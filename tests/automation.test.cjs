const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(file, deps, extra = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, require: name => {
    if (name === 'server-only') return {}
    if (name in deps) return deps[name]
    throw new Error(name)
  }, Buffer, Intl, Date, console, ...extra })
  return exports
}

test('dry-run tick performs no database, AI, refresh or publication work', async () => {
  const fail = () => { throw new Error('Unexpected side effect') }
  const { runAutomationTick } = load('lib/automation/tick.ts', {
    '@/lib/supabase/service-role': { createServiceRoleClient: fail },
    '@/lib/utils': { getTodayDateWIB: fail },
    './content-engine': { runDailyContentEngine: fail },
    './publish-post': { publishPost: fail },
    '@/lib/threads/token-manager': { refreshThreadsAccount: fail },
  }, { process: { env: { THREADS_PUBLISH_MODE: 'dry-run' } } })
  assert.equal((await runAutomationTick()).state, 'dry_run')
})

test('worker rejects missing and incorrect credentials before invoking tick', async () => {
  let calls = 0
  const secret = 'a'.repeat(64)
  const { POST } = load('app/api/automation/tick/route.ts', {
    'node:crypto': require('node:crypto'),
    'next/server': { NextResponse: { json: (body, init) => ({ body, ...init }) } },
    '@/lib/automation/tick': { runAutomationTick: async () => { calls++; return { state: 'paused' } } },
  }, { process: { env: { AUTOMATION_WORKER_SECRET: secret } } })
  for (const value of [null, '', 'Bearer wrong', `Bearer ${'b'.repeat(64)}`]) {
    assert.equal((await POST({ headers: { get: () => value } })).status, 401)
  }
  assert.equal(calls, 0)
  assert.equal((await POST({ headers: { get: () => `Bearer ${secret}` } })).body.state, 'paused')
  assert.equal(calls, 1)
})

test('Threads token inspection uses documented TH application token prefix', async () => {
  let requested
  const { inspectThreadsToken } = load('lib/threads/client.ts', {
    './config': { getThreadsConfig: () => ({ base: 'https://graph.threads.com', version: 'v1.0', appId: '123', appSecret: 'test-secret' }) },
    zod: require('zod'),
  }, {
    URL, URLSearchParams, AbortSignal,
    fetch: async url => { requested = url; return { ok: true, json: async () => ({ data: { is_valid: true, user_id: '456', scopes: ['threads_basic', 'threads_content_publish'] } }) } },
  })
  await inspectThreadsToken('user-token')
  assert.equal(requested.searchParams.get('access_token'), 'TH|123|test-secret')
})

test('slot-aware tick triggers generation for first unfilled due slot', async () => {
  let generatedSlotId = null
  const fakeSlots = [
    { id: 'slot-1', generate_after: '2026-11-12T07:00:00Z', scheduled_for: '2026-11-12T08:00:00Z', lifecycle: 'scheduled', context: 'trending news' }
  ]
  const mockDb = {
    from: (table) => {
      if (table === 'app_settings') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { singleton: true, automation_enabled: true, generation_time: '08:00', posting_time: '09:00' } }) }) }) }
      }
      if (table === 'system_logs') {
        return { insert: async () => ({}) }
      }
      if (table === 'social_accounts') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'acc-1', token_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), last_token_refresh_at: null, connected_at: new Date().toISOString() } }) }) }) }
      }
      if (table === 'schedule_slots') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                lte: () => ({
                  order: () => ({
                    limit: async () => ({ data: fakeSlots })
                  })
                })
              })
            })
          })
        }
      }
      if (table === 'content_posts') {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({ data: [] }) // no existing posts for slot-1
            })
          })
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }
  }

  const { runAutomationTick } = load('lib/automation/tick.ts', {
    '@/lib/supabase/service-role': { createServiceRoleClient: () => mockDb },
    '@/lib/utils': { getTodayDateWIB: () => '2026-11-12' },
    './content-engine': {
      runDailyContentEngine: async (opts) => {
        generatedSlotId = opts?.slotId
        return { success: true }
      }
    },
    './publish-post': { publishPost: async () => {} },
    '@/lib/threads/token-manager': { refreshThreadsAccount: async () => {} },
  }, { process: { env: { THREADS_PUBLISH_MODE: 'live' } } })

  const result = await runAutomationTick()
  assert.equal(result.state, 'generated')
  assert.equal(result.slotId, 'slot-1')
  assert.equal(generatedSlotId, 'slot-1')
})

test('ai-suggest route requires admin authentication and returns suggestion', async () => {
  const { POST } = load('app/api/posts/ai-suggest/route.ts', {
    zod: require('zod'),
    'next/server': { NextResponse: { json: (body, init) => ({ body, ...init }) } },
    '@/lib/supabase/server': {
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'admin-id' } } }) },
        rpc: async (fn) => fn === 'is_threadme_admin' ? { data: true } : { data: false },
      })
    },
    '@/lib/ai/text-provider': {
      getTextAIProvider: () => ({
        generate: async () => ({
          structuredContent: {
            content: 'gibran aja tau kapan harus mundur, masa lu enggak',
            pillar: 'humor_dan_meme'
          }
        })
      })
    },
    '@/lib/ai/prompts/persona': { THREADME_SYSTEM_PERSONA: 'persona' },
  })

  // Wrong origin
  const forbidden = await POST({
    headers: { get: (h) => h === 'origin' ? 'https://evil.com' : null },
    nextUrl: { origin: 'https://threadme.app' },
  })
  assert.equal(forbidden.status, 403)

  // Valid request
  const success = await POST({
    headers: { get: (h) => h === 'origin' ? 'https://threadme.app' : null },
    nextUrl: { origin: 'https://threadme.app' },
    json: async () => ({ context: 'gibran mundur dari wapres' }),
  })
  assert.equal(success.body.success, true)
  assert.equal(success.body.suggestion, 'gibran aja tau kapan harus mundur, masa lu enggak')
})

test('threads insights detects missing scope gracefully', async () => {
  const mockDb = {
    from: (table) => {
      if (table === 'social_accounts') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'acc-1',
                    external_user_id: '123',
                    username: 'a.zeys',
                    is_active: true,
                    token_expires_at: new Date(Date.now() + 86400000).toISOString(),
                    granted_scopes: ['threads_basic', 'threads_content_publish'], // no threads_manage_insights
                    encrypted_access_token: 'enc',
                  }
                })
              })
            })
          })
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    }
  }

  const { getThreadsInsights } = load('lib/threads/insights.ts', {
    '@/lib/supabase/service-role': { createServiceRoleClient: () => mockDb },
    './token-encryption': { decryptToken: () => 'token' },
    './config': { getThreadsConfig: () => ({ version: 'v1.0', base: 'https://graph.threads.com' }) },
    zod: require('zod'),
  })

  const result = await getThreadsInsights(true)
  assert.equal(result.status, 'scope_missing')
  assert.match(result.message, /threads_manage_insights/)
})



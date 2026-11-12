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

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(file, deps, extra = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(
    code,
    {
      exports,
      require: (name) => {
        if (name === 'server-only') return {}
        if (name in deps) return deps[name]
        throw new Error(`Missing dependency: ${name}`)
      },
      Buffer,
      crypto,
      Intl,
      Date,
      console,
      ...extra,
    }
  )
  return exports
}

const mockNextServer = {
  NextResponse: {
    json: (body, init = {}) => ({
      status: init.status || 200,
      json: async () => body,
      body,
      headers: new Map(),
    }),
  },
}

const mockNextCache = {
  revalidatePath: () => {},
}

for (const scenario of ['valid', 'inactive', 'invalid', 'stale', 'unchanged']) {
  test(`draft topic update: ${scenario}`, async () => {
    const id = '11111111-1111-4111-8111-111111111111'
    const version = '2026-11-14T10:00:00.000Z'
    let payload
    const db = { from(table) {
      const chain = {
        select() { return chain }, eq() { return chain },
        update(value) { payload = value; return chain },
        insert: async () => ({ error: null }),
        maybeSingle: async () => table === 'content_topics'
          ? { data: scenario === 'inactive' ? null : { id, slug: 'kerja' }, error: null }
          : { data: payload ? { id } : { id, status: 'ready', updated_at: scenario === 'stale' ? 'older' : version }, error: null },
      }
      return chain
    } }
    const { POST } = load('app/api/posts/[id]/route.ts', {
      'next/server': mockNextServer, 'next/cache': mockNextCache, zod: require('zod'),
      '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id } } }) }, rpc: async () => ({ data: true }) }) },
      '@/lib/supabase/service-role': { createServiceRoleClient: () => db },
      '@/lib/automation/draft-image': { POST_IMAGE_BUCKET: 'images' },
    })
    const form = new FormData()
    for (const [key, value] of Object.entries({ content: 'Teks draf untuk pengujian topik.', version, imageAction: 'keep' })) form.set(key, value)
    if (scenario !== 'unchanged') form.set('topicId', scenario === 'invalid' ? 'bad-id' : id)
    const response = await POST({ headers: { get: name => name === 'origin' ? 'https://threadme.test' : null }, nextUrl: { origin: 'https://threadme.test' }, formData: async () => form }, { params: Promise.resolve({ id }) })
    assert.equal(response.status, scenario === 'stale' ? 409 : ['invalid', 'inactive'].includes(scenario) ? 400 : 200)
    if (scenario === 'valid') { assert.equal(payload.topic_id, id); assert.equal(payload.pillar, 'kerja') }
    if (scenario === 'unchanged') assert.equal('topic_id' in payload, false)
    if (['stale', 'invalid', 'inactive'].includes(scenario)) assert.equal(payload, undefined)
  })
}

test('POST /api/topics rejects untrusted origin', async () => {
  const shared = load('app/api/topics/shared.ts', {
    'next/server': mockNextServer,
    zod: require('zod'),
    '@/lib/supabase/server': { createClient: async () => ({}) },
  })

  const { POST } = load('app/api/topics/route.ts', {
    'next/server': mockNextServer,
    'next/cache': mockNextCache,
    './shared': shared,
  })

  const req = {
    headers: { get: (name) => (name === 'origin' ? 'https://malicious.com' : null) },
    nextUrl: { origin: 'https://threadme.internal' },
  }

  const res = await POST(req)
  assert.equal(res.status, 403)
  assert.equal(res.body.error, 'Asal permintaan tidak diizinkan.')
})

test('POST /api/topics rejects non-admin users', async () => {
  const shared = load('app/api/topics/shared.ts', {
    'next/server': mockNextServer,
    zod: require('zod'),
    '@/lib/supabase/server': {
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
        rpc: async (fn) => (fn === 'is_threadme_admin' ? { data: false, error: null } : { data: null, error: true }),
      }),
    },
  })

  const { POST } = load('app/api/topics/route.ts', {
    'next/server': mockNextServer,
    'next/cache': mockNextCache,
    './shared': shared,
  })

  const req = {
    headers: { get: (name) => (name === 'origin' ? 'https://threadme.internal' : null) },
    nextUrl: { origin: 'https://threadme.internal' },
    json: async () => ({ name: 'Test Topic', priority: 3, is_active: true }),
  }

  const res = await POST(req)
  assert.equal(res.status, 403)
  assert.equal(res.body.error, 'Akses admin diperlukan.')
})

test('POST /api/topics validates input and creates topic with unique slug', async () => {
  let insertedTopic = null
  const existingSlugs = new Set(['finansial-gen-z'])

  const mockDb = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } } }) },
    rpc: async () => ({ data: true, error: null }),
    from: (table) => {
      assert.equal(table, 'content_topics')
      return {
        select: () => ({
          eq: (col, val) => ({
            maybeSingle: async () => {
              if (col === 'slug' && existingSlugs.has(val)) {
                return { data: { id: 'existing-id' }, error: null }
              }
              return { data: null, error: null }
            },
          }),
        }),
        insert: (data) => {
          insertedTopic = data
          return {
            select: () => ({
              single: async () => ({
                data: { id: 'new-uuid', ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                error: null,
              }),
            }),
          }
        },
      }
    },
  }

  const shared = load('app/api/topics/shared.ts', {
    'next/server': mockNextServer,
    zod: require('zod'),
    '@/lib/supabase/server': { createClient: async () => mockDb },
  })

  const { POST } = load('app/api/topics/route.ts', {
    'next/server': mockNextServer,
    'next/cache': mockNextCache,
    './shared': shared,
  })

  // Test invalid input: empty name
  const invalidReq = {
    headers: { get: (name) => (name === 'origin' ? 'https://threadme.internal' : null) },
    nextUrl: { origin: 'https://threadme.internal' },
    json: async () => ({ name: '', priority: 3, is_active: true }),
  }
  const invalidRes = await POST(invalidReq)
  assert.equal(invalidRes.status, 400)
  assert.equal(invalidRes.body.error, 'Nama topik wajib diisi.')

  // Test valid input with collision on 'Finansial Gen Z' -> slug becomes 'finansial-gen-z-2'
  const validReq = {
    headers: { get: (name) => (name === 'origin' ? 'https://threadme.internal' : null) },
    nextUrl: { origin: 'https://threadme.internal' },
    json: async () => ({
      name: 'Finansial Gen Z',
      description: 'Tips keuangan santai',
      priority: 4,
      is_active: true,
    }),
  }
  const validRes = await POST(validReq)
  assert.equal(validRes.status, 201)
  assert.equal(insertedTopic.name, 'Finansial Gen Z')
  assert.equal(insertedTopic.slug, 'finansial-gen-z-2')
  assert.equal(insertedTopic.source_type, 'custom')
  assert.equal(insertedTopic.priority, 4)
  assert.equal(insertedTopic.is_active, true)
})

test('PUT /api/topics/[id] preserves system slug and updates content', async () => {
  let updatedPayload = null
  const mockDb = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } } }) },
    rpc: async () => ({ data: true, error: null }),
    from: (table) => {
      assert.equal(table, 'content_topics')
      return {
        select: () => ({
          eq: (col, val) => ({
            maybeSingle: async () => {
              if (col === 'id' && val === '11111111-1111-1111-1111-111111111111') {
                return {
                  data: {
                    id: '11111111-1111-1111-1111-111111111111',
                    name: 'Overthinking',
                    slug: 'overthinking',
                    description: 'Deskripsi lama',
                    source_type: 'system',
                    priority: 3,
                    is_active: true,
                  },
                  error: null,
                }
              }
              return { data: null, error: null }
            },
          }),
        }),
        update: (payload) => {
          updatedPayload = payload
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({ data: { id: '11111111-1111-1111-1111-111111111111', ...payload }, error: null }),
              }),
            }),
          }
        },
      }
    },
  }

  const shared = load('app/api/topics/shared.ts', {
    'next/server': mockNextServer,
    zod: require('zod'),
    '@/lib/supabase/server': { createClient: async () => mockDb },
  })

  const { PUT } = load('app/api/topics/[id]/route.ts', {
    'next/server': mockNextServer,
    'next/cache': mockNextCache,
    zod: require('zod'),
    '../shared': shared,
  })

  const req = {
    headers: { get: (name) => (name === 'origin' ? 'https://threadme.internal' : null) },
    nextUrl: { origin: 'https://threadme.internal' },
    json: async () => ({
      name: 'Overthinking Malam',
      description: 'Deskripsi baru',
      priority: 5,
      is_active: false,
    }),
  }

  const res = await PUT(req, {
    params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }),
  })
  assert.equal(res.status, 200)
  assert.equal(updatedPayload.slug, 'overthinking') // Preserves system topic slug!
  assert.equal(updatedPayload.name, 'Overthinking Malam')
  assert.equal(updatedPayload.priority, 5)
  assert.equal(updatedPayload.is_active, false)
})

test('DELETE /api/topics/[id] rejects deleting system topic and deletes custom topic', async () => {
  let deletedId = null
  const topicsMap = new Map([
    ['system-topic-id', { id: 'system-topic-id', source_type: 'system', name: 'Random thoughts' }],
    ['custom-topic-id', { id: 'custom-topic-id', source_type: 'custom', name: 'My Topic' }],
  ])

  const mockDb = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } } }) },
    rpc: async () => ({ data: true, error: null }),
    from: (table) => {
      assert.equal(table, 'content_topics')
      return {
        select: () => ({
          eq: (col, val) => ({
            maybeSingle: async () => {
              if (topicsMap.has(val)) {
                return { data: topicsMap.get(val), error: null }
              }
              return { data: null, error: null }
            },
          }),
        }),
        delete: () => ({
          eq: (_col1, val1) => ({
            eq: (_col2, val2) => {
              deletedId = val1
              return { error: null }
            },
          }),
        }),
      }
    },
  }

  const shared = load('app/api/topics/shared.ts', {
    'next/server': mockNextServer,
    zod: require('zod'),
    '@/lib/supabase/server': { createClient: async () => mockDb },
  })

  const { DELETE } = load('app/api/topics/[id]/route.ts', {
    'next/server': mockNextServer,
    'next/cache': mockNextCache,
    zod: require('zod'),
    '../shared': shared,
  })

  const validUuid1 = '22222222-2222-2222-2222-222222222222'
  const validUuid2 = '33333333-3333-3333-3333-333333333333'
  topicsMap.set(validUuid1, { id: validUuid1, source_type: 'system', name: 'System Topic' })
  topicsMap.set(validUuid2, { id: validUuid2, source_type: 'custom', name: 'Custom Topic' })

  // 1. Attempt to delete system topic -> 403 Forbidden
  const req1 = {
    headers: { get: (name) => (name === 'origin' ? 'https://threadme.internal' : null) },
    nextUrl: { origin: 'https://threadme.internal' },
  }
  const res1 = await DELETE(req1, { params: Promise.resolve({ id: validUuid1 }) })
  assert.equal(res1.status, 403)
  assert.match(res1.body.error, /sistem tidak dapat dihapus/)
  assert.equal(deletedId, null)

  // 2. Delete custom topic -> 200 OK
  const res2 = await DELETE(req1, { params: Promise.resolve({ id: validUuid2 }) })
  assert.equal(res2.status, 200)
  assert.equal(res2.body.success, true)
  assert.equal(deletedId, validUuid2)
})

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
function load(file, mocks = {}, env = {}) {
  const exports = {}
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, Buffer, URL, URLSearchParams, Date, process: { env }, require: name => name === 'server-only' ? {} : mocks[name] || require(name) })
  return exports
}
const post = { id: 'post-id', status: 'ready', updated_at: 'v1', content: 'Ini teks pengujian lokal.', content_type: 'text', threads_container_id: null, threads_media_id: null }
const planner = () => load('lib/automation/publisher.ts')

test('encryption random IV roundtrip and identity binding', () => {
  const crypt = load('lib/threads/token-encryption.ts', {}, { TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32) })
  const one = crypt.encryptToken('private-token', '123')
  assert.notEqual(one, crypt.encryptToken('private-token', '123'))
  assert(!one.includes('private-token'))
  assert.equal(crypt.decryptToken(one, '123'), 'private-token')
  assert.throws(() => crypt.decryptToken(one, '456'))
  assert.throws(() => crypt.decryptToken(one + '.bad', '123'))
  const wrong = load('lib/threads/token-encryption.ts', {}, { TOKEN_ENCRYPTION_KEY: 'cd'.repeat(32) })
  assert.throws(() => wrong.decryptToken(one, '123'))
})
test('encryption rejects malformed keys and modified ciphertext', () => {
  assert.throws(() => load('lib/threads/token-encryption.ts').encryptToken('token', '123'))
  const crypt = load('lib/threads/token-encryption.ts', {}, { TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32) })
  const parts = crypt.encryptToken('token', '123').split('.')
  parts[2] = '00'.repeat(16)
  assert.throws(() => crypt.decryptToken(parts.join('.'), '123'))
})
test('dry-run planner is pure and rejects stale or unsafe image payloads', () => {
  const { planPublication } = planner()
  const copy = JSON.stringify(post)
  assert.equal(planPublication(post, 'v1', '').mediaType, 'TEXT')
  assert.equal(JSON.stringify(post), copy)
  assert.throws(() => planPublication(post, 'v2', ''))
  assert.throws(() => planPublication({ ...post, status: 'published' }, 'v1', ''))
  const image = { ...post, content_type: 'image', image_storage_path: 'post-id/file.jpg', image_public_url: 'https://project.supabase.co/storage/v1/object/public/post-images/post-id/file.jpg', image_alt_text: 'Deskripsi' }
  assert.equal(planPublication(image, 'v1', 'https://project.supabase.co').mediaType, 'IMAGE')
  assert.throws(() => planPublication({ ...image, image_public_url: image.image_public_url.replace('project.supabase.co', 'evil.test') }, 'v1', 'https://project.supabase.co'))
  assert.throws(() => planPublication({ ...post, content: '😀'.repeat(150) }, 'v1', ''))
})
function dependencies(options = {}) {
  const calls = []; const updates = []
  const store = { claim: async () => options.noClaim ? null : { ...post, threads_container_id: options.existing || null }, update: async values => { updates.push(values); if (options.dbFail && values.status === 'published') throw Error('database') } }
  const client = { createContainer: async payload => { calls.push(['create', payload]); return '111' }, getContainerStatus: async () => { calls.push(['status']); return options.status || 'FINISHED' }, publishContainer: async () => { calls.push(['publish']); if (options.timeout) throw Error('timeout'); return '222' } }
  return { calls, updates, store, client }
}
test('successful publish persists container before final published state', async () => {
  const p = planner(); const d = dependencies()
  await p.publishLive(p.planPublication(post, 'v1', ''), d.store, d.client)
  assert.equal('is_carousel_item' in d.calls.find(c => c[0] === 'create')[1], false)
  assert.equal(d.updates[0].threads_container_id, '111')
  assert.equal(d.updates.at(-1).threads_media_id, '222')
  assert.equal(d.updates.at(-1).status, 'published')
  assert.equal(d.calls.filter(c => c[0] === 'publish').length, 1)
})
test('lost claim never calls Meta', async () => {
  const p = planner(); const d = dependencies({ noClaim: true })
  await assert.rejects(p.publishLive(p.planPublication(post, 'v1', ''), d.store, d.client))
  assert.equal(d.calls.length, 0)
})
test('processing container remains pending without publish', async () => {
  const p = planner(); const d = dependencies({ status: 'IN_PROGRESS' })
  await p.publishLive(p.planPublication(post, 'v1', ''), d.store, d.client)
  assert.equal(d.calls.filter(c => c[0] === 'publish').length, 0)
  assert.equal(d.updates.at(-1).last_error_code, 'container_not_ready')
})
test('resume uses persisted container without creating another', async () => {
  const p = planner(); const d = dependencies({ existing: '111' })
  await p.publishLive(p.planPublication(post, 'v1', ''), d.store, d.client)
  assert.equal(d.calls.filter(c => c[0] === 'create').length, 0)
})
for (const options of [{ timeout: true }, { dbFail: true }]) test(`ambiguous outcome retained without retry ${JSON.stringify(options)}`, async () => {
  const p = planner(); const d = dependencies(options)
  await assert.rejects(p.publishLive(p.planPublication(post, 'v1', ''), d.store, d.client))
  assert.equal(d.updates.at(-1).status, 'publish_unknown')
  assert.equal(d.calls.filter(c => c[0] === 'publish').length, 1)
})
test('OAuth state requires matching cookie and single-use database consumption', async () => {
  let consumed = false; let queries = 0
  const query = { eq: () => query, gt: () => query, select: () => query, maybeSingle: async () => { queries++; const data = consumed ? null : { state_hash: 'hash' }; consumed = true; return { data, error: null } } }
  const oauth = load('lib/threads/oauth.ts', { '@/lib/supabase/service-role': { createServiceRoleClient: () => ({ from: () => ({ delete: () => query }) }) }, './config': {} })
  const state = 'ab'.repeat(32)
  await assert.rejects(oauth.consumeThreadsState(state, 'cd'.repeat(32), 'admin'))
  assert.equal(queries, 0)
  await oauth.consumeThreadsState(state, state, 'admin')
  await assert.rejects(oauth.consumeThreadsState(state, state, 'admin'))
})

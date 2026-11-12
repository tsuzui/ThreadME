const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const ts = require('typescript')

function load(env = {}, fetcher) {
  const source = fs.readFileSync(path.join(__dirname, '../lib/automation/threads-publishing-client.ts'), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, require: name => { if (name === 'server-only') return {}; throw new Error(name) }, process: { env }, URL, URLSearchParams, AbortSignal, fetch: fetcher })
  return exports.createPublishingClient
}

test('container creation never auto-publishes text and keeps credentials out of URL', async () => {
  let request
  const client = load({}, async (url, init) => { request = { url: String(url), init }; return { ok: true, json: async () => ({ id: '123' }) } })('test-secret', '456')
  assert.equal(await client.createContainer({ media_type: 'TEXT', text: 'Teks pengujian lokal' }), '123')
  assert.equal(new URLSearchParams(request.init.body).get('auto_publish_text'), 'false')
  assert.equal(request.init.headers.Authorization, 'Bearer test-secret')
  assert.equal(request.url.includes('test-secret'), false)
  assert.equal(request.init.redirect, 'error')
})

test('API host, version and account IDs are validated', async () => {
  const unexpected = () => { throw new Error('Network must not be called') }
  assert.throws(() => load({}, unexpected)('token', '../bad'))
  for (const base of ['http://graph.threads.com', 'https://graph.threads.com.evil.test', 'https://evil.test', 'https://user:password@graph.threads.com', 'https://graph.threads.com/redirect']) {
    await assert.rejects(load({ THREADS_API_BASE_URL: base }, unexpected)('token', '123').getRecentPosts())
  }
  await assert.rejects(load({ THREADS_API_VERSION: '../bad' }, unexpected)('token', '123').getRecentPosts())
})

test('transport failures redact upstream secrets', async () => {
  const client = load({}, async () => { throw new Error('test-secret') })('test-secret', '123')
  await assert.rejects(client.publishContainer('456'), error => !error.message.includes('test-secret'))
})

test('successful response with invalid identifier fails closed', async () => {
  const client = load({}, async () => ({ ok: true, json: async () => ({ id: '../bad' }) }))('token', '123')
  await assert.rejects(client.publishContainer('456'))
})

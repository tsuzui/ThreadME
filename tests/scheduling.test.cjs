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
        throw new Error(`Unexpected dependency: ${name}`)
      },
      Buffer,
      Intl,
      Date,
      console,
      ...extra,
    }
  )
  return exports
}

function jsonClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function createMockSupabase({ user = { id: 'admin-1' }, isAdmin = true, rpcHandlers = {} } = {}) {
  return {
    auth: {
      getUser: async () => ({
        data: { user },
        error: user ? null : { message: 'Not authenticated' },
      }),
    },
    rpc: async (fn, args) => {
      if (fn === 'is_threadme_admin') {
        return { data: isAdmin, error: null }
      }
      if (rpcHandlers[fn]) {
        return rpcHandlers[fn](args)
      }
      return { data: null, error: null }
    },
  }
}

test('updateAppSettingsAction rejects unauthenticated user', async () => {
  const mockDb = createMockSupabase({ user: null })
  const { updateAppSettingsAction } = load('app/(dashboard)/settings/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/supabase/server': { createClient: async () => mockDb },
  })

  const formData = new FormData()
  formData.set('generation_time', '08:00')
  formData.set('posting_time', '19:00')
  formData.set('topic_rotation_cooldown_days', '7')
  formData.set('max_generation_retries', '2')

  const res = await updateAppSettingsAction({}, formData)
  assert.equal(res.error, 'Sesi login telah berakhir. Silakan masuk kembali.')
})

test('updateAppSettingsAction rejects non-admin user', async () => {
  const mockDb = createMockSupabase({ isAdmin: false })
  const { updateAppSettingsAction } = load('app/(dashboard)/settings/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/supabase/server': { createClient: async () => mockDb },
  })

  const formData = new FormData()
  formData.set('generation_time', '08:00')
  formData.set('posting_time', '19:00')
  formData.set('topic_rotation_cooldown_days', '7')
  formData.set('max_generation_retries', '2')

  const res = await updateAppSettingsAction({}, formData)
  assert.equal(res.error, 'Akses admin diperlukan.')
})

test('updateAppSettingsAction rejects invalid time logic (generation after or equal to posting)', async () => {
  const mockDb = createMockSupabase()
  const { updateAppSettingsAction } = load('app/(dashboard)/settings/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/supabase/server': { createClient: async () => mockDb },
  })

  // Same time
  const formData1 = new FormData()
  formData1.set('generation_time', '19:00')
  formData1.set('posting_time', '19:00')
  formData1.set('topic_rotation_cooldown_days', '7')
  formData1.set('max_generation_retries', '2')

  const res1 = await updateAppSettingsAction({}, formData1)
  assert.match(res1.error, /Generasi harus minimal 1 menit sebelum publikasi/)

  // Generation after posting
  const formData2 = new FormData()
  formData2.set('generation_time', '20:00')
  formData2.set('posting_time', '19:00')
  formData2.set('topic_rotation_cooldown_days', '7')
  formData2.set('max_generation_retries', '2')

  const res2 = await updateAppSettingsAction({}, formData2)
  assert.match(res2.error, /Generasi harus minimal 1 menit sebelum publikasi/)
})

test('updateAppSettingsAction rejects invalid numeric bounds', async () => {
  const mockDb = createMockSupabase()
  const { updateAppSettingsAction } = load('app/(dashboard)/settings/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/supabase/server': { createClient: async () => mockDb },
  })

  const formData = new FormData()
  formData.set('generation_time', '08:00')
  formData.set('posting_time', '19:00')
  formData.set('topic_rotation_cooldown_days', '45') // max is 30
  formData.set('max_generation_retries', '2')

  const res = await updateAppSettingsAction({}, formData)
  assert.match(res.error, /Parameter harus bilangan bulat 1–30/)
})

test('updateAppSettingsAction passes validated payload to atomic RPC and communicates slot outcome', async () => {
  let passedRpc = null
  let revalidated = []

  const mockDb = createMockSupabase({
    rpcHandlers: {
      update_threadme_settings: async (args) => {
        passedRpc = args
        return { data: 'protected', error: null }
      },
    },
  })

  const { updateAppSettingsAction } = load('app/(dashboard)/settings/actions.ts', {
    'next/cache': { revalidatePath: (path) => revalidated.push(path) },
    '@/lib/supabase/server': { createClient: async () => mockDb },
  })

  const formData = new FormData()
  formData.set('generation_time', '08:00')
  formData.set('posting_time', '19:00')
  formData.set('automation_enabled', 'on')
  formData.set('topic_rotation_cooldown_days', '7')
  formData.set('max_generation_retries', '2')
  formData.set('persona_prompt', 'Anak muda santai tapi berbobot')

  const res = await updateAppSettingsAction({}, formData)
  assert.equal(res.success, true)
  assert.match(res.message, /Jadwal hari ini tetap/)
  assert.deepEqual(jsonClone(passedRpc), {
    p_generation_time: '08:00',
    p_posting_time: '19:00',
    p_enabled: true,
    p_cooldown: 7,
    p_retries: 2,
    p_persona: 'Anak muda santai tapi berbobot',
  })
  assert.ok(revalidated.includes('/settings'))
  assert.ok(revalidated.includes('/dashboard'))
  assert.ok(revalidated.includes('/calendar'))
})

test('updateAppSettingsAction reports updated when slot is safely adjusted', async () => {
  const mockDb = createMockSupabase({
    rpcHandlers: {
      update_threadme_settings: async () => ({ data: 'updated', error: null }),
    },
  })

  const { updateAppSettingsAction } = load('app/(dashboard)/settings/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/supabase/server': { createClient: async () => mockDb },
  })

  const formData = new FormData()
  formData.set('generation_time', '08:00')
  formData.set('posting_time', '19:00')
  formData.set('automation_enabled', 'on')
  formData.set('topic_rotation_cooldown_days', '7')
  formData.set('max_generation_retries', '2')

  const res = await updateAppSettingsAction({}, formData)
  assert.equal(res.success, true)
  assert.match(res.message, /Slot utama hari ini yang masih kosong ikut diperbarui/)
})

test('updateAppSettingsAction does not swallow database errors on conflict', async () => {
  const mockDb = createMockSupabase({
    rpcHandlers: {
      update_threadme_settings: async () => ({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      }),
    },
  })

  const { updateAppSettingsAction } = load('app/(dashboard)/settings/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/supabase/server': { createClient: async () => mockDb },
  })

  const formData = new FormData()
  formData.set('generation_time', '08:00')
  formData.set('posting_time', '19:00')
  formData.set('topic_rotation_cooldown_days', '7')
  formData.set('max_generation_retries', '2')

  const res = await updateAppSettingsAction({}, formData)
  assert.equal(res.success, undefined)
  assert.match(res.error, /bentrok dengan jadwal lain/)
})

test('addRecurringRuleAction validates same-day lead and calls manage_threadme_recurring_rule RPC', async () => {
  let passedRpc = null

  const mockDb = createMockSupabase({
    rpcHandlers: {
      manage_threadme_recurring_rule: async (args) => {
        passedRpc = args
        return { data: null, error: null }
      },
    },
  })

  const { addRecurringRuleAction } = load('app/(dashboard)/settings/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/supabase/server': { createClient: async () => mockDb },
  })

  // Reject lead exceeding posting minutes (e.g. 10:00 is 600 mins, lead 650 is previous day)
  const errRes = await addRecurringRuleAction('10:00', 650)
  assert.match(errRes.error, /Lead AI harus 1–1439 menit, dengan generasi pada hari yang sama/)

  // Valid rule: 12:00 (720 mins) with lead 30 mins -> gen at 11:30
  const okRes = await addRecurringRuleAction('12:00', 30)
  assert.equal(okRes.success, true)
  assert.deepEqual(jsonClone(passedRpc), {
    p_operation: 'add',
    p_time: '12:00',
    p_lead: 30,
  })
})

test('toggleRecurringRuleAction and deleteRecurringRuleAction invoke RPC and handle 23503 fk error', async () => {
  let operations = []

  const mockDb = createMockSupabase({
    rpcHandlers: {
      manage_threadme_recurring_rule: async (args) => {
        operations.push(args)
        if (args.p_operation === 'delete' && args.p_id === 'rule-with-history') {
          return { data: null, error: { code: '23503', message: 'foreign key violation' } }
        }
        return { data: null, error: null }
      },
    },
  })

  const { toggleRecurringRuleAction, deleteRecurringRuleAction } = load('app/(dashboard)/settings/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/supabase/server': { createClient: async () => mockDb },
  })

  const toggleRes = await toggleRecurringRuleAction('rule-1', false)
  assert.equal(toggleRes.success, true)
  assert.deepEqual(jsonClone(operations[0]), {
    p_operation: 'toggle',
    p_id: 'rule-1',
    p_enabled: false,
  })

  const deleteErrRes = await deleteRecurringRuleAction('rule-with-history')
  assert.match(deleteErrRes.error, /Nonaktifkan alih-alih menghapus/)

  const deleteOkRes = await deleteRecurringRuleAction('rule-fresh')
  assert.equal(deleteOkRes.success, true)
})

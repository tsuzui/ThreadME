import 'server-only'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getThreadsConfig, THREADS_SCOPES } from './config'

export const OAUTH_COOKIE = 'threadme_threads_state'
export const hashState = (value: string) => createHash('sha256').update(value).digest('hex')

export async function startThreadsOAuth(adminId: string) {
  const config = getThreadsConfig()
  const state = randomBytes(32).toString('hex')
  const db = createServiceRoleClient()
  const { data: account, error: accountError } = await db.from('social_accounts').select('id,updated_at').eq('is_active', true).maybeSingle()
  if (accountError) throw new Error('Gagal membaca koneksi Threads.')
  const revision = account ? JSON.stringify(account) : 'none'
  await db.from('threads_oauth_states').delete().lt('expires_at', new Date().toISOString())
  const { error } = await db.from('threads_oauth_states').insert({ state_hash: hashState(state), admin_id: adminId, account_revision: revision, expires_at: new Date(Date.now() + 600_000).toISOString() })
  if (error) throw new Error('OAuth belum siap. Pastikan migration Phase D sudah diterapkan.')
  const url = new URL('https://threads.com/oauth/authorize')
  url.search = new URLSearchParams({ client_id: config.appId, redirect_uri: config.redirectUri, scope: THREADS_SCOPES.join(','), response_type: 'code', state }).toString()
  return { url: url.href, state, secure: config.redirectUri.startsWith('https:') }
}

export async function consumeThreadsState(state: string, cookie: string, adminId: string) {
  if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(cookie) || !timingSafeEqual(Buffer.from(state), Buffer.from(cookie))) throw new Error('Sesi OAuth tidak valid. Mulai koneksi ulang.')
  const { data, error } = await createServiceRoleClient().from('threads_oauth_states').delete()
    .eq('state_hash', hashState(state)).eq('admin_id', adminId).gt('expires_at', new Date().toISOString()).select('state_hash,account_revision').maybeSingle()
  if (error || !data) throw new Error('Sesi OAuth kedaluwarsa atau sudah digunakan. Mulai koneksi ulang.')
  return data.account_revision
}

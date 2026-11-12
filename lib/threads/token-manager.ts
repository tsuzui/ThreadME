import 'server-only'
import { randomUUID } from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { decryptToken, encryptToken } from './token-encryption'
import { inspectThreadsToken, refreshAccessToken } from './client'

export async function refreshThreadsAccount() {
  const db = createServiceRoleClient()
  const { data: account, error } = await db.from('social_accounts').select('*').eq('is_active', true).maybeSingle()
  if (error || !account) throw new Error('Tidak ada akun Threads aktif.')
  const now = Date.now()
  if (!account.token_expires_at || Date.parse(account.token_expires_at) <= now) throw new Error('Token kedaluwarsa. Hubungkan ulang Threads.')
  if (now - Date.parse(account.last_token_refresh_at || account.connected_at) < 86_400_000) throw new Error('Token baru dapat diperbarui setelah berumur 24 jam.')
  const lease = randomUUID()
  const { data: claimed, error: claimError } = await db.rpc('claim_threads_refresh', { p_id: account.id, p_version: account.updated_at, p_lease: lease })
  if (claimError || !claimed) throw new Error('Akun sedang berubah atau publikasi sedang diproses. Coba lagi nanti.')
  try {
    const result = await refreshAccessToken(decryptToken(account.encrypted_access_token, account.external_user_id))
    const inspected = await inspectThreadsToken(result.access_token)
    if (inspected.user_id !== account.external_user_id) throw new Error('Identitas token tidak cocok. Hubungkan ulang akun.')
    const { data: updated, error: updateError } = await db.from('social_accounts').update({
      encrypted_access_token: encryptToken(result.access_token, account.external_user_id),
      token_expires_at: new Date(Date.now() + result.expires_in * 1000).toISOString(),
      granted_scopes: inspected.scopes,
      last_token_refresh_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      refresh_lease: null, refresh_lease_until: null,
    }).eq('id', account.id).eq('refresh_lease', lease).eq('updated_at', account.updated_at).eq('is_active', true).select('id').maybeSingle()
    if (updateError || !updated) throw new Error('Token berubah saat diperbarui. Hubungkan ulang jika diperlukan.')
  } finally {
    await db.from('social_accounts').update({ refresh_lease: null, refresh_lease_until: null }).eq('id', account.id).eq('refresh_lease', lease)
  }
}

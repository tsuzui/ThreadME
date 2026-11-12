import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { planPublication, publishLive } from './publisher'
import { createPublishingClient } from './threads-publishing-client'
import { decryptToken } from '@/lib/threads/token-encryption'
import type { Database } from '@/types/database'

type Post = Database['public']['Tables']['content_posts']['Row']

export function previewPost(post: Post, version: string, resume = false) {
  const resumable = resume && post.status === 'publishing' && post.last_error_code === 'container_not_ready' && !!post.threads_container_id && post.updated_at === version
  return planPublication(resumable ? { ...post, status: 'ready', threads_container_id: null } : post, version, process.env.NEXT_PUBLIC_SUPABASE_URL || '')
}

export async function publishPost(post: Post, version: string, scheduled = false) {
  if (process.env.THREADS_PUBLISH_MODE !== 'live') throw new Error('Publikasi live dinonaktifkan.')
  const preview = previewPost(post, version, true)
  const db = createServiceRoleClient()
  const { data: account, error: accountError } = await db.from('social_accounts').select('*').eq('is_active', true).maybeSingle()
  if (accountError || !account || !account.token_expires_at || Date.parse(account.token_expires_at) <= Date.now() || !['threads_basic', 'threads_content_publish'].every(scope => account.granted_scopes.includes(scope))) throw new Error('Hubungkan akun Threads aktif dengan izin publikasi dan token yang belum kedaluwarsa.')
  const client = createPublishingClient(decryptToken(account.encrypted_access_token, account.external_user_id), account.external_user_id)
  let revision = version
  return publishLive(preview, {
    async claim() {
      const { data, error } = await db.rpc(scheduled ? 'claim_scheduled_threads_post' : 'claim_threads_post', { p_id: post.id, p_version: version, p_account_id: account.id, p_account_version: account.updated_at })
      if (error) throw new Error('Klaim publikasi gagal. Pastikan migration publikasi diterapkan.')
      const claimed = data?.[0] || null
      if (claimed) revision = claimed.updated_at
      return claimed
    },
    async update(values) {
      const updatedAt = new Date().toISOString()
      const { data, error } = await db.from('content_posts').update({ ...values, updated_at: updatedAt })
        .eq('id', post.id).eq('status', 'publishing').eq('updated_at', revision).select('id').maybeSingle()
      if (error || !data) throw new Error('Status publikasi gagal disimpan.')
      revision = updatedAt
    },
  }, client)
}

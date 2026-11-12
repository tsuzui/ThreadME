import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getTodayDateWIB } from '@/lib/utils'
import { runDailyContentEngine } from './content-engine'
import { publishPost } from './publish-post'
import { refreshThreadsAccount } from '@/lib/threads/token-manager'

export async function runAutomationTick() {
  if (process.env.THREADS_PUBLISH_MODE !== 'live') return { state: 'dry_run' }
  const db = createServiceRoleClient()
  const { data: settings, error } = await db.from('app_settings').select('*').eq('singleton', true).single()
  if (error || !settings) throw new Error('settings_unavailable')
  if (!settings.automation_enabled) return { state: 'paused' }
  const today = getTodayDateWIB()
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date())
  await db.from('system_logs').insert({ level: 'info', event: 'automation_heartbeat', message: 'Worker terjadwal menerima tick.' })
  const { data: account, error: accountError } = await db.from('social_accounts').select('id,token_expires_at,last_token_refresh_at,connected_at').eq('is_active', true).maybeSingle()
  if (accountError || !account?.token_expires_at || Date.parse(account.token_expires_at) <= Date.now()) return { state: 'reconnect_required' }
  if (Date.parse(account.token_expires_at) - Date.now() < 7 * 86_400_000 && Date.now() - Date.parse(account.last_token_refresh_at || account.connected_at) >= 86_400_000) {
    await refreshThreadsAccount()
    return { state: 'token_refreshed' }
  }
  const { data: post, error: postError } = await db.from('content_posts').select('*').eq('scheduled_date', today).maybeSingle()
  if (postError) throw new Error('post_unavailable')
  if (!post && time >= settings.generation_time) {
    await runDailyContentEngine()
    return { state: 'generated' }
  }
  const resumable = post?.status === 'publishing' && post.last_error_code === 'container_not_ready'
  if (post && (post.status === 'ready' || resumable) && time >= settings.posting_time && Date.parse(post.scheduled_for) <= Date.now() && post.publish_attempts < 10) {
    if (post.last_attempt_at && Date.now() - Date.parse(post.last_attempt_at) < 60_000) return { state: 'backoff' }
    await publishPost(post, post.updated_at, true)
    return { state: 'publication_processed' }
  }
  return { state: post?.status || 'waiting' }
}

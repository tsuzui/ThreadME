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
  await db.from('system_logs').insert({ level: 'info', event: 'automation_heartbeat', message: 'Worker terjadwal menerima tick.' })
  const { data: account, error: accountError } = await db.from('social_accounts').select('id,token_expires_at,last_token_refresh_at,connected_at').eq('is_active', true).maybeSingle()
  if (accountError || !account?.token_expires_at || Date.parse(account.token_expires_at) <= Date.now()) return { state: 'reconnect_required' }
  if (Date.parse(account.token_expires_at) - Date.now() < 7 * 86_400_000 && Date.now() - Date.parse(account.last_token_refresh_at || account.connected_at) >= 86_400_000) {
    await refreshThreadsAccount()
    return { state: 'token_refreshed' }
  }

  const { error: materializeError } = await db.rpc('materialize_routine_slots')
  if (materializeError) throw new Error('routine_schedule_unavailable')

  // Fetch active slots for generation (within 24 hours window)
  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString()
  const { data: slots } = await db.from('schedule_slots')
    .select('id, generate_after, scheduled_for, lifecycle, context, local_date')
    .eq('lifecycle', 'scheduled')
    .lte('generate_after', new Date().toISOString())
    .gte('scheduled_for', oneDayAgo)
    .order('scheduled_for', { ascending: true })
    .limit(5)

  if (slots && slots.length > 0) {
    // Check which slots already have posts
    const slotIds = slots.map(s => s.id)
    const { data: existingPosts } = await db.from('content_posts')
      .select('slot_id')
      .in('slot_id', slotIds)

    const filledSlotIds = new Set((existingPosts || []).map(p => p.slot_id))

    // Generate for first empty slot whose generation time has arrived
    for (const slot of slots) {
      if (filledSlotIds.has(slot.id)) continue
      await runDailyContentEngine({ slotId: slot.id, context: slot.context ?? undefined })
      return { state: 'generated', slotId: slot.id }
    }
  }

  // Publish: find first due post that is ready or resumable
  const { data: duePosts } = await db.from('content_posts')
    .select('*')
    .in('status', ['ready', 'publishing'])
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(5)

  for (const post of duePosts || []) {
    const resumable = post.status === 'publishing' && post.last_error_code === 'container_not_ready'
    if (post.status !== 'ready' && !resumable) continue
    if (post.publish_attempts >= 10) continue
    if (post.last_attempt_at && Date.now() - Date.parse(post.last_attempt_at) < 60_000) continue
    await publishPost(post, post.updated_at, true)
    return { state: 'publication_processed', postId: post.id }
  }

  return { state: duePosts?.length ? duePosts[0].status : 'waiting' }
}

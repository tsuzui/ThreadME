import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { decryptToken } from './token-encryption'
import { getThreadsConfig } from './config'
import { z } from 'zod'

export interface ThreadsMetricItem {
  name: string
  period: string
  values: Array<{ value: number; end_time?: string }>
  title?: string
  description?: string
  id?: string
}

export interface ThreadsProfile {
  id: string
  username: string
  name?: string
  threads_profile_picture_url?: string
  threads_biography?: string
  followers_count?: number
}

export interface ThreadsInsightsData {
  status: 'ok' | 'scope_missing' | 'not_connected' | 'error'
  message?: string
  cachedAt?: string
  profile?: ThreadsProfile
  metrics?: {
    views: number
    likes: number
    replies: number
    reposts: number
    quotes: number
    followersCount?: number
  }
}

// In-memory cache for 30 minutes
let cachedInsights: {
  accountId: string
  data: ThreadsInsightsData
  expiresAt: number
} | null = null

const insightResponseSchema = z.object({
  data: z.array(
    z.object({
      name: z.string(),
      period: z.string().optional(),
      values: z.array(
        z.object({
          value: z.number(),
          end_time: z.string().optional(),
        })
      ).optional(),
      total_value: z.object({ value: z.number() }).optional(),
      title: z.string().optional(),
      description: z.string().optional(),
    })
  ),
})

export async function getThreadsInsights(forceRefresh = false): Promise<ThreadsInsightsData> {
  const db = createServiceRoleClient()

  // 1. Get active Threads account
  const { data: account, error: accountError } = await db
    .from('social_accounts')
    .select('id, external_user_id, username, is_active, token_expires_at, granted_scopes, encrypted_access_token')
    .eq('platform', 'threads')
    .eq('is_active', true)
    .maybeSingle()

  if (accountError || !account) {
    return { status: 'not_connected', message: 'Belum ada akun Threads yang terhubung.' }
  }

  // 2. Check token expiration
  if (!account.token_expires_at || Date.parse(account.token_expires_at) <= Date.now()) {
    return { status: 'error', message: 'Token akses Threads telah kedaluwarsa. Hubungkan ulang akun.' }
  }

  // 3. Check for threads_manage_insights scope
  const scopes = account.granted_scopes || []
  const hasInsightsScope = scopes.includes('threads_manage_insights')

  if (!hasInsightsScope) {
    return {
      status: 'scope_missing',
      message: 'Izin threads_manage_insights belum diberikan pada akun @' + account.username + '.',
    }
  }

  // 4. Return cached result if valid
  const now = Date.now()
  if (!forceRefresh && cachedInsights && cachedInsights.accountId === account.id && cachedInsights.expiresAt > now) {
    return cachedInsights.data
  }

  // 5. Query Meta Threads API
  try {
    const config = getThreadsConfig()
    const token = decryptToken(account.encrypted_access_token, account.external_user_id)
    const metricsParam = 'views,likes,replies,reposts,quotes'
    const insightsUrl = new URL(`/${config.version}/${account.external_user_id}/threads_insights`, config.base)
    insightsUrl.searchParams.set('metric', metricsParam)

    const followersUrl = new URL(`/${config.version}/${account.external_user_id}/threads_insights`, config.base)
    followersUrl.searchParams.set('metric', 'followers_count')

    const meUrl = new URL(`/${config.version}/me`, config.base)
    meUrl.searchParams.set('fields', 'id,username,name,threads_profile_picture_url,threads_biography')

    const headers = { Authorization: `Bearer ${token}` }

    const [insightsRes, followersRes, meRes] = await Promise.allSettled([
      fetch(insightsUrl.toString(), { method: 'GET', headers, cache: 'no-store', signal: AbortSignal.timeout(15_000) }),
      fetch(followersUrl.toString(), { method: 'GET', headers, cache: 'no-store', signal: AbortSignal.timeout(15_000) }),
      fetch(meUrl.toString(), { method: 'GET', headers, cache: 'no-store', signal: AbortSignal.timeout(15_000) }),
    ])

    let profile: ThreadsProfile | undefined = undefined
    if (meRes.status === 'fulfilled' && meRes.value.ok) {
      const meJson = await meRes.value.json()
      if (meJson && !meJson.error) {
        profile = {
          id: meJson.id,
          username: meJson.username || account.username || 'threads',
          name: meJson.name,
          threads_profile_picture_url: meJson.threads_profile_picture_url,
          threads_biography: meJson.threads_biography,
        }
      }
    }

    let followersCount: number | undefined = undefined
    if (followersRes.status === 'fulfilled' && followersRes.value.ok) {
      const folJson = await followersRes.value.json()
      const parsedFol = insightResponseSchema.safeParse(folJson)
      if (parsedFol.success && parsedFol.data.data.length > 0) {
        const item = parsedFol.data.data[0]
        followersCount = item.total_value?.value ?? item.values?.[item.values.length - 1]?.value ?? 0
      }
    }

    if (profile && followersCount !== undefined) {
      profile.followers_count = followersCount
    }

    if (insightsRes.status !== 'fulfilled' || !insightsRes.value.ok) {
      return {
        status: 'error',
        message: 'Metrik Threads belum dapat dimuat. Coba muat ulang nanti.',
        cachedAt: new Date().toISOString(),
        profile,
      }
    }

    const json = await insightsRes.value.json()
    if (json.error) {
      const errMsg = json.error?.message || 'Gagal memuat insight dari Threads API.'
      return { status: 'error', message: errMsg, profile }
    }

    const parsed = insightResponseSchema.safeParse(json)
    if (!parsed.success) {
      return { status: 'error', message: 'Format data insight Threads tidak dikenali.', profile }
    }

    const metricMap: Record<string, number> = {
      views: 0,
      likes: 0,
      replies: 0,
      reposts: 0,
      quotes: 0,
    }

    for (const item of parsed.data.data) {
      const latestValue = item.total_value?.value ?? item.values?.[item.values.length - 1]?.value ?? 0
      metricMap[item.name] = latestValue
    }

    const resultData: ThreadsInsightsData = {
      status: 'ok',
      cachedAt: new Date().toISOString(),
      profile,
      metrics: {
        views: metricMap.views || 0,
        likes: metricMap.likes || 0,
        replies: metricMap.replies || 0,
        reposts: metricMap.reposts || 0,
        quotes: metricMap.quotes || 0,
        followersCount,
      },
    }

    // Cache for 30 minutes
    cachedInsights = {
      accountId: account.id,
      data: resultData,
      expiresAt: now + 30 * 60_000,
    }

    return resultData
  } catch (err: unknown) {
    const message = (err as Error).message || 'Koneksi ke Threads API gagal.'
    return { status: 'error', message }
  }
}

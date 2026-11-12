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

export interface ThreadsInsightsData {
  status: 'ok' | 'scope_missing' | 'not_connected' | 'error'
  message?: string
  cachedAt?: string
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
      ),
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
    const url = new URL(`/${config.version}/${account.external_user_id}/threads_insights`, config.base)
    url.searchParams.set('metric', metricsParam)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })

    const json = await response.json()

    if (!response.ok || json.error) {
      const errMsg = json.error?.message || 'Gagal memuat insight dari Threads API.'
      console.warn('threads_insights_error', { status: response.status, error: json.error })
      return { status: 'error', message: errMsg }
    }

    const parsed = insightResponseSchema.safeParse(json)
    if (!parsed.success) {
      return { status: 'error', message: 'Format data insight Threads tidak dikenali.' }
    }

    const metricMap: Record<string, number> = {
      views: 0,
      likes: 0,
      replies: 0,
      reposts: 0,
      quotes: 0,
    }

    for (const item of parsed.data.data) {
      const latestValue = item.values[item.values.length - 1]?.value ?? 0
      metricMap[item.name] = latestValue
    }

    const resultData: ThreadsInsightsData = {
      status: 'ok',
      cachedAt: new Date().toISOString(),
      metrics: {
        views: metricMap.views || 0,
        likes: metricMap.likes || 0,
        replies: metricMap.replies || 0,
        reposts: metricMap.reposts || 0,
        quotes: metricMap.quotes || 0,
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

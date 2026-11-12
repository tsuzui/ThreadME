import 'server-only'
import { getThreadsConfig } from './config'
import { z } from 'zod'

const tokenSchema = z.object({ access_token: z.string().min(1), expires_in: z.number().positive().finite() })

async function request(path: string, method: 'GET' | 'POST', params: Record<string, string>, token?: string) {
  const config = getThreadsConfig()
  const url = new URL(path, config.base)
  const body = new URLSearchParams(params)
  if (method === 'GET') url.search = body.toString()
  try {
    const response = await fetch(url, {
      method, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20_000),
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
      body: method === 'POST' ? body.toString() : undefined,
    })
    const data = await response.json()
    if (!response.ok || data?.error || data?.error_type) {
      console.error('threads_api_failed', { endpoint: path, status: response.status, code: typeof data?.error?.code === 'number' ? data.error.code : null })
      throw new Error('upstream')
    }
    return data
  } catch { throw new Error('Threads tidak dapat memproses permintaan. Coba hubungkan ulang atau ulangi nanti.') }
}

export async function exchangeCode(code: string) {
  const config = getThreadsConfig()
  const short = z.object({ access_token: z.string().min(1) }).safeParse(await request('/oauth/access_token', 'POST', {
    client_id: config.appId, client_secret: config.appSecret, grant_type: 'authorization_code', redirect_uri: config.redirectUri, code,
  }))
  if (!short.success) throw new Error('Respons token Threads tidak valid.')
  const long = tokenSchema.safeParse(await request('/access_token', 'GET', {
    grant_type: 'th_exchange_token', client_secret: config.appSecret, access_token: short.data.access_token,
  }))
  if (!long.success) throw new Error('Respons token jangka panjang tidak valid.')
  return long.data
}

export async function refreshAccessToken(token: string) {
  const result = tokenSchema.safeParse(await request('/refresh_access_token', 'GET', { grant_type: 'th_refresh_token', access_token: token }))
  if (!result.success) throw new Error('Respons refresh Threads tidak valid.')
  return result.data
}

export async function inspectThreadsToken(token: string) {
  const config = getThreadsConfig()
  const parsed = z.object({ data: z.object({ is_valid: z.literal(true), user_id: z.string().regex(/^\d+$/), scopes: z.array(z.string()) }) }).safeParse(await request(`/${config.version}/debug_token`, 'GET', { input_token: token, access_token: `TH|${config.appId}|${config.appSecret}` }))
  if (!parsed.success || !['threads_basic', 'threads_content_publish'].every(scope => parsed.data.data.scopes.includes(scope))) {
    console.error('threads_token_inspection_failed', { schemaValid: parsed.success, fields: parsed.success ? [] : parsed.error.issues.map(issue => issue.path.join('.')), requiredScopesPresent: parsed.success && ['threads_basic', 'threads_content_publish'].every(scope => parsed.data.data.scopes.includes(scope)) })
    throw new Error('Izin publikasi Threads belum diberikan. Hubungkan ulang dengan izin yang diperlukan.')
  }
  return parsed.data.data
}

export async function getThreadsProfile(token: string) {
  const config = getThreadsConfig()
  const parsed = z.object({ id: z.string().regex(/^\d+$/), username: z.string().min(1) }).safeParse(await request(`/${config.version}/me`, 'GET', { fields: 'id,username' }, token))
  if (!parsed.success) throw new Error('Profil Threads tidak valid.')
  return parsed.data
}

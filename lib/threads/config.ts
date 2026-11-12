import 'server-only'

export const THREADS_SCOPES = ['threads_basic', 'threads_content_publish']

export function getThreadsConfig() {
  const appId = process.env.THREADS_APP_ID
  const appSecret = process.env.THREADS_APP_SECRET
  const key = process.env.TOKEN_ENCRYPTION_KEY || ''
  if (!appId || !/^\d+$/.test(appId) || !appSecret || !/^[a-fA-F0-9]{64}$/.test(key)) {
    throw new Error('Lengkapi THREADS_APP_ID, THREADS_APP_SECRET, dan TOKEN_ENCRYPTION_KEY (64 karakter hex) di server.')
  }
  let redirect: URL
  let app: URL
  try {
    redirect = new URL(process.env.THREADS_REDIRECT_URI || '')
    app = new URL(process.env.NEXT_PUBLIC_APP_URL || '')
  } catch { throw new Error('Alamat aplikasi atau callback Threads belum dikonfigurasi.') }
  if (redirect.origin !== app.origin || redirect.pathname !== '/api/threads/callback' || redirect.search || redirect.hash || redirect.username || redirect.password || (redirect.protocol !== 'https:' && !(redirect.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(redirect.hostname)))) {
    throw new Error('Callback Threads harus memakai origin aplikasi dan path /api/threads/callback.')
  }
  const base = new URL(process.env.THREADS_API_BASE_URL || 'https://graph.threads.com')
  const version = process.env.THREADS_API_VERSION || 'v1.0'
  if (base.protocol !== 'https:' || !['graph.threads.com', 'graph.threads.net'].includes(base.hostname) || base.port || base.username || base.password || base.pathname !== '/' || base.search || base.hash || !/^v\d+\.\d+$/.test(version)) {
    throw new Error('Konfigurasi Threads API tidak valid.')
  }
  return { appId, appSecret, key, redirectUri: redirect.href, origin: app.origin, base: base.origin, version }
}

export function threadsConfigurationError(): string | null {
  try { getThreadsConfig(); return null }
  catch (error) { return error instanceof Error ? error.message : 'Konfigurasi Threads tidak valid.' }
}

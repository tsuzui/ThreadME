import 'server-only'

function graphUrl(path: string) {
  const base = new URL(process.env.THREADS_API_BASE_URL || 'https://graph.threads.com')
  if (base.protocol !== 'https:' || !['graph.threads.com', 'graph.threads.net'].includes(base.hostname) || base.port || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
    throw new Error('Konfigurasi alamat Threads API tidak valid.')
  }
  const version = process.env.THREADS_API_VERSION || 'v1.0'
  if (!/^v\d+\.\d+$/.test(version)) throw new Error('Versi Threads API tidak valid.')
  return new URL(`/${version}/${path}`, base)
}

export function createPublishingClient(token: string, userId: string) {
  if (!/^\d+$/.test(userId)) throw new Error('Identitas akun Threads tidak valid.')
  async function request(path: string, method: 'GET' | 'POST', params: Record<string, string>) {
    const url = graphUrl(path)
    const body = new URLSearchParams(params)
    if (method === 'GET') url.search = body.toString()
    try {
      const response = await fetch(url, {
        method, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20_000),
        headers: { Authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
        body: method === 'POST' ? body.toString() : undefined,
      })
      const result = await response.json()
      if (!response.ok || !result || typeof result !== 'object' || result.error) {
        console.error('threads_publication_api_failed', { operation: method === 'GET' ? 'read' : path.endsWith('/threads_publish') ? 'publish' : 'create', status: response.status, code: typeof result?.error?.code === 'number' ? result.error.code : null, subcode: typeof result?.error?.error_subcode === 'number' ? result.error.error_subcode : null })
        throw new Error('upstream')
      }
      return result as Record<string, unknown>
    } catch { throw new Error('Permintaan Threads gagal atau hasilnya belum dapat dipastikan.') }
  }
  function numericId(value: unknown): string {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new Error('Respons identitas Threads tidak valid.')
    return value
  }
  return {
    async createContainer(payload: Record<string, string>) {
      const result = await request(`${userId}/threads`, 'POST', { ...payload, auto_publish_text: 'false' })
      return numericId(result.id)
    },
    async getContainerStatus(id: string) {
      const result = await request(numericId(id), 'GET', { fields: 'id,status' })
      if (typeof result.status !== 'string') throw new Error('Status container Threads tidak valid.')
      return result.status
    },
    async publishContainer(id: string) {
      const result = await request(`${userId}/threads_publish`, 'POST', { creation_id: numericId(id) })
      return numericId(result.id)
    },
    async getMedia(id: string) {
      return request(numericId(id), 'GET', { fields: 'id,permalink,owner,timestamp' })
    },
    async getRecentPosts() {
      return request(`${userId}/threads`, 'GET', { fields: 'id,text,permalink,owner,timestamp', limit: '25' })
    },
  }
}

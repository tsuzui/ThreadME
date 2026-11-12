import 'server-only'
import type { Database } from '@/types/database'

type Post = Database['public']['Tables']['content_posts']['Row']
export type PublishPreview = { mediaType: 'TEXT' | 'IMAGE'; text: string; imageUrl: string | null; altText: string | null }

export function planPublication(post: Post, version: string, storageOrigin: string): PublishPreview {
  if (post.status !== 'ready' || post.updated_at !== version || post.threads_container_id || post.threads_media_id) throw new Error('Draf berubah atau tidak dapat diterbitkan. Muat ulang halaman.')
  const text = post.content.trim()
  if (text.length < 15 || Buffer.byteLength(text, 'utf8') > 500) throw new Error('Teks harus minimal 15 karakter dan maksimal 500 byte UTF-8 untuk publikasi Threads.')
  let imageUrl: string | null = null
  if (post.content_type === 'image') {
    if (!post.image_public_url || !post.image_storage_path?.startsWith(`${post.id}/`)) throw new Error('Lampiran gambar tidak valid.')
    const url = new URL(post.image_public_url)
    const expected = new URL(storageOrigin)
    const path = `/storage/v1/object/public/post-images/${post.image_storage_path}`
    if (url.protocol !== 'https:' || url.origin !== expected.origin || url.username || url.password || url.search || url.hash || decodeURIComponent(url.pathname) !== path || post.image_storage_path.includes('..') || !post.image_storage_path.endsWith('.jpg')) throw new Error('Gambar harus berasal dari bucket publik post-images aplikasi ini.')
    imageUrl = url.href
  }
  return { mediaType: imageUrl ? 'IMAGE' : 'TEXT', text, imageUrl, altText: imageUrl ? post.image_alt_text : null }
}

export type PublishStore = {
  claim(): Promise<Post | null>
  update(values: Database['public']['Tables']['content_posts']['Update']): Promise<void>
}
export type PublishingClient = {
  createContainer(payload: Record<string, string>): Promise<string>
  getContainerStatus(id: string): Promise<string>
  publishContainer(id: string): Promise<string>
}

export async function publishLive(preview: PublishPreview, store: PublishStore, client: PublishingClient) {
  const claimed = await store.claim()
  if (!claimed) throw new Error('Draf atau akun berubah, atau masih ada publikasi yang perlu diperiksa.')
  let publicationAttempted = false
  try {
    const payload: Record<string, string> = { media_type: preview.mediaType, text: preview.text }
    if (preview.imageUrl) payload.image_url = preview.imageUrl
    if (preview.altText) payload.alt_text = preview.altText
    const containerId = claimed.threads_container_id || await client.createContainer(payload)
    await store.update({ threads_container_id: containerId })
    const status = await client.getContainerStatus(containerId)
    if (status !== 'FINISHED') {
      await store.update({ status: status === 'ERROR' || status === 'EXPIRED' ? 'failed' : 'publishing', last_error_code: 'container_not_ready', last_error_message: 'Container belum siap. Periksa status sebelum publikasi dilanjutkan.' })
      return { message: 'Container tersimpan tetapi belum siap. Periksa status melalui tombol pemeriksaan; jangan membuat publikasi baru.' }
    }
    await store.update({ last_error_code: 'publish_inflight' })
    publicationAttempted = true
    const mediaId = await client.publishContainer(containerId)
    await store.update({ status: 'published', threads_media_id: mediaId, published_at: new Date().toISOString(), last_error_code: null, last_error_message: null })
    return { message: 'Postingan berhasil diterbitkan ke Threads.' }
  } catch {
    try {
      await store.update({ status: publicationAttempted ? 'publish_unknown' : 'failed', last_error_code: publicationAttempted ? 'publish_unknown' : 'container_failed', last_error_message: publicationAttempted ? 'Hasil publikasi belum pasti. Periksa Threads sebelum tindakan berikutnya.' : 'Pembuatan atau pemeriksaan container gagal. Tidak ada percobaan publish ulang otomatis.' })
    } catch { /* A persisted publishing claim prevents a duplicate attempt if the database is unavailable. */ }
    throw new Error(publicationAttempted ? 'Hasil publikasi belum pasti. Jangan kirim ulang; periksa akun Threads dan status draf.' : 'Container gagal diproses. Draf tidak dipublikasikan ulang otomatis.')
  }
}

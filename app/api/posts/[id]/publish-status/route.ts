import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireThreadsAdmin } from '@/lib/threads/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createPublishingClient } from '@/lib/automation/threads-publishing-client'
import { decryptToken } from '@/lib/threads/token-encryption'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Asal permintaan tidak diizinkan.' }, { status: 403 })
  try {
    await requireThreadsAdmin()
    const { id } = await context.params
    if (!z.string().uuid().safeParse(id).success) throw new Error('ID tidak valid.')
    const db = createServiceRoleClient()
    const { data: post } = await db.from('content_posts').select('*').eq('id', id).maybeSingle()
    if (!post?.social_account_id || !['publishing', 'publish_unknown', 'published'].includes(post.status)) throw new Error('Belum ada publikasi untuk diperiksa.')
    const { data: account } = await db.from('social_accounts').select('*').eq('id', post.social_account_id).maybeSingle()
    if (!account?.is_active || !account.token_expires_at || Date.parse(account.token_expires_at) <= Date.now()) throw new Error('Akun tidak aktif atau token kedaluwarsa. Pemeriksaan memerlukan koneksi valid.')
    const client = createPublishingClient(decryptToken(account.encrypted_access_token, account.external_user_id), account.external_user_id)
    const containerStatus = post.threads_container_id ? await client.getContainerStatus(post.threads_container_id) : null
    const media = post.threads_media_id ? await client.getMedia(post.threads_media_id) : null
    const recent = await client.getRecentPosts()
    const posts = Array.isArray(recent.data) ? recent.data.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object').map(item => ({
      id: typeof item.id === 'string' ? item.id : '', text: typeof item.text === 'string' ? item.text : '', timestamp: typeof item.timestamp === 'string' ? item.timestamp : null,
    })) : []
    return NextResponse.json({ containerStatus, confirmedMediaId: media && media.id === post.threads_media_id ? post.threads_media_id : null, recent: posts,
      message: 'Pemeriksaan hanya membaca status. Daftar terbaru bukan bukti identitas publikasi; status draf tidak diubah dan tidak ada publish ulang.' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Pemeriksaan gagal.' }, { status: 400 }) }
}

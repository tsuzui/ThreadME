import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireThreadsAdmin } from '@/lib/threads/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { previewPost, publishPost } from '@/lib/automation/publish-post'

const inputSchema = z.object({ version: z.string().datetime({ offset: true }), mode: z.enum(['dry-run', 'live']), confirmed: z.boolean().optional() })

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Asal permintaan tidak diizinkan.' }, { status: 403 })
  try {
    await requireThreadsAdmin()
    const { id } = await context.params
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })
    const input = inputSchema.safeParse(await request.json())
    if (!input.success) return NextResponse.json({ error: 'Permintaan publikasi tidak valid.' }, { status: 400 })
    const db = createServiceRoleClient()
    const { data: post, error } = await db.from('content_posts').select('*').eq('id', id).maybeSingle()
    if (error || !post) return NextResponse.json({ error: 'Draf tidak ditemukan.' }, { status: 404 })
    if (input.data.mode === 'dry-run') return NextResponse.json({ preview: previewPost(post, input.data.version) }, { headers: { 'Cache-Control': 'no-store' } })
    if (process.env.THREADS_PUBLISH_MODE !== 'live' || input.data.confirmed !== true) return NextResponse.json({ error: 'Publikasi live dinonaktifkan atau belum dikonfirmasi.' }, { status: 403 })
    const result = await publishPost(post, input.data.version)
    for (const page of ['/posts', `/posts/${id}`, '/calendar', '/dashboard']) revalidatePath(page)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Publikasi gagal. Periksa status sebelum mencoba lagi.' }, { status: 400 })
  }
}

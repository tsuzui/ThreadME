import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { prepareDraftImage, POST_IMAGE_BUCKET } from '@/lib/automation/draft-image'
import type { Database } from '@/types/database'

export const runtime = 'nodejs'

const inputSchema = z.object({
  content: z.string().trim().min(15, 'Teks minimal 15 karakter.').max(500, 'Teks maksimal 500 karakter.'),
  alt: z.string().trim().max(500, 'Deskripsi gambar maksimal 500 karakter.'),
  version: z.string().datetime({ offset: true }),
  imageAction: z.enum(['keep', 'remove', 'replace']),
  context: z.string().trim().max(1000).optional(),
})

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Asal permintaan tidak diizinkan.' }, { status: 403 })
  }
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Silakan login kembali.' }, { status: 401 })
  const { data: admin, error: adminError } = await auth.rpc('is_threadme_admin')
  if (adminError || !admin) return NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 })
  const { id } = await context.params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'ID postingan tidak valid.' }, { status: 400 })
  }
  if (Number(request.headers.get('content-length')) > 6 * 1024 * 1024) {
    return NextResponse.json({ error: 'Permintaan terlalu besar. Gambar maksimal 5 MB.' }, { status: 413 })
  }

  const db = createServiceRoleClient()
  let newPath: string | null = null
  let saved = false
  try {
    const form = await request.formData()
    const parsed = inputSchema.safeParse({
      content: form.get('content'),
      alt: form.get('alt') || '',
      version: form.get('version'),
      imageAction: form.get('imageAction'),
      context: form.get('context') ? String(form.get('context')) : undefined,
    })
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const input = parsed.data
    const { data: post, error: readError } = await db.from('content_posts').select('*').eq('id', id).maybeSingle()
    if (readError) throw new Error('Gagal memuat draf.')
    if (!post) return NextResponse.json({ error: 'Postingan tidak ditemukan.' }, { status: 404 })
    if (post.status !== 'ready' || post.updated_at !== input.version) {
      return NextResponse.json({ error: 'Draf sudah berubah atau tidak dapat diedit. Muat ulang halaman.' }, { status: 409 })
    }
    let path = post.image_storage_path
    let url = post.image_public_url
    if (input.imageAction === 'remove') { path = null; url = null }
    if (input.imageAction === 'replace') {
      const file = form.get('image')
      if (!(file instanceof File)) return NextResponse.json({ error: 'Pilih gambar terlebih dahulu.' }, { status: 400 })
      let bytes: Buffer
      try { bytes = await prepareDraftImage(file) }
      catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }) }
      newPath = `${id}/${crypto.randomUUID()}.jpg`
      const { error: uploadError } = await db.storage.from(POST_IMAGE_BUCKET).upload(newPath, bytes, { contentType: 'image/jpeg', upsert: false })
      if (uploadError) throw new Error('Gagal mengunggah gambar. Pastikan bucket post-images sudah dibuat. Coba lagi atau simpan tanpa gambar; draf belum diubah.')
      path = newPath
      url = db.storage.from(POST_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
    }
    const metadata = post.generation_metadata && typeof post.generation_metadata === 'object' && !Array.isArray(post.generation_metadata)
      ? post.generation_metadata : {}
    const payload: Database['public']['Tables']['content_posts']['Update'] = {
      content: input.content, content_type: path ? 'image' : 'text',
      image_storage_path: path, image_public_url: url, image_alt_text: path ? input.alt || null : null,
      image_prompt: null, quality_score: null, quality_notes: { manuallyEdited: true },
      generation_metadata: { ...metadata, manuallyEdited: true },
      context: input.context !== undefined ? input.context : post.context,
      updated_at: new Date().toISOString(),
    }
    const { data: updated, error: updateError } = await db.from('content_posts').update(payload)
      .eq('id', id).eq('status', 'ready').eq('updated_at', input.version).select('id').maybeSingle()
    if (updateError) throw new Error('Gagal menyimpan perubahan draf. Silakan coba lagi.')
    if (!updated) {
      if (newPath) await db.storage.from(POST_IMAGE_BUCKET).remove([newPath])
      return NextResponse.json({ error: 'Draf berubah saat disimpan. Muat ulang sebelum mengedit lagi.' }, { status: 409 })
    }
    saved = true
    if (post.image_storage_path && post.image_storage_path !== path && post.image_storage_path.startsWith(`${id}/`)) {
      const { error: cleanupError } = await db.storage.from(POST_IMAGE_BUCKET).remove([post.image_storage_path])
      if (cleanupError) console.warn('Old draft image cleanup failed', id)
    }
    const { error: logError } = await db.from('system_logs').insert({ content_post_id: id, level: 'info',
      event: 'draft_manually_updated', message: 'Teks atau gambar draf diperbarui manual.', details: { imageAction: input.imageAction } })
    if (logError) console.warn('Draft edit audit failed', id)
    for (const page of ['/calendar', '/posts', '/dashboard', `/posts/${id}`]) revalidatePath(page)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (newPath && !saved) await db.storage.from(POST_IMAGE_BUCKET).remove([newPath])
    return NextResponse.json({ error: saved ? 'Draf tersimpan, tetapi halaman perlu dimuat ulang.' : (error as Error).message }, { status: 500 })
  }
}

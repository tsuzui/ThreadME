import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { prepareDraftImage, POST_IMAGE_BUCKET } from '@/lib/automation/draft-image'
import { publishPost } from '@/lib/automation/publish-post'

export const runtime = 'nodejs'

const createSchema = z.object({
  content: z.string().trim().min(15, 'Teks minimal 15 karakter.').max(500, 'Teks maksimal 500 karakter.'),
  pillar: z.string().trim().max(100).default('topik_aktual'),
  context: z.string().trim().max(1000).optional(),
  action: z.enum(['draft', 'schedule', 'publish_now']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD tidak valid.').optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format waktu HH:MM tidak valid.').optional(),
  alt: z.string().trim().max(500, 'Deskripsi gambar maksimal 500 karakter.').optional(),
})

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Asal permintaan tidak diizinkan.' }, { status: 403 })
  }

  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Silakan login kembali.' }, { status: 401 })

  const { data: isAdmin, error: adminError } = await auth.rpc('is_threadme_admin')
  if (adminError || !isAdmin) {
    return NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 })
  }

  const contentLength = Number(request.headers.get('content-length') || '0')
  if (contentLength > 6 * 1024 * 1024) {
    return NextResponse.json({ error: 'Permintaan terlalu besar. Gambar maksimal 5 MB.' }, { status: 413 })
  }

  const db = createServiceRoleClient()
  let uploadedImagePath: string | null = null
  let slotId: string | null = null
  let saved = false

  try {
    const contentType = request.headers.get('content-type') || ''
    let rawFields: Record<string, unknown> = {}
    let imageFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      rawFields = {
        content: formData.get('content'),
        pillar: formData.get('pillar') || undefined,
        context: formData.get('context') || undefined,
        action: formData.get('action'),
        date: formData.get('date') || undefined,
        time: formData.get('time') || undefined,
        alt: formData.get('alt') || undefined,
      }
      const file = formData.get('image')
      if (file instanceof File && file.size > 0) {
        imageFile = file
      }
    } else {
      rawFields = await request.json()
    }

    const parsed = createSchema.safeParse(rawFields)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const input = parsed.data
    if (input.action === 'publish_now' && process.env.THREADS_PUBLISH_MODE !== 'live') {
      return NextResponse.json({ error: 'Publikasi live dinonaktifkan. Simpan sebagai draf atau jadwalkan.' }, { status: 403 })
    }
    const postId = crypto.randomUUID()
    let scheduledDate: string | null = null
    let scheduledFor: string | null = null

    if (input.action === 'schedule') {
      if (!input.date || !input.time) {
        return NextResponse.json({ error: 'Tanggal dan jam tayang wajib diisi untuk postingan terjadwal.' }, { status: 400 })
      }
      scheduledDate = input.date
      const instant = new Date(`${input.date}T${input.time}:00+07:00`)
      if (!Number.isFinite(instant.getTime()) || instant.getTime() <= Date.now() || new Date(instant.getTime() + 7 * 3600000).toISOString().slice(0, 10) !== input.date) {
        return NextResponse.json({ error: 'Pilih tanggal valid dan waktu mendatang (WIB).' }, { status: 400 })
      }
      const scheduledIso = instant.toISOString()
      scheduledFor = scheduledIso
      const generateAfter = scheduledIso

      const { data: slot, error: slotError } = await db.from('schedule_slots').insert({
        local_date: input.date,
        scheduled_for: scheduledIso,
        generate_after: generateAfter,
        source: 'ad_hoc',
        lifecycle: 'scheduled',
        context: input.context || null,
      }).select('id').single()

      if (slotError || !slot) {
        return NextResponse.json({ error: 'Gagal membuat slot jadwal penayangan.' }, { status: 500 })
      }
      slotId = slot.id
    }

    let imageStoragePath: string | null = null
    let imagePublicUrl: string | null = null

    if (imageFile) {
      let imageBuffer: Buffer
      try {
        imageBuffer = await prepareDraftImage(imageFile)
      } catch (err) {
        if (slotId) await db.from('schedule_slots').delete().eq('id', slotId)
        return NextResponse.json({ error: (err as Error).message }, { status: 400 })
      }

      uploadedImagePath = `${postId}/${crypto.randomUUID()}.jpg`
      const { error: uploadError } = await db.storage
        .from(POST_IMAGE_BUCKET)
        .upload(uploadedImagePath, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (uploadError) {
        if (slotId) await db.from('schedule_slots').delete().eq('id', slotId)
        return NextResponse.json({ error: 'Gagal mengunggah gambar. Pastikan bucket post-images tersedia.' }, { status: 500 })
      }

      imageStoragePath = uploadedImagePath
      imagePublicUrl = db.storage.from(POST_IMAGE_BUCKET).getPublicUrl(uploadedImagePath).data.publicUrl
    }

    const fingerprint = `composer:${postId}:${Date.now()}`
    const nowIso = new Date().toISOString()

    const { data: post, error: insertError } = await db.from('content_posts').insert({
      id: postId,
      slot_id: slotId,
      scheduled_date: scheduledDate,
      scheduled_for: scheduledFor,
      content: input.content,
      content_type: imageStoragePath ? 'image' : 'text',
      pillar: input.pillar || 'topik_aktual',
      context: input.context || null,
      image_storage_path: imageStoragePath,
      image_public_url: imagePublicUrl,
      image_alt_text: imageStoragePath ? (input.alt || null) : null,
      status: 'ready',
      content_fingerprint: fingerprint,
      generation_metadata: {
        source: 'composer',
        manuallyCreated: true,
        action: input.action,
      },
      created_at: nowIso,
      updated_at: nowIso,
    }).select('*').single()

    if (insertError || !post) {
      if (uploadedImagePath) await db.storage.from(POST_IMAGE_BUCKET).remove([uploadedImagePath])
      if (slotId) await db.from('schedule_slots').delete().eq('id', slotId)
      return NextResponse.json({ error: 'Gagal menyimpan postingan ke database.' }, { status: 500 })
    }

    saved = true
    if (input.action === 'publish_now') {
      if (process.env.THREADS_PUBLISH_MODE === 'live') {
        try {
          const pubResult = await publishPost(post, post.updated_at)
          for (const path of ['/posts', `/posts/${post.id}`, '/calendar', '/dashboard']) {
            revalidatePath(path)
          }
          return NextResponse.json({
            success: true,
            postId: post.id,
            message: pubResult.message,
          })
        } catch (pubError) {
          return NextResponse.json({
            success: false,
            postId: post.id,
            status: 'ready',
            error: (pubError as Error).message || 'Postingan tersimpan tetapi gagal dipublikasikan ke Threads.',
          }, { status: 502 })
        }
      }
    }

    for (const path of ['/posts', `/posts/${post.id}`, '/calendar', '/dashboard']) {
      revalidatePath(path)
    }

    return NextResponse.json({
      success: true,
      postId: post.id,
      status: input.action === 'schedule' ? 'scheduled' : 'draft',
      message: input.action === 'schedule' ? 'Postingan berhasil dijadwalkan.' : 'Draf berhasil disimpan.',
    })
  } catch (error) {
    if (uploadedImagePath && !saved) {
      try { await db.storage.from(POST_IMAGE_BUCKET).remove([uploadedImagePath]) } catch { /* ignore */ }
    }
    if (slotId && !saved) {
      try { await db.from('schedule_slots').delete().eq('id', slotId) } catch { /* ignore */ }
    }
    return NextResponse.json(
      { error: (error as Error).message || 'Terjadi kesalahan internal saat membuat postingan.' },
      { status: 500 }
    )
  }
}

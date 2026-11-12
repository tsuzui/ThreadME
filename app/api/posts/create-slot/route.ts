import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const runtime = 'nodejs'

const createSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD tidak valid.'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format waktu HH:MM tidak valid.'),
  context: z.string().trim().max(1000).optional(),
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

  try {
    const json = await request.json()
    const parsed = createSlotSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { date, time, context } = parsed.data
    const scheduledFor = new Date(`${date}T${time}:00+07:00`).toISOString()
    const generateAfter = new Date(Date.parse(scheduledFor) - 20 * 60_000).toISOString()

    const db = createServiceRoleClient()

    // 1. Insert schedule_slot row
    const { data: slot, error: slotError } = await db.from('schedule_slots').insert({
      local_date: date,
      scheduled_for: scheduledFor,
      generate_after: generateAfter,
      source: 'ad_hoc',
      lifecycle: 'scheduled',
      context: context || null,
    }).select('id').single()

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Gagal membuat slot jadwal baru.' }, { status: 500 })
    }

    // 2. Insert initial draft content_post
    const initialContent = context
      ? `Draf postingan baru dengan konteks: ${context}`
      : 'Draf postingan baru terjadwal. Buka editor untuk mengubah teks atau meminta bantuan AI.'

    const fingerprint = `adhoc:${slot.id}:${Date.now()}`

    const { data: post, error: postError } = await db.from('content_posts').insert({
      slot_id: slot.id,
      scheduled_date: date,
      scheduled_for: scheduledFor,
      content: initialContent,
      content_type: 'text',
      pillar: 'topik_aktual',
      status: 'ready',
      context: context || null,
      content_fingerprint: fingerprint,
      generation_metadata: {
        source: 'ad_hoc',
        manuallyCreated: true,
      },
    }).select('id').single()

    if (postError || !post) {
      // rollback slot
      await db.from('schedule_slots').delete().eq('id', slot.id)
      return NextResponse.json({ error: 'Gagal membuat draf postingan.' }, { status: 500 })
    }

    for (const path of ['/calendar', '/posts', '/dashboard']) {
      revalidatePath(path)
    }

    return NextResponse.json({
      success: true,
      postId: post.id,
      slotId: slot.id,
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Terjadi kesalahan sistem.' },
      { status: 500 }
    )
  }
}

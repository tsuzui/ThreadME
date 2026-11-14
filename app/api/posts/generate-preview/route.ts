import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { runDailyContentEngine } from '@/lib/automation/content-engine'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Asal permintaan tidak diizinkan.' }, { status: 403 })
  try {
    const supabase = await createClient()

    // 1. Verifikasi autentikasi admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Tidak terotentikasi. Silakan masuk terlebih dahulu.' },
        { status: 401 }
      )
    }

    const { data: isAdmin, error: adminCheckError } = await supabase.rpc(
      'is_threadme_admin'
    )

    if (adminCheckError || !isAdmin) {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya administrator terdaftar yang diizinkan.' },
        { status: 403 }
      )
    }

    // 2. Baca payload opsional (topicId / context) jika ada
    let forcedTopicId: string | undefined = undefined
    let context: string | undefined = undefined
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.json()
        const parsed = z.object({
          topicId: z.string().uuid('ID topik harus UUID valid.').optional(),
          context: z.string().trim().max(1000, 'Konteks maksimal 1000 karakter.').optional(),
        }).safeParse(body)
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
        }
        forcedTopicId = parsed.data.topicId
        context = parsed.data.context
      } catch {
        return NextResponse.json({ error: 'Format JSON tidak valid.' }, { status: 400 })
      }
    }

    // 3. Jalankan Content Engine dalam mode manual preview
    const result = await runDailyContentEngine({
      manualPreview: true,
      forcedTopicId,
      context,
    })

    return NextResponse.json({
      success: true,
      message: forcedTopicId
        ? `Draf konten berhasil digenerate berdasarkan topik pilihan.`
        : 'Draf konten berhasil digenerate melalui Topic Studio Auto Mix.',
      data: result,
    })
  } catch (error: unknown) {
    const err = error as Error
    console.error('Error generating post preview:', err)
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Terjadi kesalahan sistem saat memproses draf konten.',
      },
      { status: 500 }
    )
  }
}

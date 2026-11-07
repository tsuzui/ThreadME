import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runDailyContentEngine } from '@/lib/automation/content-engine'

export const dynamic = 'force-dynamic'

export async function POST() {
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

    // 2. Jalankan Content Engine dalam mode manual preview
    const result = await runDailyContentEngine({
      manualPreview: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Draf konten berhasil digenerate melalui Topic Studio Auto Mix.',
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

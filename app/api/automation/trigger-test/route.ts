import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAutomationTick } from '@/lib/automation/tick'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Asal permintaan tidak diizinkan.' }, { status: 403 })
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terotentikasi. Silakan masuk terlebih dahulu.' }, { status: 401 })
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_threadme_admin')
    if (adminError || !isAdmin) {
      return NextResponse.json({ error: 'Akses ditolak. Hanya administrator yang diizinkan.' }, { status: 403 })
    }

    const result = await runAutomationTick()
    return NextResponse.json({
      success: true,
      message: 'Siklus otomatisasi (tick) berhasil dijalankan.',
      result,
    })
  } catch (error: unknown) {
    const err = error as Error
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Terjadi kesalahan sistem saat menjalankan siklus worker.',
      },
      { status: 500 }
    )
  }
}

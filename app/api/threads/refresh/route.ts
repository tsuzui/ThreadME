import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireThreadsAdmin } from '@/lib/threads/auth'
import { refreshThreadsAccount } from '@/lib/threads/token-manager'

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Asal permintaan tidak diizinkan.' }, { status: 403 })
  try {
    await requireThreadsAdmin()
    await refreshThreadsAccount()
    revalidatePath('/settings')
    return NextResponse.json({ success: true })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal memperbarui koneksi.' }, { status: 400 }) }
}

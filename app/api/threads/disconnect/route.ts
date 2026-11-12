import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireThreadsAdmin } from '@/lib/threads/auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Asal permintaan tidak diizinkan.' }, { status: 403 })
  try {
    await requireThreadsAdmin()
    const { error } = await createServiceRoleClient().rpc('disconnect_threads_account')
    if (error) throw new Error('Tidak dapat melepas akun. Pastikan tidak ada publikasi yang sedang diproses atau perlu diperiksa.')
    revalidatePath('/settings')
    return NextResponse.json({ success: true })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal melepas koneksi.' }, { status: 400 }) }
}

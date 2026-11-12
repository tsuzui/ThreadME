import { NextRequest, NextResponse } from 'next/server'
import { requireThreadsAdmin } from '@/lib/threads/auth'
import { OAUTH_COOKIE, startThreadsOAuth } from '@/lib/threads/oauth'

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Asal permintaan tidak diizinkan.' }, { status: 403 })
  try {
    const user = await requireThreadsAdmin()
    const result = await startThreadsOAuth(user.id)
    const response = NextResponse.json({ url: result.url }, { headers: { 'Cache-Control': 'no-store' } })
    response.cookies.set(OAUTH_COOKIE, result.state, { httpOnly: true, secure: result.secure, sameSite: 'lax', path: '/api/threads/callback', maxAge: 600 })
    return response
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Koneksi Threads gagal.' }, { status: 400 })
  }
}

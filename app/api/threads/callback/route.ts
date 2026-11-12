import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireThreadsAdmin } from '@/lib/threads/auth'
import { consumeThreadsState, OAUTH_COOKIE } from '@/lib/threads/oauth'
import { exchangeCode, getThreadsProfile, inspectThreadsToken } from '@/lib/threads/client'
import { encryptToken } from '@/lib/threads/token-encryption'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(request: NextRequest) {
  let outcome = 'failed'
  let stage = 'admin'
  try {
    const user = await requireThreadsAdmin()
    stage = 'state'
    const revision = await consumeThreadsState(request.nextUrl.searchParams.get('state') || '', request.cookies.get(OAUTH_COOKIE)?.value || '', user.id)
    if (request.nextUrl.searchParams.has('error')) throw new Error('denied')
    const code = request.nextUrl.searchParams.get('code')
    if (!code || code.length > 4096) throw new Error('code')
    stage = 'token_exchange'
    const result = await exchangeCode(code)
    stage = 'profile'
    const profile = await getThreadsProfile(result.access_token)
    stage = 'token_inspection'
    const inspected = await inspectThreadsToken(result.access_token)
    if (inspected.user_id !== profile.id) throw new Error('identity')
    stage = 'save_account'
    const { error } = await createServiceRoleClient().rpc('save_threads_account', {
      p_external_id: profile.id, p_username: profile.username,
      p_token: encryptToken(result.access_token, profile.id),
      p_expires: new Date(Date.now() + result.expires_in * 1000).toISOString(), p_scopes: inspected.scopes, p_revision: revision,
    })
    if (error) throw new Error('save')
    outcome = 'connected'
    revalidatePath('/settings')
  } catch {
    console.error('threads_oauth_failed', { stage })
    outcome = 'failed'
  }
  const destination = new URL('/settings', request.nextUrl.origin)
  destination.searchParams.set('threads', outcome)
  const response = NextResponse.redirect(destination)
  response.cookies.set(OAUTH_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/api/threads/callback', maxAge: 0 })
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}

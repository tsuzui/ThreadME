import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico' || pathname === '/api/health' || pathname === '/api/automation/tick' || pathname.startsWith('/api/auth/')) {
    return supabaseResponse
  }
  const respond = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
    return response
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = pathname === '/login'
  const isApi = pathname.startsWith('/api/')

  // If user is not logged in and not on login page, redirect to login
  if (!user && !isAuthPage) {
    if (isApi) return respond(NextResponse.json({ error: 'Silakan login kembali.' }, { status: 401 }))
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return respond(NextResponse.redirect(url))
  }

  // If user is logged in, verify if user is registered in admin_users
  if (user && !isAuthPage) {
    const { data: isAdmin } = await supabase.rpc('is_threadme_admin')
    if (!isAdmin) {
      if (isApi) return respond(NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 }))
      // User is logged in to Supabase but not authorized as ThreadMe single admin
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'unauthorized')
      return respond(NextResponse.redirect(url))
    }
  }

  // If user is already logged in and attempts to open /login, redirect to /dashboard
  if (user && isAuthPage) {
    const { data: isAdmin } = await supabase.rpc('is_threadme_admin')
    if (isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return respond(NextResponse.redirect(url))
    }
  }

  return supabaseResponse
}

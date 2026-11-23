/**
 * Supabase Middleware Session Refresher
 * Called from /middleware.ts on every request to keep the session alive.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export function getCleanSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const url = getCleanSupabaseUrl()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session (do NOT remove this await)
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protected routes — redirect unauthenticated users to /login
  const protectedPrefixes = ['/student', '/faculty', '/admin']
  const isProtected = protectedPrefixes.some(p => pathname.startsWith(p))

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirected', 'true')
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from /login to their dashboard
  if (pathname === '/login' && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'student'
    const dashboardMap: Record<string, string> = {
      student: '/student/dashboard',
      faculty: '/faculty/dashboard',
      admin: '/admin/dashboard',
    }
    return NextResponse.redirect(new URL(dashboardMap[role] ?? '/student/dashboard', request.url))
  }

  return supabaseResponse
}

/**
 * Supabase Server Client
 * Use in Server Components and Route Handlers
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function getCleanSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
}

export async function createServerSupabaseClient() {
  const cookieStore = cookies()
  const url = getCleanSupabaseUrl()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  return createServerClient(
    url,
    key,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Component — cookie setting is a no-op in read-only context
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Server Component — cookie removal is a no-op in read-only context
          }
        },
      },
    }
  )
}

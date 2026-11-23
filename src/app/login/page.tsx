'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, FlaskConical, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // If already authenticated, redirect away
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
          const role = data?.role ?? 'student'
          const map: Record<string, string> = {
            student: '/student/dashboard',
            faculty: '/faculty/dashboard',
            admin: '/admin/dashboard',
          }
          router.replace(map[role] ?? '/student/dashboard')
        })
      }
    })
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Login failed. Please try again.')
      setLoading(false)
      return
    }

    // Fetch role and redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role = profile?.role ?? 'student'
    const dashboardMap: Record<string, string> = {
      student: '/student/dashboard',
      faculty: '/faculty/dashboard',
      admin: '/admin/dashboard',
    }

    router.push(dashboardMap[role] ?? '/student/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-[#7C3AED] rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-purple-200">
            <FlaskConical className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#25213C]">LabLink</h1>
          <p className="text-sm text-[#6B7280] mt-1">Campus Lab Resource Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EDE9FE] p-8">
          <h2 className="text-xl font-semibold text-[#25213C] mb-6">Sign in to your account</h2>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#25213C] mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@university.edu"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-[#F8F7FF] text-[#25213C] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent placeholder:text-[#9CA3AF] transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#25213C] mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-[#F8F7FF] text-[#25213C] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent placeholder:text-[#9CA3AF] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-semibold rounded-lg text-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-sm text-[#6B7280] text-center mt-6">
            New student?{' '}
            <Link href="/register" className="text-[#7C3AED] font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        <p className="text-xs text-center text-[#9CA3AF] mt-6">
          Faculty and admin accounts are provisioned by department administrators.
        </p>
      </div>
    </div>
  )
}

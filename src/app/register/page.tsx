'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, FlaskConical, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Department {
  id: string
  name: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load departments for the dropdown
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('departments')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setDepartments(data as Department[])
      })
  }, [])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          department_id: departmentId || null,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-[#EDE9FE] p-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-[#25213C] mb-2">Account created!</h2>
            <p className="text-sm text-[#6B7280] mb-6">
              Check your email for a confirmation link. Once confirmed, you can sign in.
            </p>
            <Link
              href="/login"
              className="inline-block w-full py-2.5 bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-semibold rounded-lg text-sm transition text-center"
            >
              Go to Sign In
            </Link>
            <p className="text-xs text-[#9CA3AF] mt-4">
              If you disabled email confirmation in Supabase (dev mode), you can sign in directly.
            </p>
          </div>
        </div>
      </div>
    )
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
          <p className="text-sm text-[#6B7280] mt-1">Student Registration</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EDE9FE] p-8">
          <h2 className="text-xl font-semibold text-[#25213C] mb-1">Create student account</h2>
          <p className="text-sm text-[#6B7280] mb-6">
            Your account will be created with the <span className="font-medium text-[#7C3AED]">student</span> role.
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-[#25213C] mb-1.5">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-[#F8F7FF] text-[#25213C] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent placeholder:text-[#9CA3AF] transition"
              />
            </div>

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
              <label htmlFor="department" className="block text-sm font-medium text-[#25213C] mb-1.5">
                Department
              </label>
              <select
                id="department"
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-[#F8F7FF] text-[#25213C] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition"
              >
                <option value="">Select your department (optional)</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
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
                autoComplete="new-password"
                placeholder="Min. 6 characters"
                minLength={6}
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
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="text-sm text-[#6B7280] text-center mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#7C3AED] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}


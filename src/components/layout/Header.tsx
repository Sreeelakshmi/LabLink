'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Microscope, Bell, Sparkles, Menu, X, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  onMobileMenuToggle?: () => void
  isMobileMenuOpen?: boolean
}

interface UserInfo {
  name: string
  role: string
  initials: string
}

export function Header({ onMobileMenuToggle, isMobileMenuOpen }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  // Derive role from pathname for immediate render (no flash)
  const isFaculty = pathname?.startsWith('/faculty')
  const isAdmin = pathname?.startsWith('/admin')

  const fallbackUser: UserInfo = isFaculty
    ? { name: 'Faculty', role: 'Faculty Reviewer', initials: 'F' }
    : isAdmin
    ? { name: 'Admin', role: 'Lab Admin', initials: 'A' }
    : { name: 'Student', role: 'Student', initials: 'S' }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name, role').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          const name = data.full_name ?? 'User'
          const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
          const roleLabel = data.role === 'faculty' ? 'Faculty Reviewer' : data.role === 'admin' ? 'Lab Admin' : 'Student'
          setUserInfo({ name, role: roleLabel, initials })
        }
      })
    })
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayUser = userInfo ?? fallbackUser

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E9E5F4] h-16 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 text-[#625D75] hover:text-[#25213C] rounded-lg hover:bg-[#EDE9FE] focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#7C3AED] flex items-center justify-center text-white shadow-xs">
            <Microscope className="w-5 h-5" />
          </div>
          <div className="hidden xs:block">
            <span className="text-lg font-bold text-[#25213C] tracking-tight">
              Lab<span className="text-[#7C3AED]">Link</span>
            </span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EDE9FE] text-[#5B21B6] text-xs font-semibold border border-[#C4B5FD]/70">
          <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
          <span>GenAI Allocation Active</span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            className="p-2 rounded-xl text-[#625D75] hover:text-[#25213C] hover:bg-[#EDE9FE] transition-colors relative"
            title="Lab notifications"
            aria-label="Lab notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Capsule */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#E9E5F4]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {displayUser.initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-[#25213C] leading-tight">{displayUser.name}</p>
            <p className="text-[10px] text-[#625D75] leading-tight">{displayUser.role}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign out"
          className="p-2 rounded-xl text-[#625D75] hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}

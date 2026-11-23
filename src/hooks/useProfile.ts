'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  full_name: string
  department_id: string | null
  role: 'student' | 'faculty' | 'admin'
  created_at: string
}

export interface UseProfileReturn {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
}

export function useProfile(): UseProfileReturn {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function fetchProfile() {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!authUser) {
          setLoading(false)
          return
        }
        setUser(authUser)

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profileError) throw profileError
        setProfile(profileData as UserProfile)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null)
        setProfile(null)
      } else {
        fetchProfile()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, profile, loading, error }
}


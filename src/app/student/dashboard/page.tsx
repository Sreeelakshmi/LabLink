'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { StatCard } from '@/components/dashboard/StatCard'
import { ResourceCard } from '@/components/resources/ResourceCard'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ResourceModal } from '@/components/resources/ResourceModal'
import { StatusBadge } from '@/components/common/Badge'
import { Resource, Project } from '@/types'
import { createClient } from '@/lib/supabase/client'
import type { DbResourceWithRelations, DbProjectWithRelations, DbBookingWithRelations } from '@/types/database'
import { mapDbResourceToResource, mapDbProjectToProject } from '@/lib/mappers'
import {
  Sparkles, Layers, FolderGit2, CalendarCheck, Clock,
  ArrowRight, Loader2, AlertCircle,
} from 'lucide-react'

interface SupabaseBooking {
  id: string; status: string; preferred_start: string; preferred_end: string; created_at: string
  resources: { name: string } | null
  projects: { title: string } | null
}

export default function StudentDashboardPage() {
  const router = useRouter()
  const [projectPrompt, setProjectPrompt] = useState('')
  const [activeModalResource, setActiveModalResource] = useState<Resource | null>(null)

  const [resources, setResources] = useState<Resource[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [bookings, setBookings] = useState<SupabaseBooking[]>([])
  const [profileName, setProfileName] = useState<string>('there')
  const [loading, setLoading] = useState(true)

  const samplePrompts = [
    "I'm building a smart irrigation system using IoT sensors.",
    'Training a computer vision model on edge nodes for traffic tracking.',
    'Prototyping a 4-channel sEMG biosensing controller for prosthetics.',
  ]

  const handleLaunchAiAssistant = (promptText?: string) => {
    const textToPass = promptText || projectPrompt
    if (textToPass.trim()) {
      router.push(`/student/ai-assistant?prompt=${encodeURIComponent(textToPass)}`)
    } else {
      router.push('/student/ai-assistant')
    }
  }

  useEffect(() => {
    async function fetchDashboardData() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      // Fetch profile name
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        if (profile?.full_name) {
          setProfileName(profile.full_name.split(' ')[0])
        }
      }

      // Parallel fetches
      const [resourcesRes, projectsRes, bookingsRes] = await Promise.all([
        supabase.from('resources').select(`
          id, name, description, category, specifications,
          quantity_total, quantity_available, maintenance_status, prerequisites,
          department_id, laboratory_id,
          departments(name), laboratories(name, location)
        `).order('name').limit(10),

        user ? supabase.from('projects').select(`
          id, title, description, deadline, department_id, team_size, status, created_at,
          departments(name)
        `).eq('student_id', user.id).eq('status', 'active').order('deadline').limit(4) : { data: [], error: null },

        user ? supabase.from('booking_requests').select(`
          id, status, preferred_start, preferred_end, created_at,
          resources(name), projects(title)
        `).eq('student_id', user.id).order('created_at', { ascending: false }).limit(5) : { data: [], error: null },
      ])

      setResources(((resourcesRes.data ?? []) as unknown as DbResourceWithRelations[]).map(mapDbResourceToResource))
      setProjects(((projectsRes.data ?? []) as unknown as DbProjectWithRelations[]).map(mapDbProjectToProject))
      setBookings((bookingsRes.data ?? []) as unknown as SupabaseBooking[])
      setLoading(false)
    }

    fetchDashboardData()
  }, [])

  const availableCount = resources.filter(r => r.availableQuantity > 0).length
  const approvedBookings = bookings.filter(b => b.status === 'approved').length
  const pendingBookings = bookings.filter(b => b.status === 'pending').length

  if (loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
          <p className="text-sm text-[#625D75]">Loading your dashboard…</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#25213C] tracking-tight">
              Good morning, {profileName} 👋
            </h1>
            <p className="text-sm text-[#625D75] mt-1">Your next big idea starts with the right resources.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/student/resources" className="px-4 py-2 text-xs font-semibold text-[#5B21B6] bg-white border border-[#E9E5F4] rounded-xl hover:bg-[#EDE9FE] transition-colors">
              Browse Equipment
            </Link>
            <Link href="/student/bookings" className="px-4 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#5B21B6] rounded-xl shadow-xs transition-colors flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4" />
              <span>Book Slot</span>
            </Link>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Available Resources" value={availableCount} subtitle="Ready across departments" icon={Layers} badge={{ text: 'Active', trend: 'up' }} />
          <StatCard title="Active Projects" value={projects.length} subtitle="Your research projects" icon={FolderGit2} />
          <StatCard title="Approved Bookings" value={approvedBookings} subtitle="Confirmed lab sessions" icon={CalendarCheck} badge={{ text: 'Approved', trend: 'up' }} />
          <StatCard title="Pending Requests" value={pendingBookings} subtitle="Awaiting faculty review" icon={Clock} badge={{ text: 'In Review', trend: 'neutral' }} />
        </div>

        {/* AI Assistant Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] p-6 sm:p-8 text-white shadow-card">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-[#C4B5FD]" />
              <span>GenAI Campus Allocation Intelligence</span>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">What are you building today?</h2>
              <p className="mt-1 text-sm text-[#EDE9FE] leading-relaxed">Describe your project and let LabLink recommend the equipment you need.</p>
            </div>
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20">
                <input
                  type="text" value={projectPrompt} onChange={e => setProjectPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLaunchAiAssistant()}
                  placeholder="e.g. Building an automated hydroponics monitor with ESP32…"
                  className="flex-1 px-4 py-3 bg-transparent text-sm text-white placeholder:text-[#EDE9FE]/60 focus:outline-none"
                />
                <button onClick={() => handleLaunchAiAssistant()} className="px-6 py-3 bg-white text-[#5B21B6] hover:bg-[#EDE9FE] font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0">
                  <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                  <span>Find Resources with AI</span>
                </button>
              </div>
            </div>
            <div className="pt-1">
              <p className="text-[11px] font-semibold text-[#EDE9FE]/80 uppercase tracking-wider mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {samplePrompts.map((prompt, i) => (
                  <button key={i} onClick={() => handleLaunchAiAssistant(prompt)}
                    className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-[#EDE9FE] border border-white/10 transition-all text-left truncate max-w-xs sm:max-w-md">
                    &ldquo;{prompt}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Featured Resources */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#25213C]">High-Demand Laboratory Hardware</h3>
              <p className="text-xs text-[#625D75]">Cross-department equipment frequently paired with active student projects</p>
            </div>
            <Link href="/student/resources" className="text-xs font-semibold text-[#7C3AED] hover:text-[#5B21B6] flex items-center gap-1">
              <span>Explore All {resources.length} Units</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {resources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {resources.slice(0, 3).map(res => (
                <ResourceCard key={res.id} resource={res} onViewDetails={r => setActiveModalResource(r)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-[#625D75]">
              <AlertCircle className="w-6 h-6 text-[#C4B5FD] mx-auto mb-2" />
              No resources available. Run the seed migration in your Supabase SQL Editor.
            </div>
          )}
        </div>

        {/* Projects + Bookings Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#25213C]">Your Active Research Projects</h3>
                <p className="text-xs text-[#625D75]">Prioritized based on semester deadlines</p>
              </div>
              <Link href="/student/projects" className="text-xs font-semibold text-[#7C3AED] hover:text-[#5B21B6] flex items-center gap-1">
                <span>Manage Projects</span><ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.slice(0, 2).map(proj => (
                  <ProjectCard key={proj.id} project={proj} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E9E5F4] p-6 text-center">
                <p className="text-xs text-[#625D75]">No active projects yet.</p>
                <Link href="/student/projects" className="text-xs text-[#7C3AED] font-semibold hover:underline mt-1 inline-block">Create your first project →</Link>
              </div>
            )}
          </div>

          {/* Bookings Feed (1 col) */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#25213C]">Booking Activity</h3>
              <p className="text-xs text-[#625D75]">Status updates from faculty reviewers</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E9E5F4] p-4 shadow-xs space-y-3">
              {bookings.length > 0 ? bookings.slice(0, 3).map(booking => (
                <div key={booking.id} className="p-3 rounded-xl bg-[#F8F7FF] border border-[#E9E5F4] space-y-2 hover:border-[#C4B5FD] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-[#25213C] line-clamp-1">
                      {booking.resources?.name ?? 'Resource'}
                    </h4>
                    <StatusBadge status={booking.status as 'pending' | 'approved' | 'rejected' | 'pending_approval' | 'conflict_detected'} />
                  </div>
                  <div className="text-[11px] text-[#625D75]">
                    <p className="font-semibold text-[#7C3AED]">{booking.projects?.title ?? 'No project linked'}</p>
                    <p>{new Date(booking.preferred_start).toLocaleDateString()} • {new Date(booking.preferred_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-center text-[#625D75] py-4">No booking requests yet.</p>
              )}
              <Link href="/student/bookings" className="block text-center text-xs font-semibold text-[#5B21B6] hover:text-[#7C3AED] pt-2">
                View All Booking History →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ResourceModal resource={activeModalResource} isOpen={!!activeModalResource} onClose={() => setActiveModalResource(null)} />
    </AppShell>
  )
}

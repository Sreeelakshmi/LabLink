'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { StatCard } from '@/components/dashboard/StatCard'
import { StatusBadge } from '@/components/common/Badge'
import { createClient } from '@/lib/supabase/client'
import { reviewBookingRequest } from '@/app/actions/faculty'
import {
  ShieldCheck, Scale, Calendar, AlertTriangle, Clock, ArrowRight,
  CheckCircle2, XCircle, Loader2, AlertCircle,
} from 'lucide-react'

interface SupabaseBooking {
  id: string; status: string; preferred_start: string; preferred_end: string
  quantity_requested: number; created_at: string; review_notes: string | null
  resources: { name: string; laboratories: { location: string | null } | null } | null
  projects: { title: string; deadline: string } | null
  profiles: { full_name: string } | null
}

export default function FacultyDashboardPage() {
  const [bookings, setBookings] = useState<SupabaseBooking[]>([])
  const [profileName, setProfileName] = useState<string>('Faculty')
  const [loading, setLoading] = useState(true)
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)

  async function fetchData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    if (profile?.full_name) setProfileName(profile.full_name)

    // Faculty sees all pending/conflict requests
    const { data: bookingsData } = await supabase
      .from('booking_requests')
      .select(`
        id, status, preferred_start, preferred_end, quantity_requested, created_at, review_notes,
        resources(name, laboratories(location)),
        projects(title, deadline),
        profiles!booking_requests_student_id_fkey(full_name)
      `)
      .in('status', ['pending', 'conflict'])
      .order('created_at', { ascending: true })
      .limit(50)

    setBookings((bookingsData ?? []) as unknown as SupabaseBooking[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleDecision(bookingId: string, decision: 'approved' | 'rejected') {
    setReviewing(true)
    setErrorNotice(null)
    const result = await reviewBookingRequest(bookingId, decision, reviewNotes)
    if (!result.success) {
      setErrorNotice(result.error ?? 'Review failed.')
    } else {
      setSuccessNotice(`Booking ${decision} successfully.`)
      setTimeout(() => setSuccessNotice(null), 3000)
      setActiveReviewId(null)
      setReviewNotes('')
      await fetchData()
    }
    setReviewing(false)
  }

  const pendingCount = bookings.filter(b => b.status === 'pending').length
  const conflictCount = bookings.filter(b => b.status === 'conflict').length

  const activeBooking = bookings.find(b => b.id === activeReviewId)

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD] mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Faculty Oversight &amp; Safety Clearance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#25213C] tracking-tight">Welcome, {profileName}</h1>
            <p className="text-xs sm:text-sm text-[#625D75] mt-1">Review and manage student equipment booking requests.</p>
          </div>
          <Link href="/faculty/allocations" className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#5B21B6] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto">
            <Scale className="w-4 h-4" />
            <span>AI Conflict Allocations ({conflictCount})</span>
          </Link>
        </div>

        {/* Success/Error Banners */}
        {successNotice && (
          <div className="p-4 rounded-2xl bg-[#DCFCE7] border border-[#86EFAC] text-xs font-semibold text-[#15803D] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /><span>{successNotice}</span>
          </div>
        )}
        {errorNotice && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /><span>{errorNotice}</span>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Pending Requests" value={pendingCount} subtitle="Awaiting review" icon={Clock} badge={{ text: 'Needs Action', trend: 'neutral' }} />
          <StatCard title="Scheduling Conflicts" value={conflictCount} subtitle="AI resolutions prepared" icon={Scale} badge={{ text: 'Urgent', trend: 'down' }} accentColor="#DC2626" />
          <StatCard title="Active Reservations" value="—" subtitle="Approved bookings today" icon={Calendar} />
          <StatCard title="Total in Queue" value={bookings.length} subtitle="All open requests" icon={ShieldCheck} badge={{ text: 'Open', trend: 'neutral' }} />
        </div>

        {/* Conflict Alert */}
        {conflictCount > 0 && (
          <div className="p-6 rounded-3xl bg-[#FEF3C7] border border-[#FDE68A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-[#B45309] text-white shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#B45309]">{conflictCount} Scheduling Conflict{conflictCount > 1 ? 's' : ''} Need Resolution</h3>
                <p className="text-xs text-[#B45309]/90 mt-1">AI fairness engine has prepared suggested slot adjustments.</p>
              </div>
            </div>
            <Link href="/faculty/allocations" className="px-5 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5">
              <span>Review AI Recommendations</span><ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Pending Requests Table */}
        <div className="bg-white rounded-3xl border border-[#E9E5F4] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#25213C]">Pending Student Access Requests</h3>
              <p className="text-xs text-[#625D75]">Review project scope, verify safety status, and approve equipment slots.</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EDE9FE] text-[#5B21B6]">{bookings.length} in queue</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#25213C]">All clear! No pending requests.</p>
              <p className="text-xs text-[#625D75] mt-1">New booking requests will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F7FF] text-[#625D75] uppercase tracking-wider font-semibold border-b border-[#E9E5F4]">
                  <tr>
                    <th className="py-3 px-4">Equipment</th>
                    <th className="py-3 px-4">Student &amp; Project</th>
                    <th className="py-3 px-4">Requested Slot</th>
                    <th className="py-3 px-4">Deadline</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9E5F4]">
                  {bookings.map(req => (
                    <tr key={req.id} className="hover:bg-[#F8F7FF]/50 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-bold text-[#25213C]">{req.resources?.name ?? 'Resource'}</p>
                        <p className="text-[11px] text-[#625D75]">{(req.resources?.laboratories as { location?: string | null } | null)?.location ?? '—'}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-[#25213C]">{req.profiles?.full_name ?? 'Student'}</p>
                        <p className="text-[11px] text-[#7C3AED] truncate max-w-xs">{req.projects?.title ?? 'Ad hoc'}</p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="font-medium text-[#25213C]">{new Date(req.preferred_start).toLocaleDateString()}</p>
                        <p className="text-[11px] text-[#625D75]">{new Date(req.preferred_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(req.preferred_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-[#B45309]">{req.projects?.deadline ?? '—'}</span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusBadge status={req.status as 'pending' | 'approved' | 'rejected'} />
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        {activeReviewId === req.id ? (
                          <div className="space-y-2 text-left min-w-[200px]">
                            <textarea
                              value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                              placeholder="Optional review notes…"
                              rows={2}
                              className="w-full px-2 py-1.5 rounded-lg border border-[#EDE9FE] bg-[#F8F7FF] text-xs focus:outline-none focus:ring-1 focus:ring-[#7C3AED] resize-none"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => handleDecision(req.id, 'approved')} disabled={reviewing}
                                className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 disabled:opacity-60">
                                {reviewing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                Approve
                              </button>
                              <button onClick={() => handleDecision(req.id, 'rejected')} disabled={reviewing}
                                className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 disabled:opacity-60">
                                {reviewing ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                Reject
                              </button>
                            </div>
                            <button onClick={() => { setActiveReviewId(null); setReviewNotes('') }} className="w-full text-xs text-[#625D75] hover:text-[#25213C]">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setActiveReviewId(req.id); setReviewNotes('') }}
                            className="px-3 py-1.5 bg-[#7C3AED] hover:bg-[#5B21B6] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors">
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

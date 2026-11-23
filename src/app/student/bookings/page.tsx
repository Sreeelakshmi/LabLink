'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { StatusBadge } from '@/components/common/Badge'
import { createClient } from '@/lib/supabase/client'
import { submitBookingRequest } from '@/app/actions/bookings'
import {
  CalendarCheck, Clock, MapPin, AlertTriangle, ShieldCheck,
  Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react'

interface SupabaseResource {
  id: string; name: string; category: string; quantity_available: number
  maintenance_status: string
  laboratories: { name: string; location: string | null } | null
}

interface SupabaseProject {
  id: string; title: string; deadline: string
}

interface SupabaseBooking {
  id: string; status: string; preferred_start: string; preferred_end: string
  quantity_requested: number; created_at: string
  resources: { name: string; laboratories: { location: string | null } | null } | null
  projects: { title: string } | null
}

function BookingsContent() {
  const searchParams = useSearchParams()
  const initialResourceId = searchParams.get('resourceId') || ''

  const [resources, setResources] = useState<SupabaseResource[]>([])
  const [projects, setProjects] = useState<SupabaseProject[]>([])
  const [bookingList, setBookingList] = useState<SupabaseBooking[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Form state
  const [selectedResourceId, setSelectedResourceId] = useState(initialResourceId)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('11:00')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function fetchData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const [resRes, projRes, bookingsRes] = await Promise.all([
      supabase.from('resources').select('id, name, category, quantity_available, maintenance_status, laboratories(name, location)')
        .eq('maintenance_status', 'operational').order('name'),
      user ? supabase.from('projects').select('id, title, deadline').eq('student_id', user.id).eq('status', 'active').order('deadline') : { data: [], error: null },
      user ? supabase.from('booking_requests').select(`
          id, status, preferred_start, preferred_end, quantity_requested, created_at,
          resources(name, laboratories(location)),
          projects(title)
        `).eq('student_id', user.id).order('created_at', { ascending: false }).limit(20) : { data: [], error: null },
    ])

    setResources((resRes.data ?? []) as unknown as SupabaseResource[])
    setProjects((projRes.data ?? []) as unknown as SupabaseProject[])
    setBookingList((bookingsRes.data ?? []) as unknown as SupabaseBooking[])
    setLoadingData(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    if (!selectedResourceId) { setSubmitError('Please select a resource.'); return }
    if (!startDate || !endDate) { setSubmitError('Please set start and end dates.'); return }

    const preferredStart = `${startDate}T${startTime}:00`
    const preferredEnd = `${endDate}T${endTime}:00`

    setSubmitting(true)
    const result = await submitBookingRequest({
      resource_id: selectedResourceId,
      project_id: selectedProjectId || undefined,
      quantity_requested: quantity,
      preferred_start: preferredStart,
      preferred_end: preferredEnd,
    })

    if (!result.success) {
      setSubmitError(result.error ?? 'Failed to submit booking.')
    } else {
      setSubmitSuccess('Booking request submitted! Faculty will review shortly.')
      // Refresh booking list
      await fetchData()
      // Reset form
      setSelectedResourceId('')
      setSelectedProjectId('')
      setQuantity(1)
      setStartDate('')
      setEndDate('')
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD] mb-2">
          <CalendarCheck className="w-3.5 h-3.5 text-[#7C3AED]" />
          <span>Intelligent Reservation System</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#25213C] tracking-tight">Laboratory Slot Bookings</h1>
        <p className="text-xs sm:text-sm text-[#625D75] mt-1 max-w-2xl">
          Book workstation time, development kits, and instruments. Real-time conflict checks ensure fair access.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Booking Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-[#E9E5F4] p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-[#25213C]">New Booking Request</h2>

            {submitSuccess && (
              <div role="status" aria-live="polite" className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{submitSuccess}</span>
              </div>
            )}
            {submitError && (
              <div role="alert" aria-live="assertive" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{submitError}</span>
              </div>
            )}

            {loadingData ? (
              <div className="flex items-center justify-center py-10" role="status" aria-live="polite">
                <Loader2 className="w-6 h-6 text-[#7C3AED] animate-spin" aria-hidden="true" />
                <span className="sr-only">Loading bookings and equipment data...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Resource Select */}
                <div>
                  <label htmlFor="booking-resource-select" className="block text-sm font-medium text-[#25213C] mb-1.5">
                    Equipment / Resource *
                  </label>
                  <select
                    id="booking-resource-select"
                    value={selectedResourceId}
                    onChange={e => setSelectedResourceId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-[#F8F7FF] text-sm text-[#25213C] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  >
                    <option value="">Select a resource…</option>
                    {resources.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.quantity_available} available)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Project Select */}
                <div>
                  <label htmlFor="booking-project-select" className="block text-sm font-medium text-[#25213C] mb-1.5">
                    Link to Project (optional)
                  </label>
                  <select
                    id="booking-project-select"
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-[#F8F7FF] text-sm text-[#25213C] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  >
                    <option value="">No project (ad hoc booking)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.title} — deadline: {p.deadline}</option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label htmlFor="booking-quantity-input" className="block text-sm font-medium text-[#25213C] mb-1.5">
                    Quantity Needed
                  </label>
                  <input
                    id="booking-quantity-input"
                    type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-[#F8F7FF] text-sm text-[#25213C] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>

                {/* Start Date/Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="booking-start-date" className="block text-sm font-medium text-[#25213C] mb-1.5">
                      Start Date *
                    </label>
                    <input
                      id="booking-start-date"
                      type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-[#F8F7FF] text-sm text-[#25213C] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    />
                  </div>
                  <div>
                    <label htmlFor="booking-start-time" className="block text-sm font-medium text-[#25213C] mb-1.5">
                      Start Time
                    </label>
                    <input
                      id="booking-start-time"
                      type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-[#F8F7FF] text-sm text-[#25213C] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    />
                  </div>
                </div>

                {/* End Date/Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="booking-end-date" className="block text-sm font-medium text-[#25213C] mb-1.5">
                      End Date *
                    </label>
                    <input
                      id="booking-end-date"
                      type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-[#F8F7FF] text-sm text-[#25213C] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    />
                  </div>
                  <div>
                    <label htmlFor="booking-end-time" className="block text-sm font-medium text-[#25213C] mb-1.5">
                      End Time
                    </label>
                    <input
                      id="booking-end-time"
                      type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-[#F8F7FF] text-sm text-[#25213C] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-semibold rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : 'Submit Booking Request'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Booking Activity Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-[#25213C]">Your Booking Activity</h3>
            <p className="text-xs text-[#625D75]">Live status updates from faculty reviewers</p>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-[#7C3AED] animate-spin" />
            </div>
          ) : bookingList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E9E5F4] p-8 text-center">
              <CalendarCheck className="w-8 h-8 text-[#C4B5FD] mx-auto mb-2" />
              <p className="text-xs text-[#625D75]">No booking requests yet. Submit your first one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookingList.map(item => (
                <div key={item.id} className="bg-white rounded-2xl border border-[#E9E5F4] p-4 shadow-xs space-y-3 hover:border-[#C4B5FD] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#25213C] line-clamp-1">{item.resources?.name ?? 'Resource'}</h4>
                      <p className="text-xs font-semibold text-[#7C3AED]">{item.projects?.title ?? 'No project linked'}</p>
                    </div>
                    <StatusBadge status={item.status as 'pending' | 'approved' | 'rejected' | 'pending_approval' | 'conflict_detected'} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#625D75] pt-2 border-t border-[#E9E5F4]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span>{new Date(item.preferred_start).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span className="truncate">{(item.resources?.laboratories as { location?: string | null } | null)?.location ?? 'Lab'}</span>
                    </div>
                  </div>
                  {item.status === 'conflict' && (
                    <div className="p-2.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[11px] text-[#B45309] flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Scheduling conflict detected. Under AI-assisted faculty review.</span>
                    </div>
                  )}
                  {item.status === 'approved' && (
                    <div className="text-[11px] text-[#15803D] bg-[#DCFCE7]/60 p-2 rounded-lg flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Approved by faculty</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StudentBookingsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-xs text-[#625D75]">Loading Booking Form…</div>}>
        <BookingsContent />
      </Suspense>
    </AppShell>
  )
}

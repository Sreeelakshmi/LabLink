'use client'

import React, { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { StatCard } from '@/components/dashboard/StatCard'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, Layers, CalendarCheck, Clock, TrendingUp, AlertCircle, Cpu, Info, Loader2 } from 'lucide-react'

interface ResourceRow {
  id: string; name: string; quantity_total: number; quantity_available: number
  departments: { name: string } | null
}

export default function AdminDashboardPage() {
  const [resources, setResources] = useState<ResourceRow[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const [resourcesRes, bookingsRes] = await Promise.all([
        supabase.from('resources').select('id, name, quantity_total, quantity_available, departments(name)').order('name'),
        supabase.from('booking_requests').select('id', { count: 'exact' }).in('status', ['pending', 'conflict']),
      ])

      setResources((resourcesRes.data ?? []) as unknown as ResourceRow[])
      setPendingCount(bookingsRes.count ?? 0)
      setLoading(false)
    }
    fetchData()
  }, [])

  const totalResources = resources.reduce((acc, r) => acc + r.quantity_total, 0)
  const availableResources = resources.reduce((acc, r) => acc + r.quantity_available, 0)

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD] mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Campus Laboratory Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#25213C] tracking-tight">Institutional Laboratory Analytics</h1>
            <p className="text-xs sm:text-sm text-[#625D75] mt-1 max-w-2xl">
              Cross-department resource utilization, bottleneck monitoring, and equipment allocation efficiency.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E9E5F4] text-xs text-[#625D75] shadow-xs">
            <Info className="w-4 h-4 text-[#7C3AED]" />
            <span>Live Supabase Data</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
          </div>
        )}

        {!loading && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Equipment" value={totalResources} subtitle="Units across all departments" icon={Layers} />
              <StatCard title="Available Units" value={availableResources} subtitle="Ready for student bookings" icon={Cpu} badge={{ text: 'Available', trend: 'up' }} />
              <StatCard title="Total Resources" value={resources.length} subtitle="Unique equipment types" icon={CalendarCheck} badge={{ text: 'Catalogued', trend: 'up' }} />
              <StatCard title="Pending Clearances" value={pendingCount} subtitle="Across all queues" icon={Clock} />
            </div>

            {/* Resource Availability Table */}
            <div className="bg-white rounded-3xl border border-[#E9E5F4] p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#25213C]">Equipment Availability by Resource</h3>
                  <p className="text-xs text-[#625D75]">Real-time availability from the Supabase resources table</p>
                </div>
                <span className="text-xs font-semibold text-[#15803D] bg-[#DCFCE7] px-3 py-1 rounded-full">
                  {resources.length} resources total
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resources.map(r => {
                  const utilRate = r.quantity_total > 0
                    ? Math.round(((r.quantity_total - r.quantity_available) / r.quantity_total) * 100)
                    : 0
                  return (
                    <div key={r.id} className="p-5 rounded-2xl bg-[#F8F7FF] border border-[#E9E5F4] space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-bold text-[#25213C]">{r.name}</h4>
                          <p className="text-xs text-[#7C3AED]">{r.departments?.name ?? 'Unknown Dept'}</p>
                        </div>
                        <span className="text-sm font-extrabold text-[#7C3AED]">{utilRate}% in use</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#E9E5F4] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] rounded-full transition-all duration-500"
                          style={{ width: `${utilRate}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-[#625D75]">
                        <span>{r.quantity_available} available</span>
                        <span>{r.quantity_total} total</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top Demand vs Idle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Requested */}
              <div className="bg-white rounded-3xl border border-[#E9E5F4] p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#15803D]" />
                  <h3 className="text-base font-bold text-[#25213C]">Highest Demand Equipment</h3>
                </div>
                <div className="space-y-3">
                  {resources.slice(0, 5).map((r, i) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-[#F8F7FF] border border-[#E9E5F4]">
                      <div>
                        <p className="text-xs font-bold text-[#25213C]">{r.name}</p>
                        <p className="text-[11px] text-[#625D75]">{r.departments?.name ?? '—'}</p>
                      </div>
                      <span className="text-xs font-bold text-[#7C3AED] bg-[#EDE9FE] px-2 py-0.5 rounded">Rank #{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Idle Capacity */}
              <div className="bg-white rounded-3xl border border-[#E9E5F4] p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#B45309]" />
                  <h3 className="text-base font-bold text-[#25213C]">Underutilized Hardware (AI Sharing Targets)</h3>
                </div>
                <div className="space-y-3">
                  {resources.filter(r => r.quantity_available === r.quantity_total).slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-[#F8F7FF] border border-[#E9E5F4]">
                      <div>
                        <p className="text-xs font-bold text-[#25213C]">{r.name}</p>
                        <p className="text-[11px] text-[#625D75]">{r.quantity_available} of {r.quantity_total} idle</p>
                      </div>
                      <span className="text-xs font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded">Idle Capacity</span>
                    </div>
                  ))}
                  {resources.filter(r => r.quantity_available === r.quantity_total).length === 0 && (
                    <p className="text-xs text-[#625D75] text-center py-4">All resources are actively in use.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

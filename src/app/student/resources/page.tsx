'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { ResourceCard } from '@/components/resources/ResourceCard'
import { ResourceModal } from '@/components/resources/ResourceModal'
import { ResourceFilters } from '@/components/resources/ResourceFilters'
import { Resource } from '@/types'
import { createClient } from '@/lib/supabase/client'
import type { DbResourceWithRelations } from '@/types/database'
import { mapDbResourceToResource } from '@/lib/mappers'
import { Layers, AlertCircle, Loader2 } from 'lucide-react'

export default function ResourceDiscoveryPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [activeModalResource, setActiveModalResource] = useState<Resource | null>(null)

  // ── Fetch resources from Supabase ───────────────────────────────────────
  useEffect(() => {
    async function fetchResources() {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      const { data, error: fetchError } = await supabase
        .from('resources')
        .select(`
          id, name, description, category, specifications,
          quantity_total, quantity_available, maintenance_status, prerequisites,
          department_id, laboratory_id,
          departments ( id, name ),
          laboratories ( id, name, location )
        `)
        .order('name')

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const mapped = ((data ?? []) as unknown as DbResourceWithRelations[]).map(mapDbResourceToResource)
      setResources(mapped)
      setLoading(false)
    }

    fetchResources()
  }, [])

  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = res.name.toLowerCase().includes(q)
        const matchesDept = res.departmentName.toLowerCase().includes(q)
        const matchesLocation = res.labLocation.toLowerCase().includes(q)
        const matchesCategory = res.category.toLowerCase().includes(q)
        if (!matchesName && !matchesDept && !matchesLocation && !matchesCategory) return false
      }
      if (selectedDepartment !== 'all' && res.departmentId !== selectedDepartment) return false
      if (selectedCategory !== 'all' && res.category !== selectedCategory) return false
      if (onlyAvailable && res.availableQuantity <= 0) return false
      return true
    })
  }, [searchQuery, selectedDepartment, selectedCategory, onlyAvailable, resources])

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedDepartment('all')
    setSelectedCategory('all')
    setOnlyAvailable(false)
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD] mb-2">
            <Layers className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>Cross-Department Equipment Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#25213C] tracking-tight">
            Equipment &amp; Laboratory Workstations
          </h1>
          <p className="text-xs sm:text-sm text-[#625D75] mt-1 max-w-3xl">
            Explore advanced computing clusters, embedded dev kits, and fabrication equipment across departments.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <ResourceFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedDepartment={selectedDepartment}
          onDepartmentChange={setSelectedDepartment}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onlyAvailable={onlyAvailable}
          onOnlyAvailableChange={setOnlyAvailable}
          onReset={handleResetFilters}
        />

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
            <p className="text-sm text-[#625D75]">Loading laboratory resources…</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-lg mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-red-700">Failed to load resources</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
            <p className="text-xs text-[#625D75] mt-2">
              Make sure your Supabase environment variables are configured in <code>.env.local</code>.
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && (
          <>
            <div className="flex items-center justify-between text-xs text-[#625D75] px-1">
              <span>
                Showing <strong className="text-[#25213C]">{filteredResources.length}</strong> of {resources.length} laboratory resources
              </span>
              {onlyAvailable && (
                <span className="font-semibold text-[#15803D]">• Filtered for available slots</span>
              )}
            </div>

            {filteredResources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.map((res) => (
                  <ResourceCard
                    key={res.id}
                    resource={res}
                    onViewDetails={(r) => setActiveModalResource(r)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#E9E5F4] p-12 text-center max-w-lg mx-auto space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#25213C]">No Matching Equipment Found</h3>
                <p className="text-xs text-[#625D75]">
                  Try adjusting your filters or clearing the search query.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#5B21B6] rounded-xl transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details Modal */}
      <ResourceModal
        resource={activeModalResource}
        isOpen={!!activeModalResource}
        onClose={() => setActiveModalResource(null)}
      />
    </AppShell>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { Project } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { createProject } from '@/app/actions/projects'
import type { DbProjectWithRelations } from '@/types/database'
import { mapDbProjectToProject } from '@/lib/mappers'
import { FolderGit2, Plus, Filter, Loader2, AlertCircle } from 'lucide-react'

export default function StudentProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function fetchProjects() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Not signed in.')
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from('projects')
      .select('id, title, description, deadline, department_id, team_size, status, created_at, departments(name)')
      .eq('student_id', user.id)
      .order('deadline', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setProjects(((data ?? []) as unknown as DbProjectWithRelations[]).map(mapDbProjectToProject))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Server-action-backed project creation
  const handleProjectCreated = async (newProj: Project) => {
    setSubmitError(null)
    const result = await createProject({
      title: newProj.title,
      description: newProj.description,
      deadline: newProj.deadline,
      department_id: newProj.departmentId,
      team_size: newProj.teamMembersCount,
      requirements: newProj.specialRequirements,
    })

    if (!result.success) {
      setSubmitError(result.error ?? 'Failed to create project.')
      return
    }

    // Refresh list from DB
    await fetchProjects()
    setIsCreateModalOpen(false)
  }

  const filteredProjects = projects.filter(p => {
    if (filterStatus === 'all') return true
    return p.status === filterStatus
  })

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD] mb-2">
              <FolderGit2 className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Project-Based Laboratory Governance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#25213C] tracking-tight">
              My Academic Research Projects
            </h1>
            <p className="text-xs sm:text-sm text-[#625D75] mt-1 max-w-2xl">
              Equipment bookings tied to verified project milestones receive expedited faculty approvals.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#5B21B6] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </button>
        </div>

        {/* Error from server action */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-[#E9E5F4] p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-[#625D75]">
            <Filter className="w-4 h-4 text-[#7C3AED]" />
            <span className="font-semibold text-[#25213C]">Status Filter:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="py-1 px-2.5 rounded-lg border border-[#E9E5F4] bg-[#F8F7FF] text-xs font-medium text-[#25213C]"
            >
              <option value="all">All Projects</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <span className="text-xs text-[#625D75]">
            Showing <strong className="text-[#25213C]">{filteredProjects.length}</strong> registered projects
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
            <p className="text-sm text-[#625D75]">Loading your projects…</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-red-700">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredProjects.length === 0 && (
          <div className="bg-white rounded-3xl border border-[#E9E5F4] p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mx-auto">
              <FolderGit2 className="w-6 h-6 text-[#7C3AED]" />
            </div>
            <h3 className="text-base font-bold text-[#25213C]">No Projects Yet</h3>
            <p className="text-xs text-[#625D75]">Create your first project to start booking lab equipment.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#5B21B6] rounded-xl transition-colors"
            >
              Create Project
            </button>
          </div>
        )}

        {/* Projects Grid */}
        {!loading && !error && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProjects.map(proj => (
              <ProjectCard key={proj.id} project={proj} />
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </AppShell>
  )
}

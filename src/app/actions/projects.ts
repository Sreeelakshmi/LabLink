'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ProjectInput {
  title: string
  description?: string
  deadline: string // ISO date string (YYYY-MM-DD)
  department_id?: string // May be UUID or human code ('cs', 'ece', etc.)
  team_size: number
  requirements?: string
}

export interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

// Well-known department codes to UUID mapping (matches 003_seed_data.sql)
const DEPT_CODE_TO_UUID: Record<string, string> = {
  ece: 'd1000000-0000-0000-0000-000000000001',
  cs: 'd1000000-0000-0000-0000-000000000002',
  me: 'd1000000-0000-0000-0000-000000000003',
  biotech: 'd1000000-0000-0000-0000-000000000004',
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Create a project (student only).
 * project.student_id is always set directly to auth.uid().
 * Safely resolves department_id whether provided as a code ('cs') or UUID.
 */
export async function createProject(input: ProjectInput): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()

  // 1. Verify authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'You must be signed in to create a project.' }
  }

  // 2. Verify student role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'student') {
    return { success: false, error: 'Only students can register academic research projects.' }
  }

  // 3. Validate input parameters
  if (!input.title.trim()) {
    return { success: false, error: 'Project title is required.' }
  }
  if (!input.deadline) {
    return { success: false, error: 'Project deadline is required.' }
  }
  if (input.team_size < 1) {
    return { success: false, error: 'Team size must be at least 1 researcher.' }
  }

  // 4. Safely resolve department UUID
  let resolvedDeptId: string | null = null
  if (input.department_id) {
    const trimmedDept = input.department_id.trim().toLowerCase()
    if (DEPT_CODE_TO_UUID[trimmedDept]) {
      resolvedDeptId = DEPT_CODE_TO_UUID[trimmedDept]
    } else if (UUID_REGEX.test(input.department_id)) {
      resolvedDeptId = input.department_id
    }
  }

  // 5. Insert project
  const { data: project, error: insertError } = await supabase
    .from('projects')
    .insert({
      student_id: user.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      deadline: input.deadline,
      department_id: resolvedDeptId,
      team_size: input.team_size,
      requirements: input.requirements?.trim() || null,
      status: 'active',
    })
    .select()
    .single()

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  revalidatePath('/student/projects')
  revalidatePath('/student/dashboard')

  return { success: true, data: project as Record<string, unknown> }
}

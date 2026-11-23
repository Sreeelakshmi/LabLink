'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface BookingRequestInput {
  resource_id: string
  project_id?: string
  quantity_requested: number
  preferred_start: string   // ISO timestamp string
  preferred_end: string     // ISO timestamp string
}

export interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

/**
 * Submit a booking request (student only).
 * Validates: authenticated user, student role, time ordering, quantity > 0.
 * Dynamic slot availability:
 * - Rejects if requested quantity exceeds total physical capacity.
 * - If concurrent allocations overlap and exceed capacity, flags status as 'conflict'
 *   for AI/faculty resolution, without blocking request creation.
 * - Pending requests DO NOT consume confirmed allocation capacity until approved.
 */
export async function submitBookingRequest(input: BookingRequestInput): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()

  // 1. Verify authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'You must be signed in to submit a booking.' }
  }

  // 2. Verify student role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { success: false, error: 'Could not verify your student account profile.' }
  }
  if (profile.role !== 'student') {
    return { success: false, error: 'Only students can submit booking requests.' }
  }

  // 3. Validate input parameters
  if (input.quantity_requested < 1) {
    return { success: false, error: 'Requested quantity must be at least 1.' }
  }
  if (new Date(input.preferred_end) <= new Date(input.preferred_start)) {
    return { success: false, error: 'End time must be strictly after start time.' }
  }

  // 4. Validate physical resource inventory & maintenance status
  const { data: resource, error: resourceError } = await supabase
    .from('resources')
    .select('id, name, quantity_total, quantity_available, maintenance_status')
    .eq('id', input.resource_id)
    .single()

  if (resourceError || !resource) {
    return { success: false, error: 'Requested laboratory resource was not found.' }
  }
  if (resource.maintenance_status !== 'operational') {
    return {
      success: false,
      error: `This equipment is currently unavailable due to ${resource.maintenance_status}.`,
    }
  }

  // Physical inventory check: cannot request more units than the lab physically owns
  const maxLabUnits = resource.quantity_total
  if (input.quantity_requested > maxLabUnits) {
    return {
      success: false,
      error: `Requested quantity (${input.quantity_requested}) exceeds the laboratory's total inventory (${maxLabUnits} units).`,
    }
  }

  // 5. Check time-slot availability via database RPC function
  let initialStatus: 'pending' | 'conflict' = 'pending'
  const { data: slotCheck } = await supabase.rpc('check_slot_availability', {
    p_resource_id: input.resource_id,
    p_start: input.preferred_start,
    p_end: input.preferred_end,
  })

  if (slotCheck) {
    const slot = slotCheck as {
      available?: boolean
      remaining_capacity?: number
    }
    if (typeof slot.remaining_capacity === 'number' && slot.remaining_capacity < input.quantity_requested) {
      // Slot is already booked or partially booked — tag as conflict so faculty & AI engine can resolve
      initialStatus = 'conflict'
    }
  }

  // 6. Insert booking request
  const { data: booking, error: insertError } = await supabase
    .from('booking_requests')
    .insert({
      student_id: user.id,
      resource_id: input.resource_id,
      project_id: input.project_id || null,
      quantity_requested: input.quantity_requested,
      preferred_start: input.preferred_start,
      preferred_end: input.preferred_end,
      status: initialStatus,
      review_notes: initialStatus === 'conflict' ? 'High slot demand: flagged for AI conflict allocation' : null,
    })
    .select()
    .single()

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  revalidatePath('/student/bookings')
  revalidatePath('/student/dashboard')
  revalidatePath('/faculty/dashboard')

  return {
    success: true,
    data: {
      ...booking,
      isConflict: initialStatus === 'conflict',
    } as Record<string, unknown>,
  }
}

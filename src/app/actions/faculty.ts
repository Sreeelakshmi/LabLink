'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type BookingDecision = 'approved' | 'rejected' | 'conflict'

export interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

/**
 * Faculty reviews a booking request.
 * Authorized for faculty and admin roles only.
 * Uses atomic PostgreSQL stored procedures with row-locking to prevent
 * over-allocation and concurrency race conditions.
 */
export async function reviewBookingRequest(
  bookingId: string,
  decision: BookingDecision,
  notes?: string
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()

  // 1. Verify authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'You must be signed in to review booking requests.' }
  }

  // 2. Verify faculty or admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['faculty', 'admin'].includes(profile.role)) {
    return { success: false, error: 'Unauthorized: Only faculty or admin can review requests.' }
  }

  // 3. Process decision using atomic database procedures
  if (decision === 'approved') {
    const { data: result, error: rpcError } = await supabase.rpc(
      'approve_booking_with_allocation',
      {
        p_booking_id: bookingId,
        p_notes: notes?.trim() || null,
      }
    )

    if (rpcError) {
      return { success: false, error: rpcError.message }
    }

    const rpcData = result as { success: boolean; error?: string; conflict?: boolean }
    if (!rpcData.success) {
      return {
        success: false,
        error: rpcData.error ?? 'Booking approval failed: capacity exceeded.',
      }
    }
  } else if (decision === 'rejected') {
    const { data: result, error: rpcError } = await supabase.rpc(
      'reject_booking_request',
      {
        p_booking_id: bookingId,
        p_notes: notes?.trim() || null,
      }
    )

    if (rpcError) {
      return { success: false, error: rpcError.message }
    }

    const rpcData = result as { success: boolean; error?: string }
    if (!rpcData.success) {
      return { success: false, error: rpcData.error ?? 'Rejection failed.' }
    }
  } else {
    // Flagged as conflict for AI rescheduling or manual adjustment
    const { error: updateError } = await supabase
      .from('booking_requests')
      .update({
        status: 'conflict',
        review_notes: notes?.trim() || 'Flagged for conflict resolution',
        assigned_faculty_id: user.id,
      })
      .eq('id', bookingId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }
  }

  revalidatePath('/faculty/dashboard')
  revalidatePath('/faculty/allocations')
  revalidatePath('/student/bookings')
  revalidatePath('/student/dashboard')

  return { success: true }
}

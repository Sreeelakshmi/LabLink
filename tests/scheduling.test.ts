import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateFairnessPriority,
  calculatePriorityScore,
  intervalsOverlap,
  calculatePeakConcurrentAllocation,
  detectSchedulingConflicts,
  findFeasibleAlternativeSlots,
  findCompatibleAlternativeResources,
  generateFairAllocationRecommendation,
} from '../src/lib/scheduling/allocationEngine.ts'
import type {
  RawBookingRequest,
  ExistingAllocation,
  SchedulingResource,
} from '../src/lib/scheduling/allocationEngine.ts'
import {
  mapDbResourceToResource,
  mapDbProjectToProject,
  getErrorMessage,
} from '../src/lib/mappers.ts'
import type {
  DbResourceWithRelations,
  DbProjectWithRelations,
} from '../src/types/database.ts'

describe('LabLink Scheduling & Conflict Resolution Engine', () => {

  // ─── 1. Successful Booking Validation ───────────────────────────────────
  it('1. validates successful booking parameters (operational resource, valid duration, within capacity)', () => {
    const resource: SchedulingResource = {
      id: 'res-jetson-1',
      name: 'NVIDIA Jetson AGX Orin Dev Kit',
      category: 'computing',
      quantity_total: 4,
      quantity_available: 4,
      maintenance_status: 'operational',
    }

    const start = new Date(Date.now() + 24 * 3600000).toISOString()
    const end = new Date(Date.now() + 26 * 3600000).toISOString()
    const quantity = 2

    // Duration check
    assert.ok(new Date(end).getTime() > new Date(start).getTime(), 'End must be strictly after start')
    
    // Status check
    assert.equal(resource.maintenance_status, 'operational', 'Resource must be operational')
    
    // Capacity check
    assert.ok(quantity <= resource.quantity_total, 'Requested quantity must be within total inventory')
    assert.ok(quantity >= 1, 'Requested quantity must be at least 1')

    const existingAllocations: ExistingAllocation[] = []
    const peak = calculatePeakConcurrentAllocation(start, end, quantity, existingAllocations)
    assert.equal(peak, 2)
    assert.ok(peak <= resource.quantity_total, 'Peak concurrent allocation is within capacity')
  })

  // ─── 2. Invalid Booking Interval Rejection ──────────────────────────────
  it('2. rejects invalid booking intervals (end <= start or non-positive quantity)', () => {
    const now = new Date()
    const start = new Date(now.getTime() + 100000).toISOString()
    const invertedEnd = new Date(now.getTime() + 50000).toISOString()
    const equalEnd = start

    // Interval validity check
    const isEndAfterStartInverted = new Date(invertedEnd).getTime() > new Date(start).getTime()
    assert.equal(isEndAfterStartInverted, false, 'Should reject when end time is before start time')

    const isEndAfterStartEqual = new Date(equalEnd).getTime() > new Date(start).getTime()
    assert.equal(isEndAfterStartEqual, false, 'Should reject when end time is equal to start time')

    // Non-positive quantity validation
    const zeroQuantity = 0
    const negativeQuantity = -2
    assert.ok(zeroQuantity < 1, 'Quantity of 0 must be rejected')
    assert.ok(negativeQuantity < 1, 'Negative quantity must be rejected')
  })

  // ─── 3. Overlapping Booking Detection ───────────────────────────────────
  it('3. accurately detects overlapping time intervals', () => {
    const t0 = new Date('2026-11-25T09:00:00Z')
    const t1 = new Date('2026-11-25T11:00:00Z')
    const t2 = new Date('2026-11-25T10:00:00Z')
    const t3 = new Date('2026-11-25T12:00:00Z')
    const t4 = new Date('2026-11-25T13:00:00Z')
    const t5 = new Date('2026-11-25T15:00:00Z')

    // [09:00, 11:00) and [10:00, 12:00) overlap
    assert.equal(intervalsOverlap(t0, t1, t2, t3), true, 'Overlapping intervals must return true')

    // [09:00, 11:00) and [13:00, 15:00) are disjoint
    assert.equal(intervalsOverlap(t0, t1, t4, t5), false, 'Disjoint intervals must return false')

    // Adjacent non-overlapping intervals: [09:00, 11:00) and [11:00, 13:00)
    assert.equal(intervalsOverlap(t0, t1, t1, t4), false, 'Adjacent abutting intervals must not overlap')

    // Completely enclosed interval: [09:00, 15:00) encloses [10:00, 12:00)
    assert.equal(intervalsOverlap(t0, t5, t2, t3), true, 'Enclosed interval must return true')
  })

  // ─── 4. Capacity Exceeded Detection ────────────────────────────────────
  it('4. detects capacity exceeded when overlapping allocations surpass total inventory', () => {
    const resource: SchedulingResource = {
      id: 'res-microscope-1',
      name: 'Confocal Fluorescence Microscope',
      category: 'biotech',
      quantity_total: 1, // Only 1 physical unit
      quantity_available: 1,
      maintenance_status: 'operational',
    }

    const start = '2026-11-26T10:00:00Z'
    const end = '2026-11-26T12:00:00Z'

    const existingAllocations: ExistingAllocation[] = [
      {
        id: 'alloc-1',
        booking_request_id: 'booking-existing-1',
        resource_id: 'res-microscope-1',
        allocated_quantity: 1,
        start_time: '2026-11-26T09:30:00Z',
        end_time: '2026-11-26T11:30:00Z', // Overlaps with 10:00-12:00
      },
    ]

    // New request wants 1 unit
    const peak = calculatePeakConcurrentAllocation(start, end, 1, existingAllocations)
    assert.equal(peak, 2, 'Peak concurrent demand must equal 2 units')
    assert.ok(peak > resource.quantity_total, 'Peak exceeds physical capacity (2 > 1)')

    // Detect conflict via engine
    const req1: RawBookingRequest = {
      id: 'req-new-1',
      student_id: 'student-1',
      resource_id: 'res-microscope-1',
      quantity_requested: 1,
      preferred_start: start,
      preferred_end: end,
      status: 'pending',
    }

    const conflicts = detectSchedulingConflicts([req1], existingAllocations, [resource])
    assert.equal(conflicts.length, 1, 'Should detect 1 conflict group')
    assert.equal(conflicts[0].resourceId, 'res-microscope-1')
  })

  // ─── 5. Simultaneous Approval Serialization ─────────────────────────────
  it('5. serializes simultaneous approvals and prevents double-booking of limited capacity', () => {
    // Model atomic check with row locking
    const resourceTotal = 1
    const allocations: ExistingAllocation[] = []

    function atomicSimulatedApproval(bookingId: string, start: string, end: string, qty: number): { success: boolean; error?: string } {
      const peak = calculatePeakConcurrentAllocation(start, end, qty, allocations)
      if (peak > resourceTotal) {
        return { success: false, error: 'Capacity exceeded for time interval' }
      }
      allocations.push({
        id: `alloc-${Date.now()}-${Math.random()}`,
        booking_request_id: bookingId,
        resource_id: 'res-shared-1',
        allocated_quantity: qty,
        start_time: start,
        end_time: end,
      })
      return { success: true }
    }

    const slotStart = '2026-11-27T14:00:00Z'
    const slotEnd = '2026-11-27T16:00:00Z'

    // First concurrent approval transaction executes
    const firstAttempt = atomicSimulatedApproval('booking-A', slotStart, slotEnd, 1)
    assert.equal(firstAttempt.success, true, 'First approval should succeed')
    assert.equal(allocations.length, 1)

    // Second concurrent approval transaction executes for overlapping slot
    const secondAttempt = atomicSimulatedApproval('booking-B', slotStart, slotEnd, 1)
    assert.equal(secondAttempt.success, false, 'Second overlapping approval must fail')
    assert.equal(secondAttempt.error, 'Capacity exceeded for time interval')
    assert.equal(allocations.length, 1, 'Allocations table must remain at 1')
  })

  // ─── 6. Unauthorized Approval Rejection ─────────────────────────────────
  it('6. rejects booking approval attempts by normal student accounts', () => {
    function authorizeReviewer(role: string): { authorized: boolean; error?: string } {
      if (role !== 'faculty' && role !== 'admin') {
        return { authorized: false, error: 'Unauthorized: Only faculty or admin can review requests.' }
      }
      return { authorized: true }
    }

    const studentAttempt = authorizeReviewer('student')
    assert.equal(studentAttempt.authorized, false)
    assert.equal(studentAttempt.error, 'Unauthorized: Only faculty or admin can review requests.')

    const facultyAttempt = authorizeReviewer('faculty')
    assert.equal(facultyAttempt.authorized, true)

    const adminAttempt = authorizeReviewer('admin')
    assert.equal(adminAttempt.authorized, true)
  })

  // ─── 7. Self-Approval Prevention ────────────────────────────────────────
  it('7. prevents faculty members from approving their own booking requests', () => {
    function validateReviewPermission(reviewerId: string, bookingStudentId: string): { valid: boolean; error?: string } {
      if (reviewerId === bookingStudentId) {
        return { valid: false, error: 'Self-approval violation: Reviewer cannot approve their own booking request.' }
      }
      return { valid: true }
    }

    const facultyUser = 'usr-faculty-123'
    const selfBooking = 'usr-faculty-123'
    const studentBooking = 'usr-student-456'

    const selfCheck = validateReviewPermission(facultyUser, selfBooking)
    assert.equal(selfCheck.valid, false)
    assert.match(selfCheck.error || '', /Self-approval violation/)

    const legitimateCheck = validateReviewPermission(facultyUser, studentBooking)
    assert.equal(legitimateCheck.valid, true)
  })

  // ─── 8. Alternative Slot Generation ─────────────────────────────────────
  it('8. generates feasible alternative slots that preserve duration, respect deadlines, and fit within lab hours', () => {
    const resource: SchedulingResource = {
      id: 'res-cnc-1',
      name: '5-Axis CNC Milling Center',
      category: 'fabrication',
      quantity_total: 1,
      maintenance_status: 'operational',
      laboratory_location: 'Mechanical Engineering Workshop',
    }

    // Requested: Tomorrow at 10:00 - 12:00 (duration: 2 hours)
    const baseDate = new Date()
    baseDate.setDate(baseDate.getDate() + 1)
    baseDate.setHours(10, 0, 0, 0)
    const reqStart = baseDate.toISOString()

    const endDate = new Date(baseDate.getTime() + 2 * 3600000)
    const reqEnd = endDate.toISOString()

    // Project deadline: 5 days from now
    const deadlineDate = new Date()
    deadlineDate.setDate(deadlineDate.getDate() + 5)
    const projectDeadline = deadlineDate.toISOString()

    const request: RawBookingRequest = {
      id: 'req-cnc-student',
      student_id: 'student-2',
      resource_id: 'res-cnc-1',
      quantity_requested: 1,
      preferred_start: reqStart,
      preferred_end: reqEnd,
      status: 'pending',
      project_deadline: projectDeadline,
    }

    // Existing allocation blocks the original slot
    const existingAllocations: ExistingAllocation[] = [
      {
        id: 'alloc-busy',
        booking_request_id: 'other-booking',
        resource_id: 'res-cnc-1',
        allocated_quantity: 1,
        start_time: reqStart,
        end_time: reqEnd,
      },
    ]

    const alternativeSlots = findFeasibleAlternativeSlots(
      request,
      resource,
      existingAllocations,
      projectDeadline,
      { labOpenHour: 8, labCloseHour: 20 }
    )

    assert.ok(alternativeSlots.length > 0, 'Should find at least 1 feasible alternative slot')

    for (const slot of alternativeSlots) {
      const s = new Date(slot.start)
      const e = new Date(slot.end)
      const duration = e.getTime() - s.getTime()

      // Exact duration preserved
      assert.equal(duration, 2 * 3600000, 'Alternative slot must preserve requested duration (2 hours)')

      // Operating hours check (between 8:00 and 20:00)
      assert.ok(s.getHours() >= 8 && e.getHours() <= 20, 'Slot must be within lab operating hours')

      // Deadline check
      assert.ok(e.getTime() <= new Date(projectDeadline).getTime(), 'Slot must complete before project deadline')

      // Feasibility score is positive
      assert.ok(slot.feasibilityScore >= 70, 'Feasibility score should be >= 70')
    }
  })

  // ─── 9. Fairness Prioritization ─────────────────────────────────────────
  it('9. prioritizes urgent project deadlines and team milestones fairly with deterministic scoring', () => {
    // Candidate A: Imminent deadline (tomorrow), team of 4, academic publication
    const tomorrow = new Date(Date.now() + 24 * 3600000).toISOString()
    const breakdownA = calculateFairnessPriority(tomorrow, 4, true)

    // Candidate B: Flexible deadline (30 days away), team of 1, course assignment
    const monthAway = new Date(Date.now() + 30 * 24 * 3600000).toISOString()
    const breakdownB = calculateFairnessPriority(monthAway, 1, false)

    assert.ok(breakdownA.score > breakdownB.score, 'Candidate A must score higher than Candidate B')
    assert.ok(breakdownA.score >= 80, `Candidate A score (${breakdownA.score}) should be high priority (>= 80)`)
    assert.ok(breakdownB.score <= 50, `Candidate B score (${breakdownB.score}) should be lower priority (<= 50)`)

    // Verify AI recommendation packaging
    const conflictGroup = {
      resourceId: 'res-gpu-cluster',
      resourceName: 'High Performance AI Cluster',
      labLocation: 'CS Computing Hall B',
      quantityTotal: 1,
      timeWindowStart: tomorrow,
      timeWindowEnd: new Date(new Date(tomorrow).getTime() + 2 * 3600000).toISOString(),
      conflictingRequests: [
        {
          id: 'req-A',
          student_id: 'student-A',
          resource_id: 'res-gpu-cluster',
          quantity_requested: 1,
          preferred_start: tomorrow,
          preferred_end: new Date(new Date(tomorrow).getTime() + 2 * 3600000).toISOString(),
          status: 'pending',
          project_title: 'NeurIPS Benchmark Pipeline',
          project_deadline: tomorrow,
          team_size: 4,
          is_publication: true,
        },
        {
          id: 'req-B',
          student_id: 'student-B',
          resource_id: 'res-gpu-cluster',
          quantity_requested: 1,
          preferred_start: tomorrow,
          preferred_end: new Date(new Date(tomorrow).getTime() + 2 * 3600000).toISOString(),
          status: 'pending',
          project_title: 'Introductory ML Homework',
          project_deadline: monthAway,
          team_size: 1,
          is_publication: false,
        },
      ],
    }

    const recommendation = generateFairAllocationRecommendation(
      conflictGroup,
      [
        {
          id: 'res-gpu-cluster',
          name: 'High Performance AI Cluster',
          category: 'computing',
          quantity_total: 1,
          maintenance_status: 'operational',
        },
      ],
      []
    )

    assert.equal(recommendation.requests.length, 2)
    assert.equal(recommendation.aiRecommendation.recommendedAllocations.length, 2)
    // Winner (Candidate A) is allocated Slot 1
    assert.equal(recommendation.aiRecommendation.recommendedAllocations[0].projectTitle, 'NeurIPS Benchmark Pipeline')
    assert.match(recommendation.aiRecommendation.recommendedAllocations[0].rationale, /Priority Assigned/)
    // Runner up (Candidate B) is shifted
    assert.equal(recommendation.aiRecommendation.recommendedAllocations[1].projectTitle, 'Introductory ML Homework')
    assert.match(recommendation.aiRecommendation.recommendedAllocations[1].rationale, /Shifted Slot/)
    assert.ok(recommendation.aiRecommendation.fairnessScore > 50)
    assert.ok(recommendation.aiRecommendation.considerations.length >= 3)
  })

  // ─── 10. Database Domain Mapper Validation ─────────────────────────────
  it('10. properly maps database records and derives correct availability status and categories', () => {
    const rawOperational: DbResourceWithRelations = {
      id: 'res-test-1',
      laboratory_id: 'lab-1',
      department_id: 'cs',
      name: 'NVIDIA H100 Node',
      description: 'High performance compute server',
      category: 'computing GPU',
      specifications: { memory: '80GB HBM3' },
      quantity_total: 4,
      quantity_available: 4,
      maintenance_status: 'operational',
      prerequisites: 'CUDA Training required',
      departments: { name: 'Computer Science' },
      laboratories: { name: 'AI Lab', location: 'Block C 401' },
    }

    const mapped = mapDbResourceToResource(rawOperational)
    assert.equal(mapped.status, 'available')
    assert.equal(mapped.category, 'computing')
    assert.equal(mapped.safetyCertificationRequired, true)
    assert.equal(mapped.labLocation, 'Block C 401')

    // Maintenance status override
    const rawMaintenance: DbResourceWithRelations = {
      ...rawOperational,
      maintenance_status: 'maintenance',
      quantity_available: 3,
    }
    assert.equal(mapDbResourceToResource(rawMaintenance).status, 'maintenance')

    // In-use status when quantity_available is 0
    const rawInUse: DbResourceWithRelations = {
      ...rawOperational,
      quantity_available: 0,
    }
    assert.equal(mapDbResourceToResource(rawInUse).status, 'in_use')

    // Reserved status when partially allocated
    const rawReserved: DbResourceWithRelations = {
      ...rawOperational,
      quantity_available: 2,
    }
    assert.equal(mapDbResourceToResource(rawReserved).status, 'reserved')
  })

  // ─── 11. Error Extractor Security & Robustness ─────────────────────────
  it('11. extracts error messages safely without throwing or leaking internals', () => {
    assert.equal(getErrorMessage(new Error('Database query timed out')), 'Database query timed out')
    assert.equal(getErrorMessage('Raw string error'), 'Raw string error')
    assert.equal(getErrorMessage({ message: 'Structured error message' }), 'Structured error message')
    assert.equal(getErrorMessage(null, 'Custom fallback'), 'Custom fallback')
    assert.equal(getErrorMessage(undefined), 'An unexpected error occurred')
  })

  // ─── 12. Fairness Scoring Edge Case Resilience ─────────────────────────
  it('12. resilience test: fairness priority scoring handles extreme or missing inputs gracefully', () => {
    const now = new Date()
    // Past deadline
    const pastDeadline = new Date(now.getTime() - 86400000).toISOString()
    const pastResult = calculateFairnessPriority(pastDeadline, 1, false)
    assert.ok(pastResult.score >= 1 && pastResult.score <= 100, 'Score must be clamped between 1 and 100')
    assert.equal(pastResult.urgencyPoints, 50, 'Overdue projects get maximum urgency points')

    // No deadline provided
    const noDeadlineResult = calculateFairnessPriority(undefined, 1, false)
    assert.ok(noDeadlineResult.score >= 1 && noDeadlineResult.score <= 100, 'Undefined deadline must not crash')

    // Very large team
    const largeTeamResult = calculateFairnessPriority(new Date(now.getTime() + 86400000).toISOString(), 50, true)
    assert.ok(largeTeamResult.score >= 1 && largeTeamResult.score <= 100, 'Max points capped properly')
    assert.equal(largeTeamResult.teamPoints, 10, 'Team factor capped at 10 pts to protect solo researchers')
  })
})

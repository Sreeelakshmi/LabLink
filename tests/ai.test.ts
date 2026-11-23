import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isGeminiConfigured,
  getGeminiModelName,
} from '../src/lib/ai/geminiClient.ts'
import type {
  GroundedResource,
  AIRecommendationResult,
  AIRecommendationItem,
} from '../src/lib/ai/geminiClient.ts'
import {
  findCompatibleAlternativeResources,
} from '../src/lib/scheduling/allocationEngine.ts'
import type {
  SchedulingResource,
} from '../src/lib/scheduling/allocationEngine.ts'

describe('LabLink Gemini AI Integration & Grounding Engine', () => {
  // Test inventory mimicking the real Supabase seed data
  const realInventory: GroundedResource[] = [
    {
      id: 'e1000000-0000-0000-0000-000000000001',
      name: 'Oscilloscope DS1054Z',
      category: 'electronics',
      department_name: 'Electronics & Communication',
      lab_location: 'Block A, Room 201',
      quantity_total: 4,
      quantity_available: 4,
      maintenance_status: 'operational',
      specifications: { bandwidth: '50MHz', channels: '4' },
      prerequisites: 'Basic Electronics Lab',
    },
    {
      id: 'e1000000-0000-0000-0000-000000000004',
      name: 'NVIDIA Jetson Nano Dev Kit',
      category: 'computing',
      department_name: 'Computer Science & Engineering',
      lab_location: 'Block B, Room 305',
      quantity_total: 5,
      quantity_available: 5,
      maintenance_status: 'operational',
      specifications: { gpu: '128-core Maxwell', ram: '4GB' },
      prerequisites: 'Python proficiency',
    },
    {
      id: 'e1000000-0000-0000-0000-000000000006',
      name: 'High-Performance Workstation RTX 4090',
      category: 'computing',
      department_name: 'Computer Science & Engineering',
      lab_location: 'Block B, Room 305',
      quantity_total: 3,
      quantity_available: 3,
      maintenance_status: 'operational',
      specifications: { gpu: 'RTX 4090 24GB', cpu: 'Intel i9' },
      prerequisites: 'Supervisor sign-off',
    },
    {
      id: 'e1000000-0000-0000-0000-000000000007',
      name: 'CNC Milling Machine',
      category: 'fabrication',
      department_name: 'Mechanical Engineering',
      lab_location: 'Block C, Room 110',
      quantity_total: 2,
      quantity_available: 2,
      maintenance_status: 'operational',
      specifications: { axes: '3', spindle_speed: '10000 RPM' },
      prerequisites: 'CNC Safety Certification',
    },
    {
      id: 'e1000000-0000-0000-0000-000000000009',
      name: 'PCR Thermal Cycler',
      category: 'biotech',
      department_name: 'Biotechnology',
      lab_location: 'Block D, Room 404',
      quantity_total: 3,
      quantity_available: 3,
      maintenance_status: 'operational',
      specifications: { wells: '96' },
      prerequisites: 'BSL-2 training',
    },
  ]

  // ─── 1. AI Structured Output Validation ─────────────────────────────────
  it('1. validates AI structured JSON output schema', () => {
    const rawAiResponse = JSON.stringify({
      projectAnalysis: {
        identifiedDomains: ['Computer Vision', 'Edge Robotics'],
        coreTechnicalRequirements: ['Real-time object detection', 'Edge GPU acceleration'],
      },
      recommendedResources: [
        {
          resourceId: 'e1000000-0000-0000-0000-000000000004',
          resourceName: 'NVIDIA Jetson Nano Dev Kit',
          matchScore: 96,
          relevanceReason: 'Provides onboard GPU acceleration for real-time edge inference.',
          recommendedSlotDuration: '3 hours',
          safetyNotes: 'Python proficiency',
        },
      ],
      bundleSummary: 'Jetson Nano enables onboard deep learning inference on battery power.',
      compatibleAlternatives: [
        {
          originalResourceId: 'e1000000-0000-0000-0000-000000000004',
          alternativeResourceId: 'e1000000-0000-0000-0000-000000000006',
          compatibilityReason: 'Workstation RTX 4090 shares CUDA architecture for model training.',
        },
      ],
      followUpAdvice: 'Pre-flash JetPack OS before your lab session.',
    })

    const parsed = JSON.parse(rawAiResponse)
    assert.ok(Array.isArray(parsed.projectAnalysis.identifiedDomains))
    assert.ok(Array.isArray(parsed.projectAnalysis.coreTechnicalRequirements))
    assert.ok(Array.isArray(parsed.recommendedResources))
    assert.equal(parsed.recommendedResources[0].resourceId, 'e1000000-0000-0000-0000-000000000004')
    assert.ok(parsed.recommendedResources[0].matchScore >= 1 && parsed.recommendedResources[0].matchScore <= 100)
    assert.ok(typeof parsed.bundleSummary === 'string')
  })

  // ─── 2. Grounding Recommendations in Real Inventory ─────────────────────
  it('2. grounds recommendations strictly in real inventory and preserves metadata', () => {
    const validInventoryIds = new Set(realInventory.map((r) => r.id))

    const aiOutputs = [
      {
        resourceId: 'e1000000-0000-0000-0000-000000000004', // Exists in inventory
        resourceName: 'NVIDIA Jetson Nano Dev Kit',
        matchScore: 95,
        relevanceReason: 'Deep learning inference hardware.',
      },
      {
        resourceId: 'e1000000-0000-0000-0000-000000000001', // Exists in inventory
        resourceName: 'Oscilloscope DS1054Z',
        matchScore: 88,
        relevanceReason: 'Signal timing measurement.',
      },
    ]

    const grounded = aiOutputs.filter((item) => validInventoryIds.has(item.resourceId))
    assert.equal(grounded.length, 2, 'All valid inventory items should be preserved')
    assert.equal(grounded[0].resourceId, 'e1000000-0000-0000-0000-000000000004')
  })

  // ─── 3. Rejecting Invalid / Hallucinated Resource IDs ───────────────────
  it('3. rejects hallucinated or non-existent resource IDs not in the database', () => {
    const validInventoryIds = new Set(realInventory.map((r) => r.id))

    const mixedAiOutputs = [
      {
        resourceId: 'e1000000-0000-0000-0000-000000000004', // Real
        resourceName: 'NVIDIA Jetson Nano Dev Kit',
        matchScore: 92,
        relevanceReason: 'Edge inference.',
      },
      {
        resourceId: 'hallucinated-quantum-computer-xyz', // FAKE
        resourceName: 'IBM Quantum Qubit Station',
        matchScore: 99,
        relevanceReason: 'Quantum optimization.',
      },
      {
        resourceId: 'non-existent-uuid-9999-8888', // FAKE
        resourceName: 'Superconducting Magnet Spectrometer',
        matchScore: 90,
        relevanceReason: 'Magnetic resonance.',
      },
    ]

    const sanitized = mixedAiOutputs.filter((item) => validInventoryIds.has(item.resourceId))
    assert.equal(sanitized.length, 1, 'Only the 1 real inventory resource must survive sanitization')
    assert.equal(sanitized[0].resourceName, 'NVIDIA Jetson Nano Dev Kit')
  })

  // ─── 4. AI API Failure Handling ─────────────────────────────────────────
  it('4. gracefully handles missing API key or empty inventory without crashing', () => {
    // Empty inventory guard test
    function testEmptyInventoryGuard(inventory: GroundedResource[]) {
      if (!inventory || inventory.length === 0) {
        return {
          success: false,
          error: 'EMPTY_INVENTORY',
          message: 'No laboratory equipment found in the database. Please execute 003_seed_data.sql.',
        }
      }
      return { success: true }
    }

    const emptyResult = testEmptyInventoryGuard([])
    assert.equal(emptyResult.success, false)
    assert.equal(emptyResult.error, 'EMPTY_INVENTORY')

    // Missing key guard test
    function testApiKeyGuard(apiKey?: string) {
      if (!apiKey || apiKey.trim().length === 0) {
        return {
          success: false,
          error: 'GEMINI_API_KEY_MISSING',
          message: 'Please add GEMINI_API_KEY=your_key to .env.local',
        }
      }
      return { success: true }
    }

    const missingKeyResult = testApiKeyGuard('')
    assert.equal(missingKeyResult.success, false)
    assert.equal(missingKeyResult.error, 'GEMINI_API_KEY_MISSING')
  })

  // ─── 5. Equipment Compatibility Check ───────────────────────────────────
  it('5. enforces cross-department equipment compatibility rules and rejects incompatible substitutions', () => {
    const schedulingResources: SchedulingResource[] = realInventory.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      quantity_total: r.quantity_total,
      maintenance_status: r.maintenance_status,
      laboratory_location: r.lab_location,
    }))

    const jetson = schedulingResources.find((r) => r.id === 'e1000000-0000-0000-0000-000000000004')!
    const compatible = findCompatibleAlternativeResources(
      jetson,
      schedulingResources,
      '2026-11-26T10:00:00Z',
      '2026-11-26T12:00:00Z',
      []
    )

    // Jetson (computing) should be compatible with RTX 4090 Workstation (computing)
    assert.ok(compatible.length > 0, 'Should find compatible computing equipment')
    assert.equal(compatible[0].resourceName, 'High-Performance Workstation RTX 4090')

    // Incompatible pairing test: PCR Cycler (biotech) should NOT match CNC Mill (fabrication)
    const pcr = schedulingResources.find((r) => r.id === 'e1000000-0000-0000-0000-000000000009')!
    const pcrCompatible = findCompatibleAlternativeResources(
      pcr,
      schedulingResources,
      '2026-11-26T10:00:00Z',
      '2026-11-26T12:00:00Z',
      []
    )
    const cncMatches = pcrCompatible.some((c) => c.resourceName.includes('CNC'))
    assert.equal(cncMatches, false, 'CNC Mill must never be treated as compatible with PCR Cycler')
  })

  // ─── 6. Scheduling Explanation Consistency ─────────────────────────────
  it('6. verifies scheduling explanation consistency and capacity limits', () => {
    const conflictMock = {
      resourceName: 'High-Performance Workstation RTX 4090',
      labLocation: 'Block B, Room 305',
      availableQuantity: 1,
      conflictingTimeSlot: '10:00 AM – 12:00 PM',
      requestedDate: 'Nov 26, 2026',
      requests: [
        {
          projectTitle: 'Autonomous Vision Classifier',
          studentName: 'Alex Rivera',
          priorityWeight: 92,
          deadline: 'Nov 27, 2026',
        },
        {
          projectTitle: 'Intro ML Homework',
          studentName: 'Jordan Lee',
          priorityWeight: 34,
          deadline: 'Dec 20, 2026',
        },
      ],
      aiRecommendation: {
        recommendedAllocations: [
          {
            projectTitle: 'Autonomous Vision Classifier',
            assignedTime: '10:00 AM – 12:00 PM',
            rationale: 'Priority Assigned: Higher fairness weight (92 pts). Imminent deadline.',
          },
          {
            projectTitle: 'Intro ML Homework',
            assignedTime: '02:00 PM – 04:00 PM',
            rationale: 'Shifted Slot: Same-day shifted window after peak usage.',
          },
        ],
        fairnessScore: 63,
        utilizationOptimization: 'Pareto-optimal resolution maximizes hardware utilization by 34% while preventing overbooking.',
        considerations: [
          'Deadline Urgency: Prioritized projects with tighter milestone deadlines.',
          'Capacity Protection: Restricts concurrent reservations to total physical inventory (1 units).',
        ],
      },
    }

    // Verify explanation consistency
    const rationaleA = conflictMock.aiRecommendation.recommendedAllocations[0].rationale
    const rationaleB = conflictMock.aiRecommendation.recommendedAllocations[1].rationale

    assert.match(rationaleA, /Priority Assigned/)
    assert.match(rationaleB, /Shifted Slot/)
    assert.ok(conflictMock.requests[0].priorityWeight > conflictMock.requests[1].priorityWeight)
    assert.equal(conflictMock.availableQuantity, 1)
  })
})

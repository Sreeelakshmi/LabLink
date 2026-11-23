'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  analyzeProjectAndRecommendResources,
  explainConflictResolutionWithGemini,
  isGeminiConfigured,
  getGeminiModelName,
  GroundedResource,
} from '@/lib/ai/geminiClient'
import { Resource, SchedulingConflict } from '@/types'

export interface AiConsultationResponse {
  success: boolean
  error?: string
  message?: string
  geminiConfigured: boolean
  modelUsed?: string
  projectAnalysis?: {
    identifiedDomains: string[]
    coreTechnicalRequirements: string[]
  }
  recommendations: {
    resource: Resource
    matchScore: number
    reason: string
    slotDuration?: string
  }[]
  bundleSummary?: string
  compatibleAlternatives?: {
    originalResourceId: string
    alternativeResourceId: string
    compatibilityReason: string
  }[]
  followUpAdvice?: string
}

/**
 * Server action to consult the Gemini AI Lab Assistant.
 * 1. Fetches real resources from Supabase.
 * 2. If inventory is empty, returns an explicit empty inventory warning.
 * 3. If GEMINI_API_KEY is not configured, returns instructions on where to add it.
 * 4. Invokes Gemini with strict grounding in real database inventory.
 */
export async function consultAiLabAssistant(
  userPrompt: string
): Promise<AiConsultationResponse> {
  const geminiConfigured = isGeminiConfigured()

  // 1. Fetch real resources from Supabase
  const supabase = await createServerSupabaseClient()
  const { data: dbResources, error: dbError } = await supabase
    .from('resources')
    .select(`
      id, name, category, specifications, quantity_total, quantity_available,
      maintenance_status, prerequisites, department_id,
      departments(name),
      laboratories(name, location)
    `)
    .order('name')

  if (dbError) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: `Failed to query Supabase laboratory resources: ${dbError.message}`,
      geminiConfigured,
      recommendations: [],
    }
  }

  const rawList = dbResources || []

  // Check for empty inventory prerequisite
  if (rawList.length === 0) {
    return {
      success: false,
      error: 'EMPTY_INVENTORY',
      message: 'The campus laboratory inventory is currently empty in the database. Please execute 003_seed_data.sql in the Supabase SQL Editor to seed the 10 campus laboratory equipment items.',
      geminiConfigured,
      recommendations: [],
    }
  }

  // Format real grounded inventory for Gemini
  const groundedInventory: GroundedResource[] = rawList.map((r: any) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    department_name: r.departments?.name || 'Department',
    lab_location: r.laboratories?.location || r.laboratories?.name || 'Campus Lab',
    quantity_total: r.quantity_total,
    quantity_available: r.quantity_available,
    maintenance_status: r.maintenance_status,
    specifications: r.specifications || {},
    prerequisites: r.prerequisites,
  }))

  // 2. Check Gemini API key
  if (!geminiConfigured) {
    return {
      success: false,
      error: 'GEMINI_API_KEY_MISSING',
      message: 'GEMINI_API_KEY is missing from environment. Please add GEMINI_API_KEY=your_key to .env.local and restart the server to enable real Gemini AI recommendations.',
      geminiConfigured: false,
      recommendations: [],
    }
  }

  // 3. Call Gemini
  const aiResult = await analyzeProjectAndRecommendResources(userPrompt, groundedInventory)

  if (!aiResult.success) {
    return {
      success: false,
      error: aiResult.error,
      message: aiResult.message,
      geminiConfigured,
      modelUsed: aiResult.modelUsed,
      recommendations: [],
    }
  }

  // 4. Map recommendations back to complete Resource objects for frontend display
  const rawMap = new Map(rawList.map((r: any) => [r.id, r]))

  const mappedRecommendations = aiResult.recommendedResources.map((item) => {
    const raw = rawMap.get(item.resourceId)
    const deptName = raw?.departments?.name || 'Unknown Department'
    const labLoc = raw?.laboratories?.location || raw?.laboratories?.name || 'Campus Lab'

    const fullResource: Resource = {
      id: item.resourceId,
      name: item.resourceName,
      category: (raw?.category?.toLowerCase() || 'computing') as Resource['category'],
      departmentId: (raw?.department_id || 'cs') as Resource['departmentId'],
      departmentName: deptName,
      labLocation: labLoc,
      totalQuantity: raw?.quantity_total ?? 1,
      availableQuantity: raw?.quantity_available ?? 1,
      status: raw?.maintenance_status !== 'operational' ? 'maintenance' : (raw?.quantity_available === 0 ? 'in_use' : 'available'),
      description: item.relevanceReason,
      specifications: raw?.specifications || {},
      safetyCertificationRequired: Boolean(raw?.prerequisites),
      popularFor: [raw?.category || 'research'],
    }

    return {
      resource: fullResource,
      matchScore: item.matchScore,
      reason: item.relevanceReason,
      slotDuration: item.recommendedSlotDuration,
    }
  })

  return {
    success: true,
    geminiConfigured: true,
    modelUsed: aiResult.modelUsed || getGeminiModelName(),
    projectAnalysis: aiResult.projectAnalysis,
    recommendations: mappedRecommendations,
    bundleSummary: aiResult.bundleSummary,
    compatibleAlternatives: aiResult.compatibleAlternatives,
    followUpAdvice: aiResult.followUpAdvice,
  }
}

/**
 * Server action to generate an AI explainability narrative for a faculty scheduling conflict.
 */
export async function getAiConflictExplanation(
  conflict: SchedulingConflict
): Promise<{ explanation: string; modelUsed?: string }> {
  const explanation = await explainConflictResolutionWithGemini(conflict)
  return {
    explanation,
    modelUsed: isGeminiConfigured() ? getGeminiModelName() : undefined,
  }
}


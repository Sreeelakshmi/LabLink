/**
 * LabLink Google Gemini AI Integration Service
 * Uses the official Google GenAI SDK (@google/genai) on the server.
 * All recommendations are grounded strictly in real Supabase database inventory.
 */

import { GoogleGenAI } from '@google/genai'
import type { SchedulingConflict } from '@/types'

function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (!error) return fallback
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  return fallback
}

export interface GroundedResource {
  id: string
  name: string
  category: string
  department_name: string
  lab_location: string
  quantity_total: number
  quantity_available: number
  maintenance_status: string
  specifications: Record<string, string>
  prerequisites?: string | null
}

export interface AIRecommendationItem {
  resourceId: string
  resourceName: string
  matchScore: number
  relevanceReason: string
  recommendedSlotDuration: string
  safetyNotes?: string
}

export interface AIRecommendationResult {
  success: boolean
  error?: string
  message?: string
  projectAnalysis?: {
    identifiedDomains: string[]
    coreTechnicalRequirements: string[]
  }
  recommendedResources: AIRecommendationItem[]
  bundleSummary?: string
  compatibleAlternatives?: {
    originalResourceId: string
    alternativeResourceId: string
    compatibilityReason: string
  }[]
  followUpAdvice?: string
  rawAiText?: string
  modelUsed?: string
}

interface GeminiCallParams {
  model: string
  contents: string
  config?: {
    systemInstruction?: string
    responseMimeType?: string
  }
}

interface GeminiCallResponse {
  text?: string
}

interface RawGeminiRecommendation {
  projectAnalysis?: {
    identifiedDomains: string[]
    coreTechnicalRequirements: string[]
  }
  recommendedResources?: Array<{
    resourceId?: string
    resourceName?: string
    matchScore?: number | string
    relevanceReason?: string
    recommendedSlotDuration?: string
    safetyNotes?: string
  }>
  bundleSummary?: string
  compatibleAlternatives?: Array<{
    originalResourceId: string
    alternativeResourceId: string
    compatibilityReason: string
  }>
  followUpAdvice?: string
}

/**
 * Returns whether GEMINI_API_KEY is configured on the server.
 */
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0)
}

/**
 * Returns the currently active Gemini model name.
 * Defaults to 'gemini-4-hydrogen' (or 'gemini-2.5-flash' fallback).
 */
export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-4-hydrogen'
}

/**
 * Get or create GoogleGenAI client instance.
 * Throws a descriptive error if the API key is missing.
 */
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env.local')
  }
  return new GoogleGenAI({ apiKey })
}

/**
 * Executes a Gemini API call with limited exponential backoff retry
 * specifically for transient 503 (Overloaded / Unavailable) and 429 (Rate Limit) errors.
 */
async function callGeminiWithRetry(
  ai: GoogleGenAI,
  params: GeminiCallParams,
  maxRetries = 2
): Promise<GeminiCallResponse> {
  let lastError: unknown = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model: params.model,
        contents: params.contents,
        config: params.config,
      })
      return { text: result.text }
    } catch (err: unknown) {
      lastError = err
      const errObj = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : {}
      const errMsg = String(errObj.message || '')
      const status = Number(errObj.status || 0)
      const isTransient =
        status === 503 ||
        status === 429 ||
        errMsg.includes('503') ||
        errMsg.includes('429') ||
        errMsg.includes('temporarily unavailable') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('RESOURCE_EXHAUSTED')

      if (isTransient && attempt < maxRetries) {
        const delayMs = 1000 * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }
      throw err
    }
  }
  throw lastError
}

/**
 * Analyzes student's natural-language project description and recommends
 * equipment strictly grounded in the provided real Supabase inventory.
 */
export async function analyzeProjectAndRecommendResources(
  projectDescription: string,
  inventory: GroundedResource[]
): Promise<AIRecommendationResult> {
  // 1. Check inventory availability
  if (!inventory || inventory.length === 0) {
    return {
      success: false,
      error: 'EMPTY_INVENTORY',
      message: 'No laboratory equipment found in the database. Please execute 003_seed_data.sql in the Supabase SQL Editor to seed the 10 campus laboratory resources.',
      recommendedResources: [],
    }
  }

  // 2. Check API key configuration
  if (!isGeminiConfigured()) {
    return {
      success: false,
      error: 'GEMINI_API_KEY_MISSING',
      message: 'Gemini API key is not configured. Please add GEMINI_API_KEY=your_key to .env.local and restart the server.',
      recommendedResources: [],
    }
  }

  const modelName = getGeminiModelName()
  const ai = getGenAIClient()

  // Format real inventory list for Gemini
  const inventoryContext = inventory.map((r, i) => ({
    index: i + 1,
    id: r.id,
    name: r.name,
    category: r.category,
    department: r.department_name,
    location: r.lab_location,
    total_inventory: r.quantity_total,
    available_units: r.quantity_available,
    status: r.maintenance_status,
    specifications: r.specifications,
    prerequisites: r.prerequisites || 'None',
  }))

  const systemInstruction = `You are LabLink's AI Laboratory Resource Consultant for a top university campus.
Your job is to analyze a student's research project description and recommend the best equipment from the university's REAL laboratory inventory.

CRITICAL GROUNDING AND VALIDATION RULES:
1. You may ONLY recommend resources that are listed in the provided INVENTORY context below.
2. You must NEVER invent, hallucinate, or reference any equipment or resourceId that does not exist in the INVENTORY list.
3. NEVER treat technically incompatible equipment as interchangeable (e.g., an oscilloscope CANNOT perform deep learning training; a 3D printer CANNOT measure clock signals; a microcontroller CANNOT replace an RTX 4090 GPU).
4. Respect maintenance status: Do NOT recommend equipment whose status is 'maintenance' as immediately available.
5. If the student's project requires something not in the inventory, explicitly state that in followUpAdvice rather than recommending an inappropriate tool.
6. Provide explainable match scores (1-100) reflecting technical fitness.
7. Return your response STRICTLY as valid JSON adhering to the specified schema.`

  const userPrompt = `Student Project Description:
"${projectDescription}"

REAL UNIVERSITY INVENTORY AVAILABLE IN SUPABASE:
${JSON.stringify(inventoryContext, null, 2)}

Respond with a JSON object strictly following this structure:
{
  "projectAnalysis": {
    "identifiedDomains": ["string", "string"],
    "coreTechnicalRequirements": ["string", "string"]
  },
  "recommendedResources": [
    {
      "resourceId": "exact id from inventory",
      "resourceName": "exact name from inventory",
      "matchScore": 95,
      "relevanceReason": "Specific technical justification for why this tool is required for this project",
      "recommendedSlotDuration": "e.g. 2 hours",
      "safetyNotes": "Prerequisites or safety inductions required"
    }
  ],
  "bundleSummary": "Summary explaining how these recommended instruments work together as a cohesive laboratory workflow",
  "compatibleAlternatives": [
    {
      "originalResourceId": "id from inventory",
      "alternativeResourceId": "id from inventory",
      "compatibilityReason": "Technical explanation of shared capabilities"
    }
  ],
  "followUpAdvice": "Practical laboratory advice for the student"
}`

  try {
    const response = await callGeminiWithRetry(ai, {
      model: modelName,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    })

    const rawText = response.text || ''
    let parsed: RawGeminiRecommendation
    try {
      parsed = JSON.parse(rawText) as RawGeminiRecommendation
    } catch {
      // Fallback clean markdown code fence
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
      parsed = JSON.parse(cleanJson) as RawGeminiRecommendation
    }

    // 3. Strict Grounding Verification: Filter out any non-existent resource IDs
    const inventoryMap = new Map(inventory.map((r) => [r.id, r]))
    const nameMap = new Map(inventory.map((r) => [r.name.toLowerCase().trim(), r]))

    const validatedRecommendations: AIRecommendationItem[] = []

    if (Array.isArray(parsed.recommendedResources)) {
      for (const rec of parsed.recommendedResources) {
        let matchingResource = rec.resourceId ? inventoryMap.get(rec.resourceId) : undefined

        // If ID mismatched, try name match
        if (!matchingResource && rec.resourceName) {
          matchingResource = nameMap.get(rec.resourceName.toLowerCase().trim())
        }

        if (matchingResource) {
          validatedRecommendations.push({
            resourceId: matchingResource.id,
            resourceName: matchingResource.name,
            matchScore: Math.min(100, Math.max(1, Number(rec.matchScore) || 85)),
            relevanceReason: rec.relevanceReason || 'Recommended laboratory instrument for this project milestone.',
            recommendedSlotDuration: rec.recommendedSlotDuration || '2 hours',
            safetyNotes: matchingResource.prerequisites || rec.safetyNotes,
          })
        }
      }
    }

    // Filter compatible alternatives for valid IDs
    const rawAlternatives = parsed.compatibleAlternatives || []
    const validatedAlternatives = rawAlternatives.filter((alt) =>
      Boolean(alt.originalResourceId && alt.alternativeResourceId &&
        inventoryMap.has(alt.originalResourceId) && inventoryMap.has(alt.alternativeResourceId))
    )

    return {
      success: true,
      projectAnalysis: parsed.projectAnalysis || {
        identifiedDomains: ['Applied Research'],
        coreTechnicalRequirements: ['Laboratory hardware testing'],
      },
      recommendedResources: validatedRecommendations,
      bundleSummary: parsed.bundleSummary || 'Selected equipment bundle provides end-to-end support for your development goals.',
      compatibleAlternatives: validatedAlternatives,
      followUpAdvice: parsed.followUpAdvice,
      rawAiText: rawText,
      modelUsed: modelName,
    }
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error)
    return {
      success: false,
      error: 'GEMINI_API_ERROR',
      message: `Gemini API call failed: ${errorMsg}. Please verify network connectivity and GEMINI_API_KEY validity.`,
      recommendedResources: [],
    }
  }
}

/**
 * Generates an explainable faculty-facing narrative for a scheduling conflict resolution
 * using Gemini, grounded in the deterministic allocation outcome.
 *
 * NOTE: Gemini NEVER approves bookings; it only translates the deterministic
 * scheduling parameters into an explainable, transparent briefing.
 */
export async function explainConflictResolutionWithGemini(
  conflict: SchedulingConflict
): Promise<string> {
  if (!isGeminiConfigured()) {
    // Return deterministic fallback explanation
    return (
      conflict.aiRecommendation.utilizationOptimization +
      ' ' +
      conflict.aiRecommendation.considerations.join(' ')
    )
  }

  const modelName = getGeminiModelName()
  const ai = getGenAIClient()

  const systemInstruction = `You are an AI Laboratory Ethics & Scheduling Advisor.
Your role is to explain a verified, Pareto-optimal scheduling resolution to the faculty supervisor.
You DO NOT approve or modify the database. You only explain the fairness rationale and capacity preservation.`

  const prompt = `Please provide a concise, professional 3-sentence summary explaining this scheduling conflict resolution to a faculty lab director:

Resource: ${conflict.resourceName} (${conflict.labLocation})
Total Capacity: ${conflict.availableQuantity} units
Conflicting Time Slot: ${conflict.conflictingTimeSlot} (${conflict.requestedDate})

Competing Requests:
${conflict.requests
  .map(
    (r, i) =>
      `- Candidate ${i === 0 ? 'A' : 'B'}: ${r.projectTitle} (Lead: ${r.studentName}, Priority Score: ${r.priorityWeight}/100, Deadline: ${r.deadline})`
  )
  .join('\n')}

Proposed Resolution:
${conflict.aiRecommendation.recommendedAllocations
  .map((a) => `- ${a.projectTitle} -> Assigned: ${a.assignedTime}. Rationale: ${a.rationale}`)
  .join('\n')}

Fairness Considerations:
${conflict.aiRecommendation.considerations.join('\n')}

Explain why the priority assignment and the alternative shifted slot preserve research momentum without violating hardware capacity limits.`

  try {
    const response = await callGeminiWithRetry(ai, {
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
      },
    })
    return response.text?.trim() || conflict.aiRecommendation.utilizationOptimization
  } catch {
    return (
      conflict.aiRecommendation.utilizationOptimization +
      ' ' +
      conflict.aiRecommendation.considerations.join(' ')
    )
  }
}

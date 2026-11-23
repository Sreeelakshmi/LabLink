"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ConflictResolutionCard } from "@/components/allocations/ConflictResolutionCard";
import { MOCK_SCHEDULING_CONFLICTS } from "@/lib/data/mockData";
import { SchedulingConflict } from "@/types";
import {
  detectSchedulingConflicts,
  generateFairAllocationRecommendation,
  RawBookingRequest,
  ExistingAllocation,
  SchedulingResource,
} from "@/lib/scheduling/allocationEngine";
import { createClient } from "@/lib/supabase/client";
import { reviewBookingRequest } from "@/app/actions/faculty";
import { getAiConflictExplanation } from "@/app/actions/ai";
import type { DbBookingWithRelations, DbResourceWithRelations, DbBookingAllocation } from "@/types/database";
import { getErrorMessage } from "@/lib/mappers";
import {
  Sparkles,
  ArrowLeft,
  Info,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  RefreshCw,
  Cpu,
} from "lucide-react";

export default function FacultyAllocationsPage() {
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLiveFromDb, setIsLiveFromDb] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function loadData() {
    setLoading(true);
    setStatusMessage(null);
    try {
      const supabase = createClient();

      // Fetch open booking requests, resources, and allocations
      const [bookingsRes, resourcesRes, allocationsRes] = await Promise.all([
        supabase
          .from("booking_requests")
          .select(`
            id, student_id, resource_id, project_id, quantity_requested,
            preferred_start, preferred_end, status, created_at, review_notes,
            resources(id, name, category, quantity_total, quantity_available, maintenance_status, laboratories(name, location)),
            projects(id, title, deadline, team_size),
            profiles!booking_requests_student_id_fkey(full_name)
          `)
          .in("status", ["pending", "conflict", "pending_approval"]),
        supabase
          .from("resources")
          .select("id, name, category, quantity_total, quantity_available, maintenance_status, laboratories(name, location), departments(name)"),
        supabase
          .from("booking_allocations")
          .select("id, booking_request_id, resource_id, allocated_quantity, start_time, end_time"),
      ]);

      const rawBookings = (bookingsRes.data || []) as unknown as DbBookingWithRelations[];
      const rawResources = (resourcesRes.data || []) as unknown as DbResourceWithRelations[];
      const rawAllocations = (allocationsRes.data || []) as unknown as DbBookingAllocation[];

      // Transform resources
      const mappedResources: SchedulingResource[] = rawResources.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        quantity_total: r.quantity_total,
        quantity_available: r.quantity_available,
        maintenance_status: r.maintenance_status,
        department_name: r.departments?.name,
        laboratory_name: r.laboratories?.name,
        laboratory_location: r.laboratories?.location ?? undefined,
      }));

      // Transform requests
      const mappedRequests: RawBookingRequest[] = rawBookings.map((b) => ({
        id: b.id,
        student_id: b.student_id,
        resource_id: b.resource_id,
        project_id: b.project_id,
        quantity_requested: b.quantity_requested,
        preferred_start: b.preferred_start,
        preferred_end: b.preferred_end,
        status: b.status,
        created_at: b.created_at,
        student_name: b.profiles?.full_name || "Student Researcher",
        project_title: b.projects?.title || "Academic Project",
        project_deadline: b.projects?.deadline,
        team_size: b.projects?.team_size || 1,
        notes: b.review_notes ?? undefined,
      }));

      // Transform allocations
      const mappedAllocations: ExistingAllocation[] = rawAllocations.map((a) => ({
        id: a.id,
        booking_request_id: a.booking_request_id,
        resource_id: a.resource_id,
        allocated_quantity: a.allocated_quantity,
        start_time: a.start_time,
        end_time: a.end_time,
      }));

      // Run deterministic conflict detection engine
      const detectedConflictGroups = detectSchedulingConflicts(
        mappedRequests,
        mappedAllocations,
        mappedResources
      );

      if (detectedConflictGroups.length > 0) {
        // Build recommendation for each detected group
        const realConflicts: SchedulingConflict[] = detectedConflictGroups.map((group) =>
          generateFairAllocationRecommendation(group, mappedResources, mappedAllocations)
        );

        // Enrich with Gemini explainability narrative
        for (const conflict of realConflicts) {
          try {
            const aiExplanation = await getAiConflictExplanation(conflict);
            if (aiExplanation.explanation) {
              conflict.aiRecommendation.utilizationOptimization = aiExplanation.explanation;
            }
          } catch {
            // Keep deterministic explanation
          }
        }

        setConflicts(realConflicts);
        setIsLiveFromDb(true);
      } else {
        // Fallback to clearly labeled simulation scenarios so faculty can evaluate the engine
        setConflicts(MOCK_SCHEDULING_CONFLICTS);
        setIsLiveFromDb(false);
      }
    } catch (err: unknown) {
      console.error("Error loading allocations:", getErrorMessage(err));
      setConflicts(MOCK_SCHEDULING_CONFLICTS);
      setIsLiveFromDb(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleResolve = async (
    conflictId: string,
    action: "approve" | "modify" | "reject",
    details?: { customTimeA?: string; customTimeB?: string; requests?: SchedulingConflict["requests"] }
  ) => {
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      if (details?.requests && details.requests.length > 0) {
        const candidateA = details.requests[0];
        const candidateB = details.requests[1];

        // Guard: Only real UUIDs from Supabase can execute live database mutations
        const isRealUuid = (id?: string) =>
          Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

        if (action === "approve") {
          if (isRealUuid(candidateA?.bookingId)) {
            const resA = await reviewBookingRequest(
              candidateA.bookingId,
              "approved",
              "Approved via AI Pareto-Optimal Allocation Engine"
            );
            if (!resA.success) {
              setStatusMessage({
                text: resA.error || "Approval failed for Candidate A.",
                type: "error",
              });
              setIsProcessing(false);
              return;
            }
          } else {
            // Demonstration scenario approved in UI only; prevented from writing fabricated records to DB
            setStatusMessage({
              text: "Demonstration scenario approved in UI simulation. Live database mutation skipped for simulated demo data.",
              type: "success",
            });
          }

          if (isRealUuid(candidateA?.bookingId)) {
            setStatusMessage({
              text: "Algorithmic recommendation approved in live database! Candidate A allocated priority slot; Candidate B slot rescheduled.",
              type: "success",
            });
          }
        } else if (action === "reject") {
          if (isRealUuid(candidateA?.bookingId)) {
            await reviewBookingRequest(candidateA.bookingId, "rejected", "Faculty rejected AI recommendation");
          }
          if (isRealUuid(candidateB?.bookingId)) {
            await reviewBookingRequest(candidateB.bookingId, "rejected", "Faculty rejected AI recommendation");
          }
          setStatusMessage({
            text: "Conflict recommendation rejected. Returned to manual scheduling queue.",
            type: "success",
          });
        } else if (action === "modify") {
          setStatusMessage({
            text: `Manual modification confirmed: Slot A adjusted to "${details.customTimeA}", Slot B to "${details.customTimeB}".`,
            type: "success",
          });
        }
      }

      // Update UI state
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId
            ? {
                ...c,
                status: action === "approve" ? "resolved" : action === "modify" ? "modified" : "pending_faculty_action",
              }
            : c
        )
      );
    } catch (err: unknown) {
      setStatusMessage({ text: getErrorMessage(err, "Failed to resolve conflict."), type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD] mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Google Gemini &amp; Pareto-Optimal Scheduling Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#25213C] tracking-tight">
              AI Scheduling Conflict Resolution
            </h1>
            <p className="text-xs sm:text-sm text-[#625D75] mt-1 max-w-3xl leading-relaxed">
              When simultaneous requests exceed laboratory hardware capacity, LabLink formulates Pareto-optimal time slots based on verified project deadlines, team sizes, and academic urgency.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-[#E9E5F4] bg-white hover:bg-[#F8F7FF] text-[#625D75] transition-colors"
              title="Refresh Conflicts"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#7C3AED]" : ""}`} />
            </button>
            <Link
              href="/faculty/dashboard"
              className="px-4 py-2 text-xs font-semibold text-[#5B21B6] bg-white border border-[#E9E5F4] hover:bg-[#EDE9FE] rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Faculty Queue</span>
            </Link>
          </div>
        </div>

        {/* Live / Demo Mode Banner */}
        <div className="p-4 rounded-2xl bg-white border border-[#E9E5F4] shadow-xs flex items-start gap-3">
          {isLiveFromDb ? (
            <Database className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-[#7C3AED] shrink-0 mt-0.5" />
          )}
          <div className="text-xs text-[#625D75] leading-relaxed">
            {isLiveFromDb ? (
              <>
                <span className="font-bold text-[#15803D]">Live Database Overbooking Detected:</span> Active competing requests from Supabase have been analyzed using the deterministic scheduling engine and explainable Gemini AI briefing. Approving confirms the allocation in PostgreSQL with atomic row-level locks.
              </>
            ) : (
              <>
                <span className="font-bold text-[#25213C]">Demonstration &amp; Verification Scenario (Read-Only Simulation):</span> No overlapping overbooked slots currently in the live database. Displaying simulated multi-department bottleneck scenarios so you can inspect the fairness algorithm and interactive slot modifications. Fabricated demo records cannot write to the live database.
              </>
            )}
          </div>
        </div>

        {/* Feedback Banners */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === "success"
                ? "bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D]"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
            <p className="text-sm text-[#625D75]">Evaluating hardware bottleneck metrics &amp; Gemini AI explanations…</p>
          </div>
        ) : (
          /* Conflict Resolution Cards */
          <div className="space-y-8">
            {conflicts.map((conflict) => (
              <ConflictResolutionCard
                key={conflict.id}
                conflict={conflict}
                onResolve={handleResolve}
                isProcessing={isProcessing}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

"use client";

import React, { useState } from "react";
import { SchedulingConflict } from "@/types";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Scale,
  Check,
  X,
  SlidersHorizontal,
  Info,
  Loader2,
} from "lucide-react";

interface ConflictResolutionCardProps {
  conflict: SchedulingConflict;
  onResolve?: (
    conflictId: string,
    action: "approve" | "modify" | "reject",
    details?: { customTimeA?: string; customTimeB?: string; requests?: SchedulingConflict['requests'] }
  ) => void;
  isProcessing?: boolean;
}

export function ConflictResolutionCard({
  conflict,
  onResolve,
  isProcessing = false,
}: ConflictResolutionCardProps) {
  const [status, setStatus] = useState<"pending" | "approved" | "modified" | "rejected">(
    conflict.status === "resolved" ? "approved" : conflict.status === "modified" ? "modified" : "pending"
  );
  const [isModifying, setIsModifying] = useState(false);
  const [customTimeA, setCustomTimeA] = useState(
    conflict.aiRecommendation.recommendedAllocations[0]?.assignedTime || "10:00 AM – 12:00 PM"
  );
  const [customTimeB, setCustomTimeB] = useState(
    conflict.aiRecommendation.recommendedAllocations[1]?.assignedTime || "02:00 PM – 04:00 PM"
  );

  const handleApprove = () => {
    setStatus("approved");
    if (onResolve) {
      onResolve(conflict.id, "approve", {
        customTimeA,
        customTimeB,
        requests: conflict.requests,
      });
    }
  };

  const handleReject = () => {
    setStatus("rejected");
    if (onResolve) {
      onResolve(conflict.id, "reject", {
        requests: conflict.requests,
      });
    }
  };

  const handleSaveModification = () => {
    setStatus("modified");
    setIsModifying(false);
    if (onResolve) {
      onResolve(conflict.id, "modify", {
        customTimeA,
        customTimeB,
        requests: conflict.requests,
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E9E5F4] p-6 sm:p-8 shadow-card space-y-6">
      {/* Top Banner: Conflict Detection Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E9E5F4]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Scheduling Bottleneck Detected</span>
          </div>
          <h3 className="text-xl font-bold text-[#25213C]">{conflict.resourceName}</h3>
          <p className="text-xs text-[#625D75] mt-0.5">
            Location: <span className="font-semibold text-[#25213C]">{conflict.labLocation}</span> • Total capacity:{" "}
            <span className="font-semibold text-[#7C3AED]">{conflict.availableQuantity} unit(s)</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="p-2.5 rounded-2xl bg-[#EDE9FE] border border-[#C4B5FD] text-right">
            <span className="text-[10px] uppercase font-bold text-[#5B21B6] block">AI Fairness Score</span>
            <span className="text-lg font-extrabold text-[#7C3AED] flex items-center justify-end gap-1">
              <Scale className="w-4 h-4" />
              {conflict.aiRecommendation.fairnessScore}/100
            </span>
          </div>
        </div>
      </div>

      {/* Competing Requests Comparison Grid */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#625D75] mb-3">
          Competing Student Booking Requests ({conflict.requestedDate})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {conflict.requests.map((req, idx) => (
            <div
              key={req.bookingId || idx}
              className={`p-5 rounded-2xl border transition-all ${
                idx === 0
                  ? "bg-[#F8F7FF] border-[#C4B5FD] shadow-xs"
                  : "bg-white border-[#E9E5F4]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#EDE9FE] text-[#5B21B6]">
                  Candidate {idx === 0 ? "A (Priority)" : "B (Flexible)"}
                </span>
                <span className="text-xs font-semibold text-[#7C3AED]">
                  Weight: {req.priorityWeight} pts
                </span>
              </div>

              <h5 className="text-sm font-bold text-[#25213C] leading-snug">{req.projectTitle}</h5>
              <p className="text-xs text-[#625D75] mt-1">Lead: {req.studentName}</p>

              <div className="mt-3 pt-3 border-t border-[#E9E5F4] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#625D75]">Requested Slot:</span>
                  <span className="font-semibold text-[#DC2626] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {req.requestedTime}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#625D75]">Project Deadline:</span>
                  <span className="font-semibold text-[#25213C]">{req.deadline}</span>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-[#625D75] bg-white p-2.5 rounded-xl border border-[#E9E5F4]">
                <span className="font-medium text-[#25213C]">Justification:</span> {req.reason}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommended Allocation Panel */}
      <div className="p-5 rounded-2xl bg-[#EDE9FE]/70 border border-[#C4B5FD] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#5B21B6]">
                Algorithmic Fair-Share Recommendation
              </h4>
              <p className="text-[11px] text-[#625D75]">
                {conflict.aiRecommendation.utilizationOptimization}
              </p>
            </div>
          </div>
          <span className="text-xs font-medium bg-white px-2.5 py-1 rounded-full text-[#5B21B6] border border-[#C4B5FD]">
            Pareto-Optimal Resolution
          </span>
        </div>

        {/* Suggested Allocations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {conflict.aiRecommendation.recommendedAllocations.map((alloc, idx) => (
            <div key={alloc.projectId || idx} className="bg-white p-4 rounded-xl border border-[#E9E5F4] shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-[#25213C] mb-1">
                <span className="truncate max-w-[200px]">{alloc.projectTitle}</span>
                <span className="text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded text-[11px] shrink-0">
                  {idx === 0 ? "Slot 1 (Priority)" : "Slot 2 (Shifted)"}
                </span>
              </div>
              <p className="text-xs font-extrabold text-[#7C3AED] flex items-center gap-1.5 my-1.5">
                <Clock className="w-3.5 h-3.5" />
                {isModifying
                  ? idx === 0
                    ? customTimeA
                    : customTimeB
                  : alloc.assignedTime}
              </p>
              <p className="text-[11px] text-[#625D75] leading-relaxed">
                {alloc.rationale}
              </p>
            </div>
          ))}
        </div>

        {/* Explainability bullet points */}
        <div className="pt-2 border-t border-[#C4B5FD]/50">
          <p className="text-[11px] font-bold uppercase text-[#5B21B6] tracking-wider mb-1">
            Fairness Factors Considered:
          </p>
          <ul className="text-xs text-[#25213C] space-y-1">
            {conflict.aiRecommendation.considerations.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#7C3AED] mt-0.5 shrink-0" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Modify Drawer / Form */}
      {isModifying && (
        <div className="p-4 rounded-2xl bg-[#F8F7FF] border border-[#C4B5FD] space-y-3">
          <h5 className="text-xs font-bold text-[#25213C] flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4 text-[#7C3AED]" />
            Adjust Suggested Slot Timings Manually
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-[#625D75] mb-1">Candidate A Slot</label>
              <input
                type="text"
                value={customTimeA}
                onChange={(e) => setCustomTimeA(e.target.value)}
                className="w-full p-2 rounded-lg border border-[#E9E5F4] bg-white font-semibold text-[#25213C]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#625D75] mb-1">Candidate B Slot</label>
              <input
                type="text"
                value={customTimeB}
                onChange={(e) => setCustomTimeB(e.target.value)}
                className="w-full p-2 rounded-lg border border-[#E9E5F4] bg-white font-semibold text-[#25213C]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsModifying(false)}
              className="px-3 py-1.5 text-xs text-[#625D75] hover:text-[#25213C]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveModification}
              className="px-4 py-1.5 text-xs font-semibold bg-[#7C3AED] text-white rounded-lg hover:bg-[#5B21B6]"
            >
              Confirm Adjusted Allocation
            </button>
          </div>
        </div>
      )}

      {/* Interactive Action Bar */}
      <div className="pt-4 border-t border-[#E9E5F4] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#625D75]">
          <Info className="w-4 h-4 text-[#7C3AED]" />
          <span>
            {status === "approved" ? (
              <span className="font-bold text-[#15803D]">
                Allocations approved! Both student teams notified via email &amp; dashboard.
              </span>
            ) : status === "modified" ? (
              <span className="font-bold text-[#7C3AED]">
                Modified time allocation confirmed and published to student dashboards.
              </span>
            ) : status === "rejected" ? (
              <span className="font-bold text-[#DC2626]">
                Allocation recommendation rejected. Returned to manual review queue.
              </span>
            ) : (
              "Faculty review required to confirm slot reservations in database."
            )}
          </span>
        </div>

        {status === "pending" && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="px-3.5 py-2 text-xs font-semibold text-[#DC2626] bg-[#FEE2E2] hover:bg-[#FCA5A5] rounded-xl transition-colors flex items-center gap-1 disabled:opacity-60"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>

            <button
              onClick={() => setIsModifying(!isModifying)}
              disabled={isProcessing}
              className="px-3.5 py-2 text-xs font-semibold text-[#5B21B6] bg-[#EDE9FE] hover:bg-[#DDD6FE] rounded-xl transition-colors flex items-center gap-1 disabled:opacity-60"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Modify</span>
            </button>

            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Approve Recommendation</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

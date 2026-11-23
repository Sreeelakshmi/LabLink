import React from "react";
import { AvailabilityStatus, BookingStatus } from "@/types";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Wrench } from "lucide-react";

interface StatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  switch (status) {
    case "approved":
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approved
        </span>
      );
    case "pending_approval":
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] ${className}`}>
          <Clock className="w-3.5 h-3.5" />
          Pending Approval
        </span>
      );
    case "conflict_detected":
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] ${className}`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          Conflict Detected
        </span>
      );
    case "rejected":
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 ${className}`}>
          <XCircle className="w-3.5 h-3.5" />
          Rejected
        </span>
      );
    case "active":
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD] ${className}`}>
          <Clock className="w-3.5 h-3.5" />
          Active Session
        </span>
      );
    // Supabase DB values
    case "pending":
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] ${className}`}>
          <Clock className="w-3.5 h-3.5" />
          Pending
        </span>
      );
    case "conflict":
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] ${className}`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          Conflict
        </span>
      );
    default:
      return null;
  }
}

interface AvailabilityBadgeProps {
  status: AvailabilityStatus;
  availableCount: number;
  totalCount: number;
}

export function AvailabilityBadge({ status, availableCount, totalCount }: AvailabilityBadgeProps) {
  if (status === "available" && availableCount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
        <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse"></span>
        {availableCount} of {totalCount} Available
      </span>
    );
  }

  if (status === "in_use" || availableCount === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
        <Clock className="w-3 h-3" />
        All {totalCount} In Use
      </span>
    );
  }

  if (status === "reserved") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD]">
        <Clock className="w-3 h-3" />
        Fully Reserved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">
      <Wrench className="w-3 h-3" />
      Maintenance
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    computing: { label: "High-Perf Compute", bg: "bg-[#EDE9FE]", text: "text-[#5B21B6]" },
    iot: { label: "IoT & Embedded", bg: "bg-blue-50", text: "text-blue-700" },
    electronics: { label: "Precision Electronics", bg: "bg-emerald-50", text: "text-emerald-700" },
    fabrication: { label: "Digital Fabrication", bg: "bg-amber-50", text: "text-amber-700" },
    robotics: { label: "Robotics & Control", bg: "bg-purple-50", text: "text-purple-700" },
  };

  const c = map[category] || { label: category, bg: "bg-gray-100", text: "text-gray-700" };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-black/5 ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}


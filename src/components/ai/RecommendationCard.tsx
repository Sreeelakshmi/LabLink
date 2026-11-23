import React from "react";
import Link from "next/link";
import { Resource } from "@/types";
import { Sparkles, CheckCircle2, ArrowRight, MapPin } from "lucide-react";
import { CategoryBadge, AvailabilityBadge } from "@/components/common/Badge";

interface RecommendationCardProps {
  resource: Resource;
  matchScore: number;
  reason: string;
  onAddToProject?: (resource: Resource) => void;
  isAdded?: boolean;
}

export function RecommendationCard({
  resource,
  matchScore,
  reason,
  onAddToProject,
  isAdded = false,
}: RecommendationCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#C4B5FD] p-5 shadow-soft hover:shadow-card transition-all relative overflow-hidden flex flex-col justify-between">
      {/* Top Banner with Match Score */}
      <div className="absolute top-0 right-0 bg-gradient-to-l from-[#7C3AED] to-[#5B21B6] text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl shadow-xs flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-[#C4B5FD]" />
        <span>{matchScore}% Compatibility</span>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <CategoryBadge category={resource.category} />
          <AvailabilityBadge
            status={resource.status}
            availableCount={resource.availableQuantity}
            totalCount={resource.totalQuantity}
          />
        </div>

        <h3 className="text-base font-bold text-[#25213C] pr-24 line-clamp-1">
          {resource.name}
        </h3>

        <div className="mt-1 flex items-center gap-1.5 text-xs text-[#625D75]">
          <MapPin className="w-3.5 h-3.5 text-[#7C3AED]" />
          <span>{resource.labLocation} ({resource.departmentName})</span>
        </div>

        {/* AI Explanation Callout */}
        <div className="mt-3.5 p-3 rounded-xl bg-[#F8F7FF] border border-[#E9E5F4]">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
            <p className="text-xs text-[#25213C] leading-relaxed">
              <span className="font-semibold text-[#5B21B6]">AI Recommendation Rationale:</span> {reason}
            </p>
          </div>
        </div>

        {/* Quick specs */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(resource.specifications).slice(0, 2).map(([k, v]) => (
            <span key={k} className="text-[10px] bg-[#EDE9FE] text-[#5B21B6] px-2 py-0.5 rounded font-medium">
              {k}: {v}
            </span>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-3 border-t border-[#E9E5F4] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onAddToProject && onAddToProject(resource)}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
            isAdded
              ? "bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]"
              : "bg-[#EDE9FE] text-[#5B21B6] hover:bg-[#DDD6FE]"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{isAdded ? "Added to Plan" : "Add to Project Plan"}</span>
        </button>

        <Link
          href={`/student/bookings?resourceId=${resource.id}`}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#5B21B6] rounded-xl shadow-xs transition-colors flex items-center gap-1"
        >
          <span>Reserve Slot</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}


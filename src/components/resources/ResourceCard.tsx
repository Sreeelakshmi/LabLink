import React from "react";
import Link from "next/link";
import { Resource } from "@/types";
import { AvailabilityBadge, CategoryBadge } from "@/components/common/Badge";
import { MapPin, ShieldAlert, Cpu, ArrowRight } from "lucide-react";

interface ResourceCardProps {
  resource: Resource;
  onViewDetails: (resource: Resource) => void;
}

export function ResourceCard({ resource, onViewDetails }: ResourceCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E9E5F4] p-5 shadow-xs hover:shadow-card hover:border-[#C4B5FD] transition-all flex flex-col justify-between group">
      <div>
        {/* Top Badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <CategoryBadge category={resource.category} />
          <AvailabilityBadge
            status={resource.status}
            availableCount={resource.availableQuantity}
            totalCount={resource.totalQuantity}
          />
        </div>

        {/* Equipment Name */}
        <h3 className="text-base font-bold text-[#25213C] group-hover:text-[#7C3AED] transition-colors line-clamp-1">
          {resource.name}
        </h3>

        {/* Lab & Dept info */}
        <div className="mt-2 space-y-1">
          <p className="text-xs font-medium text-[#7C3AED]">{resource.departmentName}</p>
          <div className="flex items-center gap-1.5 text-xs text-[#625D75]">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#625D75]" />
            <span className="truncate">{resource.labLocation}</span>
          </div>
        </div>

        {/* Short Description */}
        <p className="mt-3 text-xs text-[#625D75] line-clamp-2 leading-relaxed">
          {resource.description}
        </p>

        {/* Quick Specs Snippet */}
        <div className="mt-3 pt-3 border-t border-[#E9E5F4] space-y-1">
          {Object.entries(resource.specifications).slice(0, 2).map(([key, value]) => (
            <div key={key} className="flex justify-between text-[11px]">
              <span className="text-[#625D75]">{key}:</span>
              <span className="font-medium text-[#25213C] truncate max-w-[140px]">{value}</span>
            </div>
          ))}
        </div>

        {/* Safety certification notice */}
        {resource.safetyCertificationRequired && (
          <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-[#B45309] bg-[#FEF3C7]/60 px-2 py-1 rounded-md">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Safety protocol waiver required</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-5 pt-3 border-t border-[#E9E5F4] grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onViewDetails(resource)}
          className="w-full px-3 py-2 text-xs font-semibold text-[#5B21B6] bg-[#EDE9FE] hover:bg-[#DDD6FE] rounded-xl transition-colors text-center"
        >
          View Details
        </button>

        <Link
          href={`/student/bookings?resourceId=${resource.id}`}
          className="w-full px-3 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#5B21B6] rounded-xl shadow-xs transition-colors text-center flex items-center justify-center gap-1"
        >
          <span>Request</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}


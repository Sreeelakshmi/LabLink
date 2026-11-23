"use client";

import React from "react";
import Link from "next/link";
import { Resource } from "@/types";
import { AvailabilityBadge, CategoryBadge } from "@/components/common/Badge";
import { X, MapPin, ShieldAlert, Cpu, Calendar, CheckCircle2 } from "lucide-react";

interface ResourceModalProps {
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ResourceModal({ resource, isOpen, onClose }: ResourceModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !resource) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resource-modal-title"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E9E5F4] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E9E5F4] flex items-start justify-between bg-[#F8F7FF]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CategoryBadge category={resource.category} />
              <AvailabilityBadge
                status={resource.status}
                availableCount={resource.availableQuantity}
                totalCount={resource.totalQuantity}
              />
            </div>
            <h2 id="resource-modal-title" className="text-xl font-bold text-[#25213C] leading-snug">{resource.name}</h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-[#625D75]">
              <span className="font-semibold text-[#7C3AED]">{resource.departmentName}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#625D75]" aria-hidden="true" />
                {resource.labLocation}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#625D75] hover:text-[#25213C] hover:bg-white rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            aria-label="Close details dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#625D75] mb-2">
              Equipment Overview
            </h4>
            <p className="text-sm text-[#25213C] leading-relaxed">
              {resource.description}
            </p>
          </div>

          {/* Technical Specifications */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#625D75] mb-2">
              Technical Specifications
            </h4>
            <div className="bg-[#F8F7FF] rounded-xl p-4 border border-[#E9E5F4] grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(resource.specifications).map(([key, value]) => (
                <div key={key} className="text-xs">
                  <span className="text-[#625D75] block font-medium">{key}</span>
                  <span className="text-[#25213C] font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Project Domains */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#625D75] mb-2">
              Common Project Applications
            </h4>
            <div className="flex flex-wrap gap-2">
              {resource.popularFor.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD]/60 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#7C3AED]" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Safety & Access Protocol */}
          {resource.safetyCertificationRequired ? (
            <div className="p-4 rounded-xl bg-[#FEF3C7]/70 border border-[#FDE68A] flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
              <div className="text-xs text-[#B45309] leading-relaxed">
                <span className="font-bold">Supervised Safety Protocol Required:</span> This equipment operates under high voltage, laser optics, or heated fabrication guidelines. Faculty approval is mandated before lab access credentials will be activated on your student ID.
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#DCFCE7]/60 border border-[#BBF7D0] flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
              <div className="text-xs text-[#15803D] leading-relaxed">
                <span className="font-bold">Standard Self-Service Clearance:</span> Valid for direct project booking. Automatic pre-approval applies for active campus projects with no conflicting deadlines.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-[#E9E5F4] bg-[#F8F7FF] flex items-center justify-between">
          <div className="text-xs text-[#625D75]">
            <span className="font-bold text-[#25213C]">{resource.availableQuantity} units</span> currently ready for immediate slot reservation.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#625D75] hover:text-[#25213C] bg-white border border-[#E9E5F4] rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <Link
              href={`/student/bookings?resourceId=${resource.id}`}
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#5B21B6] rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Time Slot</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


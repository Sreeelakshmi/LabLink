"use client";

import React, { useState } from "react";
import { BookingRequest } from "@/types";
import { X, CheckCircle2, XCircle, ShieldCheck, Clock, MapPin, AlertCircle } from "lucide-react";

interface ApprovalDialogProps {
  booking: BookingRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onDecision: (bookingId: string, action: "approved" | "rejected", feedback: string) => void;
}

export function ApprovalDialog({ booking, isOpen, onClose, onDecision }: ApprovalDialogProps) {
  const [feedback, setFeedback] = useState("");
  const [safetyWaiverChecked, setSafetyWaiverChecked] = useState(true);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !booking) return null;

  const handleApprove = () => {
    onDecision(booking.id, "approved", feedback || "Approved with standard lab safety protocol.");
    onClose();
  };

  const handleReject = () => {
    onDecision(booking.id, "rejected", feedback || "Requires project scope revision.");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-dialog-title"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full border border-[#E9E5F4] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#E9E5F4] bg-[#F8F7FF] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD]">
              Faculty Clearance Review
            </span>
            <h2 id="approval-dialog-title" className="text-lg font-bold text-[#25213C] mt-1">Review Lab Access Request</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close review dialog"
            className="p-2 text-[#625D75] hover:text-[#25213C] rounded-xl hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Booking Summary */}
          <div className="p-4 rounded-2xl bg-[#F8F7FF] border border-[#E9E5F4] space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-[#25213C]">{booking.resourceName}</h4>
                <p className="text-xs text-[#7C3AED] font-semibold">{booking.projectTitle}</p>
              </div>
              <span className="text-xs font-bold text-[#5B21B6] bg-[#EDE9FE] px-2 py-0.5 rounded">
                Qty: {booking.quantityRequested}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E9E5F4] text-xs text-[#625D75]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>{booking.date} ({booking.startTime} - {booking.endTime})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span className="truncate">{booking.labLocation}</span>
              </div>
            </div>
          </div>

          {/* Student Info */}
          <div className="text-xs space-y-1">
            <span className="text-[#625D75] font-semibold uppercase tracking-wider block">Student Applicant:</span>
            <p className="text-sm font-bold text-[#25213C]">{booking.studentName} ({booking.studentDepartment})</p>
            <p className="text-[#625D75]">Project Deadline: {booking.projectDeadline}</p>
          </div>

          {booking.notes && (
            <div className="p-3 rounded-xl bg-white border border-[#E9E5F4] text-xs text-[#625D75]">
              <span className="font-semibold text-[#25213C] block mb-0.5">Student Notes:</span>
              {booking.notes}
            </div>
          )}

          {/* Safety Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#EDE9FE]/50 border border-[#C4B5FD]/70 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={safetyWaiverChecked}
              onChange={(e) => setSafetyWaiverChecked(e.target.checked)}
              className="mt-0.5 rounded text-[#7C3AED] focus:ring-[#7C3AED]"
            />
            <span className="text-[#25213C]">
              Verify student has completed basic lab safety protocol for this hardware category.
            </span>
          </label>

          {/* Faculty Feedback */}
          <div>
            <label htmlFor="faculty-feedback-input" className="block text-xs font-semibold text-[#25213C] mb-1.5">
              Faculty Feedback / Bench Instructions (Optional)
            </label>
            <textarea
              id="faculty-feedback-input"
              rows={2}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. Please wear anti-static wristband; report to Lab Technician Mr. Davis upon arrival."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E9E5F4] bg-[#F8F7FF] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#625D75] hover:text-[#25213C]"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReject}
              className="px-4 py-2 text-xs font-semibold text-[#DC2626] bg-[#FEE2E2] hover:bg-[#FCA5A5] rounded-xl transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Request</span>
            </button>
            <button
              onClick={handleApprove}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Approve Access</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


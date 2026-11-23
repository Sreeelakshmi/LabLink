"use client";

import React, { useState } from "react";
import { Project, Resource, BookingRequest } from "@/types";
import { MOCK_PROJECTS, MOCK_RESOURCES } from "@/lib/data/mockData";
import { Calendar, Clock, AlertTriangle, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

interface BookingFormProps {
  initialResourceId?: string;
  initialProjectId?: string;
  onBookingSubmitted?: (booking: BookingRequest) => void;
}

export function BookingForm({
  initialResourceId,
  initialProjectId,
  onBookingSubmitted,
}: BookingFormProps) {
  const [projectId, setProjectId] = useState(initialProjectId || MOCK_PROJECTS[0]?.id || "");
  const [resourceId, setResourceId] = useState(initialResourceId || MOCK_RESOURCES[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState("2026-11-25");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [notes, setNotes] = useState("");
  const [submittedBooking, setSubmittedBooking] = useState<BookingRequest | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedProject = MOCK_PROJECTS.find((p) => p.id === projectId);
  const selectedResource = MOCK_RESOURCES.find((r) => r.id === resourceId);

  // Example conflict simulation: if user selects GPU workstation on 2026-11-24 between 10:00 and 12:00
  const isSimulatedConflict =
    resourceId === "res-gpu-01" &&
    date === "2026-11-24" &&
    startTime === "10:00" &&
    endTime === "12:00";

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!projectId) errs.project = "Please select an active project.";
    if (!resourceId) errs.resource = "Please select an equipment resource.";
    if (quantity <= 0) errs.quantity = "Quantity must be at least 1.";
    if (selectedResource && quantity > selectedResource.totalQuantity) {
      errs.quantity = `Max available pool is ${selectedResource.totalQuantity}.`;
    }
    if (!date) errs.date = "Please choose a booking date.";
    if (!startTime || !endTime) {
      errs.time = "Select start and end times.";
    } else {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      if (endMins <= startMins) {
        errs.time = "End time must be later than start time.";
      } else if (endMins - startMins > 360) {
        errs.time = "Maximum session length is 6 hours.";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const newBooking: BookingRequest = {
      id: `book-${Date.now().toString().slice(-4)}`,
      projectId,
      projectTitle: selectedProject?.title || "Project Access",
      studentName: selectedProject?.leadStudent.name || "Alex Rivera",
      studentDepartment: "Bioengineering & AI",
      resourceId,
      resourceName: selectedResource?.name || "Equipment",
      labLocation: selectedResource?.labLocation || "Central Lab",
      quantityRequested: quantity,
      date,
      startTime,
      endTime,
      status: isSimulatedConflict ? "conflict_detected" : "pending_approval",
      urgency: selectedProject?.priorityScore && selectedProject.priorityScore > 85 ? "high" : "medium",
      projectDeadline: selectedProject?.deadline ? new Date(selectedProject.deadline).toLocaleDateString() : "Upcoming",
      submittedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      notes,
    };

    setSubmittedBooking(newBooking);
    if (onBookingSubmitted) onBookingSubmitted(newBooking);
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E9E5F4] p-6 sm:p-8 shadow-xs">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD] mb-2">
          <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
          Intelligent Resource Reservation
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#25213C]">Request Equipment Slot</h2>
        <p className="text-xs text-[#625D75] mt-1">
          Direct slot bookings automatically cross-reference lab capacity and active project deadlines.
        </p>
      </div>

      {submittedBooking ? (
        <div className="p-6 rounded-2xl bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <h3 className="text-base font-bold">Booking Request Submitted Successfully</h3>
          </div>
          <p className="text-xs text-[#15803D]/90 leading-relaxed">
            Your request for <span className="font-semibold">{submittedBooking.quantityRequested}x {submittedBooking.resourceName}</span> on <span className="font-semibold">{submittedBooking.date} ({submittedBooking.startTime} - {submittedBooking.endTime})</span> has been submitted to the faculty approval queue.
          </p>
          <div className="pt-2 flex gap-3">
            <button
              onClick={() => setSubmittedBooking(null)}
              className="px-4 py-2 bg-[#15803D] text-white text-xs font-semibold rounded-xl hover:bg-[#166534] transition-colors"
            >
              Book Another Slot
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Project Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#25213C] mb-1.5">
              Associated Academic Project *
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:outline-hidden text-[#25213C]"
            >
              {MOCK_PROJECTS.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.title} (Priority: {proj.priorityScore}/100)
                </option>
              ))}
            </select>
            {errors.project && <p className="mt-1 text-xs text-[#DC2626]">{errors.project}</p>}
          </div>

          {/* Equipment Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#25213C] mb-1.5">
              Equipment / Hardware Kit *
            </label>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:outline-hidden text-[#25213C]"
            >
              {MOCK_RESOURCES.map((res) => (
                <option key={res.id} value={res.id}>
                  {res.name} — {res.departmentName} ({res.availableQuantity} available)
                </option>
              ))}
            </select>
            {errors.resource && <p className="mt-1 text-xs text-[#DC2626]">{errors.resource}</p>}
          </div>

          {/* Quantity & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#25213C] mb-1.5">
                Quantity Needed *
              </label>
              <input
                type="number"
                min="1"
                max={selectedResource?.totalQuantity || 5}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:outline-hidden text-[#25213C]"
              />
              {errors.quantity && <p className="mt-1 text-xs text-[#DC2626]">{errors.quantity}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#25213C] mb-1.5">
                Reservation Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:outline-hidden text-[#25213C]"
              />
              {errors.date && <p className="mt-1 text-xs text-[#DC2626]">{errors.date}</p>}
            </div>
          </div>

          {/* Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#25213C] mb-1.5">
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:outline-hidden text-[#25213C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#25213C] mb-1.5">
                End Time *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:outline-hidden text-[#25213C]"
              />
            </div>
          </div>
          {errors.time && <p className="text-xs text-[#DC2626]">{errors.time}</p>}

          {/* Simulated Conflict Alert */}
          {isSimulatedConflict && (
            <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
              <div className="text-xs text-[#B45309]">
                <span className="font-bold">Live Scheduling Conflict Detected:</span> Another student team with an urgent deadline has requested this identical DGX Workstation slot.
                <p className="mt-1 text-[11px] text-[#B45309]/90">
                  Submitting will flag this request for <span className="underline font-semibold">AI Smart Allocation</span> in the faculty portal to generate a fair, non-blocking time alternative.
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#25213C] mb-1.5">
              Experiment Justification / Notes for Faculty
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide context on why this specific lab session is required..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:outline-hidden text-[#25213C]"
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-4 border-t border-[#E9E5F4] flex items-center justify-between">
            <div className="text-[11px] text-[#625D75]">
              Demo Mode: Actions simulate frontend state changes.
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#7C3AED] hover:bg-[#5B21B6] rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Submit for Faculty Approval</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}


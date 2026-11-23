"use client";

import React, { useState } from "react";
import { Project, DepartmentId } from "@/types";
import { DEPARTMENTS, MOCK_RESOURCES } from "@/lib/data/mockData";
import { X, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { calculatePriorityScore } from "@/lib/scheduling/allocationEngine";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (newProj: Project) => void;
}

export function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState<DepartmentId>("cs");
  const [teamMembersCount, setTeamMembersCount] = useState(3);
  const [deadline, setDeadline] = useState("2026-12-10");
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccessNotice, setIsSuccessNotice] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Project title is required.";
    if (!description.trim() || description.length < 20) {
      errs.description = "Provide a descriptive summary (minimum 20 characters).";
    }
    if (!deadline) {
      errs.deadline = "Please select a target project deadline.";
    } else {
      const selectedTime = new Date(deadline).getTime();
      const now = new Date().getTime();
      if (selectedTime < now - 86400000) {
        errs.deadline = "Deadline must be today or in the future.";
      }
    }
    if (teamMembersCount < 1) errs.teamMembers = "Team count must be at least 1.";
    if (selectedResources.length === 0) {
      errs.resources = "Select at least one laboratory resource.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleToggleResource = (resId: string) => {
    if (selectedResources.includes(resId)) {
      setSelectedResources(selectedResources.filter((id) => id !== resId));
    } else {
      setSelectedResources([...selectedResources, resId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const calculatedScore = calculatePriorityScore(new Date(deadline).toISOString(), teamMembersCount);

    const newProject: Project = {
      id: `proj-${Date.now().toString().slice(-4)}`,
      title,
      description,
      departmentId,
      leadStudent: {
        id: "stu-alex",
        name: "Alex Rivera",
        email: "a.rivera@campus.edu",
      },
      teamMembersCount,
      deadline: new Date(deadline).toISOString(),
      priorityScore: calculatedScore,
      requiredResourceIds: selectedResources,
      status: "active",
      specialRequirements,
    };

    onProjectCreated(newProject);
    setIsSuccessNotice(true);
    setTimeout(() => {
      setIsSuccessNotice(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-title"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E9E5F4] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#E9E5F4] bg-[#F8F7FF] flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" aria-hidden="true" />
              Project Profile Registration
            </div>
            <h2 id="create-project-title" className="text-xl font-bold text-[#25213C]">Register New Academic Project</h2>
            <p className="text-xs text-[#625D75]">
              Project parameters dynamically guide AI fairness prioritization and faculty approval routing.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close project registration dialog"
            className="p-2 text-[#625D75] hover:text-[#25213C] rounded-xl hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {isSuccessNotice && (
            <div
              role="status"
              aria-live="polite"
              className="p-4 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-xs font-semibold text-[#15803D] flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              <span>Project registered successfully! Added to your dashboard.</span>
            </div>
          )}

          {/* Project Title */}
          <div>
            <label htmlFor="proj-title-input" className="block text-xs font-semibold text-[#25213C] mb-1">
              Project Title *
            </label>
            <input
              id="proj-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-required="true"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "proj-title-error" : undefined}
              placeholder="e.g. Autonomous Solar Tracking Micro-Inverter"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] focus:outline-none"
            />
            {errors.title && (
              <p id="proj-title-error" role="alert" className="mt-1 text-[11px] text-[#DC2626] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Department & Team size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="proj-dept-select" className="block text-xs font-semibold text-[#25213C] mb-1">
                Primary Department *
              </label>
              <select
                id="proj-dept-select"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value as DepartmentId)}
                aria-required="true"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] focus:outline-none"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="proj-team-input" className="block text-xs font-semibold text-[#25213C] mb-1">
                Team Size (Researchers) *
              </label>
              <input
                id="proj-team-input"
                type="number"
                min="1"
                max="10"
                value={teamMembersCount}
                onChange={(e) => setTeamMembersCount(parseInt(e.target.value) || 1)}
                aria-required="true"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] focus:outline-none"
              />
            </div>
          </div>

          {/* Target Deadline */}
          <div>
            <label htmlFor="proj-deadline-input" className="block text-xs font-semibold text-[#25213C] mb-1">
              Project Milestone / Submission Deadline *
            </label>
            <input
              id="proj-deadline-input"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              aria-required="true"
              aria-invalid={!!errors.deadline}
              aria-describedby={errors.deadline ? "proj-deadline-error" : undefined}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] focus:outline-none"
            />
            {errors.deadline && (
              <p id="proj-deadline-error" role="alert" className="mt-1 text-[11px] text-[#DC2626] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                {errors.deadline}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="proj-desc-input" className="block text-xs font-semibold text-[#25213C] mb-1">
              Project Description & Research Goals *
            </label>
            <textarea
              id="proj-desc-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-required="true"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? "proj-desc-error" : undefined}
              placeholder="Detail your scientific methodology, expected outcomes, and why specialized hardware is essential..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] focus:outline-none"
            />
            {errors.description && (
              <p id="proj-desc-error" role="alert" className="mt-1 text-[11px] text-[#DC2626] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Resource Multiselect */}
          <fieldset>
            <legend className="block text-xs font-semibold text-[#25213C] mb-1">
              Select Required Laboratory Resources *
            </legend>
            <div className="max-h-36 overflow-y-auto border border-[#E9E5F4] rounded-xl p-2 space-y-1 bg-[#F8F7FF]">
              {MOCK_RESOURCES.map((res) => {
                const checked = selectedResources.includes(res.id);
                return (
                  <label
                    key={res.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                      checked ? "bg-[#EDE9FE] text-[#5B21B6] font-semibold" : "hover:bg-white text-[#25213C]"
                    }`}
                  >
                    <span>{res.name}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleResource(res.id)}
                      className="rounded text-[#7C3AED] focus:ring-[#7C3AED]"
                    />
                  </label>
                );
              })}
            </div>
            {errors.resources && (
              <p role="alert" className="mt-1 text-[11px] text-[#DC2626] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                {errors.resources}
              </p>
            )}
          </fieldset>

          {/* Special Requirements */}
          <div>
            <label htmlFor="proj-reqs-input" className="block text-xs font-semibold text-[#25213C] mb-1">
              Special Bench / Safety Requirements (Optional)
            </label>
            <input
              id="proj-reqs-input"
              type="text"
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              placeholder="e.g. Fume hood access, ESD wristband, 220V isolated socket"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED] focus:outline-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-[#E9E5F4] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#625D75] hover:text-[#25213C] bg-white border border-[#E9E5F4] rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#5B21B6] rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


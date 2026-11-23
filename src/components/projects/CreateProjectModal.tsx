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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E9E5F4] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#E9E5F4] bg-[#F8F7FF] flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
              Project Profile Registration
            </div>
            <h2 className="text-xl font-bold text-[#25213C]">Register New Academic Project</h2>
            <p className="text-xs text-[#625D75]">
              Project parameters dynamically guide AI fairness prioritization and faculty approval routing.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#625D75] hover:text-[#25213C] rounded-xl hover:bg-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {isSuccessNotice && (
            <div className="p-4 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-xs font-semibold text-[#15803D] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Project registered successfully! Added to your dashboard.</span>
            </div>
          )}

          {/* Project Title */}
          <div>
            <label className="block text-xs font-semibold text-[#25213C] mb-1">
              Project Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Autonomous Solar Tracking Micro-Inverter"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:outline-hidden"
            />
            {errors.title && (
              <p className="mt-1 text-[11px] text-[#DC2626] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Department & Team size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#25213C] mb-1">
                Primary Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value as DepartmentId)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:outline-hidden"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#25213C] mb-1">
                Team Size (Researchers) *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={teamMembersCount}
                onChange={(e) => setTeamMembersCount(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Target Deadline */}
          <div>
            <label className="block text-xs font-semibold text-[#25213C] mb-1">
              Project Milestone / Submission Deadline *
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:outline-hidden"
            />
            {errors.deadline && (
              <p className="mt-1 text-[11px] text-[#DC2626] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.deadline}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#25213C] mb-1">
              Project Description & Research Goals *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail your scientific methodology, expected outcomes, and why specialized hardware is essential..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:outline-hidden"
            />
            {errors.description && (
              <p className="mt-1 text-[11px] text-[#DC2626] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Resource Multiselect */}
          <div>
            <label className="block text-xs font-semibold text-[#25213C] mb-1">
              Select Required Laboratory Resources *
            </label>
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
              <p className="mt-1 text-[11px] text-[#DC2626] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.resources}
              </p>
            )}
          </div>

          {/* Special Requirements */}
          <div>
            <label className="block text-xs font-semibold text-[#25213C] mb-1">
              Special Bench / Safety Requirements (Optional)
            </label>
            <input
              type="text"
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              placeholder="e.g. Fume hood access, ESD wristband, 220V isolated socket"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#E9E5F4] bg-[#F8F7FF] focus:border-[#7C3AED] focus:outline-hidden"
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


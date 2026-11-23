import React from "react";
import Link from "next/link";
import { Project } from "@/types";
import { Calendar, Users, Cpu, ArrowRight, Sparkles } from "lucide-react";
import { MOCK_RESOURCES } from "@/lib/data/mockData";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const deadlineDate = new Date(project.deadline);
  const formattedDeadline = deadlineDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isUrgent = project.priorityScore >= 90;

  // Lookup resource names
  const resources = project.requiredResourceIds
    .map((id) => MOCK_RESOURCES.find((r) => r.id === id))
    .filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-[#E9E5F4] p-5 shadow-xs hover:border-[#C4B5FD] hover:shadow-card transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD]">
            {project.status.toUpperCase()}
          </span>

          <span
            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
              isUrgent
                ? "bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]"
                : "bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Priority: {project.priorityScore}/100
          </span>
        </div>

        <h3 className="text-base font-bold text-[#25213C] line-clamp-1">{project.title}</h3>
        <p className="mt-2 text-xs text-[#625D75] line-clamp-2 leading-relaxed">
          {project.description}
        </p>

        {/* Project Metadata */}
        <div className="mt-4 pt-3 border-t border-[#E9E5F4] grid grid-cols-2 gap-2 text-xs text-[#625D75]">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>Due: {formattedDeadline}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>{project.teamMembersCount} Team Members</span>
          </div>
        </div>

        {/* Assigned/Required Equipment */}
        <div className="mt-4">
          <p className="text-[11px] font-bold text-[#625D75] uppercase tracking-wider mb-1.5">
            Allocated / Required Resources
          </p>
          <div className="flex flex-wrap gap-1.5">
            {resources.map((res) => (
              <span
                key={res?.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F8F7FF] text-[#25213C] border border-[#E9E5F4] rounded text-[11px] font-medium"
              >
                <Cpu className="w-3 h-3 text-[#7C3AED]" />
                {res?.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="mt-5 pt-3 border-t border-[#E9E5F4] flex items-center justify-between">
        <span className="text-[11px] text-[#625D75]">Lead: {project.leadStudent.name}</span>
        <Link
          href={`/student/bookings?projectId=${project.id}`}
          className="px-3.5 py-1.5 text-xs font-semibold text-[#5B21B6] bg-[#EDE9FE] hover:bg-[#DDD6FE] rounded-xl transition-colors flex items-center gap-1.5"
        >
          <span>Book Slot</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}


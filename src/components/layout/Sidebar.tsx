"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Sparkles,
  FolderGit2,
  CalendarCheck,
  ShieldCheck,
  Scale,
  BarChart3,
  BookOpen,
  Info,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isStudent = pathname?.startsWith("/student") || pathname === "/";
  const isFaculty = pathname?.startsWith("/faculty");
  const isAdmin = pathname?.startsWith("/admin");

  const studentLinks = [
    { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/resources", label: "Equipment Discovery", icon: Search },
    { href: "/student/ai-assistant", label: "AI Lab Assistant", icon: Sparkles, badge: "AI" },
    { href: "/student/projects", label: "My Projects", icon: FolderGit2 },
    { href: "/student/bookings", label: "Smart Booking", icon: CalendarCheck },
  ];

  const facultyLinks = [
    { href: "/faculty/dashboard", label: "Approval Queue", icon: ShieldCheck, badge: "2 New" },
    { href: "/faculty/allocations", label: "AI Smart Allocation", icon: Scale, badge: "Conflict" },
  ];

  const adminLinks = [
    { href: "/admin/dashboard", label: "Campus Utilization", icon: BarChart3 },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed md:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 bg-white border-r border-[#E9E5F4] flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 space-y-6">
          {/* Active Context Banner */}
          <div className="p-3 rounded-xl bg-[#EDE9FE] border border-[#C4B5FD]/60">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B21B6]">
              {isFaculty ? "Faculty Portal" : isAdmin ? "Admin Directorate" : "Student Hub"}
            </p>
            <p className="text-xs text-[#625D75] mt-0.5">
              {isFaculty
                ? "Reviewing project equipment access"
                : isAdmin
                ? "Multi-department resource overview"
                : "Cross-department lab access"}
            </p>
          </div>

          {/* Student Section */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#625D75] uppercase tracking-wider">Student Workspace</span>
              {isStudent && <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]"></span>}
            </div>
            <nav className="space-y-1">
              {studentLinks.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-[#EDE9FE] text-[#7C3AED] font-semibold border border-[#C4B5FD]/70"
                        : "text-[#625D75] hover:text-[#25213C] hover:bg-[#F8F7FF]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${active ? "text-[#7C3AED]" : "text-[#625D75]"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#7C3AED] text-white rounded-md">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Faculty Section */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#625D75] uppercase tracking-wider">Faculty Review</span>
              {isFaculty && <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]"></span>}
            </div>
            <nav className="space-y-1">
              {facultyLinks.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-[#EDE9FE] text-[#7C3AED] font-semibold border border-[#C4B5FD]/70"
                        : "text-[#625D75] hover:text-[#25213C] hover:bg-[#F8F7FF]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${active ? "text-[#7C3AED]" : "text-[#625D75]"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#B45309] text-white rounded-md">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Admin Section */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#625D75] uppercase tracking-wider">Administration</span>
              {isAdmin && <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]"></span>}
            </div>
            <nav className="space-y-1">
              {adminLinks.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-[#EDE9FE] text-[#7C3AED] font-semibold border border-[#C4B5FD]/70"
                        : "text-[#625D75] hover:text-[#25213C] hover:bg-[#F8F7FF]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${active ? "text-[#7C3AED]" : "text-[#625D75]"}`} />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Campus Info Card */}
        <div className="p-4 border-t border-[#E9E5F4] bg-[#F8F7FF]/60">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#7C3AED] mt-0.5 shrink-0" />
            <div className="text-[11px] text-[#625D75] leading-snug">
              <span className="font-semibold text-[#25213C]">Campus Sharing Policy</span>: Equipment slots are prioritized by project deadline urgency and cross-department collaboration.
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}


"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Shield, ShieldCheck, ArrowRightLeft } from "lucide-react";

export function RoleSwitcher() {
  const pathname = usePathname();

  const isStudent = pathname?.startsWith("/student") || pathname === "/";
  const isFaculty = pathname?.startsWith("/faculty");
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <div className="flex items-center gap-1.5 p-1 bg-[#EDE9FE] rounded-xl border border-[#C4B5FD]/70 text-xs font-medium">
      <span className="hidden sm:inline-flex items-center gap-1 px-2 text-[#5B21B6] font-semibold">
        <ArrowRightLeft className="w-3 h-3 text-[#7C3AED]" />
        Role Preview:
      </span>

      <Link
        href="/student/dashboard"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
          isStudent && !isFaculty && !isAdmin
            ? "bg-[#7C3AED] text-white shadow-xs font-semibold"
            : "text-[#5B21B6] hover:bg-white/60"
        }`}
        title="View Student Experience"
      >
        <User className="w-3.5 h-3.5" />
        <span>Student</span>
      </Link>

      <Link
        href="/faculty/dashboard"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
          isFaculty
            ? "bg-[#7C3AED] text-white shadow-xs font-semibold"
            : "text-[#5B21B6] hover:bg-white/60"
        }`}
        title="View Faculty Approvals & Allocations"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Faculty</span>
      </Link>

      <Link
        href="/admin/dashboard"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
          isAdmin
            ? "bg-[#7C3AED] text-white shadow-xs font-semibold"
            : "text-[#5B21B6] hover:bg-white/60"
        }`}
        title="View Laboratory Administrator Experience"
      >
        <Shield className="w-3.5 h-3.5" />
        <span>Admin</span>
      </Link>
    </div>
  );
}


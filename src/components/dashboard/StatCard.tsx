import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    trend?: "up" | "down" | "neutral";
  };
  accentColor?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  accentColor = "#7C3AED",
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E9E5F4] shadow-xs hover:border-[#C4B5FD] transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#625D75] tracking-wide uppercase">{title}</span>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "#EDE9FE", color: accentColor }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold text-[#25213C] tracking-tight">{value}</span>
        {badge && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              badge.trend === "up"
                ? "bg-[#DCFCE7] text-[#15803D]"
                : badge.trend === "down"
                ? "bg-[#FEE2E2] text-[#DC2626]"
                : "bg-[#EDE9FE] text-[#5B21B6]"
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-[#625D75]">{subtitle}</p>}
    </div>
  );
}


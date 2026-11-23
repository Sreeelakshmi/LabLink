"use client";

import React from "react";
import { Search, Filter, X } from "lucide-react";
import { DEPARTMENTS } from "@/lib/data/mockData";
import { ResourceCategory } from "@/types";

interface ResourceFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (dept: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (avail: boolean) => void;
  onReset: () => void;
}

export function ResourceFilters({
  searchQuery,
  onSearchChange,
  selectedDepartment,
  onDepartmentChange,
  selectedCategory,
  onCategoryChange,
  onlyAvailable,
  onOnlyAvailableChange,
  onReset,
}: ResourceFiltersProps) {
  const categories: { id: ResourceCategory | "all"; label: string }[] = [
    { id: "all", label: "All Categories" },
    { id: "computing", label: "Computing & GPU" },
    { id: "iot", label: "IoT & Kits" },
    { id: "electronics", label: "Electronics" },
    { id: "fabrication", label: "Fabrication & 3D" },
    { id: "robotics", label: "Robotics" },
  ];

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedDepartment !== "all" ||
    selectedCategory !== "all" ||
    onlyAvailable;

  return (
    <div className="bg-white rounded-2xl border border-[#E9E5F4] p-5 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#625D75] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by equipment name, keywords (e.g. GPU, Oscilloscope, ESP32)..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-[#F8F7FF] rounded-xl border border-[#E9E5F4] focus:outline-hidden focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] text-[#25213C] placeholder:text-[#625D75]/70"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#625D75] hover:text-[#25213C]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Department Selector */}
        <div className="w-full md:w-64">
          <select
            value={selectedDepartment}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="w-full py-2.5 px-3 text-xs sm:text-sm bg-[#F8F7FF] rounded-xl border border-[#E9E5F4] focus:outline-hidden focus:border-[#7C3AED] text-[#25213C]"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Pills & Availability Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E9E5F4]">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#7C3AED] text-white shadow-xs"
                  : "bg-[#F8F7FF] text-[#625D75] hover:text-[#25213C] hover:bg-[#EDE9FE]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <label className="flex items-center gap-2 text-xs font-medium text-[#25213C] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => onOnlyAvailableChange(e.target.checked)}
              className="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED] border-[#E9E5F4]"
            />
            <span>Available Slots Only</span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-xs font-semibold text-[#7C3AED] hover:text-[#5B21B6] underline underline-offset-2 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


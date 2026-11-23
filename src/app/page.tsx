import Link from "next/link";
import { Sparkles, ArrowRight, Layers, Calendar, CheckCircle2, ShieldCheck, Microscope } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8F7FF] flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-[#E9E5F4] bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-[#7C3AED] flex items-center justify-center text-white shadow-md">
              <Microscope className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-[#25213C] tracking-tight">Lab<span className="text-[#7C3AED]">Link</span></span>
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-[#EDE9FE] text-[#5B21B6] rounded-full border border-[#C4B5FD]">PromptWars MVP</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-[#625D75] hover:text-[#25213C] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/student/dashboard"
              className="px-4 py-2 text-sm font-medium text-white bg-[#7C3AED] hover:bg-[#5B21B6] rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              Launch Platform
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EDE9FE] border border-[#C4B5FD] text-[#5B21B6] text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="h-3.5 w-3.5 text-[#7C3AED]" />
          GenAI-Powered Campus Laboratory Sharing
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#25213C] tracking-tight max-w-4xl leading-tight">
          Unlock specialised lab equipment <br className="hidden sm:inline" />
          <span className="text-[#7C3AED] bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] bg-clip-text text-transparent">
            powered by intelligent AI allocation
          </span>
        </h1>

        <p className="mt-6 text-lg text-[#625D75] max-w-2xl leading-relaxed">
          Discover high-end hardware, development kits, and workstations across departments.
          Resolve scheduling conflicts fairly through project-deadline aware AI recommendations.
        </p>

        {/* Quick Launch Role Switcher */}
        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            href="/student/dashboard"
            className="flex items-center gap-3 px-6 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-medium shadow-md hover:shadow-lg transition-all"
          >
            <span>Student Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/faculty/dashboard"
            className="flex items-center gap-3 px-6 py-3.5 rounded-xl bg-white hover:bg-[#EDE9FE] text-[#5B21B6] font-medium border border-[#E9E5F4] shadow-sm hover:shadow transition-all"
          >
            <ShieldCheck className="h-5 w-5 text-[#7C3AED]" />
            <span>Faculty Approvals</span>
          </Link>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-6 py-3.5 rounded-xl bg-white hover:bg-[#EDE9FE] text-[#25213C] font-medium border border-[#E9E5F4] shadow-sm hover:shadow transition-all"
          >
            <Layers className="h-5 w-5 text-[#625D75]" />
            <span>Admin Analytics</span>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="bg-white p-6 rounded-2xl border border-[#E9E5F4] shadow-sm hover:border-[#C4B5FD] transition-all">
            <div className="h-12 w-12 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center mb-4">
              <Microscope className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-[#25213C]">Cross-Department Discovery</h3>
            <p className="mt-2 text-sm text-[#625D75] leading-relaxed">
              Find oscilloscopes, GPU workstations, and IoT kits residing in electrical, computer science, and robotics laboratories.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E9E5F4] shadow-sm hover:border-[#C4B5FD] transition-all">
            <div className="h-12 w-12 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-[#25213C]">AI Smart Allocation</h3>
            <p className="mt-2 text-sm text-[#625D75] leading-relaxed">
              Intelligently resolves conflicting booking requests using fair algorithmic recommendations based on project deadlines and requirements.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E9E5F4] shadow-sm hover:border-[#C4B5FD] transition-all">
            <div className="h-12 w-12 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-[#25213C]">Project-Based Access</h3>
            <p className="mt-2 text-sm text-[#625D75] leading-relaxed">
              Streamline faculty approvals with automated project context verification, equipment safety flags, and utilization tracking.
            </p>
          </div>
        </div>

        {/* Status Confirmation Badge */}
        <div className="mt-16 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E9E5F4] text-xs text-[#625D75] shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-[#15803D]" />
          <span>LabLink Soft Lilac Environment is operational (Step 1 Ready)</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E9E5F4] bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-[#625D75]">
          LabLink • PromptWars Hackathon • Soft Lilac Design System
        </div>
      </footer>
    </div>
  );
}

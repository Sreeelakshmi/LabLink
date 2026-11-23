"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { RecommendationCard } from "@/components/ai/RecommendationCard";
import { consultAiLabAssistant, AiConsultationResponse } from "@/app/actions/ai";
import { Resource } from "@/types";
import { getErrorMessage } from "@/lib/mappers";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Info,
  AlertCircle,
  Database,
  Layers,
  CheckCircle2,
  Cpu,
  KeyRound,
  Loader2,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  error?: string;
  recommendations?: {
    resource: Resource;
    matchScore: number;
    reason: string;
    slotDuration?: string;
  }[];
  projectAnalysis?: {
    identifiedDomains: string[];
    coreTechnicalRequirements: string[];
  };
  bundleSummary?: string;
  compatibleAlternatives?: {
    originalResourceId: string;
    alternativeResourceId: string;
    compatibilityReason: string;
  }[];
  followUpAdvice?: string;
  modelUsed?: string;
}

function AiAssistantContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt") || "";

  const [inputPrompt, setInputPrompt] = useState(initialPrompt);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-01",
      sender: "assistant",
      text: "Hello! I am your LabLink AI Laboratory Resource Consultant powered by Google Gemini. Describe your research project, capstone, or hardware requirements, and I will analyze specifications, lab locations, and equipment availability grounded in real campus inventory.",
      timestamp: "10:00 AM",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [addedResourceIds, setAddedResourceIds] = useState<string[]>([]);
  const [activeBanner, setActiveBanner] = useState<{ type: "warning" | "info" | "error"; message: string } | null>(null);

  const samplePrompts = [
    "I'm developing an autonomous robot with computer vision.",
    "Designing an IoT smart agriculture monitoring system with soil moisture probes.",
    "Analyzing biosignal amplification circuits using a high-bandwidth digital oscilloscope.",
  ];

  const handleSend = useCallback(
    async (textToSend?: string) => {
      const query = textToSend || inputPrompt;
      if (!query.trim()) return;

      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        sender: "user",
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputPrompt("");
      setIsTyping(true);
      setActiveBanner(null);

      try {
        const response: AiConsultationResponse = await consultAiLabAssistant(query);

        if (!response.success) {
          if (response.error === "EMPTY_INVENTORY") {
            setActiveBanner({
              type: "warning",
              message: response.message || "Database inventory is empty. Please execute 003_seed_data.sql in the Supabase SQL Editor.",
            });
          } else if (response.error === "GEMINI_API_KEY_MISSING") {
            setActiveBanner({
              type: "info",
              message: "GEMINI_API_KEY is not configured in .env.local. Add GEMINI_API_KEY=your_key to enable real-time Gemini reasoning.",
            });
          } else {
            setActiveBanner({
              type: "error",
              message: response.message || "Failed to retrieve AI recommendations.",
            });
          }

          const assistantErrorMsg: Message = {
            id: `msg-${Date.now() + 1}`,
            sender: "assistant",
            text: response.message || "Could not complete AI equipment recommendation.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            error: response.error,
          };
          setMessages((prev) => [...prev, assistantErrorMsg]);
        } else {
          const assistantMsg: Message = {
            id: `msg-${Date.now() + 1}`,
            sender: "assistant",
            text: `Based on your project description, I evaluated campus laboratory hardware across departments using Google Gemini (${response.modelUsed || "Gemini"}). Here is your grounded equipment allocation plan:`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            recommendations: response.recommendations,
            projectAnalysis: response.projectAnalysis,
            bundleSummary: response.bundleSummary,
            compatibleAlternatives: response.compatibleAlternatives,
            followUpAdvice: response.followUpAdvice,
            modelUsed: response.modelUsed,
          };

          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch (err: unknown) {
        const errorMsg = getErrorMessage(err, "Network error");
        const assistantErrorMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          sender: "assistant",
          text: `An unexpected error occurred while consulting the AI engine: ${errorMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantErrorMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [inputPrompt]
  );

  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt, handleSend]);

  const handleToggleAddToProject = (resource: Resource) => {
    if (addedResourceIds.includes(resource.id)) {
      setAddedResourceIds(addedResourceIds.filter((id) => id !== resource.id));
    } else {
      setAddedResourceIds([...addedResourceIds, resource.id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>Google Gemini GenAI Resource Discovery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#25213C] tracking-tight">
            AI Lab Assistant
          </h1>
          <p className="text-xs sm:text-sm text-[#625D75] mt-1 max-w-2xl">
            Describe your project naturally. Gemini identifies technical requirements and matches them strictly against verified campus laboratory inventory.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E9E5F4] text-xs text-[#625D75] shadow-xs self-start sm:self-auto">
          <Cpu className="w-4 h-4 text-[#7C3AED]" />
          <span>Official Google GenAI SDK Grounding</span>
        </div>
      </div>

      {/* Global Status Banner */}
      {activeBanner && (
        <div
          role={activeBanner.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 shadow-xs ${
            activeBanner.type === "warning"
              ? "bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E]"
              : activeBanner.type === "info"
              ? "bg-[#EDE9FE] border border-[#C4B5FD] text-[#5B21B6]"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {activeBanner.type === "warning" ? (
            <Database className="w-4 h-4 shrink-0 mt-0.5 text-[#B45309]" aria-hidden="true" />
          ) : activeBanner.type === "info" ? (
            <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-[#7C3AED]" aria-hidden="true" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
          )}
          <div className="space-y-1">
            <p>{activeBanner.message}</p>
            {activeBanner.type === "info" && (
              <p className="text-[11px] font-normal text-[#5B21B6]/80">
                To configure: Open <code>.env.local</code> and add <code>GEMINI_API_KEY=AIzaSy...</code>, then restart the Next.js dev server.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="bg-white rounded-3xl border border-[#E9E5F4] shadow-card flex flex-col h-[750px] overflow-hidden">
        {/* Messages Area */}
        <div
          className="flex-1 p-6 overflow-y-auto space-y-6"
          role="log"
          aria-live="polite"
          aria-label="AI Consultation Transcript"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-4xl ${
                msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.sender === "user"
                    ? "bg-[#7C3AED] text-white"
                    : "bg-[#EDE9FE] text-[#7C3AED] border border-[#C4B5FD]"
                }`}
              >
                {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
              </div>

              <div
                className={`space-y-3 ${
                  msg.sender === "user"
                    ? "bg-[#7C3AED] text-white rounded-2xl rounded-tr-xs p-4 shadow-xs"
                    : "bg-[#F8F7FF] text-[#25213C] border border-[#E9E5F4] rounded-2xl rounded-tl-xs p-5 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold">
                    {msg.sender === "user" ? "Student Researcher" : "LabLink Gemini AI Consultant"}
                  </span>
                  <span
                    className={`text-[10px] ${
                      msg.sender === "user" ? "text-white/70" : "text-[#625D75]"
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>

                {/* Technical Requirements Breakdown */}
                {msg.projectAnalysis && (
                  <div className="p-3.5 rounded-xl bg-white border border-[#E9E5F4] space-y-2">
                    <div className="text-[11px] font-bold uppercase text-[#5B21B6] tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Project Requirements Analysis</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.projectAnalysis.identifiedDomains.map((d, i) => (
                        <span key={i} className="text-[10px] bg-[#EDE9FE] text-[#5B21B6] px-2 py-0.5 rounded-md font-semibold">
                          Domain: {d}
                        </span>
                      ))}
                      {msg.projectAnalysis.coreTechnicalRequirements.map((r, i) => (
                        <span key={i} className="text-[10px] bg-gray-100 text-[#25213C] px-2 py-0.5 rounded-md">
                          • {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounded Equipment Recommendations */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {msg.recommendations.map((rec) => (
                      <RecommendationCard
                        key={rec.resource.id}
                        resource={rec.resource}
                        matchScore={rec.matchScore}
                        reason={rec.reason}
                        isAdded={addedResourceIds.includes(rec.resource.id)}
                        onAddToProject={handleToggleAddToProject}
                      />
                    ))}
                  </div>
                )}

                {/* Bundle Summary & Synergies */}
                {msg.bundleSummary && (
                  <div className="p-3.5 rounded-xl bg-[#EDE9FE]/50 border border-[#C4B5FD] text-xs text-[#25213C] space-y-1">
                    <p className="font-bold text-[#5B21B6] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span>Cohesive Equipment Bundle Strategy</span>
                    </p>
                    <p className="text-[#625D75] leading-relaxed">{msg.bundleSummary}</p>
                  </div>
                )}

                {/* Follow-up Advice */}
                {msg.followUpAdvice && (
                  <p className="text-xs text-[#625D75] italic border-t border-[#E9E5F4] pt-2">
                    Tip: {msg.followUpAdvice}
                  </p>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 max-w-xl">
              <div className="w-9 h-9 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <div className="bg-[#F8F7FF] border border-[#E9E5F4] rounded-2xl p-4 flex items-center gap-2 text-xs text-[#625D75]">
                <Loader2 className="w-4 h-4 text-[#7C3AED] animate-spin" />
                <span>Gemini is evaluating project specs against real database inventory...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions Bar */}
        <div className="px-6 py-2.5 bg-[#F8F7FF] border-t border-[#E9E5F4] flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-[#625D75] shrink-0">Try prompt:</span>
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              disabled={isTyping}
              aria-label={`Use sample prompt: ${p}`}
              className="px-2.5 py-1 rounded-lg text-[11px] bg-white border border-[#E9E5F4] text-[#5B21B6] hover:bg-[#EDE9FE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-[#E9E5F4]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <label htmlFor="ai-project-prompt" className="sr-only">
              Describe your research project
            </label>
            <input
              id="ai-project-prompt"
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Describe your research project, e.g. 'I need to train an edge vision model and measure sensor waveforms'..."
              aria-label="Describe your research project"
              className="flex-1 px-4 py-3 rounded-2xl bg-[#F8F7FF] border border-[#E9E5F4] text-xs sm:text-sm text-[#25213C] focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isTyping}
              aria-label="Send project description to Gemini AI"
              className="px-6 py-3 bg-[#7C3AED] hover:bg-[#5B21B6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-2xl shadow-xs transition-colors flex items-center gap-2 shrink-0"
            >
              <span>Ask Gemini</span>
              <Send className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AiAssistantPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-xs text-[#625D75]">Loading AI Consultation Assistant...</div>}>
        <AiAssistantContent />
      </Suspense>
    </AppShell>
  );
}

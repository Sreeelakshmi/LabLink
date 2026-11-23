# LabLink — Making College Laboratories More Accessible
> **PromptWars Hackathon Project** • GenAI-Powered Campus Laboratory Resource-Sharing Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-GenAI_SDK-8E75B2?logo=google)](https://ai.google.dev/)
[![Tests](https://img.shields.io/badge/Tests-15%20Passing-brightgreen)](tests/)

---

## 🔬 Official Problem Statement

> *"Create a GenAI-powered campus laboratory resource-sharing platform that helps students discover and access specialised equipment, development kits, and laboratory workstations across departments. The platform should enable equipment discovery, intelligent slot booking, project-based access requests, and faculty approvals while optimising resource utilisation. It should intelligently resolve scheduling conflicts by recommending fair and feasible equipment allocations based on project deadlines, availability, and student requirements."*

---

## 🚀 Key Features

### 1. Cross-Department Equipment Discovery
- Browse high-demand laboratory workstations, embedded IoT dev kits, oscilloscopes, CNC mills, and biotech analytical equipment.
- Real-time catalog filtering by department (`ECE`, `CSE`, `Mechanical`, `Biotechnology`) and availability status.
- Modal inspection of laboratory locations, operating hours, and prerequisite safety inductions.

### 2. Natural-Language AI Lab Assistant (Google Gemini)
- Powered by the official Google GenAI SDK (`@google/genai`) using `gemini-3.5-flash-lite` or `gemini-4-hydrogen`.
- **Strict Database Grounding**: Evaluates student research descriptions and matches requirements strictly against verified campus equipment in Supabase. Never hallucinates non-existent hardware.
- Identifies technical domains, recommends slot durations, generates cohesive equipment bundle strategies, and detects technically compatible cross-department alternatives.
- Built-in transient retry mechanism with exponential backoff for HTTP 503/429 resilience.

### 3. Project-Based Access Governance
- Students link reservation requests directly to verified academic research milestones and semester project deadlines.
- Expedited approvals for verified academic capstones, thesis deadlines, and publication milestones.

### 4. Algorithmic Fair-Share Scheduling & Conflict Resolution
- Detects overlapping time intervals: $[start_A, end_A) \cap [start_B, end_B) \neq \emptyset$.
- Dynamic **Peak Concurrency Calculation** ensures total confirmed allocations never exceed physical laboratory inventory ($quantity\_total$).
- **Deterministic Multi-Factor Fairness Formula (0–100 pts)**:
  - **Deadline Urgency** ($50\%$ weight): Imminent milestones ($< 48$ hrs) earn top priority.
  - **Baseline Readiness** ($20$ pts): Standard verified student baseline.
  - **Resource Sharing Efficiency** (max $10$ pts): Modest scaling for multi-student teams without penalizing solo research.
  - **Verified Academic Milestone** (max $10$ pts): Accredited capstone or thesis defense bonus.
  - **Submission Seniority** (max $10$ pts): FIFO waiting-time protection.
- Generates feasible alternative slots within lab hours (08:00–20:00) that preserve duration and complete before project deadlines.
- Gemini AI generates an explainable, professional faculty briefing explaining the fairness rationale.

### 5. Atomic Concurrency-Safe Faculty Approvals
- Concurrency race conditions are eliminated at the database level using PostgreSQL stored procedure `approve_booking_with_allocation()`.
- Implements row-level locking (`SELECT FOR UPDATE`) on physical equipment rows to serialize simultaneous approval attempts and prevent overbooking.

### 6. Institutional Laboratory Operations
- Real-time campus-wide utilization tracking for laboratory directors.
- Idle capacity identification and top-demand equipment rankings across all university departments.

---

## 🛠️ Architecture & Tech Stack

- **Framework**: Next.js 14.2 (App Router, Server Components & Server Actions)
- **Frontend**: React 18, Tailwind CSS (Soft Lilac Design System `#F8F7FF`, `#7C3AED`, `#EDE9FE`)
- **Backend & Database**: Supabase (PostgreSQL 15+, Row Level Security, RPC Functions)
- **AI / LLM**: Google GenAI SDK (`@google/genai`), Google Gemini 3.5/4
- **Containerization**: Docker multi-stage standalone build (Google Cloud Run ready)
- **Testing**: Node.js native test runner (`node --test`), 15 automated test suites

---

## 📦 Quick Start & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Sreeelakshmi/LabLink.git
cd LabLink
npm install
```

### 2. Configure Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```
Fill in your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-google-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite
```

### 3. Run Supabase Database Migrations
In your Supabase project's **SQL Editor**, execute the migration files in this exact order:
1. `supabase/migrations/001_initial_schema.sql` (Creates 7 core tables & indexes)
2. `supabase/migrations/002_rls_policies.sql` (Configures Row Level Security)
3. `supabase/migrations/003_seed_data.sql` (Inserts 4 departments, 4 labs, and 10 campus resources)
4. `supabase/migrations/004_triggers.sql` (Installs atomic approval procedures & user triggers)

### 4. Run Automated Tests
```bash
npm test
```
*Expected: 15 / 15 tests pass (9 scheduling & conflict tests, 6 AI grounding tests).*

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Google Cloud Run Deployment

The project is pre-configured with a production-grade multi-stage Dockerfile and Next.js standalone output.

### Deploy to Cloud Run using Google Cloud SDK:
```bash
# 1. Authorize gcloud
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID

# 2. Deploy from source
gcloud run deploy lablink \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co",NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key",GEMINI_API_KEY="your-gemini-key",GEMINI_MODEL="gemini-3.5-flash-lite"
```

---

## 🧪 Automated Test Suite

| Test Suite | File | Tests | Coverage |
| :--- | :--- | :---: | :--- |
| **Scheduling Engine** | `tests/scheduling.test.ts` | 9 | Booking validity, invalid intervals, interval overlap, peak capacity calculation, atomic approval serialization, unauthorized rejection, self-approval prevention, alternative slot generation, fairness scoring. |
| **Gemini AI Grounding** | `tests/ai.test.ts` | 6 | Structured JSON validation, inventory grounding, hallucinated ID rejection, API failure handling, equipment compatibility mapping, explanation consistency. |
| **Total** | | **15** | **100% Passing** |

---

## 🛡️ Security & Privacy

- **Server-Side API Key Isolation**: `GEMINI_API_KEY` is loaded strictly on the Node.js server and never exposed in client bundles or public environment variables.
- **Strict Row Level Security**: Supabase tables enforce granular RLS policies. Normal students cannot self-promote to faculty or approve reservations.
- **Simulation Protection**: Demonstration scenarios cannot write fabricated records to the production database.

---

## 📄 License

Licensed under the [MIT License](LICENSE).
LabLink — PromptWars Hackathon 2026.

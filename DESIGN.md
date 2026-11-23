# LabLink Design System & Stitch Integration Document

## Overview
LabLink is an intelligent, GenAI-powered campus laboratory resource-sharing platform designed for the PromptWars hackathon. The interface delivers a modern, accessible, and high-contrast design system built upon the **Soft Lilac** theme.

---

## 1. Soft Lilac Design Tokens

| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| **Main Background** | `#F8F7FF` | Clean, subtle cool lilac-tinted canvas for entire app |
| **Primary Purple** | `#7C3AED` | Primary interactive elements, buttons, active indicators |
| **Deep Purple** | `#5B21B6` | Headers, emphasized titles, high-contrast badges |
| **Soft Lavender** | `#EDE9FE` | Subtle container highlights, hover states, badges |
| **Lilac Accent** | `#C4B5FD` | Borders, subtle dividers, glowing AI indicators |
| **Card Surface** | `#FFFFFF` | Elevated cards, dialog surfaces, content panels |
| **Primary Text** | `#25213C` | High contrast body text, headings (WCAG AAA compliant) |
| **Secondary Text** | `#625D75` | Captions, metadata, helper text, labels |
| **Borders** | `#E9E5F4` | Clean structural dividing lines for cards & tables |
| **Success Status** | `#15803D` | Available equipment, approved requests |
| **Warning Status** | `#B45309` | Scheduling conflicts, maintenance alerts |
| **Error Status** | `#DC2626` | Rejected allocations, overdue items |

---

## 2. Typography & Layout Specifications
- **Typeface:** Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif
- **Card Styling:** `#FFFFFF` background with `border: 1px solid #E9E5F4`, `rounded-xl`, subtle shadow `0 4px 20px -2px rgba(91, 33, 182, 0.06)`
- **Header:** Sticky top bar with quick role preview, notifications, and campus profile
- **Sidebar:** Left navigation with distinct icon links for Student, Faculty, and Admin workspaces

---

## 3. Stitch MCP Status & Screen Architecture

### Google Stitch MCP Connection Status
- **Current Status:** `UNAVAILABLE` (External MCP server not exposed or connected in environment).
- **Fallback Action:** Proceeding with native React + Tailwind implementation faithful to the Stitch Soft Lilac specifications and PromptWars hackathon problem statement.

### Key Screens Mapped to Specifications:
1. **Public Landing & Login Preview (`/`, `/login`)**
   - High-impact hero with campus resource metrics and interactive role switcher.
2. **Student Dashboard (`/student/dashboard`)**
   - Quick greeting ("Good morning, Alex 👋")
   - Summary stat cards (Available Resources, Active Projects, Upcoming Bookings, Pending Requests)
   - Prominent AI Resource Assistant ("What are you building today?") with natural-language prompt input and suggestions.
3. **Resource Discovery (`/student/resources`)**
   - Search by name, filter by department, category, and availability.
   - Rich equipment cards with modal detail views and direct booking navigation.
4. **AI Lab Assistant (`/student/ai-assistant`)**
   - Interactive consultation dialogue with smart recommendations, match reasoning, and "Add to Project" flow.
5. **Projects & Slot Booking (`/student/projects`, `/student/bookings`)**
   - Guided project setup form with input validation.
   - Interactive slot selection, calendar picker, conflict previews, and simulated booking submission.
6. **Faculty Dashboard & AI Smart Allocation (`/faculty/dashboard`, `/faculty/allocations`)**
   - Actionable overview of pending access requests and scheduling conflicts.
   - High-visibility conflict resolution engine comparing competing projects, fairness scoring, timeline adjustments, and interactive demo approval/modification actions.
7. **Admin Laboratory Overview (`/admin/dashboard`)**
   - Laboratory workstation utilization charts, top-requested hardware, and underutilized resource alerts.


# EDUVIAN AI SALES AND APPOINTMENT BOOKING AGENT — COMPLETE TECHNICAL DOCUMENTATION

**Project:** Eduvian · AI Sales & Appointment Booking Agent
**Document type:** Full technical handover documentation (A–Z)
**Audience:** Senior Backend Developer (no prior project knowledge)
**Codebase inspected:** `C:\eduvian agent` (React/TypeScript frontend, UI phase)
**Repository state at inspection:** single commit `67e3dc2 "eduvian application"` plus uncommitted research-feature changes
**Status of this document:** Complete — written from source code inspection only; no feature is claimed functional without evidence in the code.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Complete Technology Stack](#2-complete-technology-stack)
3. [Complete Page-by-Page Explanation](#3-complete-page-by-page-explanation)
4. [Complete Module Explanations](#4-complete-module-explanations)
5. [Complete Workflows](#5-complete-workflows)
6. [Feature-to-Feature Relationships](#6-feature-to-feature-relationships)
7. [Complete Backend Development Requirements](#7-complete-backend-development-requirements)
8. [Database Design](#8-database-design)
9. [AI Agent Architecture](#9-ai-agent-architecture)
10. [Email and Calendar Integrations](#10-email-and-calendar-integrations)
11. [Status Definitions and Business Rules](#11-status-definitions-and-business-rules)
12. [Security and Access Control](#12-security-and-access-control)
13. [Error Handling and Edge Cases](#13-error-handling-and-edge-cases)
14. [Current Implementation vs Pending Backend Work](#14-current-implementation-vs-pending-backend-work)
15. [Backend Developer Implementation Roadmap](#15-backend-developer-implementation-roadmap)
16. [Appendices](#16-appendices)

---

## 1. Project Overview

### 1.1 What is this project?

Eduvian AI Sales & Appointment Booking Agent is an **internal web workspace** used by Eduvian Solutions' partnership/sales team to research schools, manage outreach leads, and book appointments with school decision-makers (principals, correspondents, directors).

The application is an **outbound sales tool**: Eduvian employees contact schools, not the other way around. The product wraps this outreach in an **AI agent** that a employee talks to in plain language ("find CBSE schools in Chennai over 2000 students", "book an appointment with ABC International School for Tuesday at 11") and that prepares — but never sends without human approval — every action.

**The codebase in this repository is the frontend UI phase only.** There is no FastAPI service, no PostgreSQL database, no email delivery, no calendar sync, no AI provider and no speech service connected. Every screen runs against a clearly-flagged in-memory demonstration dataset (`src/data/demo.ts`, `src/data/researchCorpus.ts`). The banner shown in the app states this explicitly: *"The FastAPI backend, email provider, calendar and AI model are not connected yet. Every record shown is clearly-flagged demonstration data — no emails are sent and no calendars are updated."*

### 1.2 Why is it being developed?

Eduvian Solutions' team currently manages school outreach manually: searching for schools, finding contact details, verifying them, tracking who was contacted, coordinating meeting times by e-mail, and chasing responses and follow-ups. This is slow, error-prone, and invisible to management.

The system is being developed to:

1. **Find and qualify schools systematically** — filter schools by state, district, board, medium of school, student strength (>2,000) and reputation instead of ad-hoc searching.
2. **Extract and verify real contact information** — pull official e-mail/phone/contact person from the school's own website and grade the contact as *Verified / Partially Verified / Unverified* using deterministic checks (never invented data).
3. **Centralise outreach in one pipeline** — a lead pipeline with stages from *New Lead* to *Converted* / *Not Interested*, with assignment to employees.
4. **Book appointments through a guided flow** — two standardised workflows (existing school, new school) with availability checking, invitation e-mails and school-side responses.
5. **Give management visibility and control** — approvals for sensitive actions, reports/analytics, audit log, policy controls.
6. **Reduce manual effort with an AI agent** — a conversational agent that performs the above on request, with voice support, while humans keep every decision.

### 1.3 What problem does it solve?

| Manual problem today | How this system solves it |
| --- | --- |
| Scattering across the web to find school contacts | AI school research with structured filters and staged extraction |
| Unverified / wrong e-mail addresses bounce | Deterministic 3-check contact verification with source links |
| Leads tracked in spreadsheets, forgotten | Lead pipeline with stages, assignment, follow-ups, reminders |
| E-mail ping-pong to find a meeting slot | Availability check + invitation with one-click school response |
| No record of who promised what | Status history, notifications, audit log |
| Management cannot see outreach health | Reports, metrics, approvals queue |

### 1.4 Who will use this application?

| User | Access | What they do |
| --- | --- | --- |
| **Employee** (Partnership Manager / Associate — demo accounts `priya.raman@`, `arjun.nair@`, `kavya.selvam@eduvian.in`) | Personal scope: their assigned schools, leads, appointments, follow-ups, notifications | Runs both booking workflows through the AI agent or the pages, reviews research results, adds leads, books appointments, manages follow-ups |
| **Management / Admin** (demo account `vikram.iyer@eduvian.in`) | Everything above **plus** Approvals, Reports, team-wide Settings, team-wide notification feed | Reviews/approves sensitive actions, watches team performance, configures appointment policy, employees, knowledge base, AI and integrations |
| **AI Agent** (in-app, scripted) | Acts as the employee's assistant | Understands requests, runs research, checks availability, prepares drafts/invitations — executes only after employee confirmation (and management approval when policy requires) |
| **School contact** (external, no account) | Secure tokenised response page only (`/invite/:token`) | Confirms, declines, or requests another time for an invited appointment |

**There are no school-side accounts, dashboards or public booking pages.** Schools only ever see the single-purpose response page from their invitation e-mail.

### 1.5 Role of employees, management and AI agents

- **Employees** make every business decision: which schools to research, which results are suitable, which contact to use, which slot to offer, whether to send an invitation, how to respond to a school's counter-proposal. The UI is built so an employee must confirm before anything leaves the system.
- **Management** governs: appointment policy (duration, buffer, approval thresholds), employee roster, knowledge base, AI settings, integration configuration, and explicit **Approvals** for policy-sensitive actions (e.g. research-sourced invitations — see `policy.requireResearchApproval`). Management also consumes Reports.
- **AI agents** prepare and execute *after* confirmation: they parse intent, run the research engine, compute availability, assemble appointment drafts, and stage invitation sending. In the current code the agent is a **deterministic scripted state machine** (`src/features/agent/useAgentDemo.ts`); no LLM/provider call exists. The design intent (per comments in `src/lib/types.ts`) is that the same UI will drive a real provider-backed agent through backend APIs.

### 1.6 Complete objective of the system

> Give Eduvian's team one workspace where an employee can, in a single conversation or a few clicks, **discover an English-medium school with >2,000 students → extract and verify its official contacts → add it to a managed lead pipeline → book a meeting with its decision-maker via an invitation e-mail → track the school's response, follow-ups and outcome**, while **management** retains approval control, policy control, reporting and a full audit trail — with the **school** participating only through a secure, account-free response link.

---

## 2. Complete Technology Stack

### 2.1 Existing frontend technologies (verified from code)

| Concern | Technology | Version (package.json) | Evidence / usage |
| --- | --- | --- | --- |
| Build tool | **Vite** | `^8.3.6` | `vite.config.ts` — plugins `@vitejs/plugin-react`, `@tailwindcss/vite`; dev server port **5173** |
| UI framework | **React** | `^19.3.1` (`react`, `react-dom`) | Function components + hooks throughout; `StrictMode` in `src/main.tsx` |
| Language | **TypeScript** | `~7.0.2` | `tsconfig.app.json` — `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noEmit` |
| Styling | **Tailwind CSS v4** | `^4.3.5` via `@tailwindcss/vite` | Design tokens in `src/index.css` under `@theme` (`--color-navy-*`, `--color-brand-*`, `--color-canvas`, `--color-line`); no `tailwind.config.js` (v4 CSS-first config) |
| Routing | **react-router-dom** | `^7.18.5` | `BrowserRouter` in `main.tsx`; route table + auth guard in `src/App.tsx` |
| Icons | **lucide-react** | `^1.72.0` | Icon components across all pages |
| Dates | **date-fns** | `^4.4.0` | Date formatting/arithmetic (calendar, reports, follow-ups) |
| Class merging | **clsx** | `^2.1.1` | `cn()` helper in `src/lib/utils.ts` |
| Charts | **Hand-rolled SVG / divs** | — (no chart library) | `src/components/ui/Charts.tsx` — line/bar/donut rendered manually |
| Linting | **oxlint** | `^1.90.0` | `.oxlintrc.json` — `react/rules-of-hooks` error, `only-export-components` warn |
| Fonts | Google Fonts (Inter, Plus Jakarta Sans) | external `<link>` in `index.html` | Only external network dependency of the app |

**Scripts** (`package.json`): `npm run dev` (Vite dev server), `npm run build` (`tsc -b && vite build`), `npm run lint` (oxlint), `npm run preview`.

### 2.2 State management

- **No Redux/Zustand/React Query.** State lives in **one React Context store**: `src/store/AppStore.tsx` exports `AppProvider` (wrap in `main.tsx`) and `useApp()` hook.
- Store holds: session (current user), schools, appointments, approvals, follow-ups, notifications, audit entries, toasts, appointment policy, agent conversation snapshot, research leads (delegates to demo data + registrations).
- Page-local state (filters, modals, wizards, tabs) is plain `useState`/`useMemo` inside page components.
- **Persistence:** only four browser-storage keys (see §2.4). All business mutations are **in-memory and reset on reload** — except appointment policy and session which are stored in `localStorage`.

### 2.3 API integration currently present

- **Zero.** A codebase-wide search finds **no `fetch()`, no `axios`, no `XMLHttpRequest`, no `import.meta.env` usage**. There is no `src/lib/api.ts` yet (it is referenced only in a comment in `src/lib/types.ts` as the future service layer).
- Every "server response" in the UI (agent replies, research stages, e-mail sending, availability) is **simulated locally** with timers (`setTimeout`/`setInterval` in `useAgentDemo.ts`, `SchoolsPage.tsx`, `AgentPage.tsx`).

### 2.4 Existing backend connections, database references, external services

| Category | Status in code |
| --- | --- |
| Backend / API | **None.** README and in-app banner state FastAPI is "not connected yet". `src/lib/types.ts` header comment: types *"mirror the Pydantic schemas planned for the FastAPI backend"* |
| Database | **None referenced at runtime.** No SQL/ORM/driver anywhere. PostgreSQL is the stated intended store (README hand-off notes) |
| Email provider | **Not connected.** `EmailStatus` values and `EmailRecord` rows are demo; no SMTP/API call exists |
| Calendar | **Not connected.** Availability and bookings are demo values; no calendar event is created |
| AI provider | **Not connected.** Agent is a scripted state machine; no prompt is sent anywhere |
| Speech | **Browser-native only**: `SpeechRecognition` (input) and `speechSynthesis` (read-aloud) in `src/features/agent/useVoice.ts`. Nothing recorded or uploaded |
| Messaging (WhatsApp/SMS) | **Not connected** — appears only as demo integration rows |
| Knowledge base | Demo document rows only; no retrieval index |
| Browser storage keys | `eduvian.demo.session` (session employee id), `eduvian.demo.policy` policy key in `AppStore` (`POLICY_KEY`), `eduvian.demo.banner` (banner dismissed), `eduvian.sidebar` (nav collapsed); `sessionStorage` `eduvian.demo.agent` (cleared on logout) |
| External network at runtime | Google Fonts only |

### 2.5 Current project architecture

```
Browser (SPA)
│
├── main.tsx ─── BrowserRouter → AppProvider (AppStore context) → branded AppLoader (1.6 s) → App
│
├── App.tsx ─── route table + auth guard (user ? AppShell : redirect /login) + admin guard (/approvals)
│
├── components/layout/ ─ AppShell (sidebar+topbar frame, demo banner), Sidebar (nav, role gating),
│                        Topbar (command palette, notification bell, profile menu)
│
├── pages/ ───── one component per route (14 routes incl. public /invite/:token)
│
├── features/agent/ ─ useAgentDemo.ts (scripted agent state machine, 1 713 lines),
│                     AgentCards.tsx (12 card renderers), useVoice.ts (speech hooks)
│
├── store/AppStore.tsx ─ single context: session, schools, appointments, approvals,
│                        follow-ups, notifications, audit, policy, toasts
│
├── data/ ────── demo.ts (seed records + lookups), researchCorpus.ts (43-row school corpus)
│
└── lib/ ─────── types.ts (domain model ≈ planned Pydantic schemas),
                research.ts (filters, verification, query parsing),
                scheduling.ts (working hours, slots, conflicts),
                utils.ts (formatters, tones, CSV export)
```

**Layering rule already established by the code (important for backend work):**

1. `lib/types.ts` = the contract. Page components must not change when demo data is replaced by API calls.
2. `store/AppStore.tsx` = the seam. Its method signatures are what the API service layer must satisfy (README hand-off: *"Replace AppStore mutations with API calls and keep the same method signatures"*).
3. `data/*.ts` = replaceable data source behind those methods.

### 2.6 Technologies proposed for backend development (NOT yet in the codebase)

These are stated intentions from README/comments — **none of this exists yet**:

| Proposed | Source of the statement |
| --- | --- |
| **FastAPI** (Python) service with **Pydantic** schemas mirroring `src/lib/types.ts` | `types.ts` header comment; README banner |
| **PostgreSQL** database | README hand-off notes |
| Email provider (server-side credentials, never in browser) | README hand-off notes |
| Calendar integration (availability + event creation) | README hand-off notes |
| AI model provider (replaces scripted state machine) | README "What is intentionally not real" |
| Speech service (if browser Speech APIs are insufficient) | `Integration` rows / README |
| Secure single-use, expiring invitation **response tokens** | README hand-off notes |
| Server-side enforcement of appointment policy, capacity, approval thresholds | README hand-off notes |

---

<!-- DOC-CONTINUE -->

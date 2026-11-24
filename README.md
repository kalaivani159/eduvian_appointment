# Eduvian · AI Sales & Appointment Agent

Internal web workspace for Eduvian Solutions' outbound appointment workflow. This repository is the **UI phase only** — there is no FastAPI service, PostgreSQL database, email delivery, calendar sync, AI provider or speech service connected yet. Every screen runs against a clearly-flagged demonstration dataset.

## Requirements covered

- Two workflows only, both outbound Eduvian → school:
  1. **Existing school** — pick an assigned school, contact, and slot, then prepare an invitation.
  2. **New school** — research the school and contact, verify details, then book.
- Employees make every decision; the agent prepares and executes only after confirmation.
- Management reviews sensitive actions in **Approvals** and sees workspace-wide reporting.
- Schools respond through a secure, account-free response page.
- No school-side accounts, dashboards or public booking pages.

## Stack

| Concern | Choice |
| --- | --- |
| Build | Vite 8 |
| UI | React 19 + TypeScript 7 |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` |
| Routing | react-router-dom v7 |
| Icons | lucide-react |
| Dates | date-fns |
| Charts | hand-rolled SVG / divs (no chart library) |

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build    # tsc -b && vite build
npm run preview  # serve the production build
npm run lint     # oxlint
```

Node 20+ is recommended (developed on Node 22).

## Demo sign-in

Authentication is a front-end stand-in. Any non-empty password is accepted for a seeded account, and the chosen employee id is stored under `eduvian.demo.session`.

| Account | Role |
| --- | --- |
| `priya.raman@eduvian.in` | Employee (Senior Partnership Manager) |
| `arjun.nair@eduvian.in` | Employee (Partnership Manager) |
| `kavya.selvam@eduvian.in` | Employee (Partnership Associate) |
| `vikram.iyer@eduvian.in` | Management / Admin |

The management account additionally sees **Approvals**, **Reports**, team-wide **Settings**, and a team-wide notification feed. Employee accounts are scoped to their assigned schools and records.

## Screens

| Route | Purpose |
| --- | --- |
| `/login` | Demo account picker |
| `/` | Overview: personal metrics, pipeline, response mix, upcoming work |
| `/agent` | AI Appointment Agent — text and voice, both workflows |
| `/schools` | Schools & Leads, research results, contacts |
| `/appointments` | All appointments with status and email state |
| `/appointments/:id` | Full record, status history, invitation preview, school-response link |
| `/calendar` | Day / week / month view, working windows, conflicts |
| `/follow-ups` | Due, overdue, scheduled and completed follow-ups |
| `/approvals` | Management decisions for policy-sensitive actions (admin only) |
| `/reports` | Filterable reporting, CSV export, print view |
| `/settings` | Profile, employees, appointment policy, knowledge, AI, integrations, audit log |
| `/notifications` | In-app workflow events |
| `/invite/:token` | Public school response page (no sign-in) |
| `*` | Not-found page |

Demo response links follow `/invite/demo-<appointmentId>`, for example `/invite/demo-apt-2` (awaiting a response), `/invite/demo-apt-1` (confirmed), and `/invite/demo-does-not-exist` (invalid). The page supports confirm, not available, and request-another-time, and updates the in-memory appointment status.

## AI school research

Research exists in two places — the **Research new schools** modal on `/schools` and Workflow 2 in the agent on `/agent` — and both run on the same engine (`src/lib/research.ts` over `src/data/researchCorpus.ts`).

- **Filters** — state with dependent district, board, "Medium of school" (English medium only, on by default — other language mediums are removed because outreach targets English-medium schools), a "more than 2,000 students" toggle, a "prioritise reputed & well-established schools" toggle, and free-text keywords. The agent parses the same filters out of a typed request such as *“find English medium schools in Karnataka over 2000 students”*.
- **Staged pipeline** — each run shows the staged steps (query sources → rank websites → visit sites → extract contacts → validate → duplicate check) over the corpus.
- **Contact verification** — every result is graded by `verifyContactExtraction()`: e-mail format, phone format, and whether the e-mail domain belongs to the school's own website. Labels are always **Verified / Partially Verified / Unverified**, each card shows “n of 3 checks passed”, the page the contact was read from (`sourceUrl`), and the extraction method. Nothing is marked verified on trust and no contact detail is ever generated — missing values are shown as “No e-mail found / No phone found”.
- **Results** — school name, board, location (city/district/state), student strength, medium (English), reputation tier with establishment year, contact person and designation, e-mail, phone, verification status and source link.
- **Lead pipeline** — employees tick suitable results and press **Add N to Lead Management**; records enter the Schools & Leads pipeline at **New Lead**, names already on file are flagged “Already in records” and cannot be added twice. In the chat flow, ordinals like *“the third one”* always refer to the results currently on screen.

## Design system

- Deep navy for navigation and structure.
- Royal purple for primary actions and AI accents.
- Teal for success and confirmations.
- White / light-lavender canvas with soft grey borders and rounded cards.
- Tokens live in `src/index.css` under `@theme` (`--color-navy-*`, `--color-brand-*`, `--color-canvas`, `--color-line`, shadows).

### Official logo

The supplied Eduvian logo must be used exactly as provided — no recolouring, re-creation or distortion. Drop the file at:

```
public/eduvian-logo.svg
```

`src/components/brand/Logo.tsx` renders it at its natural aspect ratio. If the file is absent it shows a neutral wordmark fallback so the interface stays usable; for a PNG, update the `src` in that component.

## What is intentionally not real

Every integration is either **Not Connected** or **Configuration Required**. The UI never claims otherwise:

- **Email** — invitations and reminders are previews. No message leaves the browser.
- **Calendar** — availability and confirmed bookings are demonstration values, not real employee availability. No calendar event is created.
- **AI model** — the agent conversation is a scripted front-end state machine (`src/features/agent/useAgentDemo.ts`). No prompt or response is sent to a provider.
- **School research** — the school corpus (43 rows) is clearly-flagged demonstration data: no website is fetched and no contact is invented. The *verification logic is real* — format checks and e-mail-domain-vs-website matching run over the data at load time, which is why some rows come out Partially Verified or Unverified. Live crawling would replace `src/data/researchCorpus.ts` behind the same functions.
- **Voice** — uses the browser `SpeechRecognition` API where available and `speechSynthesis` for playback. Nothing is recorded or uploaded; unsupported browsers show a clear message.
- **Knowledge base** — documents are demonstration entries; no retrieval index exists.
- **Messaging** — WhatsApp/SMS channels are not connected.
- **Approvals, confirmations, audit entries** — all mutations are in-memory demonstrations and reset on reload.

There are no hardcoded production metrics, targets or availability claims. Aggregates are computed from the demo records or explicitly labelled as fixed demonstration series.

## Project structure

```
src/
  App.tsx                 route table + auth guard
  main.tsx                provider bootstrap
  index.css               Tailwind v4 theme tokens
  store/AppStore.tsx      session, appointments, approvals, follow-ups, toasts
  data/demo.ts            single source of seed data and lookups
  data/researchCorpus.ts  AI school-research corpus (derived verification)
  lib/
    types.ts              domain types (backend-shaped)
    research.ts           research filters, verification and query parsing
    utils.ts              formatters, tone maps, CSV export
  components/
    layout/               AppShell, Sidebar, Topbar, command palette, demo banner
    ui/                   buttons, cards, badges, fields, modals, tables, charts…
    dashboard/            stat cards and metric rows
    brand/                logo slot
  features/agent/         scripted agent state machine, cards, voice hooks
  pages/                  one component per route
```

## Backend hand-off notes

- `src/lib/types.ts` mirrors the intended API schemas so the store can be replaced by an API service layer without touching page components.
- Replace `src/store/AppStore.tsx` mutations with API calls and keep the same method signatures.
- Replace `src/data/demo.ts` reads with server queries; drop the `isDemo` flags and demo banners once real data exists.
- Persist appointment, approval and notification changes server-side; today they reset on reload.
- Enforce appointment policy, capacity, approval thresholds and secure single-use response tokens on the server. Response tokens must be unique, expiring and bound to the invitation email.
- Provider credentials belong server-side only and must never be stored in the browser.

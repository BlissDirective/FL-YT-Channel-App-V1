# 🚀 FULL APP DEVELOPMENT PLAN

### Autonomous build plan for the Faceless Channel Studio web app

> **Operating model:** Claude Code builds every phase fully autonomously — frontend, backend,
> orchestration, and deployment. **Your only role is to (1) create the accounts in
> `setup.md` and provide credentials, and (2) validate each phase's acceptance criteria
> in the live app.** Every phase ends with a deployed, clickable result and a short
> validation checklist written for a non-developer.

> **Product in one sentence:** A calm, warm, control-panel-style web app where you run
> multiple autonomous faceless-YouTube-channel **projects**, watch their live stats and
> insights from one overview dashboard, click into any project to review/edit/approve the
> autonomous video production line, and download finished video packages to upload to
> YouTube yourself.

---

## 0. PRODUCT DEFINITION

### 0.1 Core user flows

```
FLOW 1 — OVERVIEW (home)
  Open app → see all channel projects as live cards (status, videos in pipeline,
  views, CTR, insights) → global activity feed + cost meter

FLOW 2 — CREATE PROJECT (wizard)
  New Project → niche & audience → brand kit (colors/fonts/thumbnail style) →
  voice selection (ElevenLabs preview) → autonomy & budget settings → project live

FLOW 3 — PRODUCTION REVIEW (the daily loop)
  Project page → Idea cards arrive from daily intelligence run → approve idea →
  script + voiceover appear → read script while VO plays, edit inline, approve →
  clips/thumbnails/metadata appear in gallery, regenerate any item, approve →
  final rendered video plays in browser → approve

FLOW 4 — PUBLISH KIT (manual upload by design)
  Approved video → "Publish Kit" panel: download MP4 + thumbnail, copy title/
  description/tags with one tap, upload checklist → after uploading, paste the
  YouTube URL → app tracks live public stats for that video automatically

FLOW 5 — INSIGHTS
  Per-project: retention/CTR/views trends, what's working, Optimizer suggestions →
  one-tap "apply suggestion" updates that project's prompt templates
```

**Deliberately out of scope (v1):** automated YouTube upload (you upload manually —
this avoids Google's API audit entirely), multi-user/teams, mobile native app
(the PWA covers mobile).

### 0.2 Why this can be built autonomously

Two design rules make every phase codeable and testable without you:

1. **Mock-first provider adapters.** Every external service (Claude, ElevenLabs, fal.ai,
   Pexels, YouTube) sits behind a typed adapter with a `mock` mode that returns realistic
   fixture data (sample scripts, a sample MP3, sample clips, sample stats). The entire
   app — UI, pipeline, review gates, rendering — runs end-to-end on mocks. When you
   provide credentials, flipping env vars switches adapters to live mode with no code
   changes. **This means account setup never blocks development.**
2. **Acceptance criteria per phase, written as user actions.** Each phase below ends with
   "✅ You validate by…" steps performable in the deployed app in under 5 minutes.

---

## 1. DESIGN SYSTEM — "WARM CONTROL PANEL"

Derived from the SunEnergy reference. Locked here so every phase ships consistent UI.

### 1.1 Foundations

| Token | Value | Use |
|---|---|---|
| `bg-canvas` | `#EDEBE7` warm gray | App background |
| `bg-surface` | `#FAF7F1` warm cream | Main panel background (large rounded container) |
| `bg-card` | `#FFFFFF` / `#FDFBF7` | Cards, with `rounded-2xl` (20–24px) and soft shadow `0 1px 3px rgb(0 0 0 / 0.04)` |
| `accent` | `#F5B829` amber | Primary actions, progress fills, active states, brand mark |
| `accent-soft` | `#FCEBC2` | Progress tracks, chips, hover fills |
| `ink` | `#17150F` near-black | Headlines, logo chip, key diagram nodes (dark-on-warm contrast blocks) |
| `coral` | `#F0876C` | Secondary data series, warnings-soft |
| `lavender` | `#A78BFA` | Tertiary data series |
| `success` | `#5BB98C` | Positive deltas, "Active"/"Published" chips |
| `muted` | `#8A8578` | Secondary text |
| Gradient | `#F5B829 → #F0876C` | Gauges, hero numbers, "Performance" accents |

- **Typography:** Plus Jakarta Sans (or Inter). Stat numerals: `font-bold`,
  tabular-nums, large (28–40px). Labels: 13px, muted.
- **Shape language:** everything rounded — cards 20px+, buttons & inputs pill or 12px,
  toggle switches (amber when on), pill-style segmented controls for nav/tabs
  (white active pill on cream track, exactly like the reference's Dashboard/Analytics nav).
- **Components to build in Phase 1:** StatCard (icon chip + label + big number + delta
  badge), ProgressBar (bold % inside amber fill), SemicircleGauge (gradient arc),
  StatusChip, PillTabs, ToggleRow, FlowDiagram (dark node + light nodes with connector
  lines, like "Live Energy Flow" — reused as the **pipeline visualizer**), ActivityFeedItem,
  ComboChart (bars + line, warm palette).
- **Tone:** generous whitespace, no harsh borders, calm motion (150–250ms ease), light
  mode only in v1.

### 1.2 Screen map

```
/                    Overview — project cards grid, portfolio stats row,
                     activity feed, monthly cost meter
/projects/new        Create-project wizard (5 steps)
/projects/[id]       Project home — pipeline board (FlowDiagram of stages with
                     live counts), stat row, insights panel
/projects/[id]/review            Review queue (Gates 1–4), card-based
/projects/[id]/videos            Library: all videos + per-video stats
/projects/[id]/videos/[vid]      Video detail: script, assets, render, publish kit, stats
/projects/[id]/settings          Brand kit, voice, autonomy dial, budgets, templates
/insights            Cross-project insights + Optimizer suggestions
/settings            Global: credentials health, cost ledger, notifications
```

---

## 2. ARCHITECTURE (locked from the Technical Blueprint)

- **Next.js 15 (App Router, TypeScript) on Vercel** — UI + API routes + webhooks
- **Supabase** — Postgres (all state), Auth (single user, email+password), Storage
  (voiceovers/clips/thumbnails/renders), Realtime (live pipeline updates on dashboard)
- **Trigger.dev v4** — durable pipelines, cron intelligence runs, waitpoint approval
  gates, long-running render tasks
- **Providers via adapters:** Anthropic (Claude), ElevenLabs (TTS + timestamps),
  fal.ai (Kling/Veo/Hailuo clips, Ideogram/Nano-Banana thumbnails), Pexels (stock b-roll),
  YouTube Data API v3 (trend research + public stats by video ID — API key only, no OAuth)
- **Remotion** — programmatic video assembly with word-level captions
- **Repo layout:** single repo — `apps/web` (Next.js), `packages/core` (domain logic,
  adapters, state machine), `packages/video` (Remotion project), `trigger/` (tasks),
  `mcp-server/` (Phase 9), `supabase/` (migrations)

Video state machine (drives everything in the UI):

```
IDEA → IDEA_APPROVED ✋ → SCRIPTING → SCRIPT_READY ✋ → GENERATING_ASSETS →
ASSETS_READY ✋ → ASSEMBLING → FINAL_REVIEW ✋ → APPROVED → (you upload) → TRACKING
                              any ✋ → NEEDS_REVISION (loops back) / KILLED
```

---

## 3. BUILD PHASES

Each phase is one autonomous coding mission: **Scope → Deliverables → ✅ You validate by.**
Credentials needed *at* each phase are flagged; everything runs on mocks until then.

---

### PHASE 0 — Scaffold, Design System & First Deploy
**Needs from you:** GitHub repo access (have), Vercel + Supabase + Trigger.dev accounts connected (setup.md §1–3).

**Scope:** Monorepo scaffold (pnpm + Turborepo), Next.js 15 + Tailwind v4 + shadcn/ui
themed to §1 tokens, Plus Jakarta Sans, app shell (top nav with pill tabs, warm canvas +
cream surface layout), the full §1.1 component library with a hidden `/styleguide` page
demoing every component with sample data, CI (lint, typecheck, build), Vercel production
deploy, Supabase project linked, Trigger.dev project linked.

**✅ You validate by:** opening the production URL, seeing the themed shell, and browsing
`/styleguide` — it should *feel* like the reference image. This is the moment to request
visual tweaks; the design system is cheap to change now and expensive later.

---

### PHASE 1 — Database, Auth & Project CRUD
**Needs from you:** nothing new.

**Scope:** Full Supabase schema + migrations (projects, videos, scripts, assets, ideas,
approvals, prompt_templates, analytics_snapshots, cost_ledger, settings) with RLS;
single-user auth (email+password, no public signup); typed DB client (generated types);
create-project wizard (niche/audience → brand kit with live preview of colors on a sample
StatCard/thumbnail frame → voice picker UI [mock voices] → autonomy + budget settings);
project settings pages; seed script that creates one demo project with realistic fixture
data at every pipeline stage.

**✅ You validate by:** logging in, creating a project through the wizard, seeing it on
the overview grid, editing its settings.

---### PHASE 2 — Overview Dashboard & Project Home
**Needs from you:** nothing new.

**Scope:** The two hero screens, fully alive on seed/mock data.
- **Overview (`/`):** portfolio stat row (total views, watch hours, videos published,
  est. revenue — StatCards with delta badges), project cards grid (name, niche chip,
  mini sparkline, videos-in-pipeline count, health gauge, "Active/Paused" chip),
  activity feed ("Script ready for *Why Banks Fail* — awaiting your review"),
  monthly cost meter (ProgressBar vs. budget cap).
- **Project home (`/projects/[id]`):** pipeline FlowDiagram (Ideas → Script → Assets →
  Render → Ready, dark active node, live counts per stage, click navigates to that
  queue), project stat row, recent videos strip, insights panel placeholder.
- Supabase Realtime wiring: dashboard updates live when DB rows change (proved via
  seed-data mutation button in dev mode).

**✅ You validate by:** browsing both screens populated with the demo project and
confirming the layout/density/warmth matches your vision (second design checkpoint).

---

### PHASE 3 — Orchestration Backbone & Review Gates
**Needs from you:** nothing new (mocks).

**Scope:** Trigger.dev wired end-to-end with the state machine: `produceVideo` parent
task with waitpoint at each ✋ gate; `approvals` table + API routes (approve / request
revision with notes / kill); the **Review Queue UI** (`/review`) as swipeable cards —
each gate type gets a tailored card layout; revision loops re-run the prior stage with
your notes injected; cost-ledger writes from every (mock) provider call; budget-cap
enforcement (pipeline pauses with a visible "budget reached" state); per-gate autonomy
toggles (Assist / Co-pilot / Autopilot) stored per project — Autopilot auto-resolves
waitpoints; global kill switch in settings; PWA manifest + web-push notifications on
gate arrival.

**✅ You validate by:** pressing "Run demo pipeline" on the demo project and walking a
mock video through all four gates from your phone — approving, requesting one revision,
and watching the pipeline FlowDiagram update live.

---

### PHASE 4 — Script & Voice Pipeline (first real AI)
**Needs from you:** 🔑 **Anthropic API key, ElevenLabs API key** (setup.md §4–5).

**Scope:** Claude adapter live: idea → full script via the project's Master Script
Framework template (structured output: hook, beats with `[VISUAL]` prompts, CTA,
estimated runtime) + metadata package (3 titles, description, tags, chapters);
ElevenLabs adapter live: script → MP3 + character timestamps → stored in Supabase
Storage; word-timing JSON derived for captions; **Script Review screen:** script reader
with synced VO playback (current sentence highlights as audio plays), inline text
editing (edited script re-generates VO for changed sections), title/description editor;
voice picker in the wizard now lists your real ElevenLabs voices with audio previews;
prompt templates editable per project in settings (versioned on save).

**✅ You validate by:** typing a topic into the demo project ("7 money habits…"),
approving the idea, then reading a real Claude script while a real ElevenLabs voice
reads it to you, editing one paragraph, and hearing the updated VO.

---

### PHASE 5 — Visual Asset Pipeline
**Needs from you:** 🔑 **fal.ai API key, Pexels API key** (setup.md §6–7).

**Scope:** Visual Director step: per-beat shot plan with model routing (hero → premium
model, b-roll → standard, factual → Pexels stock search) honoring per-project cost
settings; fal.ai adapter: clip generation with webhook completion + polling fallback,
per-clip cost recorded; Pexels adapter: licensed stock clip search/download; thumbnail
generation (4 candidates via Ideogram/Nano-Banana through fal) using the project's brand
kit; **Asset Gallery review screen:** grid of clips (hover-to-play) mapped to script
beats, thumbnail picker, per-item ↻ Regenerate (with optional prompt tweak) and
"swap to stock" buttons; storage lifecycle (raw clips auto-pruned after final render,
configurable).

**✅ You validate by:** approving the Phase-4 script and reviewing a real gallery of
generated clips + 4 thumbnails, regenerating one clip, swapping one to stock footage.

---

### PHASE 6 — Assembly & Final Render (Remotion)
**Needs from you:** nothing new (Remotion is free at your scale; renders run on Trigger.dev).

**Scope:** Remotion composition library: branded intro sting (project colors/logo
text), beat sequencer (clips cut to VO timing), word-level animated captions (style per
brand kit), background music bed with auto-ducking under VO (royalty-free tracks
bundled, selectable per project), soft-CTA lower-third at the 70% mark, end card;
9:16 Shorts variant of the template; render task on Trigger.dev large machine → MP4
(1080p, h264) to Storage; **Final Review screen:** in-browser player, chapter markers,
side-by-side thumbnail + title as it will appear (mock YouTube search-result preview
card); render-retry and "back to assets" paths.

**✅ You validate by:** watching a complete, captioned, music-backed, branded video in
the browser — produced end-to-end from the topic you typed in Phase 4. **This is the
product's proof moment.**

---

### PHASE 6.5 — Source Library agent (licensed footage acquisition)
**Needs from you:** 🔑 free Pixabay API key (optional: widens the pool beyond Pexels).

**Scope (added 2026-06-13 after the scraping-agent feasibility assessment — see
DECISIONS.md):** a licensed-source acquisition agent, NOT a general video scraper.
Per-beat fan-out search across compliant sources only — Pexels (live), Pixabay,
Internet Archive (PD/CC0 filters), Wikimedia Commons, NASA/gov archives — with
Claude scoring candidates for visual relevance and verifying license metadata;
**attribution ledger** per asset (CC-BY credits auto-injected into video
descriptions in the Publish Kit); candidates surface at the existing Assets gate
for human approval. Explicitly out of scope: downloading from YouTube (ToS +
license-laundering risk) and publisher IP (e.g. game footage) — gaming niches use
official press-kit assets or own-capture lanes, manually gated, never autonomous.

**✅ You validate by:** seeing a stock-beat's candidate strip include Archive/
Wikimedia footage with license + credit chips, approving one, and finding the
attribution line already present in the video's description.

---

### PHASE 7 — Publish Kit & Live Stats Tracking
**Needs from you:** 🔑 **YouTube Data API key** (setup.md §8 — API key only, no OAuth).

**Scope:** **Publish Kit panel** on approved videos: download MP4 + selected thumbnail,
one-tap copy for title/description/tags, upload checklist (incl. AI-content disclosure
reminder and end-screen suggestions), "Mark as uploaded" → paste YouTube URL; stats
ingestion: nightly + on-demand fetch of public stats (views, likes, comments) for all
tracked video IDs via YouTube Data API; per-video stats sparkline on the video page;
project + portfolio dashboards switch from seed data to real tracked stats; estimated
revenue (views × configurable niche RPM); CSV export.

**✅ You validate by:** downloading a video package, uploading it to a real channel,
pasting the URL, and seeing its live view count on your overview dashboard the same day.

---

### PHASE 8 — Intelligence & Agents (autonomy layer)
**Needs from you:** nothing new (uses existing Anthropic + YouTube keys).

**Scope:**
- **Daily intelligence run** (cron per project): YouTube niche search (top recent +
  3–18-month proven band) → Claude scoring (repurposability rubric from the Master
  Plan) → idea cards land in the review queue each morning with source stats and a
  suggested angle.
- **QC agent:** every gate artifact gets an automatic review (hook strength, brand-voice
  match, thumbnail readability, policy risk) shown as a scored card next to the Approve
  button; in Co-pilot mode, QC confidence ≥ threshold auto-approves; QC-vs-you agreement
  rate surfaces in settings so you know when to raise autonomy.
- **Scout chat** (project page): conversational research copilot with tools (YouTube
  search, your DB, web fetch) for competitor teardowns and niche exploration; findings
  saveable as idea cards.
- **Optimizer:** weekly job correlating your tracked stats with formats/hooks/lengths/
  thumbnails → plain-English insight cards on `/insights` + proposed prompt-template
  diffs you apply with one tap (versioned, revertible).

**✅ You validate by:** waking up to scored idea cards, asking Scout to tear down a
competitor channel, and applying one Optimizer suggestion.

---

### PHASE 9 — Studio MCP Server + Hardening
**Needs from you:** nothing new.

**Scope:**
- **`studio-mcp` — a custom MCP server shipped in this repo** exposing the app to any
  MCP client (Claude Code, Claude Desktop, this remote environment). Tools:
  `list_projects`, `get_project_stats`, `list_pending_approvals`, `approve_gate`,
  `request_revision`, `queue_idea`, `get_video`, `run_intelligence_now`,
  `get_cost_summary`, `propose_template_update`. Auth via a scoped API token; deployed
  as an HTTP (streamable) MCP endpoint inside the Next.js app. **Why it matters:** it
  makes the finished app operable *by Claude itself* — you can tell a Claude session
  "approve everything QC scored above 85 on Project X" or run weekly reviews
  conversationally, and it's how I maintain/extend the app for you post-launch.
  (No other custom MCP servers are necessary — production integrations are direct
  typed APIs by design; this one exists to make *the app itself* agent-operable.)
- **Hardening:** error states & retry UX everywhere, empty states, loading skeletons,
  Sentry error tracking, provider-credential health panel (`/settings` shows each key's
  status with a "test" button), rate-limit guards, Supabase backups confirmed,
  E2E smoke tests (Playwright) for the golden path, Lighthouse pass on dashboard,
  full README + operations runbook.

**✅ You validate by:** running the provided one-line MCP config in Claude Desktop/Code
and asking Claude "what's pending review across my projects?" — and getting the answer.

---

### PHASE 10 — Final Validation & Handoff
**Needs from you:** ~1 hour of clicking.

**Scope:** Guided validation script (a `VALIDATION.md` walking every flow), seed-data
purge, your real first project created together, all autonomy dials set to Assist,
budget caps confirmed, credential rotation instructions, backlog of v2 candidates
(YouTube OAuth auto-upload + API audit, A/B thumbnail testing, Shorts auto-derivation
schedule, multi-language tracks).

**✅ You validate by:** producing and uploading your first real video. The app is yours.

---

## 4. PHASE → CREDENTIAL TIMELINE

| Phase | New credentials needed | Everything else |
|---|---|---|
| 0–3 | Vercel, Supabase, Trigger.dev, GitHub (infrastructure) | runs on mocks |
| 4 | Anthropic, ElevenLabs | |
| 5 | fal.ai, Pexels | |
| 7 | YouTube Data API key | |
| 6, 8, 9, 10 | — none — | |

You can hand over all keys at once after completing `setup.md`, or just-in-time per
phase — development never blocks either way (mock mode).

## 5. STANDING RULES FOR THE AUTONOMOUS BUILD

1. Every phase ends **deployed to production** with its validation checklist posted.
2. No secrets in the repo, ever — Vercel/Trigger.dev/Supabase env vaults only.
3. Conventional commits per feature; one PR per phase to `main` so the diff history
   stays reviewable.
4. Mock adapters are kept working forever (they double as the test suite's fixtures
   and a free "demo mode").
5. Any deviation from this plan gets recorded in `docs/DECISIONS.md` with rationale.
6. Spending guardrails are code: per-video and per-month caps enforced in the cost
   ledger before any paid provider call.

---

*Build plan for SparkForge / BlissDirective — Faceless Channel Studio v1.0*
*Companion docs: `FacelessChannel-MasterPlan.md` (business playbook),*
*`AppBlueprint-TechnicalPlan.md` (architecture rationale), `setup.md` (your account checklist).*

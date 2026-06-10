# 🏗 FACELESS CHANNEL APP — TECHNICAL BLUEPRINT v1.0

### Turning the Master Playbook into a near-fully-autonomous, single-operator web app

> Companion to `FacelessChannel-MasterPlan.md`. The Master Plan describes a human-driven
> process glued together with n8n, Telegram, Notion, CapCut, and Google Drive. This document
> specifies how to replace that glue with **one coded web application** that runs the entire
> idea → published-video pipeline autonomously, with you acting only at approval gates —
> or not at all, once you trust it.

---

## 1. WHAT CHANGES FROM THE MASTER PLAN

The Master Plan's pipeline is correct. Its *implementation* has five manual/fragile links
that a coded app eliminates:

| Master Plan component | Problem | App replacement |
|---|---|---|
| n8n workflows | Visual flows are hard to version, test, and branch; state lives in n8n | **Trigger.dev** (durable, code-first orchestration in the repo) |
| Telegram approval gates | Context-poor; can't preview audio/clips/thumbnails inline | **In-app Review Queue** (mobile PWA + push; Telegram kept as optional remote) |
| Notion content calendar | Second system of record, drifts from reality | **Supabase Postgres** — pipeline state IS the calendar |
| CapCut manual editing (20–30 min/video) | The single biggest blocker to autonomy | **Remotion** programmatic rendering — templated, deterministic, zero-touch |
| Google Drive asset folders | Manual file shuffling | **Supabase Storage** buckets, linked to each video record |
| Manual YouTube upload | Last-mile manual step | **YouTube Data API `videos.insert`** — scheduled auto-publish |

Result: active time per video drops from the plan's ~30 min target to **~3–5 min of
reviewing** (or zero in full-auto mode), and every video, prompt, cost, and outcome is
queryable in one database.

---

## 2. RECOMMENDED TECH STACK (and why it beats the original)

### 2.1 Application core

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | One codebase for dashboard, review UI, API routes, webhooks |
| Hosting | **Vercel** | Zero-ops deploys; preview deployments per branch (Vercel MCP already connected to this workspace) |
| Database / Auth / Storage / Realtime | **Supabase** | Postgres for pipeline state, Storage for VO/clips/thumbnails, Realtime for live pipeline status on the dashboard, Row Level Security for the single-user auth. (Supabase MCP already connected to this workspace — schema can be managed straight from Claude Code sessions.) |
| Orchestration | **Trigger.dev v4** | Durable, retryable, code-first background jobs with **waitpoints** (perfect approval-gate primitive), long-running machines for ffmpeg/Remotion renders, cron scheduling for the 7 AM intelligence run. Replaces n8n entirely. |
| UI | Tailwind + shadcn/ui | Fast to build the dashboard/review queue; PWA manifest + web push for gate notifications |

**Why Trigger.dev over n8n (or Inngest/Temporal):**
- Workflows live in the repo → version-controlled, testable, Claude Code can modify them.
- `wait.forToken()` waitpoints model the Master Plan's ✋ gates natively: the run pauses
  for days at zero cost until you tap Approve in the UI.
- Long-running tasks (up to hours) handle Kling render polling and Remotion/ffmpeg
  assembly without serverless timeout gymnastics — this is where Vercel functions and
  Inngest get awkward. (Inngest is a fine alternative if you prefer; Temporal is
  overkill for one operator.)
- Per-channel cloning (Phase 7) = a `channelId` parameter, not a duplicated visual flow.

### 2.2 AI & media services

| Function | Recommendation | Replaces / Notes |
|---|---|---|
| LLM (scripts, scoring, metadata, agents) | **Anthropic API — Claude Sonnet 4.6** for pipeline steps, **Opus/Fable-class** for weekly deep research | Master Plan already specifies this. Use structured outputs (tool-use JSON) everywhere — no free-text parsing. |
| Agentic research | **Claude Agent SDK** | Powers the multi-agent layer (§4) |
| Voiceover | **ElevenLabs API** (`eleven_multilingual_v2` / `v3`) with **`with_timestamps`** | Character-level timestamps drive auto-captions in Remotion — eliminates a CapCut step entirely |
| AI video clips | **fal.ai as the unified gateway** → Kling 2.x, Veo 3.x, Hailuo, Wan, Luma behind one API key | **Better than direct Kling API**: per-second pricing, no Pro-plan gate, swap models per scene from config (`hero: veo3`, `broll: kling`), webhook callbacks on completion. Replicate is the equivalent alternative. |
| Stock b-roll fallback | **Pexels / Pixabay APIs** (free) | Huge cost lever: many educational niches need only 30–50% AI-generated shots; QC agent decides per-beat |
| Thumbnails | **Gemini API (`gemini-*-image`, i.e. "Nano Banana")** and/or **Ideogram API** (both also on fal.ai) | Ideogram is strongest at the bold text overlays thumbnails need |
| Captions/word timing (fallback) | **AssemblyAI** or Whisper via fal | Only if ElevenLabs timestamps prove insufficient |
| Video assembly | **Remotion** (rendered on Trigger.dev machines or Remotion Lambda) | React-defined video templates: intro → captioned beats → CTA card → end screen. Deterministic, brandable per channel, fully autonomous. **Lower-code alternatives:** Shotstack, Creatomate, JSON2Video (JSON-in/MP4-out APIs) — good Plan B if Remotion templates feel heavy. Raw ffmpeg (`fluent-ffmpeg`) suffices for simple slideshow formats. |
| Publishing | **YouTube Data API v3** (`videos.insert`, `thumbnails.set`, `playlists`) via OAuth2 refresh token per channel | See §6 caveats (audit, quota) |
| Trend/competitor data | **YouTube Data API** (search.list, videos.list) + optionally **Apify YouTube scrapers** | API quota (10k units/day) covers daily pulls; Apify fills gaps (outlier detection à la 1of10/ViewStats) without burning quota |
| Analytics feedback | **YouTube Analytics API** | Nightly snapshot per video → feeds the Optimization agent (§4) |
| Notifications | Web Push (PWA) + optional **Telegram Bot API** | Gates reachable from your phone either way |

### 2.3 Cost model (replaces subscription stack)

Per ~8-minute video, pay-per-use (estimates, verify current pricing):

| Item | Est. cost |
|---|---|
| Claude API (scoring + script + metadata + QC) | $0.30–1.00 |
| ElevenLabs TTS (~11k chars) | $1–2 |
| AI video: ~12–16 clips × 5–10s via fal (Kling std) | $4–9 (less with stock-footage mix) |
| Veo 3 hero shot (premium niches only) | $1–3 |
| Thumbnails (4 candidates) | $0.15–0.40 |
| Remotion/ffmpeg render compute | $0.10–0.40 |
| **Total per video** | **≈ $6–15** |

Fixed: Vercel free/Pro ($0–20), Supabase free/Pro ($0–25), Trigger.dev free/hobby ($0–10).
At 12–16 videos/month this lands near the Lean Stack's monthly cost **with the Premium
Stack's capability and zero manual editing** — and costs scale per-video, not per-seat,
which matters enormously at Phase 7 (3 channels ≈ 3× videos, ~$0 added fixed cost).

---

## 3. SYSTEM ARCHITECTURE

```
┌──────────────────────────── NEXT.JS APP (Vercel) ────────────────────────────┐
│  Dashboard          Review Queue           Channel Settings      Library     │
│  - pipeline board   - idea cards (Gate 1)  - niche, voice ID,    - published │
│  - cost meter       - script reader+VO     - brand kit, autonomy - analytics │
│  - agent chat       - asset gallery        - dial, budget caps   - reports   │
│    (research        - (Gates 2/3)                                            │
│    copilot w/ MCP)  - one-tap approve/redo/kill                              │
└──────────────┬────────────────────────────────────────────────┬──────────────┘
               │ Postgres / Storage / Realtime / Auth           │ trigger / wait-token
        ┌──────▼──────┐                                  ┌──────▼───────────────┐
        │  SUPABASE   │◄────────── state writes ─────────│   TRIGGER.DEV        │
        │  channels   │                                  │  cron: intelligenceRun│
        │  ideas      │                                  │  task: scriptPipeline │
        │  videos     │                                  │  task: assetPipeline  │
        │  assets     │                                  │  task: assemblyRender │
        │  approvals  │                                  │  task: publishJob     │
        │  analytics  │                                  │  task: analyticsSync  │
        │  costs      │                                  │  task: weeklyOptimize │
        └─────────────┘                                  └──────┬───────────────┘
                                                                │ API calls + webhooks
        ┌───────────────────────────────────────────────────────▼───────────────┐
        │ Anthropic (Claude/Agent SDK) · ElevenLabs · fal.ai (Kling/Veo/Ideogram)│
        │ Pexels · Remotion render · YouTube Data + Analytics APIs · Telegram   │
        └────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Video state machine (single source of truth)

```
SOURCED → SCORED → IDEA_APPROVED ✋ → SCRIPTING → SCRIPT_READY ✋ →
GENERATING_ASSETS → ASSETS_READY ✋ → ASSEMBLING → FINAL_REVIEW ✋ →
SCHEDULED → PUBLISHED → ANALYZED
        ↘ (any state) REJECTED / NEEDS_REVISION (loops back one stage)
```

Each ✋ gate is a Trigger.dev waitpoint + an `approvals` row. The **autonomy dial**
(per channel, per gate) decides whether the waitpoint requires a human or auto-resolves:

- **Assist** — every gate requires a tap (Master Plan default)
- **Co-pilot** — QC agent auto-approves when its confidence ≥ threshold; you only see exceptions
- **Autopilot** — all gates auto-resolve; daily digest email of what shipped; hard stops on
  budget caps, QC failures, and a global kill switch

This is the honest definition of "near fully autonomous": the system is *capable* of
zero-touch, and trust is earned gate-by-gate as QC-agent decisions correlate with yours.

### 3.2 Core schema (Supabase)

```
channels(id, name, niche, voice_id, brand_kit jsonb, autonomy jsonb, yt_refresh_token, budget_caps jsonb)
source_videos(id, channel_id, yt_video_id, title, stats jsonb, fetched_at)
ideas(id, channel_id, source_video_id?, title, angle, score, flag, status)
videos(id, channel_id, idea_id, status, title, scheduled_at, yt_video_id?, total_cost)
scripts(id, video_id, version, body, beats jsonb /* [VISUAL] prompts per beat */, runtime_est)
assets(id, video_id, kind enum(vo|clip|thumb|render|captions), storage_path, meta jsonb, provider, cost)
approvals(id, video_id, gate, decided_by enum(human|qc_agent), decision, notes, wait_token)
analytics_snapshots(id, video_id, captured_at, views, ctr, avg_view_dur, rpm, ...)
prompt_templates(id, channel_id, kind, version, body)   -- Master Script Framework lives in DB, versioned
cost_ledger(id, video_id?, provider, units, usd, at)
```

`prompt_templates` is important: the Master Plan's "living Claude Project" becomes
versioned rows the Optimization agent can propose diffs against (§4.3).

### 3.3 The five pipelines (Trigger.dev tasks)

1. **`intelligenceRun`** (cron, 7:00 per channel) — YouTube search for niche top videos
   (last 7d + 3–18mo proven band) → Claude scoring with the Master Plan's HIGH/MED/SKIP
   rubric (structured output) → upsert `ideas` → push notification → **Gate 1 waitpoint**.
2. **`scriptPipeline`** (on Gate 1 approve) — Claude generates script via channel's
   Master Script Framework template → beats + `[VISUAL]` prompts parsed into `scripts.beats`
   → ElevenLabs VO with timestamps → store MP3 + timing JSON → **Gate 2** (review UI plays
   VO over the script text).
3. **`assetPipeline`** (on Gate 2) — fan-out per beat: fal.ai clip generation (model chosen
   per beat type: hero → Veo, b-roll → Kling, factual/chart → stock via Pexels or a Remotion
   chart component) with webhook completion; parallel: 4 thumbnails (Ideogram + Nano Banana),
   metadata package (titles ×3, description, tags, chapters) via Claude → **Gate 3** (gallery
   review; per-clip "regenerate" buttons re-run just that beat).
4. **`assemblyRender`** (on Gate 3) — Remotion composition: clips sequenced to VO timing,
   word-level captions from ElevenLabs timestamps, channel brand kit (fonts/colors/LUT),
   CTA at 70% mark, end card → MP4 to Storage → **Gate 4 final preview** (in-browser player).
5. **`publishJob`** (on Gate 4 / schedule) — `videos.insert` (resumable upload from Storage),
   `thumbnails.set`, playlist add, scheduled `publishAt` → status PUBLISHED.
6. **`analyticsSync`** (nightly) + **`weeklyOptimize`** (§4.3) close the loop.

---

## 4. MULTI-AGENT ORCHESTRATION — ASSESSMENT

### 4.1 The key insight: workflow-first, agents-at-the-edges

The strongest architectural decision you can make here is **not** to build the pipeline as
a free-form multi-agent swarm. The production path (idea → script → VO → clips → render →
upload) is a *deterministic DAG with LLM calls at specific nodes*. Durable workflows with
structured-output LLM steps give you retries, idempotency, cost ceilings, and debuggability
that agent loops fundamentally don't. An agent that "decides" to call ElevenLabs is strictly
worse than a workflow step that always does — same output, more failure modes, more tokens.

Where genuine agency (open-ended tool loops, judgment, iteration) **earns its complexity**:

| Agent | Role | Why an agent and not a step |
|---|---|---|
| **Scout** (content intelligence) | Mode-B deep research: competitor teardowns, gap analysis, niche scorecards (Phase 1 protocol) | Open-ended: needs to search, read, follow leads, decide when it has enough — classic agentic loop. Runs weekly + on-demand from the dashboard chat. |
| **QC / Editor-in-Chief** | Reviews each gate artifact against channel rubric: hook strength, retention structure, brand voice, thumbnail readability, policy/copyright risk | This is the **autonomy unlock** — it's your judgment, encoded. Outputs decision + confidence + notes; drives auto-approval in Co-pilot/Autopilot modes. Its decisions vs. your overrides become a measurable trust metric. |
| **Optimizer** (analytics) | Weekly: reads analytics snapshots, correlates hooks/formats/lengths/thumbnails with CTR & retention, proposes versioned diffs to `prompt_templates` | Requires multi-source reasoning and producing recommendations a human ratifies — the Master Plan's "What worked?" session, automated. |
| **Visual Director** (lightweight) | Translates script beats into per-shot prompts + model routing + continuity (recurring character/style refs) | Borderline — start as a single structured-output step; promote to an iterating agent only if clip rejection rates stay high. |

Scriptwriting, scoring, and metadata stay as **plain structured LLM calls inside workflow
steps**. They're single-shot transformations; agentizing them adds cost and variance for
nothing.

### 4.2 Implementation

- **Claude Agent SDK** for Scout and Optimizer (tool loops over YouTube search, DB queries,
  web fetch). Run them *inside Trigger.dev tasks* so even agents get durability and budget
  caps. Cap iterations and tool-call budgets per run.
- **QC agent** = one Claude call with rich context (artifact + channel rubric + past
  approve/reject examples retrieved from `approvals`) returning
  `{decision, confidence, issues[], suggested_fix}`. Few-shot from your own past decisions —
  it literally learns your taste from the database.
- **Orchestrator-worker** topology, never peer-to-peer agent chatter: Trigger.dev is the
  orchestrator; agents are leaf workers with typed inputs/outputs. No agent triggers another
  agent directly.
- **Dashboard "research copilot" chat**: a Claude session wired to MCP servers (§5) for
  interactive Mode-B sessions — ask "tear down channel X," it uses the YouTube tools and
  writes findings into `ideas`.

### 4.3 The self-improvement loop (what makes this compound)

```
publish → analyticsSync (nightly) → Optimizer (weekly)
  → proposed prompt_template diffs + experiment suggestions ("test question-hooks vs. statement-hooks")
  → you ratify in UI (one tap) → next videos use template vN+1
  → outcomes tagged with template version → Optimizer measures its own past advice
```

This implements Master Plan Critical Rule #5 (the living document) as code, and it's the
real moat: after 50 videos the system has a private dataset of *what works in your niche
with your voice* that no off-the-shelf tool has.

---

## 5. MCP SERVERS vs. DIRECT APIs — WIRING MAP

**Principle:** the *production pipeline* uses direct SDKs/REST inside Trigger.dev steps
(deterministic, typed, retryable, no extra hop). **MCP servers** serve two other surfaces:
(a) the in-app research copilot, and (b) building/operating this app from Claude Code.

### 5.1 Production runtime — direct APIs (required keys)

| Service | Auth | Used for |
|---|---|---|
| Anthropic API | API key | All LLM steps + Agent SDK |
| ElevenLabs | API key | TTS + timestamps |
| fal.ai | API key | Kling / Veo / Hailuo / Ideogram / Nano Banana, one key for all |
| YouTube Data API v3 | API key (read) + **OAuth2 refresh token per channel** (upload) | Trend pulls, upload, thumbnails, playlists |
| YouTube Analytics API | Same OAuth | Retention/CTR/RPM snapshots |
| Pexels / Pixabay | Free API keys | Stock b-roll |
| Gemini API (optional) | API key | Direct Veo/Imagen access if bypassing fal |
| Telegram Bot (optional) | Bot token | Remote gate approvals |
| Remotion | License (free for individuals/small co.) | Rendering |

All secrets live in Trigger.dev/Vercel env vars; per-channel OAuth tokens encrypted in
`channels` table.

### 5.2 Development & operations — MCP servers (already mostly wired here)

| MCP server | Status | Use |
|---|---|---|
| **Supabase MCP** | ✅ connected in this workspace | Schema migrations, SQL, logs, advisors — Claude Code manages the DB directly |
| **Vercel MCP** | ✅ connected in this workspace | Deploys, build logs, runtime logs |
| **GitHub MCP** | ✅ connected | PRs, issues, CI |
| **ElevenLabs MCP** (official) | add when useful | Voice library exploration, test generations during Phase 3 voice lock-in |
| **YouTube Data MCP** (community, e.g. `youtube-data-mcp-server`) | add for copilot | Powers the dashboard research chat's channel/video lookups |
| **Trigger.dev MCP** (official) | add when building | Deploy/inspect tasks and runs from Claude Code |

**Recommendation:** don't hunt for MCP servers for Kling/fal/Pexels — none are mature, and
the pipeline doesn't want them anyway. Where the copilot needs a capability with no good
MCP server (e.g., fal), expose your own app's functions as tools via the Agent SDK's
in-process tool definitions — you control the surface and it ships with the app.

### 5.3 Notable platform realities (plan around these)

1. **YouTube upload audit:** videos uploaded by unverified API projects are forced to
   *private*. For one personal channel this is fine initially (upload private → publish via
   Studio in one tap) but for true autopilot you must complete Google's API audit/verification
   for the project. Build the pipeline so `publishJob` works either way (`privacyStatus`
   configurable). Quota: one upload = 1,600 units of the 10k/day free quota → ~6 uploads/day
   headroom; daily search pulls cost 100 units each — comfortably within budget.
2. **Kling has no self-serve direct API on starter plans** — going through fal.ai/Replicate
   sidesteps this and is the single best "tech stack improvement" over the Master Plan's
   tooling table.
3. **AI-disclosure**: set the YouTube "altered or synthetic content" flag in upload metadata
   where applicable; have the QC agent check niche-policy risk (esp. health/finance YPP
   reusability rules — voice consistency and original scripting, which the plan already
   mandates, are the mitigations).
4. **ElevenLabs timestamps** return character-level timing; aggregate to word-level for
   captions in the Remotion template — no separate transcription pass needed in the
   happy path.

---

## 6. BUILD PLAN — ENGINEERING MILESTONES

Mirrors the Master Plan's phases but ordered for fastest end-to-end value:
**walking skeleton first, autonomy last.**

### M0 — Foundation (Week 1)
Repo scaffold (Next.js + Supabase + Trigger.dev + shadcn), schema migration, auth,
channel settings CRUD, secrets wiring, deploy to Vercel. *Exit: app live, one channel row.*

### M1 — Manual-trigger production line (Weeks 1–3) ← build this before any intelligence
Paste a topic → `scriptPipeline` → `assetPipeline` → `assemblyRender` → download MP4 +
thumbnail + metadata. All gates manual in the Review Queue. *Exit: one watchable, captioned,
branded video produced end-to-end from a topic string.* This de-risks the two hardest
integrations (fal clip gen, Remotion assembly) immediately and gives you the Phase 3/4
proof-of-concept batch tooling.

### M2 — Publishing (Week 3–4)
YouTube OAuth connect flow, `publishJob` with resumable upload + thumbnail + scheduling,
`analyticsSync` nightly. *Exit: Gate-4 approve → video appears on YouTube on schedule.*

### M3 — Intelligence (Weeks 4–5)
`intelligenceRun` cron, scoring rubric, idea cards UI (Gate 1), PWA push notifications,
optional Telegram mirror. *Exit: wake up to scored repurpose targets daily — Master Plan
Phase 2 Mode A, fully replaced.*

### M4 — Agents (Weeks 5–7)
Scout agent + dashboard research chat (Mode B); QC agent scoring every gate artifact
(advisory only — it renders opinions next to the Approve button but you decide).
*Exit: every artifact arrives pre-reviewed with confidence + issues.*

### M5 — Autonomy dial + Optimizer (Weeks 7–9)
Per-gate auto-approve thresholds, budget caps + cost ledger + kill switch, Autopilot mode
with daily digest; `weeklyOptimize` proposing template diffs. *Exit: Co-pilot mode on a
real channel; you handle exceptions only.*

### M6 — Scale protocol (Week 10+, gated on Master Plan §7.1 triggers)
Multi-channel: everything is already `channel_id`-scoped, so cloning = new channel row +
brand kit + voice + OAuth + niche config. Per-channel isolation (Rule #6) is a DB
constraint, not a discipline.

---

## 7. INSIGHTS & RECOMMENDATIONS — SUMMARY

1. **The biggest unlock isn't AI — it's replacing CapCut.** Programmatic assembly (Remotion)
   converts the plan from "human with robot helpers" (75–90 min/video) to "robot with a
   human editor-in-chief" (3–5 min/video). Prioritize it (M1).
2. **Workflow-first, agents-at-the-edges.** Durable DAG for production; real agents only for
   research (Scout), judgment (QC), and learning (Optimizer). Resist the swarm.
3. **Autonomy is a dial you earn, not a switch you flip.** Ship with human gates, log QC-agent
   agreement with your decisions, raise thresholds as agreement climbs. Budget caps and a
   kill switch make Autopilot safe to actually use.
4. **fal.ai over direct Kling; pay-per-use over subscriptions.** One key, model routing per
   shot, costs that scale with output — and the stock-footage fallback halves clip spend in
   most educational niches.
5. **MCP for the copilot and the build process; direct APIs for the pipeline.** Supabase +
   Vercel + GitHub MCP (already connected) mean Claude Code can build, migrate, deploy, and
   debug this app in-session; the production runtime stays on typed SDK calls.
6. **The database is the moat.** Versioned prompts, every approval decision, every analytics
   snapshot, every cost — after 50 videos the Optimizer is tuning on a private dataset no
   competitor tool has. That's the compounding asset the Master Plan's Notion+Telegram stack
   could never accumulate.
7. **Plan around YouTube's API audit** for fully-public automated uploads; until verified,
   autopilot ends at "scheduled private upload + one tap in Studio," which is still a 95%
   reduction in touch time.

---

*Blueprint for SparkForge / BlissDirective — App build companion to Master Playbook v1.0*

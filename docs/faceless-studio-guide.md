# Faceless Studio — The Complete Guide

*The owner's manual for Faceless Studio: a near-autonomous web app for running
faceless YouTube channels end-to-end — daily content intelligence, AI script +
voiceover + video production with human approval gates, programmatic rendering,
and a publish kit — all from one calm control panel.*

This document is the instruction manual that ships with the app. It explains
**what every part does, how the pipeline flows, and how to operate it day to
day** — for an owner or a buyer taking it over.

---

## 1. What it is (in one minute)

Faceless Studio turns a **channel idea** into **finished, ready-to-upload
videos** with you reviewing at a few key checkpoints instead of doing the work.

- You create a **project** (one channel: niche, audience, angle, brand, voice).
- Every day the studio **scouts the niche** and proposes scored video ideas.
- For each approved idea it writes a **script**, makes a **voiceover**, gathers
  or **generates visuals**, **renders** the video, and assembles a **publish
  kit** (title, description, tags, thumbnail) for manual upload.
- You approve (or send back) at **four gates** — Idea, Script, Assets, Final cut
  — at whatever level of automation you choose per gate.
- Everything runs **mock-first**: with zero API keys the whole app works end to
  end on realistic placeholder data. Add a key and that step goes live — no code
  change.

---

## 2. The big picture (architecture)

```
        ┌──────────────────────────────────────────────────────────────┐
        │                     YOU (web + phone push)                     │
        │   Dashboard · Review queue · Script/Video · Market Intel ·     │
        │   Spend · Insights · Settings                                  │
        └───────────────┬───────────────────────────────┬──────────────┘
                        │ (Next.js 15 app on Vercel)     │
        ┌───────────────▼───────────────┐   ┌────────────▼─────────────┐
        │   App server (serverless)      │   │  studio-mcp  /api/mcp    │
        │   • server actions             │   │  operate it from Claude  │
        │   • pipeline state machine     │   └──────────────────────────┘
        │   • typed provider adapters ───┼──────────► Claude · ElevenLabs ·
        │     (mock-first)               │            fal.ai · Pexels · YouTube ·
        └───┬───────────────────────┬────┘            Gemini
            │                       │
   ┌────────▼────────┐     ┌────────▼─────────────────────────────────┐
   │  Supabase        │     │  GitHub Actions (background workers/cron) │
   │  Postgres · Auth │     │  Render farm · Intelligence · Optimizer · │
   │  Storage · Realtime│   │  Stats refresh · Video-Intel perception · │
   └──────────────────┘     │  DB migrate · Env sync                    │
                            └───────────────────────────────────────────┘
```

**Why this shape:** Vercel's serverless functions are perfect for the app and
quick AI calls, but can't run Chrome (Remotion rendering) or binaries (ffmpeg,
yt-dlp). Those heavy/long jobs run on **GitHub Actions** — a free, full-Linux
compute lane the app drives via a job queue in the database.

**Stack:** Next.js 15 · Supabase (Postgres/Auth/Storage/Realtime) · Anthropic
Claude · ElevenLabs · fal.ai (FLUX images, Kling/Veo/Seedance video, Kokoro TTS)
· Pexels · YouTube Data API · Google Gemini · Remotion · Vercel · GitHub Actions.

---

## 3. Core concepts

| Concept | What it is |
|---|---|
| **Project** | One channel. Holds niche, audience, angle, tone, brand kit (colors/font/thumbnail style), voice, autonomy settings, budget, and niche RPM. |
| **Video** | One piece of content moving through the pipeline, with a status. |
| **Idea card** | A scored, repurposable topic the daily intelligence run lands in the queue. |
| **Gate** | A human review checkpoint: **Idea · Script · Assets · Final cut.** |
| **Autonomy mode** | Per gate: **Assist** (always ask), **Co-pilot** (auto-approve high-confidence), **Autopilot** (never ask). |
| **Adapter** | A typed wrapper around an external service with a built-in mock. Missing key = mock; present key = live. |
| **Blueprint** | The output of a Market-Intelligence scan: what works/doesn't, hooks, structure, gaps, title/thumbnail patterns. |

---

## 4. The production pipeline (visual)

Each video is a state machine. Stages run automatically; the pipeline **pauses at
a gate** until you (Assist) or the system (Autopilot) resolves it.

```
  IDEA ──▶ IDEA_APPROVED ──▶ SCRIPTING ──▶ SCRIPT_READY ──▶ GENERATING_ASSETS
   │ gate:IDEA                  (Claude)     │ gate:SCRIPT        (VO + visuals)
   │                                          │
   └─ revise ◀──────────────────────────────┘
                                                          │
   ASSETS_READY ──▶ ASSEMBLING ──▶ FINAL_REVIEW ──▶ APPROVED ──▶ TRACKING
    │ gate:ASSETS    (Remotion       │ gate:FINAL      (publish      (live stats
    │                 render farm)    │                  kit ready)    tracked)
    └─ revise ◀───────────────────────┘

  Any stage can be sent to NEEDS_REVISION (re-runs the prior stage with your
  notes) or KILLED.
```

**Stage by stage:**

1. **Idea** — from the daily intelligence run or queued manually. Gate: *Idea*.
2. **Scripting** — Claude writes a spoken-word script (beats + visual directions
   + titles/description/tags/chapters) using the project's voice-DNA system
   prompt and tone. Gate: *Script*.
3. **Generating assets** — ElevenLabs/Kokoro voiceover per beat; visuals per beat
   from Pexels stock, FLUX images, or generated **video clips** (Kling/Veo/
   Seedance). Gate: *Assets*.
4. **Assembling** — the **render farm** (Remotion on GitHub Actions) produces the
   long-form MP4 + a Short. Gate: *Final cut*.
5. **Approved → Tracking** — the **Publish Kit** gives you everything for a manual
   upload; once live, nightly **stats refresh** tracks views/revenue.

A **QC agent** scores each gate arrival; in Co-pilot mode high scores
auto-advance. The **budget guard** pauses the pipeline before any overspend.

---

## 5. Screen-by-screen function guide

### Dashboard (`/`)
Portfolio at a glance: project count, in-pipeline, published, total views,
estimated revenue. Project cards, an **Activity** feed (new ideas, assets ready),
and a **Monthly spend** card that links to the full spend log. Live-updating via
Supabase Realtime.

### New Project wizard (`/projects/new`)
Four steps — **Niche** (name, niche, audience, content angle, tone), **Brand**
(palette, thumbnail style), **Voice** (pick from your connected voices), and
**Autonomy** (set Assist/Co-pilot/Autopilot per gate). Sets the niche **RPM** so
revenue estimates are realistic.

### Project page (`/projects/[id]`)
The channel's flow diagram, pipeline counts, queued ideas, **Scout chat**, and a
**Run intelligence** button. Sub-pages: **Settings** (edit the project + prompt
template editor) and **Videos**.

### Review queue (`/projects/[id]/review`)
Every video waiting at a gate, with its QC score and the open gate. Approve,
request a revision (with notes), or open the video. Also the **Source Library**
for the Assets gate (compliant footage + the press-kit/own-capture lane).

### Video page (`/projects/[id]/videos/[vid]`)
The work surface for one video:
- **Script review** — read/play each beat with synced word highlighting; edit a
  beat (and re-voice just that section). **Approve script & set up video**
  auto-classifies shot types and drops you into the AI Video Generation setup
  (models + timings pre-filled). You review/tweak, then **Approve video settings
  → generate** advances the video into production — nothing generates until you
  approve the settings.
- **Script Remix** — a chat with Claude to rewrite the script. Controls:
  **creativity**, **tone**, **verbiage/reading level**, **length & pacing**, and
  a **whole-script vs. per-section** target. *Propose → accept*: nothing changes
  until you accept; iterate in chat first. A Market-Intelligence brief can be
  **handed straight into this chat** (see §6).
- **AI Video Generation** — per section, choose the **shot type**
  (hero/b-roll/stock), pick a **model** (cost + quality shown), set duration,
  see the live estimate, and generate an **original** clip from your keyframe.
  A **$100/mo** budget bar guards spend. Three one-tap helpers:
  - **Auto-pick types** — Claude classifies each beat as hero / b-roll / stock
    from the script.
  - **Auto-pick models** — Veo 3.1 for hero, Seedance 2.0 for b-roll, Seedance
    2.0 Fast for stock.
  - **Match time to script** — sets each clip's seconds to that section's spoken
    length (voiceover duration, or a word-count estimate), capped at the model's
    max.
- **Title & description** editor; **Publish Kit** when the video is approved.
- **Scan the market** — deep-links into Market Intelligence pre-filled for this
  video.

### Market Intelligence (`/intel`)
Study what works in the market, then turn it into your own original plan.
- **Quick scan** (no gate): pulls similar videos via the YouTube Data API
  (titles, stats, chapters) and an optional pasted transcript → Claude
  **blueprint**.
- **Deep scan** (operator-vouched): **Gemini** ingests a public YouTube URL
  natively (no download) → timestamped notes + transcript, folded into the
  blueprint. *Precise frames* toggle instead enqueues a **worker** job that
  downloads (yt-dlp) and samples high-res frames for Claude vision.
- The **blueprint dashboard**: *what works / what doesn't*, **Hook Lab**,
  structure timeline, pacing, gaps, title/thumbnail patterns, and the
  frame-by-frame perception timeline. Actions: **Send to Script Remix**,
  **Copy brief**.
- Compliance: analysis only; **no third-party footage is ever reused** — every
  output is generated original.

### Spend log (`/costs`)
Every provider call and render cost, live. Filter by **project**, sort by date /
amount / project / **spend type** (script, voiceover, video clip, stock, video
intel…). Monthly + all-time totals.

### Insights (`/insights`)
The **optimizer** and **scout** propose prompt-template improvements as cards you
apply with one tap (versioned, revertible). Includes a QC-agreement readout.

### Settings (`/settings`)
**Credential health** (which adapters are live vs. mock, with a Test button), the
**kill switch** (pause everything), the **cost ledger**, **notifications**
(web push), and a danger zone.

---

## 6. Market Intelligence → Script Remix handoff

The two systems connect: from any blueprint tied to a video, **Send to Script
Remix** carries a structured brief (what works/doesn't, hooks, structure, gaps,
patterns) into that video's Script Remix chat — it opens the panel and pre-loads
the brief so you can remix the script against real market research in one click.

---

## 7. Intelligence & agents

- **Generate ideas (on demand)** — scouts the niche and lands a batch of ~3
  scored idea-stage videos at the Idea gate (approve/reject there). Pick
  **Short / Long / Either** to set each idea's target runtime. The nightly
  auto-run is **opt-in per project** (Settings → "Daily auto-ideas"), off by
  default — you're in control of when ideas are generated.
- **Scout chat** — ask it to tear down top channels or surface proven topics; it
  pulls real titles + view counts.
- **Optimizer** — reviews performance and proposes prompt-template revisions.
- **QC agent** — scores each gate arrival (hook, retention, policy safety);
  drives Co-pilot auto-approval.

---

## 8. Media, sourcing & models

**Mock-first adapters** (each goes live by adding its key):

| Adapter | Live with | Does |
|---|---|---|
| Claude | `ANTHROPIC_API_KEY` | Scripts, remix, QC, intelligence, blueprints |
| ElevenLabs | `ELEVENLABS_API_KEY` | Premium voiceover |
| fal.ai | `FAL_KEY` | FLUX images, **Kling/Veo/Seedance video**, Kokoro TTS |
| Pexels | `PEXELS_API_KEY` | Licensed stock b-roll |
| YouTube Data | `YOUTUBE_API_KEY` | Niche research + public stats |
| Gemini | `GEMINI_API_KEY` | Deep video-intel perception (native URL + audio) |

**Shot types** (set by the script, editable per beat, auto-classifiable):

| Type | Source | Cost | Looks like |
|---|---|---|---|
| **stock** | Real licensed footage from **Pexels** (or generate AI to replace) | Free (Pexels); model price only if you generate | Authentic real-world places, people, objects, events |
| **b-roll** | AI-generated supporting visual (FLUX still, or an AI video clip) | Cheap image, or the video model's $/sec | Generated illustrative motion/scenes |
| **hero** | Premium AI-generated signature shot | Premium model $/sec | The hook, big reveals, emotional/visual peaks |

*Stock = real captured footage; b-roll/hero = generated. A beat is `stock`
because real footage tells it better (and it's free); you only pick a video model
for a stock beat if you want to **override** Pexels with an AI clip.*

**Compliant source lanes** (the autonomous agent never touches publisher IP):
1. Autonomous licensed lane (Pexels/Pixabay/Openverse/Wikimedia, CC0/CC-BY).
2. Manual press-kit / own-capture lane (operator vouches; attribution auto-added).
3. Official embed/reference (link, don't redistribute).
4. Forbidden: ripped/leaked footage, re-uploading publisher media.

**Video-model registry** (per-segment selection shows cost + quality):

| Model | ~$/sec | Best for | Duration |
|---|---|---|---|
| Seedance 2.0 Fast | $0.022 | Cheap b-roll default | 4–15s |
| Seedance 2.0 | $0.07 | Top all-round, optional audio | 4–15s |
| Kling v2.5-turbo Pro | $0.07 | Crisp motion | 5 / 10s |
| Veo 3.1 | $0.40 | Premium, synced dialogue | 4 / 6 / 8s |

---

## 9. Background workers (GitHub Actions)

| Workflow | Trigger | Job |
|---|---|---|
| **Render Farm** (`render`) | cron 10m + dispatch | Remotion → MP4 + Short, upload, advance to Final review |
| **Intelligence** (`intelligence`) | daily cron | Scout each project → scored idea cards |
| **Optimizer** (`optimizer`) | cron | Propose template improvements |
| **Stats** (`stats`/refresh) | nightly | Refresh tracked-video views/revenue |
| **Video Intel** (`video-intel`) | cron 10m + dispatch | Deep frame perception (yt-dlp + ffmpeg + Claude vision + Gemini transcription) |
| **DB Migrate** (`db-migrate`) | on migration push | Apply `supabase/migrations/*.sql` |
| **Sync Vercel Env** (`sync-vercel-env`) | dispatch | Push GitHub secrets → Vercel, redeploy |

Heavy/long/binary jobs live here precisely because Vercel can't run them.

---

## 10. Operate it from Claude (studio-mcp)

The app ships an MCP server at `POST /api/mcp` (bearer `STUDIO_MCP_TOKEN`) so a
Claude client runs your studio conversationally. Tools: `list_projects`,
`get_project_stats`, `list_pending_approvals`, `approve_gate`,
`request_revision`, `queue_idea`, `update_project`, `get_video`,
`run_intelligence_now`, `get_cost_summary`, `propose_template_update`.

*"What's pending review across my projects?"* · *"Approve everything QC scored
above 85."* · *"Run intelligence on the AI-investing channel."*

---

## 11. Cost controls

- **Per-video** and **monthly** budget caps per project (the budget guard pauses
  the pipeline before overspend).
- A separate **$100/mo AI-video-generation cap** (portfolio-wide).
- The **kill switch** halts all paid work instantly.
- Every paid call is written to the **cost ledger** and surfaced in `/costs`.
- Niche **RPM** per project drives realistic revenue estimates.

---

## 12. Setup & deployment (pointers)

- **Accounts & keys checklist:** [setup.md](./setup.md).
- **Operations (env, cron, MCP, troubleshooting):** [RUNBOOK.md](./RUNBOOK.md).
- Flow: create the Supabase project → add keys as **GitHub secrets** → run
  **Sync Vercel Env** (pushes them to Vercel + redeploys) → **DB Migrate** runs on
  any migration push. Generate shared secrets with `openssl rand -hex 32`.
- Mock-first means you can demo the entire app with **zero credentials** first.

---

## 13. Compliance & security posture

- **Source policy:** the autonomous agent never touches publisher IP; IP-heavy
  footage only enters via a human-vouched lane; nothing gets re-uploaded.
- **Video intelligence:** analysis only — "learn from anything, generate
  everything we ship." Competitor frames/footage never reach a render. The
  download path (yt-dlp) is gated behind a one-time research acknowledgment.
- **YMYL niches** (finance/health): the QC policy check enforces
  educate-don't-advise; set such projects accordingly.
- **Auth:** Supabase Auth gates the app; the MCP endpoint is bearer-token scoped;
  GitHub secrets are write-only and synced to Vercel by the env workflow.

---

## 14. If you're taking this over (handover checklist)

A buyer receives a complete, self-hostable system. To make it yours:

1. **Stand up infra:** your own Supabase project + Vercel project; set
   `NEXT_PUBLIC_SUPABASE_URL` etc.; run DB Migrate.
2. **Add provider keys** as GitHub secrets, run **Sync Vercel Env**. Start with
   Claude + YouTube (cheapest path to real value); add fal/ElevenLabs/Gemini as
   you scale.
3. **Set `STUDIO_MCP_TOKEN`** if you want conversational control.
4. **White-label:** brand name lives in the top nav/shell; per-channel branding
   is in each project's brand kit.
5. **Pick your portfolio** (see `docs/preliminary-niche-research.md` and the
   concept-review docs), create projects in the wizard, and let the daily
   intelligence run fill the queue.
6. **Operate by exception:** start gates in Assist, move proven steps to Co-pilot
   /Autopilot as you trust the output. Watch `/costs` and the budget caps.

**What's included:** the full pipeline, review gates, publish kit, live stats,
intelligence/optimizer/scout agents, Market Intelligence (Quick/Deep/Precise),
Script Remix, AI video generation, the studio-mcp server, the render farm and
background workers, mock-first adapters for zero-credential demos, and the docs
in `/docs`.

---

## 15. Glossary

- **Gate** — a review checkpoint (Idea/Script/Assets/Final).
- **Autonomy mode** — Assist / Co-pilot / Autopilot, per gate.
- **Blueprint** — structured market analysis → an original content plan.
- **Beat** — one ~60–90s section of a script (narration + visual direction).
- **Adapter** — typed external-service wrapper with a mock fallback.
- **Render farm** — the GitHub Actions Remotion worker.
- **RPM** — revenue per 1,000 views; set per project for revenue estimates.
- **studio-mcp** — the in-app MCP server for operating the studio from Claude.

---

*Faceless Studio — built to run a portfolio of channels with you in the loop only
where it matters. For deeper architecture and decisions, see
[AppBlueprint-TechnicalPlan.md](./AppBlueprint-TechnicalPlan.md),
[FacelessChannel-MasterPlan.md](./FacelessChannel-MasterPlan.md), and
[video-intelligence-spec.md](./video-intelligence-spec.md).*

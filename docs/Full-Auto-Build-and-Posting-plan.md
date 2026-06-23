# Full-Auto Build & Post — Architecture & Build Plan

> Status: **DRAFT for review.** No code is written yet. This doc is the
> blueprint we finalize together before any implementation. Items marked
> **⟶ confirm** are recommended defaults awaiting your sign-off.

---

## 1. Goal

A per-project ("channel") one-button system — **"Build & Post"** — that takes a
batch of 1–6 videos from idea → script → assets → render → **scheduled auto-
publish** → tracking, fully unattended, with quality gating, budget guardrails,
and a feedback loop that adapts to performance over time.

It is the orchestration capstone over primitives the app already has; ~70% is
wiring existing pieces together, ~30% is new (the modal, a batch-run record, a
publish scheduler, and QC-gated auto-approval).

---

## 2. The loop, mapped to the app

| Piece | Exists today | Build & Post adds |
|---|---|---|
| **Automation** | render/clips/stats crons; `fullAutoGenerate` (tier plan + `auto_finish`) | **Build-run orchestrator** + run record; **publish scheduler** cron |
| **Source** | `ideas` table; `runIntelligence` (Scout/niche research) | Use existing ideas **or** auto-generate N; **topic dedup** vs prior videos |
| **Skill** | Claude script → ElevenLabs VO → fal visuals → Remotion render → hero-still+phrase thumbnail | reused as-is |
| **Agent** | Claude (script, shot-type, kinetic phrase, idea research) | reused; idea ranker for performance bias |
| **Checker** | QC agent scores every gate; autopilot auto-approves on score | **QC floor**, **auto-revise-once**, **budget pre-flight** |
| **Memory** | `vo_cache`, QC→script feedback loop, `optimizer` insights, `analytics_snapshots` | **performance-aware** idea/tier selection; dedup memory |
| **Budget** | per-video budget, **$100/mo video cap**, tier cost estimates | per-batch **cost estimate + confirm**, cap enforcement |

---

## 3. Finalized decisions (from review)

1. **Quality gate = auto-revise once, then judge.** On a sub-floor QC score at
   the script gate, run **one** revision pass (reusing the QC→script feedback
   loop), re-score, then publish if it passes the floor, else **hold** in
   "Needs attention" (never auto-post a weak video).
2. **Cadence = both modes offered:** *Multi-day* (one video per day at the slot)
   **and** *Staggered within a day* (multiple per day at fixed times). Plus
   *All at once* (publish each as soon as its assets finalize).
3. **One config for the whole batch** (length, type, tier, thumbnail style,
   schedule apply to all N).
4. **Performance-aware from day one**, with a **cold-start fallback**: until the
   channel has ≥ N published videos with stats, fall back to QC/heuristics; then
   bias idea topics, format, and tier toward what's performing.

---

## 4. Open decisions — recommended defaults (⟶ confirm)

| # | Topic | Recommended default |
|---|---|---|
| O1 | **Post time / timezone** | 2:00 PM **America/Chicago**, DST-aware (CDT/CST auto). |
| O2 | **Staggered times** | 2/day → 10:00 AM + 2:00 PM CT; 3/day → 9:00 AM + 1:00 PM + 6:00 PM CT. |
| O3 | **Multi-day start** | First slot = **next 2 PM CT** (today if before 2 PM, else tomorrow), then +1 day each. |
| O4 | **QC floor** | **7.0 / 10** to auto-publish; below → revise once → still below → hold. |
| O5 | **Auto-revise scope** | Script gate only, **max 1** revision (bounded cost). Assets/render failures → hold, no auto-retry loop. |
| O6 | **Cold-start threshold** | Performance weighting activates at **≥ 5** published videos with ≥ 1 stats snapshot; below that, QC/heuristics. |
| O7 | **"Thumbnail style"** | Now that thumbnails are hero-still + kinetic phrase, "style" = a **text/treatment preset** (e.g. *Bold bottom* / *Center punch* / *Top kicker*) + accent color from brand. (The old AI-image style was removed.) |
| O8 | **Default privacy** | Auto-posted videos go up **unlisted** unless the project's `YOUTUBE_UPLOAD_PRIVACY` says otherwise — review before public. *(Strongly recommended for an unattended loop.)* ⟶ or `public`? |
| O9 | **Concurrency** | Up to 6 videos/run; render farm processes ≤ 5/pass so a batch drains over a few cron cycles (fine). |
| O10 | **Privacy of auto-publish** | A run can be **paused/cancelled** any time from the run dashboard; cancels un-published items. |

---

## 5. Architecture

### 5.1 Data model (new)

**`build_runs`** (one row per Build & Post launch)
```
id              uuid pk
project_id      uuid → projects
status          text    -- planning | generating | scheduled | publishing | done | held | cancelled
count           int     -- 1..6
kind            text    -- 'long' | 'short'
length_min_sec  int
length_max_sec  int
tier            text    -- base | economy | premium | platinum | custom
custom_spec     jsonb   -- when tier=custom
thumb_style     text    -- O7 preset
qc_floor        numeric -- default 7.0
schedule_mode   text    -- all_at_once | multi_day | staggered
schedule_cfg    jsonb   -- {times:[...], startDate, perDay}
idea_source     text    -- 'existing' | 'research'
est_cost_usd    numeric
total_cost_usd  numeric
created_at      timestamptz
```

**`videos`** new columns
```
build_run_id        uuid → build_runs (nullable)
scheduled_publish_at timestamptz   -- absolute UTC release time (null = ASAP/all-at-once)
auto_publish        boolean         -- this video publishes itself when due
auto_pilot_run      boolean         -- gates auto-approve (QC-gated) for this video
```

No change to the core state machine — Build & Post drives videos through the
**existing** `IDEA → … → APPROVED → TRACKING` states, just without human taps.

### 5.2 Orchestrator (the "automation")

A server action `startBuildRun(projectId, config)`:
1. **Budget pre-flight:** estimate batch cost = Σ `estimateTierCost(tier, …)` per
   planned video; reject if it would exceed the $100/mo cap; surface the number
   for confirm.
2. **Source ideas:** `idea_source='existing'` → take selected ideas;
   `'research'` → `runIntelligence` to generate `count` scored ideas, **deduped**
   against prior video topics (memory), **ranked** by performance bias (§5.5).
3. **Create N videos** (`queueTopic`-style insert) with `build_run_id`,
   `auto_pilot_run=true`, `kind`, target length sampled in [min,max], `thumb_style`.
4. **Compute schedule:** assign each video a `scheduled_publish_at` per
   `schedule_mode` (absolute UTC from 2 PM CT, DST-aware) — null for all-at-once.
5. **Kick generation:** for each, run `fullAutoGenerate(tier)` which auto-classifies
   shots, approves the script gate, generates VO/stills/clips, sets `auto_finish`
   → render farm renders → `FINAL_REVIEW`.
6. The **gate auto-approver** (§5.3) carries each video to `APPROVED`.
7. The **publish scheduler** (§5.4) releases each at its slot.

A new GitHub Actions cron (the loop heartbeat, every ~10–15 min) advances runs
and is **idempotent** (re-entrant; only acts on what's due).

### 5.3 QC-gated auto-approval (the "checker")

For `auto_pilot_run` videos, at each gate arrival the QC agent (`reviewGate`)
scores the artifact:
- **Script gate:** score ≥ floor → approve. Below → **revise once** (regenerate
  script with the QC issues injected — the loop we built), re-score; pass →
  approve; still below → set **HELD** (needs attention), drop from the run.
- **Assets / Final gates:** score ≥ floor → approve & continue; below → hold.
- Render/asset **failures** → hold (no infinite retry); the rest of the batch
  proceeds (fail-soft).

This reuses `decideGate`, `qc_reviews`, autonomy logic, and `COPILOT_AUTO_APPROVE_SCORE`.

### 5.4 Publish scheduler (the "schedule")

Videos reach `APPROVED` but **do not publish** until their slot.
- A scheduler pass finds `auto_publish` videos with
  `scheduled_publish_at <= now()` (or null for all-at-once, once `APPROVED`) and
  sets `publish_requested=true`.
- The **existing** render-farm `publishStagedVideos` then uploads to the
  project's channel (per-project token) → `TRACKING`.
- Times are stored as **absolute UTC** computed from 2 PM CT on each target date,
  so DST is resolved once at scheduling time. No drift, no double-posts.

### 5.5 Performance-aware selection (the "memory", self-improving)

Inputs: `analytics_snapshots` (views/retention) + `optimizer` insights.
- **Idea ranking:** score generated ideas by similarity to the channel's top
  performers (topic/angle/format), then pick the top `count`.
- **Tier/format nudge:** if shorts or a given tier consistently outperform, bias
  the *suggested* defaults in the modal (you still choose).
- **Cold start (O6):** below threshold, fall back to QC score + niche heuristics.
- Persist a small per-project "playbook" (what's working) refreshed by the
  optimizer cron — same pattern as the QC→script lessons.

### 5.6 Budget (guardrail)

- Pre-flight estimate shown in the modal; **hard stop** if over the monthly cap.
- Per-video budget still downgrades pricey beats to free stills/stock as today.
- Run dashboard shows **est vs actual** spend; a run can be cancelled mid-flight.

---

## 6. UI / UX

### 6.1 Project home — the button
A primary **"Build & Post"** button on the project home (next to "Generate ideas").

### 6.2 The modal (one config for the batch)
- **How many** — 1–6 (stepper, hard max 6).
- **Ideas** — ◦ Use selected existing ideas (multi-select list) ◦ Research new
  (Claude generates `count`, deduped + performance-ranked).
- **Type** — Long-form / Short.
- **Length range** — min–max (e.g. 1–2 min); each video samples within it.
- **Thumbnail style** — preset (O7).
- **Quality tier** — Base / Economy / Premium / Platinum / Custom.
- **Schedule** — All at once / Multi-day / Staggered (+ per-day count & times,
  defaults O2); time zone shown (CT).
- **Advanced** — QC floor (default 7), privacy (default unlisted).
- **Footer** — live **estimated cost** + remaining monthly budget + **Launch**
  (disabled if over cap).

### 6.3 Run dashboard
Per run: each video's live stage (generating → rendering → scheduled → posted),
scheduled time, QC score, cost; **Pause / Cancel run**; held items surfaced for
one-tap review. Lives on the project home (replaces/extends "Needs attention").

---

## 7. Phase-by-phase build

| Phase | Deliverable | Notes |
|---|---|---|
| **P0 — Data + run record** | `build_runs` table, `videos` columns, `startBuildRun` action that creates N videos + kicks `fullAutoGenerate`. No scheduling/auto-approve yet (lands at FINAL_REVIEW). | Smallest end-to-end slice. |
| **P1 — QC-gated auto-approve + auto-revise-once** | Auto-advance gates on QC ≥ floor; one script revision on miss; hold otherwise; fail-soft. | Reuses `decideGate`, feedback loop. |
| **P2 — Publish scheduler** | `scheduled_publish_at`, scheduler cron, 2 PM CT DST-aware, all-at-once / multi-day / staggered → `publish_requested`. | Reuses `publishStagedVideos`. |
| **P3 — Budget pre-flight** | Batch cost estimate, monthly-cap stop, est-vs-actual on the dashboard. | |
| **P4 — Build & Post modal + run dashboard** | The full UI (§6). | First user-facing milestone. |
| **P5 — Performance-aware selection** | Idea ranking + tier/format nudges from stats; cold-start fallback; per-project playbook. | The "improving" loop. |
| **P6 — Monitoring & alerts** | Push/notify on run complete, held items, posted; retention surfaced. | Reuses web-push + stats. |

Each phase is independently shippable and reverts cleanly.

---

## 8. Failure handling & edge cases
- **One video fails** → held, batch continues (fail-soft).
- **Budget cap hit mid-run** → remaining videos pause; you're notified.
- **YouTube quota** (≈ 6 uploads/day on default quota) → scheduler spreads or
  queues past the daily limit; surfaced if exceeded.
- **No live keys** (fal/ElevenLabs) → mock path; the run is flagged as a dry run.
- **Scheduler restart / double-run** → idempotent (acts only on what's due,
  `publish_requested` is a one-way latch).
- **Cancel run** → un-published videos stop; already-posted stay.

---

## 9. Safety / guardrails
- Default **unlisted** posting (review before public) ⟶ confirm O8.
- Hard **monthly $ cap** + per-run estimate + confirm.
- Brand-safe content (the visual-prompt scrubbing + no-text rules already live).
- Per-project channel token (already built) — a run posts only to its channel.
- Full **audit**: run record + `cost_ledger` + `approvals` + QC scores.

---

## 10. Reuse map (existing → leveraged)
`fullAutoGenerate`, `selectClipBeats`/tiers, `auto_finish`, `runIntelligence`,
`queueTopic`, `decideGate` + autonomy + `qc_reviews`, QC→script feedback loop,
`publish_requested` + `publishStagedVideos`, per-project `youtube_refresh_token`,
render/clips/stats crons, `optimizer` + `analytics_snapshots`, `cost_ledger` +
caps, hero-still+phrase thumbnail, web-push notifications.

---

## 11. Open questions to close before P0
1. O8 — default posting privacy: **unlisted** (recommended) or public?
2. O2/O3 — confirm staggered times and multi-day start rule.
3. O4/O6 — QC floor (7.0) and cold-start threshold (5 videos) OK?
4. O7 — thumbnail "style" as a text-treatment preset — agree, or do you want a
   different notion of style?
5. Should a run be able to mix long + short, or one type per run? (Current plan:
   one type per run, per "one config for the batch".)

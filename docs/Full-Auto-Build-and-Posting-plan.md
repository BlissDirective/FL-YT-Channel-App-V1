# Full-Auto Build & Post — Architecture & Build Plan

> Status: **FINALIZED — ready to build.** All decisions are locked (§3 + §4).
> No code is written yet; implementation begins at Phase 0 on approval.

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
   loop), re-score, then proceed if it passes the floor, else **hold** in
   "Needs attention" (never auto-post a weak video).
2. **Posting privacy = QC-tied** (decided on the **final-cut** QC score):
   - score **≥ 8.0 → Public** (full reach, hands-off),
   - **7.0 ≤ score < 8.0 → Unlisted** (staged for a quick human glance, not broadcast),
   - **score < 7.0 → Held** (not posted at all).
3. **Cadence = both modes offered:** *Multi-day* (one video/day at the slot)
   **and** *Staggered within a day* (multiple/day at fixed times). Plus
   *All at once* (publish each as soon as its assets finalize).
4. **One config for the whole batch** (length, type, tier, thumbnail style,
   schedule apply to all N).
5. **One content type per run** — a run is all long-form **or** all short-form
   (never mixed), consistent with "one config for the batch".
6. **Performance-aware from day one**, with a **cold-start fallback**: until the
   channel has **≥ 5** published videos with stats, fall back to QC/heuristics;
   then bias idea topics, format, and tier toward what's performing.
7. **Thumbnail style = text-treatment preset** (Bold-bottom / Center-punch /
   Top-kicker) + brand accent color, over the hero still (the old AI-image
   thumbnail style was removed).

---

## 4. Finalized parameters

| # | Parameter | Value |
|---|---|---|
| P1 | **Post timezone / base slot** | 2:00 PM **America/Chicago**, DST-aware (CDT/CST resolved at scheduling time). |
| P2 | **Staggered times** | 1/day → 2 PM CT · 2/day → 10 AM + 2 PM CT · 3/day → 9 AM + 1 PM + 6 PM CT. |
| P3 | **Multi-day start** | First slot = next 2 PM CT (today if before 2 PM, else tomorrow), +1 day each. |
| P4 | **QC floor (publish at all)** | **7.0 / 10**. Below → revise once → still below → Held. |
| P5 | **QC public threshold** | **8.0 / 10**. ≥ 8.0 → Public; 7.0–8.0 → Unlisted; < 7.0 → Held. |
| P6 | **Auto-revise scope** | Script gate only, **max 1** revision. Assets/render failures → Held (no retry loop). |
| P7 | **Cold-start threshold** | Performance weighting activates at **≥ 5** published videos with ≥ 1 stats snapshot. |
| P8 | **Thumbnail styles** | Bold-bottom · Center-punch · Top-kicker (text treatment) + brand accent. |
| P9 | **Run size** | 1–6 videos; render farm processes ≤ 5/pass (batch drains over a few cron cycles). |
| P10 | **Run control** | A run can be **paused/cancelled** anytime; cancel stops un-published items, keeps posted ones. |

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
thumb_style     text    -- bold-bottom | center-punch | top-kicker (P8)
qc_floor        numeric -- default 7.0  (publish at all)
qc_public       numeric -- default 8.0  (>= → Public, floor..public → Unlisted)
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
publish_privacy     text            -- public | unlisted (set from final QC score, P5)
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
- **Script gate:** score ≥ floor (7.0) → approve. Below → **revise once**
  (regenerate script with the QC issues injected — the loop we built), re-score;
  pass → approve; still below → **HELD** (needs attention), drop from the run.
- **Assets gate:** score ≥ floor → approve & continue; below → Held.
- **Final gate (decides privacy, P5):** the final-cut QC score sets how it posts —
  **≥ 8.0 → Public**, **7.0–8.0 → Unlisted** (staged for your glance),
  **< 7.0 → Held** (not posted).
- Render/asset **failures** → Held (no infinite retry); the rest of the batch
  proceeds (fail-soft).

This reuses `decideGate`, `qc_reviews`, autonomy logic, and `COPILOT_AUTO_APPROVE_SCORE`.

### 5.4 Publish scheduler (the "schedule")

Videos reach `APPROVED` but **do not publish** until their slot.
- A scheduler pass finds `auto_publish` videos with
  `scheduled_publish_at <= now()` (or null for all-at-once, once `APPROVED`) and
  sets `publish_requested=true`.
- The **existing** render-farm `publishStagedVideos` then uploads to the
  project's channel (per-project token) at the video's `publish_privacy`
  (Public/Unlisted, set from the final QC score per P5) → `TRACKING`.
- Times are stored as **absolute UTC** computed from 2 PM CT on each target date,
  so DST is resolved once at scheduling time. No drift, no double-posts.
- **Note:** the worker's `uploadVideo` currently reads one privacy from
  `YOUTUBE_UPLOAD_PRIVACY`; P5 requires a small change to accept a **per-video**
  privacy override.

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
- **Thumbnail style** — Bold-bottom / Center-punch / Top-kicker (P8).
- **Quality tier** — Base / Economy / Premium / Platinum / Custom.
- **Schedule** — All at once / Multi-day / Staggered (+ per-day count & times,
  defaults P2); time zone shown (CT).
- **Advanced** — QC floor (7.0) + public threshold (8.0). Privacy is **QC-tied
  (automatic)** — no manual privacy picker; high QC posts Public, borderline
  Unlisted, fail Held.
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
- **QC-tied privacy** (P5): only confidently-good cuts (≥ 8.0) go Public;
  borderline (7.0–8.0) post Unlisted for review; failures are Held, never posted.
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

## 11. Open questions

**All resolved** (see §3 Finalized decisions + §4 Finalized parameters) —
privacy is QC-tied (P5), staggered times confirmed (P2), QC floor 7.0 / public
8.0 / cold-start 5 confirmed (P4–P7), thumbnail presets confirmed (P8), one type
per run confirmed (§3.5).

**Plan is ready to build — starting at Phase 0 (data model + run record).**

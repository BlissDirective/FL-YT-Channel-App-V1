# Fable 5 — Director Mode Build Spec

**Status:** Approved concept, consultation complete — ready to build
**Date:** 2026-07-13
**Owner:** Operator (Chris) · Spec by Fable 5 session
**Branch:** `claude/manual-operator-pipeline-mode-ie8mpw`

---

## 0. The problem this solves

The app today is optimized for autonomy: QC gates that hard-block progress,
sweeps that move assets on their own, revision caps, fail-closed holds, and
an Autopilot Operator that seeds and finalizes videos on a calendar. That
machinery is powerful but currently **over-constrains the operator** — assets
stall on threshold misses, automated actions fire when they aren't wanted,
and the pipeline's "what happens next" is decided by the engine, not the
human.

**Director Mode** is a per-project pipeline mode in which the operator
directs every stage and conducts every agent action. Agents still do all the
work — ideation, scripting, judging, QC analysis, visual generation, editing,
revision — but **nothing moves, generates, revises, or publishes unless the
operator presses the button.** QC and judges become advisors, not
gatekeepers.

---

## 1. Consultation record (operator decisions)

These eight decisions were made by the operator on 2026-07-13 and are binding
for the build. Recorded verbatim-in-substance:

| # | Question | Decision |
|---|----------|----------|
| 1 | Hard QC gates & safety rails in Director Mode | **Advisory QC, keep money rails.** All quality floors (idea score, seed-vision, fact-risk, self-watch, beat relevance, revision caps) become advisory badges/notes — nothing blocks or auto-revises. Budget caps and the fail-closed spend guard (paid generation blocked when the QC model has no key) stay active. |
| 2 | Autonomous background systems (auto-fix sweep, self-watch runner, auto-rescript, Autopilot Operator, cron nudges, build-run finalizer) | **Convert to on-demand buttons.** All sweeps/crons skip Director projects entirely; each capability becomes a per-asset button ("Run Auto-Fix pass", "Run Self-Watch analysis", …). Nothing runs unless triggered. |
| 3 | UI shape | **Director Console per asset.** Library grid stays as the overview; opening an asset in a Director project shows a stage-rail console — each stage (Idea → Script → Visuals → Edit → Publish) is a card with Generate / Review / Revise / Re-render / Advance buttons, agent notes inline, editing suite embedded at the visuals/edit stages. |
| 4 | Learning loop | **Full operator-signal learning.** Every approve/reject/revise/publish decision is logged against the agents' scores; disagreements become memory lessons so judges calibrate to the operator's taste over time. |
| 5 | Mode setting mechanics | **Per-project, switchable anytime, freeze-in-place.** "Pipeline Mode: Autonomous / Director" in project Settings + new-project wizard. Flipping to Director freezes in-flight videos at their current stage; flipping back re-arms the engine from wherever assets sit. |
| 6 | Length targeting | **Preset brackets + hard enforcement.** Format (Short/Long) + bracket chosen at idea time. Script agent targets the bracket by word count; post-voiceover actual duration is checked against the bracket with an advisory flag (never a block) if it misses. |
| 7 | Revise vs Re-render semantics | **Two distinct buttons at every stage, unlimited, no caps.** REVISE = targeted fix to the existing artifact applying review findings + optional operator notes. RE-RENDER = fresh artifact from scratch (reviews + notes as context). |
| 8 | Session deliverable | **Spec doc only**, pushed to branch; implementation in follow-up sessions after spec approval. |

**Operator's core question, answered:** *Does the agentic learning loop still
function in Director Mode?* — **Yes, fully.** The Studio Memory loop
(`src/lib/pipeline/memory.ts`, `memory-service.ts`, playbook) is fed by agent
*actions and outcomes* — QC reviews, autofix critiques, retention data — not
by *who triggered them*. Every review/revise/watch action the operator
conducts writes the same evidence-gated lessons as today. Decision #4 goes
further: operator decisions become an **additional, higher-quality signal**
the autonomous mode never had (see §7).

---

## 2. Design principles

1. **The operator is the state machine.** In Director Mode the engine never
   chooses the next action. Every transition is an explicit operator command.
2. **Agents advise, never veto.** Every judge/QC/review result is displayed
   with full findings and preloaded into Revise/Re-render — but a low score
   never stops a button from working.
3. **Money rails are not creative rails.** Budget caps (`budgetPause`),
   monthly video-spend caps, per-action cost estimates, and the fail-closed
   guard (`failClosedBlocksSpend`) remain enforced. The global kill switch
   remains enforced.
4. **One button = one bounded action.** A press does its stage's work
   (including its internal quality micro-loops, §4.4) and stops. No chaining,
   no hop loop, no follow-on gate decisions.
5. **Same engine, two conductors.** Director Mode reuses the existing stage
   bodies (`runScripting`, `runAssetGeneration`, `runAssembly`, autofix,
   self-watch, …). We branch *orchestration*, not *capability* — no forked
   stage logic to maintain.
6. **Reversible.** A project can flip modes at any time with well-defined
   freeze/resume semantics (§4.2). No data migration on flip.

---

## 3. Data model changes (Supabase migrations)

### 3.1 `projects.pipeline_mode`

```sql
alter table projects add column pipeline_mode text not null default 'autonomous'
  check (pipeline_mode in ('autonomous', 'director'));
```

- Read alongside the existing per-gate `autonomy` record. In Director Mode
  the per-gate autonomy settings are ignored (UI greys them out with an
  explanatory note); they're preserved so flipping back restores them.

### 3.2 `videos.length_target`

```sql
alter table videos add column length_target jsonb;
-- shape: { "format": "short" | "long", "bracket": "60-90s",
--          "minSec": 60, "maxSec": 90 }
```

Preset brackets (constants in `packages/core`, exported next to
`SHORT_LENGTHS`):

| Format | Brackets |
|---|---|
| Short | 15–30s, 30–60s, 60–90s, 90–180s |
| Long | 1–2 min, 2–3 min, 3–4 min, 4–5 min, 5–6 min, 6–8 min |

`length_target` is set at idea/video creation in Director Mode and is
nullable — autonomous-mode videos keep today's `target_len`/tier behavior.
When present it **wins** over tier defaults in `runScripting` and VO
assembly.

### 3.3 `operator_decisions` (the decision ledger, feeds learning §7)

```sql
create table operator_decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  stage text not null,            -- 'idea'|'script'|'visuals'|'edit'|'publish'
  action text not null,           -- 'generate'|'review'|'revise'|'rerender'|'advance'|'step_back'|'publish'|'kill'
  agent_score numeric,            -- latest agent/judge score for the artifact at decision time (null if unreviewed)
  agent_verdict text,             -- 'pass'|'fail'|null relative to the (advisory) floor
  operator_notes text,            -- free-text notes passed with the action
  findings_applied jsonb,         -- which review findings were attached to a revise/re-render
  cost_usd numeric,               -- actual cost recorded for the action (from ledger)
  created_at timestamptz not null default now()
);
create index on operator_decisions (project_id, created_at desc);
create index on operator_decisions (video_id, stage);
```

RLS: same owner-scoped policies as `qc_reviews`.

### 3.4 Advisory reviews — no new table

Stage reviews in Director Mode write to the existing `qc_reviews` (and
seed-vision / watch verdict storage) exactly as today, with
`decided_by: 'operator_directed'` where a decider is recorded. The
*interpretation* changes (advisory), not the storage.

---

## 4. System changes

### 4.1 Engine orchestration branch

`src/lib/pipeline/engine.ts` — the hop loop in `runPipeline` (line ~1555) is
the single place autonomous advancement happens. Changes:

1. **Mode guard at the top of `runPipeline`:** if
   `project.pipeline_mode === 'director'` and the call did not originate from
   an explicit director action (new `opts.directed?: { stage, actorNote? }`
   param), return `{ ok: true }` without acting. This single guard makes
   every legacy caller (crons, sweeps, gate-decision chaining, Telegram,
   MCP autonomous tools) a no-op for Director projects.
2. **Directed single-step execution:** new exported entry point
   `runDirectedStage(videoId, stage, opts)` that executes exactly one stage
   body (`SCRIPTING` → `runScripting`, `GENERATING_ASSETS` →
   `runAssetGeneration`, `ASSEMBLING` → `runAssembly`) and stops at the
   resulting gate status. **No hop loop** — one press, one stage.
3. **`decideGate` in Director Mode:** `approved` moves status forward via
   `ON_APPROVE` but never chains into the next stage body; `revision`
   ignores `revisionWarnAt`/`revisionHardCap` entirely (no warn, no block).
   `COPILOT_AUTO_APPROVE_SCORE` logic is bypassed.
4. **Advisory gate results:** every floor check in stage bodies
   (`ideaFloor`, `seedVisionFloor` cross-stage holds, `factRiskMax` holds,
   `beatRelevanceFloor` re-rolls, watch-gate publish blocks) branches on
   mode: in Director Mode the finding is **recorded + surfaced** (attached
   to the artifact and the video's advisory feed) but the video proceeds/
   holds only per the operator's buttons.
5. **Money rails unchanged:** `budgetPause`, `checkBudget`,
   `VIDEO_MONTHLY_CAP_USD`, `failClosedBlocksSpend`, and `isKillSwitchOn`
   run identically in both modes.

### 4.2 Freeze / resume semantics (mode flip)

- **Autonomous → Director:** nothing is killed mid-execution (serverless
  stage bodies finish their current invocation and land on their next
  status). From the flip onward, guard (4.1.1) stops all further movement.
  Every video effectively freezes at its current status. The Library shows a
  "Awaiting direction" chip on frozen non-gate statuses.
- **Director → Autonomous:** per-gate autonomy settings resume meaning. A
  one-time "re-arm" pass calls `runPipeline` on every video sitting in a
  non-gate working status (`SCRIPTING`, `GENERATING_ASSETS`, `ASSEMBLING`)
  so nothing stays stranded; gate statuses wait for their configured
  autonomy as normal.
- Flip is a Settings action with a confirm dialog stating exactly the above.

### 4.3 Sweeps, crons, and background runners

Every autonomous entry point adds a `pipeline_mode = 'director'` skip filter
on its project query:

| System | File | Director-mode behavior |
|---|---|---|
| Build-run processor | `engine.ts` `processPendingBuildVideos` | Skips director projects (Build & Post runs are an autonomous-mode feature; hidden in Director UI) |
| Autopilot finalizer | `engine.ts` `finalizeAutoPilotVideos` | Skip |
| Scheduled release | `engine.ts` `releaseScheduledVideos` | Skip — publish is always manual (§6.5) |
| Auto-fix sweep | `pipeline/autofix.ts` sweep entry | Skip; becomes per-asset button |
| Self-watch runner | `pipeline/watch-runner.ts` | Skip; becomes per-asset button |
| Auto-rescript | `pipeline/auto-rescript.ts` | Skip; becomes per-asset button |
| Autopilot Operator tick | `pipeline/operator.ts` | Cannot be started on a director project (UI hides Autopilot page; server action rejects); an active run blocks flipping to Director until stopped |
| Stall nudges / reconcilers | `reconcileStuckRenders`, `reconcileBuildRuns` | `reconcileStuckRenders` **stays on** (it heals externally-stuck renders, doesn't advance stages); run-level reconcilers skip |
| Telegram approval cards / digests | `adapters/telegram.ts` call sites | Skip for director projects (no gates to approve remotely in v1) |

### 4.4 In-stage quality micro-loops (kept, bounded, disclosable)

Within a single operator-triggered generation, the agent still does the
stage *well*: art-director prompt refinement, seed-still re-roll below
`seedVisionFloor` before paying to animate, pHash variety re-roll, stock
fallback. These run **inside the one button press**, capped exactly as
today, because they're part of "the agent executes this stage" — not
cross-stage automation. Two adjustments:

- Every micro-loop action is itemized in the stage card's activity log
  ("re-rolled seed still 2× (vision 4.8 → 7.1), +$0.12") so the operator
  sees and learns what the press did.
- A per-project toggle `director_micro_loops` (default **on**) lets the
  operator disable in-stage re-rolls for absolute single-shot control.

### 4.5 Length targeting (Decision #6)

1. **Selection:** idea-creation UI (§6.2) requires format + bracket.
   Stored to `videos.length_target` when the video is spun up.
2. **Script targeting:** `runScripting` computes a word budget from the
   bracket midpoint × the project's measured narration rate (fallback
   150 wpm), passes `targetWords` + hard `minSec`/`maxSec` into
   `generateScript`, and the prompt instructs the model to hit the window.
3. **Enforcement check:** after VO synthesis (`synthesizeBeatVo` /
   assembly), actual total duration is compared to the bracket. Outside the
   window → an **advisory flag** on the video ("Ran 4:37 against a 3–4 min
   target, +18%") plus a preloaded one-click action: **"Revise to length"**
   (a script revise with the duration delta as the finding). Never a block.
4. Existing `SHORT_LENGTHS` remains for autonomous mode; brackets are a
   superset defined beside it in `packages/core`.

---

## 5. The stage model — actions and their agents

Director Mode presents five operator-facing stages mapped onto the existing
state machine (no new statuses needed):

| Console stage | Underlying statuses | Generate action | Review action(s) (advisory) | Revise / Re-render target |
|---|---|---|---|---|
| **1. Idea** | `IDEA`, `IDEA_APPROVED` | Generate N ideas (1–5) with format+bracket (guardrails `planNextTopic` / intelligence) | Idea judge (`gateIdea`) + dedup check | Revise idea text / regenerate idea |
| **2. Script** | `SCRIPTING`, `SCRIPT_READY` | Generate script to length (`runScripting`) | Script QC (`reviewGate`), editorial guard, fact-check (`factCheckScript`) | `remixScript` (revise) / `regenerateScript` (re-render) |
| **3. Visuals** | `GENERATING_ASSETS`, `ASSETS_READY` | Generate VO + visuals (`runAssetGeneration`) | Seed-vision critique, beat-relevance (`verifyBeatVisual`), image inspect | Per-beat: `rerollBeatVisual`, `generateBeatVideo`, stock swap; whole-stage re-render |
| **4. Edit** | `ASSEMBLING`, `FINAL_REVIEW` | Assemble/render (`runAssembly` → farm) | Self-Watch analysis (`watch-gate`), autofix critique pass, final QC | Autofix apply (revise) / re-assemble (re-render); full editing suite (`videos/[vid]/edit`) embedded |
| **5. Publish** | `APPROVED`, `TRACKING` | Mark approved + build publish kit | Watch verdict + packaging review (advisory) | Metadata edit, thumbnail re-roll; then manual publish-kit download |

Cross-cutting per-stage actions: **Advance ▸** (`decideGate` approve),
**◂ Step back** (existing `stepBackStage`), **Kill** (existing `killVideo`),
**Notes** (free text attached to any action → `operator_decisions`).

Every Revise/Re-render dialog shows the latest review findings as checkable
items (all checked by default) + a notes field; the checked set is what the
agent applies and is stored in `operator_decisions.findings_applied`.

Paid actions (visuals generation, video clips, renders, VO) show a cost
estimate (existing `estimateTierCost` / `estimateClipCost` /
`estimateBuildCost` plumbing) on the button before confirm.

---

## 6. UI / UX

### 6.1 Settings + wizard

- **Project Settings** (`settings-form.tsx`): new "Pipeline Mode" card at
  the top — a two-option segmented control (Autonomous / Director) with a
  one-paragraph description of each and the freeze/resume confirm dialog on
  change. When Director is active: the per-gate autonomy card and quality-
  gate threshold card render in a collapsed "advisory reference" state with
  a note ("Floors shown are advisory in Director Mode — they annotate, never
  block"), plus the `director_micro_loops` toggle.
- **New-project wizard** (`projects/new/wizard.tsx`): mode choice step with
  the same two options; Director is a first-class choice, not buried.

### 6.2 Library in Director Mode

The Library grid (`projects/[id]/library`) stays the overview, with:

- A **mode badge** next to the project title ("Director Mode").
- The **New Ideas panel** gains the director creation flow: count stepper
  (1–5), format toggle (Short/Long), bracket picker (chip row per §4.5),
  optional topic seed. Pressing Generate creates the ideas and *stops* —
  cards land in the Ideas section awaiting direction.
- Tile quick-actions swap from approve/revise gate semantics to
  **"Open Console"** as the primary action; status chips read as
  "Awaiting direction · Script ready" rather than gate/paused language.
- No autonomous chips (auto-fix latch, nudges, operator slots) render for
  director projects.

### 6.3 The Director Console (core new surface)

Rendered by the Asset Canvas route (`videos/[vid]/page.tsx`) when
`project.pipeline_mode === 'director'` — same URL, different layout. Anatomy:

```
┌────────────────────────────────────────────────────────────────┐
│ ‹ Library   VIDEO TITLE           [len target: 3–4 min] [Kill] │
│ ①Idea ─── ②Script ─── ③Visuals ─── ④Edit ─── ⑤Publish          │  ← stage rail
│   ✓done     ● current    ○locked     ○         ○               │
├────────────────────────────────────────────────────────────────┤
│ CURRENT STAGE CARD (e.g. Script)                               │
│ ┌────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ Artifact viewer/editor     │ │ ADVISORY PANEL              │ │
│ │ (script beats, stills grid,│ │ · Script QC 6.8/10 ⚠ below  │ │
│ │  render player, embedded   │ │   floor 7 — advisory        │ │
│ │  edit suite at stage 4)    │ │ · Fact-check: 2 claims flag │ │
│ │                            │ │ · Editorial guard: pass     │ │
│ │                            │ │ · Length: est 3:52 ✓ target │ │
│ └────────────────────────────┘ │ [findings, expandable]      │ │
│                                └─────────────────────────────┘ │
│ [⚙ Generate] [🔍 Run review] [✎ Revise…] [↻ Re-render…]        │
│ [◂ Step back]                 [Advance to Visuals ▸]  est $0.42│
├────────────────────────────────────────────────────────────────┤
│ ACTIVITY LOG (this stage): every action, micro-loop, cost, note│
└────────────────────────────────────────────────────────────────┘
```

Behavior notes:

- **Stage rail** is clickable for completed stages (view their artifact +
  reviews read-only, with Step-back offered); future stages are locked
  until Advance.
- **Buttons are state-aware, never gate-blocked:** "Generate" when the
  stage has no artifact; "Run review" enabled once one exists; Revise/
  Re-render enabled always (findings optional); "Advance" enabled the
  moment an artifact exists — an unreviewed advance just logs
  `agent_score: null`. Only money rails and kill switch disable buttons
  (with the reason shown inline).
- **Advisory panel** aggregates every stored review for the stage, newest
  first, each finding checkable straight into the Revise/Re-render dialog.
  Sub-floor scores show an amber "advisory" chip — never red/blocking.
- **Stage 3 (Visuals)** embeds the existing per-beat tools
  (`stick-scenes-editor`, `video-gen`, `vision-review`, reroll controls) in
  the artifact pane; per-beat revise = existing `rerollBeatVisual` with
  note.
- **Stage 4 (Edit)** embeds the editing suite (`videos/[vid]/edit`
  timeline/inspector) in the artifact pane, with Self-Watch and Auto-Fix as
  the review/revise agents.
- **Stage 5 (Publish)** shows packaging (title/desc/thumbnail via
  `editVideoMetadata`), the watch verdict advisory, and the **Publish-kit
  download** (`publish-kit.tsx`) as the terminal manual action, moving the
  video to `TRACKING`.
- Realtime: reuse `RealtimeRefresher` so long-running presses (renders,
  clip generation) stream status into the activity log; in-flight actions
  show a progress chip on the stage rail.

### 6.4 On-demand automation buttons (Decision #2)

Surfaced in the Edit/Publish stage cards' "Agent passes" row:
**Run Auto-Fix pass** (one settle iteration of the autofix loop),
**Run Self-Watch** (full watch analysis, results to advisory panel),
**Auto-Rescript proposal** (generates the rescript as a *proposal* the
operator applies or discards). Each is one bounded pass per press.

### 6.5 Publishing

`releaseScheduledVideos` and auto-publish never touch director projects.
The only publish path is the operator pressing publish-kit download /
"Mark published" on stage 5.

---

## 7. Operator-signal learning (Decision #4)

The existing loop keeps working untouched (§1). New signal on top:

1. **Every button press writes an `operator_decisions` row** with the
   artifact's latest agent score/verdict at that moment (§3.3).
2. **Disagreement mining** (extends `memory-service.ts`): a periodic pass
   (piggybacks on the existing intelligence run — read-only, so it may run
   for director projects) looks for *recurring* divergences, e.g.:
   - Operator advanced/published ≥N times below floor X → lesson in the
     relevant namespace: `"Operator publishes scripts at ≥5.5 script-QC;
     floor 7 over-rejects for this channel"` (evidence: the decision rows).
   - Operator re-rendered ≥N times despite passing scores citing note
     theme Y → lesson for the generator: `"Operator repeatedly re-renders
     hooks mentioning statistics — lead with narrative instead"`.
   Lessons obey the existing evidence-gated write + reinforce + decay
   governance (`memory.ts`) — no new memory mechanics.
3. **Taste calibration display:** the advisory panel shows the judge score
   *and* the operator's empirical acceptance threshold for that stage
   ("You typically advance scripts scoring ≥5.5") once ≥5 decisions exist —
   pure display derived from the ledger, no behavior change.
4. **Outcome attribution** (`outcome-audit.ts`, retention loop) continues
   to attribute published-video performance back to lessons regardless of
   mode — director-published videos feed it identically.

---

## 8. MCP surface (phase D6)

Add director tools to `src/lib/mcp/tools.ts` mirroring the console buttons
(`director_generate_ideas`, `director_run_stage`, `director_run_review`,
`director_revise`, `director_rerender`, `director_advance`), so the operator
can direct the pipeline conversationally from Claude with identical
semantics (each tool = one bounded action; money rails enforced server-side).
Existing autonomous MCP tools (approve-all, etc.) refuse on director
projects with a clear message.

---

## 9. Build phases

Each phase ships independently behind the mode flag; autonomous mode is
regression-safe throughout because every change branches on
`pipeline_mode === 'director'`. The mode-isolation suite (§10.2) is a
merge gate per phase: D1 requires §10.2.1–10.2.4 + 10.2.7 green, D2 adds
§10.2.5, D3 adds §10.2.6, and later phases must keep the whole suite green.

**D1 — Foundation (mode + guards).** Migration §3.1/§3.2/§3.3; Settings +
wizard mode UI with freeze/resume confirm; `runPipeline` mode guard +
`runDirectedStage`; `decideGate` director branch (no caps, no auto-approve);
all §4.3 sweep skip-filters; Library mode badge + "awaiting direction"
chips. *Accept:* flipping a seeded project to Director stops all autonomous
movement (crons run, nothing advances); flipping back re-arms and strands
nothing; autonomous projects behave byte-identically.

**D2 — Stage actions + advisory gates.** Server actions for every §5 cell
(generate/review/revise/re-render per stage, idea batch with count);
advisory branching of every floor check (§4.1.4); micro-loop activity
itemization + `director_micro_loops` toggle; `operator_decisions` writes on
every action. *Accept:* a video can be driven idea→publish entirely by
server actions with QC scores of 0 and never blocks; budget cap and
fail-closed still block paid generation; every action logged with cost.

**D3 — Director Console UI.** The §6.3 console layout on the canvas route;
stage rail; advisory panel with checkable findings → Revise/Re-render
dialogs; activity log; cost estimates on paid buttons; Library new-idea
director flow (§6.2); embedded visuals tools + edit suite panes. *Accept:*
full idea→publish walkthrough in the browser with no dead ends; every
button state-correct per §6.3; realtime progress during renders.

**D4 — Length targeting.** Bracket constants in `packages/core`; picker in
idea flow; `runScripting` word-budget targeting; post-VO duration check +
advisory flag + "Revise to length" action. *Accept:* a 3–4 min target
produces a script whose VO lands in-window in mock mode; an out-of-window
VO shows the flag and the one-click revise tightens it.

**D5 — On-demand automation.** Auto-Fix pass, Self-Watch, Auto-Rescript
proposal buttons (§6.4); hide Build & Post + Autopilot surfaces for
director projects; Telegram skip. *Accept:* each button runs exactly one
bounded pass and writes its findings to the advisory panel; no sweep ever
touches a director project (verified via cron dry-run logging).

**D6 — Operator-signal learning + MCP.** Disagreement mining into memory;
taste-calibration display; §8 MCP tools. *Accept:* seeded decision history
produces a lesson visible in /insights with correct evidence; MCP can drive
a stage end-to-end; autonomous MCP tools refuse politely.

Suggested order of PRs: D1 → D2 → D3 (the usable core), then D4/D5 in either
order, D6 last.

---

## 10. Testing

### 10.1 Feature tests

- **Unit:** mode guard (runPipeline no-op matrix per caller); decideGate
  cap-bypass; bracket→word-budget math; freeze/re-arm status matrix;
  mergeQualityGates untouched-in-director invariant; disagreement-mining
  thresholds (pure functions, mirrors `memory.ts` test style).
- **Integration (mock adapters):** full director walkthrough
  idea→TRACKING with zero credentials; budget-cap block mid-walkthrough;
  mode flip both directions mid-pipeline.
- **E2E (Playwright, existing harness):** console renders per stage; a
  low-QC advance succeeds with advisory chip visible.

### 10.2 Mode-isolation test suite (no cross-mode leakage)

**The isolation invariant, stated once and enforced everywhere:** for a
project in Director Mode, *no* autonomous-mode function, setting, sweep,
notification, or UI surface may act on it or render for it — and vice
versa, no director-only action, setting, or surface may act on or render
for an autonomous project. The suites below (`tests/mode-isolation.spec.ts`
+ a Playwright counterpart) prove the invariant holds today and keep
holding as the codebase grows. **Merge gates:** D1 cannot merge without
10.2.1–10.2.4 and 10.2.7 green; D2 adds 10.2.5; D3 adds 10.2.6; every later
phase must keep the whole suite green.

**10.2.1 Autonomous entry-point registry (the architectural guard).**
Maintain an explicit registry constant `AUTONOMOUS_ENTRY_POINTS` listing
every function that can autonomously move, mutate, or publish a video:
`runPipeline` (hop loop), `decideGate` auto-approve paths,
`processPendingBuildVideos`, `finalizeAutoPilotVideos`,
`releaseScheduledVideos`, the auto-fix sweep, `watch-runner`,
`auto-rescript`, the Autopilot Operator tick, Telegram approval handlers,
and each autonomous MCP tool. A parameterized test invokes **every**
registry entry against a director-mode fixture project (spy/recording DB
client) and asserts **zero writes** to `videos`, `assets`, `qc_reviews`,
`build_runs`, and zero adapter calls. A companion CI check greps the
pipeline/actions/mcp modules for status-mutation call sites
(`runPipeline(`, `decideGate(`, `.from("videos").update`) and fails if any
call site is not either (a) inside a registry-covered function or (b)
inside a director action module — so a *future* automation cannot be added
without landing in the registry and inheriting the isolation test.

**10.2.2 Engine no-op matrix.** Property-style matrix test: every
`VIDEO_STATUS` × every caller origin (cron, gate-decision chain, Telegram,
MCP, build-run, realtime nudge) × `pipeline_mode='director'` →
`runPipeline` returns without any status change, `paused_reason` change,
or spend. Exactly one path advances a director video: `runDirectedStage`
with explicit `directed` opts — and it advances exactly one stage (asserted
by status delta = 1 transition, never two).

**10.2.3 Settings-inertness matrix (standard settings dead in Director).**
For a director project, each autonomous setting is proven to have **zero
behavioral effect** by running the relevant flow at both extremes of the
setting and asserting identical outcomes:
- per-gate `autonomy` (all 3^4 gate combinations sampled: assist/copilot/
  autopilot never auto-approve anything);
- `COPILOT_AUTO_APPROVE_SCORE` (a 10.0-scored artifact still waits);
- `revisionWarnAt` / `revisionHardCap` (11th revision succeeds, no warn);
- every blocking floor in `QualityGateConfig` (idea/seed-vision/fact-risk/
  beat-relevance/watch floors at max strictness: generation proceeds,
  finding recorded as advisory only);
- operator-run `autoApproveHours` / `autoApproveQc` / calendar slots
  (never fire);
- autofix latch / stall nudges (never fire).
The inverse direction: for an autonomous project, director-only settings
(`director_micro_loops`, `length_target` UI defaults) have zero effect,
and **no** `operator_decisions` rows are ever written by autonomous flows
(assert table untouched after a full autonomous mock walkthrough).
Exceptions stay shared *by design* and are asserted to fire in BOTH modes:
budget caps, `failClosedBlocksSpend`, `isKillSwitchOn`,
`reconcileStuckRenders`.

**10.2.4 Sweep/cron isolation (integration, twin-project diff).** Seed two
byte-identical projects — one autonomous, one director — with videos parked
at every status. Run **every** cron/sweep entry point once. Assert: the
autonomous project's rows changed as expected; the director project's
`videos`, `assets`, `qc_reviews`, and `cost_ledger` rows are **byte-
identical before/after** (full row snapshot diff = ∅), and no Telegram/
push adapter calls referenced it.

**10.2.5 Server-action mode assertions (wrong-mode rejection).** Every
director server action begins with an `assertPipelineMode('director')`
guard; every autonomous mutating server action (gate approve-all, build-run
start, autopilot start, schedule release) asserts `'autonomous'`. The test
calls **each** action against the wrong-mode project and asserts a typed
`WRONG_MODE` error and zero DB writes. This is the API-level seam that
makes UI isolation (10.2.6) defense-in-depth rather than the only barrier.
Includes MCP: autonomous tools refuse on director projects; director tools
refuse on autonomous projects.

**10.2.6 UI isolation (component + Playwright).** Director project renders
**none** of: gate approve/revise quick actions, Build & Post panel,
Autopilot page (route redirects to Library), auto-fix latch chips, operator
calendar panel, Telegram approval hints, copilot/autopilot status copy;
the Settings autonomy + threshold cards render disabled/advisory. Autonomous
project renders **none** of: Director Console layout, Generate/Advance/
Re-render buttons, bracket picker, mode badge, activity log. Both asserted
by explicit `data-mode` selectors so the specs fail loudly if a surface
leaks rather than silently passing on markup drift.

**10.2.7 Mode-flip transition & race tests.**
- Autonomous→Director mid-`SCRIPTING`: the in-flight invocation finishes
  its stage body, lands on the gate status, and nothing further runs;
  pending build-run videos become inert; an **active** Autopilot run blocks
  the flip (typed error) until stopped.
- Director→Autonomous: the re-arm pass resumes every working-status video
  exactly once (idempotency: running re-arm twice causes no double stage
  execution — assert via spend/ledger count); pre-flip per-gate autonomy
  values are restored unchanged.
- Race: simulate a sweep that read the project as autonomous, then the
  mode flips before it writes — the guard must re-check `pipeline_mode`
  at write time (per-video, inside the mutation path, not just at query
  time) and refuse. Fuzz: N random flips against randomized pipeline
  states never yields a double-advance or a stuck video lacking a visible
  "awaiting direction"/`paused_reason` state.

**10.2.8 Learning-loop scoping.** Disagreement mining reads only director
projects' `operator_decisions`; lessons it writes carry evidence citing
those rows; running the miner against autonomous-only fixtures writes
nothing. Shared memory reads (prompt-prefix lessons) remain mode-agnostic
by design and are asserted available in both modes.

---

## 11. Explicit non-goals (v1)

- No per-video mode (project-level only).
- No Telegram remote-directing (v1 is in-app + MCP only).
- No changes to autonomous mode behavior, thresholds, or UI.
- No new render/edit capabilities — Director Mode re-hosts existing agents.
- No multi-operator/roles; single-operator semantics as today.

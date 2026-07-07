# Fable 5 — UI/UX Redesign: Running Log & Build Plan

**Started:** 2026-07-06 · **Branch:** `claude/app-ui-ux-redesign-9j0267` ·
**Status:** v1 + v2 SHIPPED (Phases 0–7 + engine consolidation). Exit gate: `e2e-authed` green in CI. Next: Auto-Rescript spec.

This is the living document for the full UI/UX redesign. It records every
operator decision as it is made (§2), the target design those decisions imply
(§4–§8), and the phased build plan with the testing required at every phase
(§10). Companion docs: `Fable5-Enhancement-Plan.md` (audit),
`Fable5-Agentic-Harness-Plan.md` + `Fable5-Self-Watch-Loop-Plan.md` (the
quality/agentic machinery this redesign must not disturb),
`Fable5-faceless-studio-live-app.md` (go-to-market — this redesign lands
**before** its Stage 3 multi-tenancy and effectively pre-builds its Stage 5).

---

## 1. Why (findings that motivated this)

Full review 2026-07-06, on `main` @ `7c0f181`:

- **The backend pipeline is already "contained."** One `videos` row per asset;
  `status` advances `IDEA → … → TRACKING`
  (`packages/core/src/state-machine.ts`). Scripts, VO, clips, renders, QC
  verdicts, approvals are child records keyed to that row. Nothing is ever
  physically transferred between phases — the fragmentation is a **UI
  projection**, which is why this redesign can be frontend-only (D-10).
- **Every gate is built twice.** SCRIPT/ASSETS/FINAL each exist as a
  review-queue card (`src/components/dashboard/review-queue.tsx`) *and* a full
  editor on the video detail page (`ScriptReview`, `VideoGen`, `PublishKit` —
  which reimplements "Approve final cut" at `publish-kit.tsx:108`). The
  operator ping-pongs between `/projects/[id]/review` and
  `/projects/[id]/videos/[vid]` for the same asset at the same gate.
- **Three creation surfaces** on the project page (`QueueTopic`, `ScoutChat`
  save-idea, Build & Post modal), **two parallel autonomy systems**
  (`OperatorPanel` calendar/cadence vs `BuildAndPost`/`BuildRunsPanel` batch
  runs), **signals repeated everywhere** (spend in 4 places, needs-attention
  in 3), **no single view of everything in flight**, and **inconsistent IA**
  (desktop pill-nav ≠ mobile tab bar; `/downloads` is a dead redirect).
- **"Assets stuck in phases" is a visibility problem**, not structural: the
  stranding bugs were fixed in the audit; what remains is that `paused_reason`
  / pending-gate state surfaces inconsistently. The library's per-tile status
  bar + attention badge is the fix.
- **All mutations already flow through server actions** (`src/lib/actions/*`)
  wrapping `decideGate` / `runPipeline` / `fullAutoGenerate` / `recordCost`;
  MCP calls the same engine functions. Preserving that contract preserves
  every gate, budget cap, kill switch, atomic claim, and learning loop.
- **Test gap:** pure cores are well-tested (20 vitest files: state machine,
  ledger, watch gate, memory, rubrics…) but the UI→server-action→engine paths
  have **zero automated coverage** (e2e is a 4-test credential-free smoke).
  The build plan therefore starts by building the harness (Phase 0).

---

## 2. Decision log

Firm decisions, dated. New decisions get appended; superseded ones are struck
through, never deleted.

| # | Date | Decision |
|---|---|---|
| D-1 | 2026-07-06 | **Concept approved:** contained per-asset lifecycle. An asset is born, developed, and finished on **one page** (the Asset Canvas); pipeline phases become checkpoints on a progress rail, not separate rooms. Backend gates/phases are untouched — containment is presentational. |
| D-2 | 2026-07-06 | **Library is per-project**, not cross-project. Each project has its own Library screen — the project's home. |
| D-3 | 2026-07-06 | **Library layout: stage-sectioned vertical grid.** Top section **Ideas** (quick approve/reject + status details; **collapsible** to cut noise), then **Script** stage assets (same quick-action pattern), then **Video** stage assets rendered as real video/thumbnail tiles. Clicking any asset at any point opens its full edit screen (Asset Canvas) contextual to its stage. Full-auto assets simply move between sections automatically until render/publish. |
| D-4 | 2026-07-06 | **Library shows everything from first spark** — including un-promoted idea cards, so the asset's whole life is visible in one place. |
| D-5 | 2026-07-06 | **Inline quick actions on the grid:** approve, reject, view (→ Asset Canvas). Every tile carries a **stage-progress status bar** and a **QC score label** as it develops. Grid-with-quick-actions is sufficient for batch triage — no separate focus/swipe review mode. |
| D-6 | 2026-07-06 | **Asset Canvas** = evolution of the existing video detail page (~70% there). Gains: persistent progress rail (4 checkpoints + render + publish + tracking), review-queue card capabilities absorbed inline (QC score card, Self-Watch panel, calibration 👍/👎, approve/revise/kill at the current checkpoint), the idea stage (born and dies on this page), and pause/resume/step-back in one consistent header. The review-queue page and duplicated gate bodies are **deleted at the end** (Phase 7, not before). |
| D-7 | 2026-07-06 | **Home page stays** as per-project selection (portfolio). Project library grids are individual per project. |
| D-8 | 2026-07-06 | **Scout chat and Intel become summonable tools** from asset/library context; removed from primary navigation to cut redundancy. |
| D-9 | 2026-07-06 | **Operator + Build & Post merge into one "Autopilot" system.** The operator's calendar/cadence model wins ("this channel publishes daily at 9am under a $60/30-day cycle"); **batch run demoted to a one-off action inside Autopilot** for expediting assets in full auto. Backend `operator_runs`/`build_runs` machinery unchanged in v1 (see D-10). |
| D-10 | 2026-07-06 | **v1 is strictly a frontend re-projection.** Zero schema/engine changes; all safety systems untouched. Engine refactors (e.g. unifying operator/build-run tables) deferred to v2 after the new UI is proven. |
| D-11 | 2026-07-06 | **Primary device: phone (PWA)** for library + approvals; desktop is the deep-edit environment — but **full editing must remain possible on the phone** (extended travel is a real use case). |
| D-12 | 2026-07-06 | **Insights + Intel fold into a per-project notification-style feed.** They leave global nav as destinations. |
| D-13 | 2026-07-06 | **Styleguide stays in nav.** |
| D-14 | 2026-07-06 | **Running log required:** this document; all answers/decisions logged as the plan develops. **Every build phase must include extensive testing.** |
| D-15 | 2026-07-06 | *(resolves Q-A)* **Home carries a cross-project "awaiting you" row** — per-project pending counts deep-linking into each project's library — alongside project cards + SystemPulse. |
| D-16 | 2026-07-06 | *(resolves Q-B)* **Feed is a full per-project activity feed with filters:** publishes, holds, autofix outcomes, operator events, with agent outputs (optimizer insights, intel scans) as its actionable card subset. Replaces the dashboard Activity card. |
| D-17 | 2026-07-06 | *(resolves Q-C)* **Published/TRACKING assets live in a collapsible "Published" section at the bottom of the library grid**, tiles showing view counts. No separate archive tab. |
| D-18 | 2026-07-06 | *(resolves Q-D)* **Ideas section presentational merge confirmed:** intelligence-scored `ideas` rows + videos at the IDEA gate render as one visual section with a subtle origin badge; quick-approve on an intelligence idea promotes it via the existing action. Frontend-only, no schema change. |
| D-19 | 2026-07-06 | *(resolves Q-E)* **Boost runs confirmed:** the one-off batch inside Autopilot keeps using the existing `build_runs` machinery unchanged in v1, labeled **"boost runs"** in the activity timeline. |

### Open questions (answers get promoted to the log above)

*None currently — Q-A…Q-E resolved 2026-07-06 → D-15…D-19.*

---

## 3. Invariants (what the redesign must never break)

These are the harnesses, quality gates, and agentic functions. Every phase's
test gate re-verifies them.

1. **Server-action contract.** The new UI calls the same server actions
   (`src/lib/actions/pipeline.ts`, `operator.ts`, `build.ts`, `publish.ts`,
   `intelligence.ts`, `autofix.ts`) the old UI calls. The UI never writes
   `videos.status`, `assets`, `cost_ledger`, or `app_settings` directly.
2. **The state machine stays the orchestrator.** All gate decisions go through
   `decideGate` (revision hard-cap, approvals log, autonomy routing); all
   stage execution through `runPipeline` (kill switch, `budgetPause`,
   `paused_reason` on failure, gate arrival + QC review via `arriveAtGate`).
3. **Safety non-negotiables checklist** (manually verified at every phase
   exit, automated where possible):
   - Kill switch reachable in ≤2 taps from anywhere; failure surfaces an error.
   - `paused_reason` always visible wherever the asset is visible.
   - Per-gate autonomy (`assist|copilot|autopilot`) controls preserved.
   - Budget caps: per-video, monthly, operator cycle; fail-closed holds
     (grader down ⇒ hold; paid provider live + QC mocked ⇒ no spend).
   - Revision caps enforced (warn at 3, hard-cap 4) with visible state.
   - Calibration 👍/👎 preserved on QC and Watch verdicts — they feed
     `judge_labels`; losing them silently starves C1 calibration.
   - Self-Watch verdict panel preserved at FINAL (fix plan, holds).
   - Attribution ledger + AI-disclosure checklist preserved in publish flow.
   - Telegram approvals and studio-mcp flows untouched (they bypass the UI).
4. **Realtime:** `RealtimeRefresher` (or equivalent) keeps every new surface
   live; full-auto assets must visibly move between library sections without
   a manual refresh.
5. **No dead ends:** every stalled/held state shown in the library carries a
   next action (retry, resume, open canvas, reset render attempts).

---

## 4. Consolidation strategy (clutter → merged, without losing quality or pace)

The operator asked: how do we eliminate/merge each redundancy without
sacrificing quality or production rate? Answer per category — in every case
the *capability* survives in exactly one home; only duplicate surfaces die.

| Redundancy today | New single home | Why quality/pace survive |
|---|---|---|
| **Every gate built twice** (review-queue card + video-page editor) | **Asset Canvas** owns all gate actions & editors; **Library quick actions** own fast triage (approve/reject from the tile). Review queue page deleted last (Phase 7). | Triage speed moves to the grid (faster than the old queue: no page-per-project hop); depth moves to one canvas (no context loss mid-review). QC score + Self-Watch verdicts render inline at the checkpoint, so quality signals are *more* visible at decision time, not less. |
| **Three creation surfaces** (QueueTopic, Scout save-idea, Build & Post) | One **"New asset"** entry on the Library (topic + format, the current QueueTopic essentials). Scout is a summonable tool (D-8) whose findings save into the Ideas section. Batch creation lives inside **Autopilot** as the one-off boost action (D-9). | Same three intents (one video now / research-driven idea / batch in full auto) — each now has exactly one obvious door. No engine change: `queueTopicAction`, Scout actions, and `fullAutoGenerate`/build-run actions are called unchanged. |
| **Two autonomy systems** (Operator panel vs Build & Post + runs panel) | One **Autopilot** surface per project: calendar/cadence is the system; batch run is a button inside it; run history and operator events merge into one activity list. Backend `operator_runs` + `build_runs` untouched in v1. | The operator's quality path (idea gate → QC → Self-Watch → settle) and the build-runner's path both keep their engine flows; the merge is a presentation of two run types in one timeline. Production rate unchanged — same crons, same actions. |
| **Signals repeated everywhere** (spend ×4, attention ×3) | One signal strip per scope. **Home:** SystemPulse (providers · MTD spend vs cap · attention count). **Project Library header:** one strip (this project's spend vs budget · autopilot state · attention count). `/costs` remains the canonical ledger; the Settings ledger card and the dashboard Monthly-spend card are deleted. | Signals get *more* trustworthy: one number per scope, one source (`cost_ledger` via the existing queries). Attention count deep-links to the exact tiles that need action. |
| **Inconsistent IA** (desktop ≠ mobile; orphaned project/asset levels) | One two-level IA on both breakpoints. **Global:** Home · Spend · Settings (+ Styleguide kept per D-13). **Inside a project:** Library · Autopilot · Feed · Project Settings. Insights/Intel leave global nav (D-12, D-8). Same tabs as bottom bar on phone and pill-nav on desktop. | Fewer destinations, zero capability loss: Insights become Feed cards (Apply/Dismiss preserved), Intel becomes a summonable tool with the same scan launcher + blueprint view. Back-button ambiguity disappears because the hierarchy is real. |
| **Scattered "pending user action"** | Library tiles: 🟠 *awaiting you* badge (pending gate / held / paused_reason) + stage-progress bar + QC label (D-5). Home aggregates per-project counts (Q-A). | Nothing waits invisibly; triage is one glance + one tap. This directly *raises* production rate — held assets were the observed stall cause. |

---

## 5. Target information architecture

```
Home (portfolio)                    ← project cards, SystemPulse,
 │                                    "awaiting you" row (D-15)
 └─ Project
     ├─ Library (project home)      ← stage-sectioned asset grid, "New asset",
     │    │                           header signal strip, quick actions
     │    └─ Asset Canvas (/projects/[id]/videos/[vid])
     │                              ← the one page an asset lives on, idea → tracking
     ├─ Autopilot                   ← merged operator calendar/cadence + boost runs
     ├─ Feed                        ← per-project insights + intel + [Q-B activity]
     └─ Project Settings            ← existing settings + template editor
Global: Spend (/costs) · Settings (/settings) · Styleguide (kept)
Summonable tools (not nav): Scout chat · Intel scan (from Library/Canvas context)
```

Mobile (PWA, first-class per D-11): bottom tab bar switches with context —
global tabs on Home; project tabs inside a project. Deep edit on the Canvas
must remain fully functional on a phone (single-column layout already; keep
touch targets and sticky action bars).

## 6. Library spec (per project — D-2..D-5)

- **Sections in order:** Ideas (collapsible, merged sources per D-18) →
  Script → Production (assets + render, real thumbnails/video tiles) →
  Ready/Publish → Published (collapsible, tiles show view counts — D-17).
  Sections map to existing `PIPELINE_STAGES` / `effectiveStageKey`
  (`src/lib/db/pipeline.ts`) — no new stage taxonomy.
- **Tile anatomy:** thumbnail or stage placeholder · title · stage-progress
  bar (segments = idea/script/assets/render/publish) · QC score chip (latest
  `qc_reviews` for the current gate; Watch score at FINAL) · badges: 🟠
  awaiting-you (pending gate / `paused_reason` / held), 🔴 failed, 🤖
  autopilot-owned · spend-to-date.
- **Quick actions per tile (stage-aware):** Approve / Reject(kill or revise) /
  View. Approve routes to `approveGateAction`; reject offers "request
  changes" (`requestRevisionAction`, shows remaining revisions) vs "kill"
  (`killVideoAction`, confirm). Ideas: approve/reject/promote via existing
  idea + queue actions.
- **Realtime:** tiles move sections + update bars live (existing
  `RealtimeRefresher` tables: videos, assets, qc_reviews, ideas…).
- **Header:** project signal strip + "New asset" + Autopilot status chip +
  overflow (Run intelligence → Feed, Scout, demo affordances hidden once the
  project has real videos, per Enhancement P6.4).

## 7. Asset Canvas spec (D-1, D-6)

One route (`/projects/[id]/videos/[vid]`, evolved in place), one vertical
canvas whose sections activate as the asset advances; earlier sections stay
visible/editable per the state machine's step-back rules.

- **Persistent header:** title · status chip · progress rail (IDEA ▸ SCRIPT ▸
  ASSETS ▸ RENDER ▸ FINAL ▸ PUBLISH ▸ TRACKING, current checkpoint pulsing,
  gate checkpoints marked) · spend chip · controls: pause/resume, step-back
  (where `canStepBack`), kill, overflow (Scan market → summons Intel; Scout).
- **Checkpoint block (the absorbed review card):** at any gate, the canvas
  shows the QC score card + criteria, Self-Watch panel at FINAL (verdict,
  fix plan, hold reasons), calibration 👍/👎 (writes `judge_labels`), and the
  decision bar (Approve & continue / Request changes / Kill) — all calling
  the exact actions `review-queue.tsx` calls today.
- **Stage sections (all existing components, re-homed not rewritten):** Idea
  (new small section: idea text, score, improve/approve) · Script
  (`ScriptReview` + `MetadataEditor` + remix) · Production (`VideoGen`,
  `HighlightsEditor`, `VisionReview`, `AutofixPanel`, `StickScenesEditor`,
  thumbnail selection absorbed from the ASSETS review card) · Render status ·
  Publish (`PublishKit`: downloads, copy fields, publish/mark-uploaded,
  attribution, AI-disclosure) · Tracking (`TrackingPanel`) · `DeriveShorts`.
- **Autopilot-owned assets:** same canvas, decision bar replaced by "Autopilot
  will settle this (threshold X) — take over" (existing hold/steal semantics).

## 8. Autopilot spec (D-9) — presentation merge only (D-10)

One per-project surface: go-live checklist + mode (copilot/autopilot) +
cadence & cycle budget + the 30-day calendar (operator today) · **Boost**
button = the old Build & Post modal, reframed as a one-off batch inside
Autopilot, shown as **"boost runs"** in the timeline (D-19) · one activity
timeline interleaving `operator_events` and `build_runs` rows (chips:
held/publishing/scheduled) · held items deep-link to their library
tiles/canvas.

## 9. Feed spec (D-12, D-16)

Per-project **full activity feed with filters** (D-16): system events
(publishes, holds, autofix outcomes, operator events) interleaved with the
actionable agent cards — optimizer insights (Apply/Dismiss + template diff,
the existing `InsightCard` capabilities) and intel scan results
(`BlueprintView` summary → full view, "send to remix" preserved). Filters:
all · needs-action · insights · intel · system. "Generate insights" and
"Run scan" live here and in the summonable tools. Replaces the dashboard
Activity card; `/insights` and `/intel` pages retire in Phase 7 with
redirects.

---

## 10. Build plan (testing at every phase — D-14)

Strangler pattern: new surfaces ship alongside old ones behind a feature flag
(`NEXT_PUBLIC_UI_V2` or an `app_settings` flag readable per session); the old
UI stays fully functional until Phase 7. Nothing is deleted until parity is
proven twice (automated + manual).

**Standing test gates at EVERY phase exit:**
`pnpm typecheck` (all packages) · `pnpm build` · full vitest suite ·
Playwright suite (old smoke + new specs) · the §3.3 safety checklist walked
manually in mock mode · Lighthouse budgets on touched routes.

### Phase 0 — Test harness first (no UI changes) — ✅ BUILT 2026-07-06
The redesign's insurance policy; also closes Enhancement P5.5.

> **Shipped:** `tests/action-contract.test.ts` + `tests/contracts/` (manifest
> of all 80 server actions across 11 modules, signature-pinned, plus the
> caller inventory — regenerate deliberately via
> `node tests/contracts/update-action-manifest.mjs`); `tests/safety-critical.
> test.ts` + `tests/helpers/fake-db.ts` (14 tests running the REAL
> `decideGate`/`runPipeline`/`killVideo` against a fake query-builder:
> revision hard-cap, approvals audit trail, kill switch, budget pause, gate
> arrival writes qc_reviews + waits in assist, grader-down hold, autopilot
> settle); `e2e/authed/golden-path-authed.spec.ts` (bootstrap → project →
> queue topic → all four gates with a beat edit → mock render → publish kit →
> mark uploaded → TRACKING, + baseline screenshots of the 8 main routes) with
> the `authed-chromium` Playwright project and the `e2e-authed` CI job
> (local Supabase via `supabase start` on GitHub runners).
>
> **Verified locally:** typecheck (all packages) · lint · vitest 321/321
> (was 216; +105 new) · build · credential-free e2e smoke 4/4.
> **Verified in CI only:** the authed golden path needs Docker (local
> Supabase), which the dev sandbox lacks — its first real run is the
> `e2e-authed` job on this push. Treat Phase 0 as *exit-complete only when
> that job is green*; fix-forward anything it surfaces before starting
> Phase 1.
>
> **Audit finding logged:** two actions have no caller surface today —
> `runOptimizerNowAction` (superseded by `runAllOptimizerAction`) and
> `runOperatorNowAction` (panel uses start/pause/stop). Encoded in the
> contract test as `KNOWN_UNREFERENCED`; Phase 7 wires or deletes them.
1. **Authenticated mock-mode e2e golden path against the CURRENT UI:**
   create project → queue topic → IDEA gate approve → SCRIPT gate (edit a
   beat, approve) → assets → advance to render (mock completes in-app) →
   FINAL approve → publish kit → mark uploaded → TRACKING. Runs in CI via
   `supabase start` (local Docker Supabase) + seeded auth user; adapters all
   mock (credential-free by design).
2. **Server-action contract inventory test:** an enumerated manifest of every
   action the UI invokes (approve/revision/kill/resume/step-back/queue-topic/
   full-auto/beat-edits/thumbnail-select/publish/labels/settings…) asserted
   to exist and keep signatures; the same manifest is the Phase-7 parity
   checklist.
3. **Safety-critical integration tests** (vitest, service-role against local
   Supabase): `decideGate` enforces the revision hard-cap and writes
   `approvals`; `arriveAtGate` inserts `qc_reviews` and holds on grader-down;
   kill switch blocks `runPipeline` and `generateBeatVideoAction`;
   `checkBudget` blocks reroll paths at cap.
4. **Baseline screenshots** (Playwright) of the 8 main routes for reference.
- *Exit:* all green in CI on `main`-equivalent code; zero product changes.

### Phase 1 — Foundations (flagged, invisible)
1. UI primitives the new surfaces need: `AssetTile` (thumb, progress bar, QC
   chip, badges), `ProgressRail`, `SectionHeader` (collapsible), `QuickActions`,
   signal strip; all added to `/styleguide` (kept per D-13).
2. Route scaffolding behind the flag: project Library route, Autopilot route,
   Feed route (empty shells), context-aware nav (global vs project tabs,
   desktop + mobile identical sets).
3. Data selectors (read-only lib code): `libraryForProject()` grouping via
   existing `effectiveStageKey`/`stageCounts` + pending-gate/paused detection;
   unit-tested against fixture rows for every status × paused × autopilot
   combination.
- *Tests:* unit tests for selectors (every state-machine status maps to
  exactly one section; badge logic table-driven); Playwright: flag OFF ⇒ old
  UI byte-identical (screenshot diff vs Phase 0 baselines); styleguide
  renders new primitives.

### Phase 2 — The Library (per-project)
1. Stage-sectioned grid (D-3): Ideas (collapsible, merged sources per D-18) →
   Script → Production → Ready → Published (collapsible, view counts — D-17);
   realtime moves; header strip; "New asset" (QueueTopic essentials); Scout +
   Intel summonable from header (D-8).
2. Quick actions wired to the existing actions (D-5), with confirm on kill,
   remaining-revisions display, and error surfacing (no silent failures —
   kill-switch lesson).
- *Tests:* e2e — a seeded project with one asset per stage renders every
  section correctly; quick-approve at IDEA and SCRIPT advances the asset and
  the tile moves sections (realtime); reject flows (revise vs kill) enforce
  and display the revision cap; collapsible Ideas persists; paused asset
  shows 🟠 + `paused_reason` + working retry. Unit: tile badge/QC-chip logic.
  Manual: §3.3 checklist; phone-width pass (tap targets, grid reflow).

### Phase 3 — Asset Canvas
1. Evolve the video page per §7: progress rail + header controls; absorb the
   gate bodies (QC card, Self-Watch panel, calibration thumbs, decision bar,
   ASSETS thumbnail-select); add the Idea section; keep every existing editor
   component in place.
2. Library tiles "View" → Canvas; review-queue links keep working (old page
   still up).
- *Tests:* **port the Phase-0 golden path to run entirely through the new
  surfaces** (Library + Canvas) and keep the old-UI run green — the parity
  proof, both run in CI from here on. e2e: gate decisions from the Canvas
  write `approvals`/`qc_reviews` identically (assert DB rows, not just UI);
  calibration 👍/👎 writes `judge_labels`; step-back/pause/kill from header;
  Self-Watch hold renders and blocks publish; script edit → re-voice → QC
  visible at checkpoint. Manual: full phone deep-edit session (D-11) —
  script edit, beat reroll, thumbnail pick, publish kit — on a real device.

### Phase 4 — Autopilot merge (presentation only, D-9/D-10)
1. One surface: operator panel content + calendar + Boost (Build & Post modal
   relocated) + merged activity timeline (operator events + build runs).
2. Held items deep-link to tiles/canvas; autonomy + cycle budget controls
   preserved verbatim.
- *Tests:* e2e — enable autopilot in mock mode, run the operator tick
  (existing dev/cron entry), watch a seeded asset move through library
  sections without human action, then a held (below-threshold) asset surface
  🟠 with take-over working; Boost creates a `build_runs` row and its videos
  appear in the library; kill switch halts both. Assert `operator_runs` /
  `build_runs` writes are unchanged (schema untouched). Unit: timeline
  interleaving. Manual: Telegram approval round-trip still works.

### Phase 5 — Feed + summonable tools
1. Per-project Feed (§9); Insights Apply/Dismiss with canary semantics
   preserved; Intel scan launcher + BlueprintView as a summonable panel with
   deep-link params (`?project&video&topic`) preserved; "send to remix"
   still lands on the Canvas.
- *Tests:* e2e — generate insights (mock) ⇒ cards in Feed ⇒ Apply creates the
  template proposal exactly as `/insights` did (DB assert); scan from a
  Canvas pre-fills topic; remix handoff. Old pages still functional.

### Phase 6 — Home, nav unification, PWA polish
1. Slim Home: project cards + SystemPulse + the cross-project "awaiting you"
   row (per-project pending counts deep-linking into each library — D-15);
   remove duplicated spend/activity cards (Feed/Costs own them).
2. Nav final form (§5) on both breakpoints; Styleguide kept; back-button
   behavior verified against the real hierarchy.
3. PWA pass: installability, offline shell, safe-area, tab bar context
   switching.
- *Tests:* e2e nav matrix (every destination reachable ≤2 taps from Home on
  phone viewport); Lighthouse PWA + a11y budgets as errors on Home/Library;
  screenshot suite refresh. Manual: §3.3 sweep on phone + desktop.

### Phase 7 — Deletion & cutover (only after parity proven)
1. Flag default ON → remove flag; delete `/projects/[id]/review` (redirect →
   Library), review-queue gate bodies, Build & Post from project header
   (redirect → Autopilot), `/insights` + `/intel` pages (redirect → Feed /
   tools), dashboard duplicate cards, `/downloads` dead route.
2. Contract sweep: Phase-0 action manifest re-run — every action still has
   exactly one caller surface; grep for orphaned components; bundle-size diff.
3. Docs: RUNBOOK + VALIDATION updated to the new surfaces; this log gets a
   "shipped" entry per phase.
- *Tests:* full CI suite green with old specs retargeted (not deleted —
  rewritten against the new UI so coverage never dips); the golden path now
  runs only on the new UI; redirects tested; final manual §3.3 + a real
  end-to-end video in mock mode, then one real (live-key) video before
  calling it done.

### v2 — engine-side consolidation (SHIPPED 2026-07-07)

The backlog D-10 deferred, now built:

1. **One FINAL_REVIEW settle core** (`src/lib/pipeline/settle.ts`, 18 tests):
   the invariants both owners must agree on — autofix-convergence wait,
   Self-Watch verdict reuse-or-run, the publish-block rule (floor +
   compliance policy risk, degraded-never-fakes-a-pass), and one hold-reason
   phrasing — extracted from `finalizeAutoPilotVideos` (engine) and
   `processOperatorApprovals` (operator). The owners keep their genuinely
   distinct halves (per-run QC thresholds vs publish floor + editorial
   guard; push vs Telegram) but can never drift on the safety rules again —
   the exact drift class the Enhancement audit's §0.4 fixed once by hand.
2. **One unified runs read model** (`src/lib/pipeline/runs.ts`, 4 tests):
   `StudioRun` over `operator_runs` + `build_runs`; the Autopilot timeline
   and the Feed both consume it (their duplicated boost-row mappings
   deleted).
3. **Schema changes: deliberately none.** The two run tables keep their
   distinct write paths, budgets, and lifecycles; a destructive merge on a
   live single-tenant DB buys nothing the accessor doesn't. The physical
   merge (if ever) rides the Stage-3 migration, which must touch every row
   of both tables anyway to add `org_id`.

### Multi-tenancy interplay (for live-app Stage 3, which ships AFTER this)

How the new IA maps onto the Stage-3 lift, recorded now so the migration
plan can lean on it:

- **The per-project Library (D-2) is already tenant-shaped.** Every v2
  surface (Library/Canvas/Autopilot/Feed) is project-scoped; Stage 3 adds
  `org_id` above `project_id` and the UI needs only an org switcher on Home
  — no surface redesign.
- **Data access is choke-pointed.** New read models (`library-data.ts`,
  `feed.ts`, `runs.ts`) and the server-action contract are the only paths
  the UI touches; adding org-aware RLS + a per-tenant key resolver changes
  queries in a handful of files, all pinned by the contract manifest +
  golden path.
- **The settle core is where per-tenant policy lands.** Plan caps /
  autonomy-tier gating per tenant (Stage 4 "gate by capability") slots into
  `settle.ts` + `checkBudget` — one place each, both unit-tested.
- **Signals are single-sourced** (signal strip / pulse / cost ledger), so
  per-tenant metering (the billing meter) reuses `cost_ledger` untouched.
- **Reminder from the live-app plan:** public signup stays DISABLED until
  Stage 3's RLS rewrite; the bootstrap-one-account rule is unchanged by
  this redesign.

---

## 11. Progress log

| Date | Entry |
|---|---|
| 2026-07-06 | Repo review completed (UI surface + backend map). Concept discussed; operator answered clarifying round 1 (→ D-1..D-14). This document created with consolidation strategy + draft phased build plan. Open: Q-A..Q-E. |
| 2026-07-06 | Operator answered clarifying round 2: Q-A..Q-E all resolved (→ D-15..D-19). Specs updated (Home awaiting-you row, full-feed scope + filters, Published grid section, Ideas merge, boost runs). **No open questions — plan is ready for Phase 0 green-light.** Doc merged to `main` at operator's request. |
| 2026-07-06 | **Phase 0 green-lit and built** (see Phase 0 box in §10): action-contract manifest (74 actions pinned + caller inventory), 14 safety-critical engine tests on a fake query-builder, authed mock-mode golden-path e2e + baseline screenshots, `e2e-authed` CI job on local Supabase. All local gates green (typecheck/lint/vitest 321/build/smoke e2e). Authed suite awaits its first CI run (needs Docker). Found + pinned two orphaned actions (`runOptimizerNowAction`, `runOperatorNowAction`) for Phase 7. |
| 2026-07-07 | **Phase 1 shipped** (`6ff1f5a`): flag helper, `src/lib/db/library.ts` pure classification core (23 table-driven tests over every status), AssetTile / ProgressRail / CollapsibleSection / ProjectSignalStrip primitives in `/styleguide` + a browser smoke test, route shells. |
| 2026-07-07 | **Phase 2 shipped** (`3e31881`): the per-project Library — stage-sectioned grid (Ideas merged per D-18, Published per D-17), quick actions calling the SAME server actions as the review queue, New asset, signal strip, Scout summonable, realtime tile movement. New table-op actions `queueIdeaCardAction`/`dismissIdeaCardAction` (mirror studio-mcp queue_idea; no engine change). Library-journey authed e2e added. |
| 2026-07-07 | **Phase 3 shipped** (`170d3b5`): the Asset Canvas — QcCard/WatchPanel/ThumbPicker/DecisionBar extracted to `components/dashboard/checkpoint.tsx` (review queue re-imports them: one implementation, two hosts), video page gains ProgressRail header + kill/resume controls + CheckpointPanel at any gate (idea context at IDEA, thumbs + pending-clips at ASSETS, Self-Watch at FINAL, calibration 👍/👎 everywhere). Golden path ported to run entirely on Library+Canvas alongside the old-UI run (parity pair). |
| 2026-07-07 | **Phase 4 shipped** (`7dc6fdb`): merged Autopilot surface — operator calendar/cadence as the system, Build & Post demoted to "Boost", boost runs interleaved into the operator activity timeline (D-9/D-19). Backend untouched. |
| 2026-07-07 | **Phase 5 shipped** (`fde7879`): per-project Feed — one filtered stream (All/Needs action/Insights/Intel/System) of status changes, holds, autofix outcomes (with score deltas), operator + boost events, with InsightCard (Apply/Dismiss + canary preserved) and intel-scan cards. `runOptimizerNowAction` re-homed as the Feed's "Generate insights" (orphan list shrank). |
| 2026-07-07 | **Phase 6 shipped** (`48e990e`): Home awaiting-you row (D-15, same tileState as the Library), context-aware two-level nav on both breakpoints behind the flag; flag-ON build + smoke verified. |
| 2026-07-07 | **Phase 7 shipped (cutover)**: flag removed (v2 is the UI). `/projects/[id]` → Library (the project home, D-2); `/review`, `/downloads`, `/insights` → redirects; review-queue + needs-attention + QueueTopic + AdvanceStage deleted; ClipsGrid + SourceLibrary + attribution ledger absorbed into the ASSETS checkpoint **before** deletion (the caller-inventory test caught `resetRenderAttemptsAction` going orphan — re-homed as "Reset & retry" on failed tiles); JudgeCalibration re-homed to Settings; global Generate-insights to Home; Run-intelligence/demo to the Library; orphaned `runOperatorNowAction` deleted; manifest regenerated; KNOWN_UNREFERENCED now empty; e2e retargeted (v2 journey IS the golden path; screenshots cover library/autopilot/feed); VALIDATION.md updated. **Deliberate keep:** `/intel` remains as the summonable tool page (out of nav) — BlueprintView needs a full-page host; engine push-notification URLs still point at `/review` and land on the redirect (D-10: zero engine edits). |

### Build notes / deviations (operator review welcome)

1. **`/intel` kept as a tool page** (out of nav) rather than folded into the
   Feed — the deep scan workspace + BlueprintView need a full page; the Feed,
   Library, and Canvas summon it with context params. D-8 satisfied in spirit.
2. **ScriptReview's sticky approve bar still exists** at the SCRIPT gate on
   the Canvas alongside the CheckpointPanel decision bar (it additionally
   auto-classifies shot types + jumps to VideoGen). Candidate for later merge.
3. **Engine untouched throughout (D-10)** — including `arriveAtGate`'s push
   URLs (`…/review`), which now land on the Library via redirect.
4. **CI note:** the `e2e-authed` job (local Supabase on GitHub runners) is the
   final Phase-7 exit gate — first run happens on push; fix-forward expected
   for selector-level surprises. |
| 2026-07-07 | **v1 merged to `main`** (`5ee84cc`, operator instruction) after merging in the operator's Auto-Rescript spec commit. |
| 2026-07-07 | **v2 shipped**: shared settle core (`settle.ts` — both owners refactored onto it, 18 tests), unified runs read model (`runs.ts` — Autopilot + Feed consume it, 4 tests), schema deliberately unchanged, multi-tenancy interplay documented (§ above). Suite: 374 tests green, build green. Next: Fable5-Auto-Rescript-Spec.md build. |

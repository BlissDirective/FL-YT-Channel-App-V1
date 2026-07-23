# Precision Editing + Clean House v2 — Build Spec

Three related upgrades, agreed with the operator:

- **Part A — Highest-salvageability budget strategy** (Clean House allocates a
  capped budget to the best-odds assets first, not arbitrary order).
- **Part B — Re-select** (discard the triage plan and reopen the picker, both
  pre-approval and mid-run).
- **Part C — MVDA precision editing** (visual grounding for the cut agent, a
  Clean-House → MVDA edit-session trigger, and a manual "Precision edit" button
  on both Director and Autonomous modes) — scoped to **generated-clip cutting**
  (timing · transitions · captions · motion · b-roll swaps · pacing), NOT
  raw-take cleanup. Ideas adopted natively; **no literal `video-use`
  dependency** (see rationale §C.0).

---

## Part A — Highest-salvageability budget strategy

### Problem
The execution tick queries pending items with **no ordering**
(`clean_house_items … is('outcome', null)`), so a capped budget is spent in
arbitrary insertion order and auto-pauses when the ledger hits the ceiling —
the money lands on *whatever assets it reaches first*, not the best bets.

### Change
1. **Order the work queue by salvageability, descending** (tie-break: lower
   `est_cost_usd` first, so cheap high-salvageability wins go first). The
   `salvageability` score is already persisted per item — just add
   `.order('salvageability', { ascending:false }).order('est_cost_usd', { ascending:true })`
   to the tick query in `advanceCleanHouseRun` (`clean-house-runner.ts`).
2. **Operator-selectable strategy (DECIDED).** Expose a selector in the plan
   view with three strategies, default **salvageability**:
   - **salvageability** — highest salvageability first (tie: cheapest). Best odds.
   - **cheapest** — lowest `est_cost_usd` first. Most wins per dollar.
   - **closest-to-floor** — smallest QC-gap-to-floor first (least quality lift
     per win). Requires the asset's QC score on the item (added — see schema).
   Pure helper `rankForBudget(items, strategy)` returns the ordered queue; the
   run persists the chosen strategy (`clean_house_runs.budget_strategy`).
3. **Plan preview shows the budget frontier.** Given the ceiling + strategy,
   `planWithinBudget(rankedItems, ceilingUsd)` (pure) returns
   `{ funded, deferred, fundedCostUsd }`; the plan view shows
   "≈N of M assets fit under $X; the rest wait." **Deferred items stay pending**
   (NOT marked skipped) so raising the ceiling + Resume funds more — the preview
   is the explicit surface, resume stays possible.

### Schema (migration `0065`)
- `clean_house_runs.budget_strategy text not null default 'salvageability'`
- `clean_house_items.qc_score numeric` (nullable; captured at triage, powers
  closest-to-floor ranking).

### Notes
- The hard cap stays enforced on **real reconciled ledger spend**
  (`cleanHouseLedgerStop`) — unchanged. This only changes *ordering* + *preview*.

### Tests
- `planWithinBudget` pure unit tests (ordering, frontier, zero/inf ceiling).
- Tick orders by salvageability (unit around the query builder / a fake db).

---

## Part B — Re-select (discard → reopen picker)

### Behavior
- **Pre-approval (awaiting_approval):** the plan view gains a **"← Re-select
  assets"** button. It cancels the awaiting run (`cancelCleanHouseRun`) and
  reopens the picker. (Selection is discarded — operator picks fresh.)
- **Mid-run (running/paused) (DECIDED):** the run controls gain **"Re-select"**
  behind a one-tap confirm ("This ends the current run and starts a new
  selection"). It **cancels the active run** and reopens the picker.
  - **Cancel semantics:** assets **already in-flight** (advanced into an async
    worker stage — render/clip jobs already dispatched) **finish naturally** on
    their own queues; Clean House simply stops advancing them. Assets **queued
    for cleanup but not yet advanced** are **dropped** (the cancelled run never
    touches them). Already-ledgered spend stays real. This is exactly the
    existing `cancelCleanHouseRun` behavior (tick halts on `status != running`),
    so the change is UI-only.

### UI
- `clean-house-panel.tsx`: add the Re-select affordance in both the plan block
  and the running/paused block; wire to `cancelCleanHouse` → then set the
  panel back into `picking` mode.

### Tests
- Component behavior is light; covered by the existing action contract +
  a manual visual check. No pure-core change.

---

## Part C — MVDA precision editing

### C.0 — Why native, not a `video-use` dependency
`browser-use/video-use` is an AI editing agent (Transcribe → LLM reasons → EDL
→ Render → Self-Eval) for **raw recorded footage** (filler removal, diarization,
color grade, burned subs). A literal dependency is the wrong fit because it
targets footage we don't produce, and it carries its own EDL/render/self-eval
that would **bypass our EDD, render farm, media-QC, watch gate, decision trail,
cost ledger, and budget caps** — losing QC, cost tracking, and versioning. We
therefore adopt its two best *ideas* natively (below). A literal integration is
only revisited if a future "bring-your-own raw footage" path is added.

### C.1 — Visual grounding for the MVDA cut agent (highest value)
Today the cut agent (`packages/agent`) reasons over the EDD + `judge_preview`
scores. Give it **frames**:
- At each **cut boundary** (and key overlay/motion points), render a compact
  **filmstrip + audio-waveform thumbnail** (reuse the render package's existing
  ffmpeg frame sampling used by media-QC) and pass it into the agent's context
  — only at decision points, to stay token-efficient (video-use's `timeline_view`
  idea).
- New agent tool `timeline_view(range)` → returns the filmstrip/waveform PNG(s)
  for a beat range, so the agent can *look* before it retimes/transitions/swaps.
- Scope to **generated-clip** decisions: cut timing, transition choice, caption
  emphasis/timing, camera motion, **b-roll/visual swaps** (`swap_visual`), and
  pacing — the levers that matter for faceless AI footage.

### C.2 — Clean House → MVDA edit-session trigger (autonomous) (DECIDED)
Clean House currently polishes via the autofix loop and **never invokes the MVDA
cut agent**. Add: when a salvageable asset reaches the cut/FINAL stage on an
`mvda_enabled` channel, Clean House (and the normal autonomous build)
**request an MVDA edit session** (`edit_session_requested`) so the cut agent does
a precision pass before the FINAL gate — **on by default** for mvda_enabled
channels — bounded by the same budget ceiling + `cut_copilot_floor` + 2-round cap.
- **MVDA on by default for ALL channels (DECIDED):** migration flips
  `projects.mvda_enabled` default → `true` **and backfills existing channels to
  true**; the project-settings action default also flips to on. (Operators can
  still turn it off per channel.) Enabling the flag alone doesn't start runs — a
  session only fires when `edit_session_requested` is set, so this is safe.

### C.3 — Manual precision editing on both modes (DECIDED: two actions)
Offer **two distinct actions** on an asset, available in **both** Director and
Autonomous modes:
1. **"Open editor"** — opens the existing 18-verb human timeline editor for
   hands-on precision cutting.
2. **"Run MVDA cut"** — requests an MVDA precision pass (`edit_session_requested`)
   the operator can then refine in the editor.
One consistent entry point in the asset/console UI, both modes.

### C.4 — Training MVDA to write better edits (uses existing loops)
No new ML — feed the agent better signal through systems that already exist:
1. **Visual grounding** (C.1) makes decisions frame-aware.
2. **Few-shot exemplars** mined from **outcome-audit** winners (high-retention
   EDL diffs) injected into the cut-agent prompt; a richer editing rubric via the
   **style playbook** (Batch 4 taste profile).
3. **Human precision edits become graded lessons** — each hand-cut is captured by
   the **editing-research / memory-service** loop and graduated after the existing
   ≥5-real-cut threshold. Your manual edits literally train the agent.

### Scope guardrails
- Targets **generated-clip cutting**, not raw-take cleanup (no filler removal /
  diarization — inapplicable to scripted TTS VO).
- Everything flows through the existing EDD, render farm, media-QC, watch gate,
  decision trail, **cost ledger + budget caps**, and versioning. Nothing bypasses
  the gates. Never publishes; never auto-kills.

### Tests
- Pure: exemplar-selection + rubric assembly helpers (core).
- Agent: `timeline_view` tool contract; edit-session trigger gating (mvda_enabled
  + cap + floor). Mock-first, consistent with the framework smoke test.

---

## Build order (proposed)
1. **Part A + Part B** — small, high-value, ship together (budget strategy +
   re-select). Pure helpers + runner query + panel UI.
2. **Part C.1** — visual grounding (the biggest editing-quality lever).
3. **Part C.3** — manual Precision-edit button (both modes).
4. **Part C.2** — Clean House → MVDA edit-session trigger.
5. **Part C.4** — exemplar/rubric training signal.

Each step: tsc + eslint + vitest + build green, visual QA, sign off here,
commit + merge in the established rhythm.

## Resolved decisions (operator sign-off)
1. Budget strategy: **operator-visible selector** (salvageability / cheapest /
   closest-to-floor), default salvageability.
2. Mid-run re-select: **cancels** the run — in-flight assets finish on their
   worker queues, queued-but-not-started assets are dropped.
3. Clean House → MVDA precision pass **on by default** for mvda_enabled
   channels; **`mvda_enabled` default flipped to true for all channels**
   (+ backfill existing).
4. Precision editing: **two distinct actions** — "Open editor" and "Run MVDA cut"
   — on both modes.

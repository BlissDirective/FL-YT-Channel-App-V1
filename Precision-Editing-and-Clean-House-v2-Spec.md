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
2. **Plan preview shows the budget frontier.** In the plan view, given the
   entered ceiling, compute (pure, in `@studio/core`) which advance-items fit
   under the ceiling in salvageability order → show
   "≈N of M assets fit under $X; the rest wait / are skipped." A new pure
   helper `planWithinBudget(items, ceilingUsd)` returns
   `{ funded: Item[], deferred: Item[], fundedCostUsd }`.
3. **Deferred items are explicit.** When the ledger cap pauses the run, items
   never reached are marked `outcome:'skipped'` with reason "beyond budget"
   (today they silently stay pending). Operator can raise the ceiling + resume
   to fund more.

### Notes
- The hard cap stays enforced on **real reconciled ledger spend**
  (`cleanHouseLedgerStop`) — unchanged. This only changes *ordering* + *preview*.
- Optional (confirm): expose the strategy as a selector
  (`salvageability | cheapest | closest-to-floor`) — default salvageability.

### Tests
- `planWithinBudget` pure unit tests (ordering, frontier, zero/inf ceiling).
- Tick orders by salvageability (unit around the query builder / a fake db).

---

## Part B — Re-select (discard → reopen picker)

### Behavior
- **Pre-approval (awaiting_approval):** the plan view gains a **"← Re-select
  assets"** button. It cancels the awaiting run (`cancelCleanHouseRun`) and
  reopens the picker. (Selection is discarded — operator picks fresh.)
- **Mid-run (running/paused):** the run controls gain **"Re-select"** behind a
  one-tap confirm ("This ends the current run and starts a new selection").
  It cancels the active run and reopens the picker.
  - **In-flight caveat, surfaced in the confirm:** assets already advanced this
    run keep whatever progress/spend already happened (that's real, ledgered
    work); re-select just stops *new* work and starts a fresh triage.

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

### C.2 — Clean House → MVDA edit-session trigger (autonomous)
Clean House currently polishes via the autofix loop and **never invokes the MVDA
cut agent**. Add: when a salvageable asset reaches the cut/FINAL stage on an
`mvda_enabled` channel, Clean House (and the normal autonomous build) may
**request an MVDA edit session** (`edit_session_requested`) so the cut agent does
a precision pass before the FINAL gate — bounded by the same budget ceiling +
`cut_copilot_floor` + 2-round cap. Gated so it never runs on channels without
MVDA enabled, and never exceeds the run's cap.

### C.3 — Manual "Precision edit" on both modes
- **Director mode:** a **"Precision edit"** action on an asset opens the existing
  editor (the 18-verb timeline) AND/OR triggers an MVDA cut session the operator
  then refines. (Human edit UI already exists — this surfaces the trigger.)
- **Autonomous mode:** same button, so the operator can promote a precision pass
  on demand even while autopilot runs.
- One consistent entry point in the asset/console UI, available in both modes.

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

## Open questions
1. Budget strategy: single default (salvageability-first) or an operator-visible
   selector (salvageability / cheapest / closest-to-floor)?
2. Mid-run re-select: confirm it should **cancel** the current run (abandon new
   work) rather than pause-and-resume a different subset.
3. C.2 autonomy: should the Clean House → MVDA edit-session pass be **on by
   default** for mvda_enabled channels, or opt-in per run?
4. Precision-edit button: open the **human editor**, **trigger an MVDA cut**, or
   offer **both** as two actions?

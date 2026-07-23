# ClickMax-Style Interaction Model — Transition & Build Plan

**Status:** Draft for review
**Scope:** Keep the pipeline spine and under-layer systems (state machine, engine stages, render farm, clip queue, QC/eval/learning, cost ledger). Replace the gate/approval interaction model with a ClickMax-style single-surface, asset-level-iteration UX.
**Companion docs:** `Fable-5-Director-Mode-Build-Spec.md`, `Fable-5-UI-Redesign.md`, `Fable-5-Visual-Craft-Engine-Build-Spec.md`

---

## 0. Working assumptions (override any of these)

These four decisions shape the plan. Defaults were chosen to keep scope controlled; each is reversible and the plan notes where a different answer changes things.

| # | Decision | Default adopted here | Alternative |
|---|----------|----------------------|-------------|
| A | **Product scope** | Phased: rebuild the creation UX single-operator first (Phases 0–4). Multi-user/SaaS + growth loops (try-funnel, portfolios, Discover, SEO pages) are speced in Phase 5 and deferred, with foundations (schema, cost metering, rate table) laid earlier so nothing needs re-architecture. | Build full SaaS now (adds auth/RLS rework, Stripe credits, abuse controls — roughly doubles the plan). |
| B | **Composer model** | Hybrid: one glass composer with mode toggles driving structured engine actions; outputs render as regenerable cards in the same surface. Free-text chat works, but buttons carry the flow. | Fully chat-driven agent (needs an intent-router layer; deliverable as a Phase 4+ enhancement on top of the hybrid, not instead of it). |
| C | **Cost display** | Real USD from the cost ledger, shown on every generate button and card ("Generate · ~$0.42"). A `model_rates` table is added at the same time so a credits abstraction can be flipped on in Phase 5 without UI changes. | Credits-only UI from day one. |
| D | **QC / learning surfacing** | QC runs automatically after each generation and appears as inline badges on cards with one-click **Auto-fix** / **Regenerate with notes**. The learning loop keeps running in the background and its conclusions surface on ONE consolidated Insights page (merging today's `costs`, `intel`, `insights` pages). Standalone review dashboards are retired from nav. | Keep all current dashboards and restyle them. |

---

## 1. North star

> One project. One surface. Every artifact is a card you can re-prompt. "Continue" is the only ceremony.

The user experience we are copying from ClickMax Studio:

- A single composer (prompt box) with **mode toggles** is the whole workspace.
- Every generation is **one prompt → one artifact**; a bad result is fixed by re-prompting *that artifact*, never by re-running a stage or filing a revision.
- Model choice is a **user-facing menu** with plain-language pros, durations, quality tiers, and visible cost.
- A project is a **container with context** (instructions, references, brand), not a workflow with gates.

What we deliberately keep that ClickMax does not have (our moat):

- End-to-end assembly (Remotion render farm, `packages/render`).
- Beat-structured scripts wired to visuals (`scripts.beats` → per-beat VO/clips).
- Idea research + YouTube analytics, publish kit, derive-shorts.
- QC/evaluation/learning loop (kept, resurfaced — see §4.4).
- Cost ledger with real per-provider spend.

---

## 2. Keep / Refactor / Park / Delete map

### 2.1 KEEP (spine — untouched or lightly touched)

| System | Location | Notes |
|---|---|---|
| Status state machine | `packages/core/src/state-machine.ts` | Statuses stay as the internal data model. Gate semantics (`GATE_FOR_STATUS`, approvals ceremony) disappear from UX; see §4.1. |
| Stage bodies | `src/lib/pipeline/engine.ts` — `runScripting`, `runAssetGeneration`, `runAssembly` | Refactored for per-asset entry points (§5.2) but logic preserved. |
| Render farm | `packages/render`, `.github/workflows/render.yml` | Unchanged. |
| Clip queue | `packages/clips/src/clip-queue.ts`, `clips.yml` | Unchanged. |
| Reconciliation / self-healing | `reconcileStuckRenders` etc. | Unchanged — this is load-bearing reliability, not over-engineering. |
| Cost ledger | `cost_ledger`, per-asset `cost_usd` | Extended with pre-generation estimates (§4.5). |
| QC reviews | `qc_reviews`, stage review logic | Re-pointed from gates to assets (§4.4). |
| Autofix | `autofix.ts` | Becomes the card-level "Auto-fix" action. |
| Learning loop | `memory`, `insights`, `judge_labels`, `outcome_audits`, optimizer cron | Keeps running in background; output consolidated to one Insights page. Each module gets a "is it functioning?" audit in Phase 0. |
| Idea research / intel | YouTube Data adapters, `video_intel`, `analytics_snapshots` | Kept; idea results feed the composer's Idea mode. |
| Publish kit, derive-shorts, highlights | co-located components under `videos/[vid]/` | Kept; re-homed as cards/panels in the new workspace. |
| Adapters with live providers | ElevenLabs, fal (FLUX + video models), Pexels, Gemini video, script | Kept. The video/image model configs become the source of the user-facing model catalog (§4.3). |
| Telegram approvals + web push | | Kept for autopilot notifications (single auto-run path, §4.2). |

### 2.2 REFACTOR (same capability, new shape)

| Current | Becomes |
|---|---|
| `runPipeline` + `runDirectedStage` (duplicate stage switches + money rails) | One `advanceStage(videoId)` used by both the workspace "Continue" button and autopilot. |
| `fullAutoGenerate` + `startBuildRun`/build-runner + Auto-Pilot Operator (three autonomy layers) | One autopilot path: `build_runs` + build-runner cron survive (they're the most robust); `fullAutoGenerate` becomes a thin wrapper that creates a 1-video build run; the Operator's decision logic folds into build-runner or parks. |
| Per-gate autonomy matrix (`assist`/`copilot`/`autopilot` × 4 gates) on projects | One project-level switch: **Director** (default) vs **Autopilot**. Migration maps existing configs onto it. |
| `approvals` gate ceremony + `CheckpointPanel` | "Continue" action per stage; row still written to `approvals` for the learning loop's benefit, but it's a click, not a review workflow. |
| Video hub page with ~10 co-located panels (`script-review`, `video-gen`, `checkpoint-panel`, `director-console`, …) | The Workspace (§3): composer + card stream + stage rail. Panels become card types. |
| `costs` + `intel` + `insights` pages | One **Insights** page. |

### 2.3 PARK (branch `parked/post-clickmax`, earn-back after 30 days of core-loop use)

Parking = code moved/flag-removed on the transition branch but preserved on a dedicated branch with a note in `PARKED.md` describing what it was and what "earning it back" would look like.

- **Visual Craft Engine dark flags** (`vce.ts`: bible/router/refine/grounding/compositor — all currently `false`). Exception: if the visual-bible path is demonstrably improving `runScripting` output today, keep that single flag.
- **Editor & Assembly flag suite** (`editor-flags.ts`: assembly/proEditor/keyframes/segmentAgent — all `false`) and the flag-gated `/edit` + `/assembly` sub-routes.
- **Clean House** system (core, runner, cron, migrations' feature surface) + **Self-Watch Loop** + **Agentic Harness** — the app auditing itself is a luxury; reconciliation functions (kept above) already cover reliability.
- **Speculative learning extras that aren't demonstrably functioning** after the Phase 0 audit: `bandit`, `format-bandit`, `best-of-n`, `taste-profile`, `variant-judge`, `competitive-judge`. (The core loop — qc_reviews, judge_labels, memory, insights, outcome_audits — is KEPT per assumption D.)
- **Stubs / thin modules:** `twelvelabs.ts`, `translate.ts`/`localization.ts`, `monetization.ts`, `packages/agent` + `packages/intel` queues if the audit shows they're idle.
- Speculative one-shot adapters not referenced by the kept paths: `stick-choreographer`, `transition-critic`, `lesson-synthesizer`, and similar (exact list produced by the Phase 0 dependency audit, not guessed).

### 2.4 DELETE (nothing yet)

Nothing is hard-deleted in this transition. Parking is the only removal mechanism until the 30-day review.

---

## 3. Target UX — "the Workspace"

One route replaces the video hub: `projects/[id]/videos/[vid]` renders the Workspace. (Project page becomes a simple grid of video cards + "New video" — ClickMax dashboard style.)

```
┌────────────────────────────────────────────────────────────┐
│ ◈ Project name        [Director ▾]      Balance/spend  ⚙   │
│ ── Stage rail: Idea ─ Script ─ Assets ─ Assemble ─ Publish │  ← progress, not gates
├────────────────────────────────────────────────────────────┤
│                                                            │
│   CARD STREAM (scrolls; grouped by stage)                  │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐    │
│   │ Idea card     │ │ Script card   │ │ Beat 4 clip   │    │
│   │ title, angle, │ │ hook, beats   │ │ ▶ preview     │    │
│   │ score  ↻ ✎    │ │ list  ↻ ✎ QC✓ │ │ QC⚠ ↻ Auto-fix│    │
│   └───────────────┘ └───────────────┘ └───────────────┘    │
│                                                            │
│                      [ Continue → Assets  · ~$3.20 ]       │  ← the only ceremony
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ✦ glass composer                                     │  │
│  │ [Idea|Script|Image|Video|Voice]  [Model ▾] [refs 📎] │  │
│  │ "Describe what to create or change…"    [Send ·$0.42]│  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Composer modes** (mirrors ClickMax's image/video/chat trio, extended for our pipeline):

| Mode | Placeholder | Action routed to |
|---|---|---|
| Idea | "Paste a title or idea, e.g. 'What If You Grew Up on Mars'…" | idea creation/research; new Idea card |
| Script | "What should this video be about? Or ask for changes…" | `runScripting` / script revision with notes |
| Image | "Describe the thumbnail or scene…" | FLUX/thumbnail generation → asset card |
| Video | "Describe the scene to generate…" (+ duration/quality controls from model config) | clip job → asset card |
| Voice | "Paste narration or pick a beat…" | ElevenLabs VO → asset card |

**Context-aware targeting:** selecting a card focuses the composer on it ("Editing: Beat 4 clip" chip, ClickMax's "Send to thumbnail strategist" pattern). Sending re-prompts *that artifact*. With no card selected, the composer creates new artifacts in the current stage.

**Card anatomy (uniform across types):** preview/content · provider+model chip · cost chip · QC badge (✓ / ⚠ with issue list) · actions: **↻ Regenerate** (optional notes), **✎ Edit**, **Auto-fix** (when QC flags), **⋯** (history/versions, pin as final).

**Continue button:** one per stage boundary, shows estimated cost of the next stage. Internally calls `advanceStage` → same status transitions as today, writes an `approvals` row. `NEEDS_REVISION` as a user-facing state disappears; revision is just regenerating cards.

**Free-text fallback (assumption B):** unrecognized composer input in any mode is treated as an instruction to the focused card or, unfocused, as a script/idea note — never an error. A true intent-router agent (the "regenerate scene 4" fully-conversational layer) is an optional Phase 4 enhancement once the structured path is solid.

---

## 4. Feature workstreams (the 8 notes, expanded)

### 4.1 Collapse gates into inline iteration (note 1, 6)
- Statuses and transitions in `state-machine.ts` unchanged; drop only the UX concepts: `CheckpointPanel`, gate review screens, per-gate autonomy config, revision request forms.
- `GATE_FOR_STATUS` retained internally as "stage boundary where Continue is offered."
- Every artifact becomes individually addressable and regenerable (§5.2) — script beats included: each beat is a card (text + visual prompt); regenerating a beat re-runs only that beat's script text and invalidates only its downstream VO/clip cards (marked "stale," one-click refresh, not auto-regenerated — cost stays user-controlled).

### 4.2 Director default, one auto-run path (note 3)
- Project-level mode switch: **Director** (default; Continue buttons, everything visible) / **Autopilot** (build-runner drives; Continue clicks are auto-approved by QC score exactly as `build_runs` does today; Telegram/push notify).
- Consolidate to `advanceStage` + build-runner. `runDirectedStage`, `fullAutoGenerate` as separate paths are removed; Operator logic folds in or parks.

### 4.3 Models as a user-facing menu (note 8)
- New `src/lib/models/catalog.ts`: one typed catalog entry per generation model — id, label, logo, one-line description, plain-language pros (ClickMax-style: "realism-per-dollar," "lowest cost in catalog"), supported durations, quality tiers, per-unit cost formula. Sourced from the existing `video-models.ts` + FLUX + ElevenLabs adapters.
- Composer model picker popover renders the catalog (badge for "Fast/Cheap/Best"), remembers last choice per mode per project (ClickMax persists this in localStorage; we persist on the project row).
- `model_rates` table mirrors the catalog's cost formulas in SQL so estimates, ledger reconciliation, and future credits (Phase 5) share one source.

### 4.4 QC, evaluation, learning — kept and resurfaced (note 4)
- **QC:** after each artifact generation, the existing stage-review scoring runs scoped to that artifact; result stored in `qc_reviews` keyed by `asset_id` (new nullable column) instead of only gate+video. Card badge: green ✓ (pass), amber ⚠ (issues; tooltip lists them; actions: Auto-fix / Regenerate with notes / Dismiss).
- **Evaluation/learning:** judge labels, memory, outcome audits, optimizer cron keep running unchanged. New single **Insights** page (replaces `costs` + `intel` + `insights` nav entries): spend over time (ledger), what the loop has learned (memory/insights entries in plain language), model performance ("Kling clips pass QC 84% for this niche"), idea-research results.
- **Phase 0 audit gate:** each learning module gets a one-line verdict — *functioning* (produces data that changed a default or decision in the last 60 days), *dormant* (runs but unused), *broken*. Functioning → keep; dormant/broken → park list, per note 4's "truly non-critical" rule. You review the verdict table before anything moves.

### 4.5 Small delights (note 5)
- **Cost on the button:** `estimateCost(action, model, params)` from `model_rates`; rendered on Send and Continue buttons and card chips. Actuals continue to the ledger; estimate vs actual drift shows on Insights.
- **Project instructions:** `projects.instructions` (free text: tone, colors, audience, pacing) — injected into every prompt path (scripting system prompt, image/video prompt prefix, VO style hints). UI: editable panel in workspace header, ClickMax's "Edit project instructions" pattern.
- **References:** surface existing `visual_refs` as composer attachments (📎 upload/paste, shown as chips) feeding image/video generation.
- Dictation (speech-to-text prompt input) — cheap, optional, last.

### 4.6 One creation surface (note 2) — covered in §3.

### 4.7 Frictionless entry + growth loops (note 7) — Phase 5, speced not built
Deferred per assumption A, with foundations laid earlier (model_rates, per-asset addressing, USD→credits swap point). When triggered:
1. Multi-tenant auth + RLS rework (today's single-operator policies are the biggest blocker), per-user API key strategy → platform keys + credits.
2. `/try/:mode` anonymous funnel: localStorage draft (prompt + refs) → sign-up → draft becomes first project (ClickMax's `funnelDraft`/`composerAuthSeed` pattern).
3. 5-question onboarding writing to `onboarding_responses`.
4. Growth surfaces: public portfolio route, Discover gallery (opt-in publish per artifact), template catalog, SEO tool-landing pages.
5. Stripe subscriptions + credit metering on top of `model_rates`.

---

## 5. Data model changes (deliberately minimal)

1. `projects.instructions text` — free-text context.
2. `projects.workspace_mode text default 'director'` — director | autopilot (supersedes per-gate autonomy; migration maps old configs).
3. `projects.composer_prefs jsonb` — last model/duration/quality per mode.
4. `assets.parent_asset_id uuid`, `assets.version int`, `assets.superseded_at` — take/version history per artifact (VO takes, clip retries, thumbnail variants); current = latest non-superseded, pinnable.
5. `assets.stale boolean default false` — set when an upstream beat changes.
6. `qc_reviews.asset_id uuid null` — asset-scoped QC alongside existing gate-scoped rows.
7. `model_rates` table — model id, unit, unit_cost_usd, (later) unit_credits.
8. No changes to `videos` statuses, `scripts`, `clip_jobs`, `build_runs`, ledger.

---

## 6. Phase plan

Each phase ends with the app deployed and usable; no long-lived broken states.

**Phase 0 — Audit & safety net (small)**
- Dependency/usage audit producing the Keep/Park verdict table (§2.3, §4.4) for your sign-off. Deliverable: `PARKED.md` draft + verdict table.
- Create `parked/post-clickmax` branch. Tag current main.
- Golden-path smoke test: one video end-to-end (mock providers) in CI so the refactor can't silently break the spine.

**Phase 1 — Engine seams (backend only, UI untouched)**
- Extract `advanceStage`; re-point existing UI + build-runner to it. Delete duplicate stage-switch in `runDirectedStage`/`runPipeline` wrapper paths.
- Per-asset regeneration entry points: `regenerateBeat`, `regenerateVO(beat)`, `regenerateClip(beat)`, `regenerateThumbnail(variant)`, each writing versioned assets (schema §5) and asset-scoped QC.
- `estimateCost` + `model_rates` + `catalog.ts`.
- Consolidate autonomy layers onto build-runner.

**Phase 2 — The Workspace (the big UI phase)**
- New workspace page: stage rail, card stream (idea/script/beat/VO/clip/thumbnail/render/publish cards), Continue button, card focus + history.
- Glass composer with 5 modes, model picker, reference attachments, cost-labeled Send.
- Project instructions field wired into all prompt paths.
- Old hub panels retired as cards reach parity; `CheckpointPanel` and gate screens removed last, behind a feature flag for one release ("classic view" escape hatch during your first week of use).

**Phase 3 — QC/Insights resurfacing**
- Asset-level QC badges + Auto-fix + Regenerate-with-notes on cards.
- Consolidated Insights page; remove `costs`/`intel`/`insights` from nav.
- Director/Autopilot switch in workspace header; Telegram/push flows re-tested for Autopilot.

**Phase 4 — Polish & parking execution**
- Execute the approved park list (move to branch, `PARKED.md` finalized).
- Dictation input; stale-cascade UX refinement; empty states, keyboard shortcuts, ClickMax-style dark glass styling pass (align with `Colourway-v2.md`).
- Optional: intent-router chat layer ("regenerate scene 4" free-text) if the structured loop feels solid.
- **Start the 30-day clock:** you use only the new loop for daily channel work.

**Phase 5 — SaaS & growth (only after 30-day review)**
- §4.7 items, sequenced auth → funnel → billing → growth surfaces.

**30-day earn-back review:** for each parked item, either (a) a concrete moment occurred where you missed it → un-park with a UX home in the new workspace, or (b) it stays parked another 30 days, or (c) it graduates to deletion. Review notes appended to `PARKED.md`.

---

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Refactoring the 4,700-line engine breaks the working pipeline | Phase 0 golden-path CI test before any engine edits; Phase 1 is seam-extraction only (no behavior change), verified against the test. |
| Beat regeneration cascades cost (regenerate one beat → re-pay VO+clip) | Stale marking instead of auto-regeneration; user pays per click, cost shown on the click. |
| Losing QC/learning value during the UX move | Nothing in the kept list is turned off at any phase; only its *display* moves. Park list requires the Phase 0 verdict table + your sign-off. |
| "Classic view" flag lingers forever | Hard removal one release after Phase 2 unless a blocking gap is filed. |
| Scope creep toward SaaS mid-transition | Phase 5 items are speced here precisely so they can be declined until the review date. |

---

## 8. Open questions (answer to unblock; defaults proceed otherwise)

1. **Assumptions A–D** (§0) — confirm or override.
2. Visual-bible flag: is it improving current scripts enough to survive the park (§2.3)?
3. Autopilot notifications: keep Telegram, web push, or both?
4. Should Idea mode keep full niche-research (YouTube API sweep) in the composer, or simplify to "paste a title" ClickMax-style with research as an explicit button?
5. Naming: keep "Director/Autopilot" or adopt friendlier labels in the new UI?

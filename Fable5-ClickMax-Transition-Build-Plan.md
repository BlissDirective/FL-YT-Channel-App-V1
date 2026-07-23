# ClickMax-Style Interaction Model — Transition & Build Plan

**Status:** Confirmed — decisions locked 2026-07-23
**Scope:** Keep the pipeline spine and under-layer systems (state machine, engine stages, render farm, clip queue, QC/eval/learning, cost ledger, Visual Craft Engine). Replace the gate/approval interaction model with a chat-first single-surface, asset-level-iteration UX.
**Companion docs:** `Fable-5-Director-Mode-Build-Spec.md`, `Fable-5-UI-Redesign.md`, `Fable-5-Visual-Craft-Engine-Build-Spec.md`

---

## 0. Confirmed decisions

| # | Decision | Confirmed direction |
|---|----------|---------------------|
| 1 | **Product scope** | Phased: core UX/UI first (Phases 0–4), SaaS later (Phase 5). Foundations (schema, rate table, cost metering, per-asset addressing) laid now so nothing needs re-architecting. |
| 2 | **Composer model** | **Chat is the main driver and can control everything, 100%.** Buttons/toggles/pickers exist as added UI for granular control, never as the only path. The intent-router layer is core (Phase 2), not optional. |
| 3 | **Cost display** | Real USD everywhere now. A **Credits system is v2** (Phase 5) — `model_rates` table built now carries a `unit_credits` column so v2 flips on without UI redesign. |
| 4 | **QC / learning surfacing** | Inline badges + autofix only. QC runs silently after each generation → badges on cards with one-click Auto-fix / Regenerate-with-notes. Learning loop runs invisibly and only influences defaults. Dedicated dashboards (`costs`, `intel`, `insights`, review panels) are parked. |
| 5 | **Visual Craft Engine** | **Kept, not parked.** Visual-bible flag and the VCE stages fold into the invisible under-layer agentic system — they run automatically inside generation with no user-facing flags or UI. |
| 6 | **Autopilot notifications** | Telegram **and** web push, each individually selectable in Settings. |
| 7 | **Idea mode** | Keep the full YouTube niche-research sweep, driven from the composer. UI simplified to a single prompt box and/or single button — the sweep's machinery is invisible. |
| 8 | **Mode naming** | "Director / Autopilot" stays. |

---

## 1. North star

> One project. One surface. Chat runs everything; every artifact is a card you can re-prompt. "Continue" is the only ceremony.

The user experience we are adopting from ClickMax Studio:

- A single composer (prompt box) with **mode toggles** is the whole workspace.
- Every generation is **one prompt → one artifact**; a bad result is fixed by re-prompting *that artifact*, never by re-running a stage or filing a revision.
- Model choice is a **user-facing menu** with plain-language pros, durations, quality tiers, and visible cost.
- A project is a **container with context** (instructions, references, brand), not a workflow with gates.

Where we go beyond ClickMax (decision 2): their composer only creates assets. Ours is an **agent** — "regenerate scene 4 with more tension," "switch beat 2's clip to Kling," "continue to assembly," "what did QC flag?" are all valid messages that route to real engine actions.

What we deliberately keep that ClickMax does not have (our moat):

- End-to-end assembly (Remotion render farm, `packages/render`).
- Beat-structured scripts wired to visuals (`scripts.beats` → per-beat VO/clips).
- Idea research + YouTube analytics, publish kit, derive-shorts.
- QC/evaluation/learning loop and the Visual Craft Engine (kept, made invisible — §4.4, §4.5).
- Cost ledger with real per-provider spend.

---

## 2. Keep / Refactor / Park map

### 2.1 KEEP (spine — untouched or lightly touched)

| System | Location | Notes |
|---|---|---|
| Status state machine | `packages/core/src/state-machine.ts` | Statuses stay as the internal data model. Gate semantics (`GATE_FOR_STATUS`, approvals ceremony) disappear from UX; see §4.1. |
| Stage bodies | `src/lib/pipeline/engine.ts` — `runScripting`, `runAssetGeneration`, `runAssembly` | Refactored for per-asset entry points (§5.2) but logic preserved. |
| **Visual Craft Engine** | `vce.ts` stages: bible / router / refine / grounding / compositor | **Kept per decision 5.** Flags removed as *user-facing* concepts; VCE becomes an always-available under-layer that the engine invokes automatically where it measurably improves output (§4.5). |
| Render farm | `packages/render`, `.github/workflows/render.yml` | Unchanged. |
| Clip queue | `packages/clips/src/clip-queue.ts`, `clips.yml` | Unchanged. |
| Reconciliation / self-healing | `reconcileStuckRenders` etc. | Unchanged — load-bearing reliability. |
| Cost ledger | `cost_ledger`, per-asset `cost_usd` | Extended with pre-generation estimates (§4.6). |
| QC reviews | `qc_reviews`, stage review logic | Re-pointed from gates to assets, surfaced as card badges only (§4.4). |
| Autofix | `autofix.ts` | Becomes the card-level "Auto-fix" action and a chat-invokable action. |
| Learning loop | `memory`, `insights`, `judge_labels`, `outcome_audits`, optimizer cron | Runs invisibly; influences defaults (model choice, prompt templates, QC thresholds). No dedicated UI. Chat can answer questions about it ("why did you pick Kling?"). |
| Idea research / intel | YouTube Data adapters, `video_intel`, `analytics_snapshots` | Kept in full (decision 7); driven from the composer's Idea mode behind one prompt box/button. |
| Publish kit, derive-shorts, highlights | co-located components under `videos/[vid]/` | Kept; re-homed as cards in the new workspace. |
| Adapters with live providers | ElevenLabs, fal (FLUX + video models), Pexels, Gemini video, script | Kept. Video/image model configs become the source of the user-facing model catalog (§4.3). |
| Telegram + web push | | Kept; per-channel toggles in Settings (decision 6). |

### 2.2 REFACTOR (same capability, new shape)

| Current | Becomes |
|---|---|
| `runPipeline` + `runDirectedStage` (duplicate stage switches + money rails) | One `advanceStage(videoId)` used by the workspace "Continue" action (button *or* chat) and autopilot. |
| `fullAutoGenerate` + `startBuildRun`/build-runner + Auto-Pilot Operator (three autonomy layers) | One autopilot path: `build_runs` + build-runner cron survive; `fullAutoGenerate` becomes a thin wrapper creating a 1-video build run; Operator decision logic folds into build-runner or parks. |
| Per-gate autonomy matrix (`assist`/`copilot`/`autopilot` × 4 gates) on projects | One project-level switch: **Director** (default) / **Autopilot**. Migration maps existing configs onto it. |
| `approvals` gate ceremony + `CheckpointPanel` | "Continue" action per stage; row still written to `approvals` for the learning loop, but it's a click or a chat message, not a review workflow. |
| Video hub page with ~10 co-located panels (`script-review`, `video-gen`, `checkpoint-panel`, `director-console`, …) | The Workspace (§3): chat thread + card stream + stage rail + composer. Panels become card types. |
| VCE + editor feature flags (`vce.ts`, `editor-flags.ts`) as config surface | VCE: flags deleted, invocation automatic (§4.5). Editor/assembly flags: parked (§2.3). |
| `costs` / `intel` / `insights` pages | Parked (decision 4). Spend shows as: cost chips on buttons/cards, a small running-total in the workspace header, and chat queries ("what have I spent this week?"). |

### 2.3 PARK (branch `parked/post-clickmax`, earn-back after 30 days of core-loop use)

Parking = removed from the transition branch but preserved on a dedicated branch with a `PARKED.md` entry describing what it was and what "earning it back" looks like. Nothing is hard-deleted until a 30-day review graduates it.

- **Editor & Assembly flag suite** (`editor-flags.ts`: assembly / proEditor / keyframes / segmentAgent — all currently `false`) and the flag-gated `/edit` + `/assembly` sub-routes.
- **Dashboards:** `costs`, `intel`, `insights` pages; QC review panels, decision trails, provider scoreboards (decision 4 — capabilities keep running, display parks).
- **Clean House** system (core, runner, cron) + **Self-Watch Loop** + **Agentic Harness** self-audit tooling — reconciliation functions (kept) already cover reliability.
- **Speculative learning extras that aren't demonstrably functioning** after the Phase 0 audit: `bandit`, `format-bandit`, `best-of-n`, `taste-profile`, `variant-judge`, `competitive-judge`. (Core loop — qc_reviews, judge_labels, memory, insights, outcome_audits — is KEPT and invisible per decision 4.)
- **Stubs / thin modules:** `twelvelabs.ts`, `translate.ts` / `localization.ts`, `monetization.ts`, `packages/agent` + `packages/intel` queues if the Phase 0 audit shows they're idle.
- Speculative one-shot adapters not referenced by kept paths: `stick-choreographer`, `transition-critic`, `lesson-synthesizer`, and similar (exact list from the Phase 0 dependency audit; VCE-referenced adapters like `art-director`, `visual-bible`, `visual-grounding` are excluded — they're kept with VCE).

---

## 3. Target UX — "the Workspace"

One route replaces the video hub: `projects/[id]/videos/[vid]` renders the Workspace. (Project page becomes a simple grid of video cards + "New video" — ClickMax dashboard style.)

```
┌────────────────────────────────────────────────────────────┐
│ ◈ Project name      [Director ▾]     spend to date  ⚙      │
│ ── Stage rail: Idea ─ Script ─ Assets ─ Assemble ─ Publish │  ← progress, not gates
├────────────────────────────────────────────────────────────┤
│  THREAD + CARD STREAM (one scroll; chat turns interleaved  │
│  with the artifact cards they created or changed)          │
│                                                            │
│   you: make the hook more urgent                           │
│   ┌───────────────┐        agent: rewrote the hook — beat  │
│   │ Script card   │        1 updated, VO marked stale.     │
│   │ hook, beats   │                                        │
│   │ ↻ ✎ QC✓       │   ┌───────────────┐                    │
│   └───────────────┘   │ Beat 4 clip   │                    │
│                       │ ▶ preview     │                    │
│                       │ QC⚠ ↻ Auto-fix│                    │
│                       └───────────────┘                    │
│                                                            │
│                      [ Continue → Assets  · ~$3.20 ]       │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ✦ glass composer                                     │  │
│  │ [Idea|Script|Image|Video|Voice]  [Model ▾] [refs 📎] │  │
│  │ "Type anything — create, change, ask…"   [Send ·$…]  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### 3.1 Chat as the main driver (decision 2)

The composer input is parsed by an **intent router** (Claude tool-use over a typed action registry) that can reach *every* engine capability:

| Intent class | Examples | Routed to |
|---|---|---|
| Create | "make a thumbnail of…", "generate beat 4's clip" | per-asset generation entry points |
| Revise | "punchier hook", "regenerate scene 4 with more tension", "swap the music" | `regenerateBeat/VO/Clip/Thumbnail` with notes |
| Configure | "use Kling for the rest", "make clips 8 seconds", "switch to Autopilot" | composer prefs / project settings |
| Navigate/advance | "continue", "go back to script", "render it" | `advanceStage` / stage targeting |
| Interrogate | "what did QC flag on beat 2?", "what have I spent?", "why this model?" | qc_reviews, ledger, learning-loop memory (read-only answers) |
| Research | "find me 10 ideas in the survival niche" | idea research sweep |

Rules:
- **100% coverage:** every action a button can take has a registered intent; the action registry is the single source both UIs call. A button is sugar over the same action the router invokes.
- **Cost-bearing intents confirm inline** with the USD estimate ("Regenerating 6 clips ≈ $2.10 — go ahead?") unless the user has said "don't ask under $X" (a project setting).
- **Ambiguity degrades gracefully:** unresolved input becomes a note attached to the focused card or, unfocused, a clarifying reply — never an error, never a silent no-op.
- Mode toggles bias the router's parsing and set the granular controls shown (duration/quality for Video, voice picker for Voice, etc.); they never limit what chat can do.

### 3.2 Composer modes

| Mode | Placeholder | Granular controls shown |
|---|---|---|
| Idea | "Paste a title, an angle, or ask for niche research…" | one **Research** button (full YouTube sweep behind it — decision 7) |
| Script | "What should this video be about? Or ask for changes…" | length target, style |
| Image | "Describe the thumbnail or scene…" | model picker, aspect, refs |
| Video | "Describe the scene to generate…" | model picker, duration, quality, start/end frame refs |
| Voice | "Paste narration or pick a beat…" | voice picker, per-beat selector |

**Context-aware targeting:** selecting a card focuses the composer on it ("Editing: Beat 4 clip" chip). Sending re-prompts *that artifact*. With no card selected, the router infers the target from the message, asking one short clarification when genuinely ambiguous.

### 3.3 Cards

Uniform anatomy across types (idea / script / beat / VO / clip / thumbnail / render / publish): preview/content · provider+model chip · cost chip · QC badge (✓ / ⚠ with issue tooltip) · actions: **↻ Regenerate** (optional notes), **✎ Edit**, **Auto-fix** (when QC flags), **⋯** (version history, pin as final).

### 3.4 Continue

One action per stage boundary (button and chat-invokable), showing the estimated USD cost of the next stage. Internally calls `advanceStage` → same status transitions as today, writes an `approvals` row. `NEEDS_REVISION` as a user-facing state disappears; revision is just regenerating cards.

---

## 4. Feature workstreams

### 4.1 Collapse gates into inline iteration (notes 1, 6)
- Statuses and transitions in `state-machine.ts` unchanged; drop only the UX concepts: `CheckpointPanel`, gate review screens, per-gate autonomy config, revision request forms.
- `GATE_FOR_STATUS` retained internally as "stage boundary where Continue is offered."
- Every artifact individually addressable and regenerable (§5.2) — script beats included: each beat is a card (text + visual prompt); regenerating a beat re-runs only that beat and marks downstream VO/clip cards **stale** (one-click refresh, not auto-regenerated — cost stays user-controlled, chat can batch: "refresh everything stale").

### 4.2 Director default, one auto-run path (decision 8: naming stays)
- Project-level switch: **Director** (default; Continue actions, everything visible) / **Autopilot** (build-runner drives; Continues auto-approved by QC score exactly as `build_runs` does today).
- Notifications on Autopilot events: Telegram and web push, each with its own on/off toggle in Settings (decision 6).
- Consolidate to `advanceStage` + build-runner; `runDirectedStage` and `fullAutoGenerate` as separate paths are removed; Operator logic folds in or parks.

### 4.3 Models as a user-facing menu (note 8)
- New `src/lib/models/catalog.ts`: one typed entry per generation model — id, label, logo, one-line description, plain-language pros (ClickMax-style: "realism-per-dollar," "lowest cost in catalog"), supported durations, quality tiers, per-unit cost formula. Sourced from existing `video-models.ts` + FLUX + ElevenLabs adapters.
- Composer model picker renders the catalog (badges: Fast / Cheap / Best); last choice remembered per mode per project (persisted on the project row). Chat can set it too ("use Veo for everything cinematic").
- `model_rates` table mirrors the catalog's cost formulas in SQL — single source for estimates, ledger reconciliation, and the v2 credits system (`unit_credits` column, unused until Phase 5).

### 4.4 QC, evaluation, learning — invisible but active (decision 4)
- **QC:** after each artifact generation, existing stage-review scoring runs scoped to that artifact; stored in `qc_reviews` keyed by `asset_id` (new nullable column). Card badge: green ✓ / amber ⚠ (tooltip lists issues; actions: Auto-fix / Regenerate with notes / Dismiss). That badge is QC's *entire* UI.
- **Learning loop:** judge labels, memory, outcome audits, optimizer cron keep running unchanged, influencing defaults (model selection, prompt templates, QC thresholds). No dashboard. Chat is the window into it: "why did you pick this model?", "what's been working for this niche?" answered from memory/insights tables.
- **Spend visibility without a costs page:** cost chips at point of click, a running total in the workspace header, chat queries against the ledger.
- **Phase 0 audit gate:** each learning module gets a verdict — *functioning* (produced data that changed a default/decision in the last 60 days), *dormant*, *broken*. Functioning → keep; dormant/broken → park list. You review the verdict table before anything moves.

### 4.5 Visual Craft Engine → invisible under-layer (decision 5)
- Remove the five user-facing VCE flags; the engine decides internally when to run each stage (bible / router / refine / grounding / compositor) as part of `runScripting` / `runAssetGeneration`.
- Phase 1 includes a **VCE activation audit**: verify each stage runs green on the golden-path test, measure cost + latency + QC delta per stage, then set per-stage internal policy (always / per-tier / off) in one config in the engine, not in project settings.
- Visual-bible output stays stored on the video row and feeds prompts as today; no UI beyond its effect on results. Chat can surface it on request ("show me the visual bible").
- VCE-supporting adapters (`art-director`, `visual-bible`, `visual-grounding`, `seed-vision`, etc.) come off the park candidates list.

### 4.6 Small delights (note 5)
- **Cost on the button:** `estimateCost(action, model, params)` from `model_rates`; rendered on Send and Continue and card chips (USD — decision 3). Estimate-vs-actual drift logged for the learning loop.
- **Project instructions:** `projects.instructions` free text (tone, colors, audience, pacing) injected into every prompt path (scripting system prompt, image/video prompt prefix, VO style hints). Editable panel in the workspace header.
- **References:** surface existing `visual_refs` as composer attachments (📎 upload/paste, chips) feeding image/video generation.
- Dictation (speech-to-text prompt input) — cheap, optional, last.

### 4.7 Idea mode with full research, simple face (decision 7)
- The full YouTube niche-research sweep (Data API, scoring, HIGH_VALUE flags) stays intact behind the Idea composer: one prompt box ("survival stories for retirees") and/or one **Research** button.
- Results arrive as Idea cards (title, angle, score, source stats) in the stream; "make this one" (chat or button) seeds the Script stage.
- All sweep configuration (depth, region, competitor lists) moves to sensible defaults + chat overrides — no settings surface.

### 4.8 Frictionless entry + growth loops (note 7) — Phase 5, speced not built
Deferred per decision 1, foundations laid earlier. When triggered:
1. Multi-tenant auth + RLS rework; platform API keys + metering.
2. **Credits v2** (decision 3): flip on `unit_credits` in `model_rates`, credit balance UI, Stripe subscriptions.
3. `/try/:mode` anonymous funnel: localStorage draft (prompt + refs) → sign-up → draft becomes first project (ClickMax's `funnelDraft` / `composerAuthSeed` pattern).
4. 5-question onboarding.
5. Growth surfaces: public portfolio route, Discover gallery (opt-in publish per artifact), template catalog, SEO tool-landing pages.

---

## 5. Data model changes (deliberately minimal)

1. `projects.instructions text` — free-text context.
2. `projects.workspace_mode text default 'director'` — director | autopilot (supersedes per-gate autonomy; migration maps old configs).
3. `projects.composer_prefs jsonb` — last model/duration/quality per mode; cost-confirmation threshold.
4. `projects.notify_prefs jsonb` — `{telegram: bool, webpush: bool}` (decision 6).
5. `assets.parent_asset_id uuid`, `assets.version int`, `assets.superseded_at` — take/version history per artifact; current = latest non-superseded, pinnable.
6. `assets.stale boolean default false` — set when an upstream beat changes.
7. `qc_reviews.asset_id uuid null` — asset-scoped QC alongside existing gate-scoped rows.
8. `workspace_messages` — the chat thread (role, content, resolved intent, affected asset/video ids) so the stream is replayable and the learning loop can mine it.
9. `model_rates` — model id, unit, unit_cost_usd, unit_credits (unused until v2).
10. No changes to `videos` statuses, `scripts`, `clip_jobs`, `build_runs`, ledger.

---

## 6. Phase plan

Each phase ends with the app deployed and usable; no long-lived broken states.

**Phase 0 — Audit & safety net (small)**
- Dependency/usage audit producing the Keep/Park verdict table (§2.3, §4.4) for sign-off. Deliverable: `PARKED.md` draft + verdict table.
- Create `parked/post-clickmax` branch. Tag current main.
- Golden-path smoke test: one video end-to-end (mock providers) in CI so the refactor can't silently break the spine.

**Phase 1 — Engine seams (backend only, UI untouched)**
- Extract `advanceStage`; re-point existing UI + build-runner to it. Remove duplicate stage-switch paths.
- Per-asset regeneration entry points: `regenerateBeat`, `regenerateVO(beat)`, `regenerateClip(beat)`, `regenerateThumbnail(variant)` — versioned assets (§5) + asset-scoped QC.
- **Action registry**: every engine capability registered as a typed action (name, params, cost estimator, executor). This is the substrate both chat and buttons call.
- `estimateCost` + `model_rates` + `catalog.ts`.
- VCE activation audit + internal policy config (§4.5).
- Consolidate autonomy layers onto build-runner.

**Phase 2 — The Workspace (the big UI phase)**
- New workspace page: stage rail, thread + card stream, Continue, card focus + history.
- Glass composer with 5 modes, model picker, reference attachments, USD-labeled Send.
- **Intent router v1** over the action registry (create / revise / configure / advance / interrogate / research), with inline cost confirmation and graceful-ambiguity rules (§3.1). Ships *with* the workspace, since chat is the main driver.
- Project instructions field wired into all prompt paths.
- Old hub panels retired as cards reach parity; gate screens removed last behind a "classic view" flag for one release.

**Phase 3 — QC surfacing + Autopilot**
- Asset-level QC badges + Auto-fix + Regenerate-with-notes on cards; chat interrogation of QC/ledger/memory.
- Director/Autopilot switch in workspace header; Telegram + web push toggles in Settings; flows re-tested.
- Park the `costs`/`intel`/`insights` pages once chat + header spend cover their daily use.

**Phase 4 — Polish & parking execution**
- Execute the approved park list (move to branch, `PARKED.md` finalized).
- Intent-router hardening pass: transcript review of real usage → close the top misrouted/unhandled intents until chat truly covers 100%.
- Dictation input; stale-cascade UX refinement; empty states; keyboard shortcuts; ClickMax-style dark glass styling pass (align with `Colourway-v2.md`).
- **Start the 30-day clock:** you use only the new loop for daily channel work.

**Phase 5 — SaaS & growth (only after the 30-day review)**
- §4.8 items, sequenced auth → credits v2 → funnel → growth surfaces.

**30-day earn-back review:** for each parked item, either (a) a concrete moment occurred where you missed it → un-park with a UX home in the new workspace, or (b) it stays parked another 30 days, or (c) it graduates to deletion. Review notes appended to `PARKED.md`.

---

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Refactoring the 4,700-line engine breaks the working pipeline | Phase 0 golden-path CI test before any engine edits; Phase 1 is seam-extraction only, verified against the test. |
| Intent router misfires on cost-bearing actions | All cost-bearing intents confirm inline with USD estimate (threshold configurable); router only invokes registered typed actions — it can never construct raw engine calls. |
| Chat coverage gaps frustrate ("it can't do X by chat") | Registry-first rule: a capability ships only as a registered action, so chat coverage is structural; Phase 4 transcript-driven hardening closes routing gaps. |
| Beat regeneration cascades cost | Stale marking instead of auto-regeneration; user pays per click (or per confirmed chat batch), cost shown at the point of action. |
| VCE stages silently add cost/latency once always-available | Phase 1 activation audit sets per-stage policy from measured QC delta vs cost; policy lives in one engine config, revisited with ledger data. |
| Losing QC/learning value during the UX move | Capabilities never turn off at any phase; only dashboards park. Park list requires the Phase 0 verdict table + your sign-off. |
| "Classic view" flag lingers | Hard removal one release after Phase 2 unless a blocking gap is filed. |
| Scope creep toward SaaS mid-transition | Phase 5 items speced precisely so they can be declined until the review date. |

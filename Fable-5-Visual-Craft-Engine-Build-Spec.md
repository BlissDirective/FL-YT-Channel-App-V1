# Fable 5 — Visual Craft Engine (VCE) Build Spec

**Status:** Approved concept — ready to build
**Date:** 2026-07-15
**Owner:** Operator (Chris) · Spec by Fable 5 session
**Branch:** `claude/manual-operator-pipeline-mode-ie8mpw` (spec doc); implementation branches per phase

---

## 0. Goal

Make every asset's images and videos **more relevant to the actual script**,
**more visually striking**, and **cheaper** — by having the Master Video
Development Agent (MVDA) plan visuals as a director would: extract the video's
real subjects once, decompose each beat into shots, pick the cheapest medium
that satisfies each shot, ground factual beats in real references, refine
per-beat against critics, and composite generative footage under a programmatic
Remotion graphics layer.

Five systems, one engine:

1. **Visual Bible** — continuity conditioning from the whole script.
2. **Medium Router** — cost-aware per-shot medium selection.
3. **Grounded Generation (RAG visuals)** — seed factual beats from real references.
4. **Per-Beat Refine Loop** — critic-driven targeted prompt rewrites, cheap-first.
5. **Remotion Compositor** — expanded scene vocabulary + overlay layer over generative clips.

---

## 1. Grounding — what already exists (build on, don't rebuild)

| Capability | Where | Notes |
|---|---|---|
| **Text→image** | `adapters/fal.ts` `generateImage` | FLUX schnell ($0.003) / dev ($0.025). |
| **Image→video & text→video** | `adapters/video-models.ts` + `fal.ts` `generateVideo` | Seedance 2.0 (fast/std), Kling v2.5-turbo, Veo 3.1, LTX, Wan — i2v + t2v via fal. |
| **Art direction agent** | `adapters/art-director.ts` | `directShots`, `assessVisualPrompt`, `assessPromptRelevance`, `refineOneShot`. |
| **Beat relevance critic** | `adapters/beat-relevance.ts` | `verifyBeatVisual` scores narration↔visual match. |
| **Seed-still critic** | `adapters/seed-vision.ts` | `critiqueSeedStill` before paying to animate. |
| **Prompt hygiene** | `packages/core/visual-prompt.ts` | `buildVisualPrompt`, `scrubVisualPrompt`, `NO_TEXT_SUFFIX`. |
| **Programmatic animation (Remotion)** | `packages/render/` | Stick Studio (`StickScene`), data-viz (`ChartReveal`, `LottieInsert`), kinetic highlights, EDD compositions. |
| **Stick choreographer** | `adapters/stick-choreographer.ts` | `choreographStickScenes` — beats → scene spec today. |
| **Data-viz agent** | `adapters/dataviz.ts` | `proposeCharts`, `verifyChartFacts`, `planVerifiedCharts`. |
| **Cost tiers** | `adapters/auto-tiers.ts` | `AutoTier`, `tierJobForSection`, `TIER_PLAN_COST`, `estimateTierCost`. |
| **Assets model** | `assets` table | rows `kind` (still/clip/vo/sfx), `beat_index`, `meta`, `cost_usd`. |
| **Money rails** | `pipeline/ledger.ts`, `quality-gates.ts` | `checkBudget`, `recordCost`, `failClosedBlocksSpend`, monthly caps. |

**Design principle:** VCE is an *orchestration + conditioning* layer over these
adapters. New agents produce **structured specs**; existing adapters execute
them. Money rails and Director-Mode isolation are untouched — every VCE spend
routes through `checkBudget`/`recordCost`, and every stage runs the same in
both pipeline modes (the operator can drive each VCE step from the Director
console; the autonomous engine runs them inline).

---

## 2. Data model (Supabase migrations)

### 2.1 `videos.visual_bible` (V1)

```sql
alter table videos add column visual_bible jsonb;
-- {
--   "subjects":   [{ "id":"alphafold", "label":"AlphaFold protein model",
--                    "descriptor":"ribbon-diagram 3-D protein structure, teal on graphite" }],
--   "setting":    "modern computational-biology lab / data-center",
--   "palette":    ["#0E7C86","#1B1F24","#E8E6DF"],
--   "styleContract":"clean lab-tech realism; no generic stock cliché; shallow DoF",
--   "motifs":     ["folding animation","pipeline flow","molecular grids"],
--   "avoid":      ["generic DNA double-helix","test tubes","microscope clichés"],
--   "version": 1, "model": "claude-…", "createdAt": "…"
-- }
```

### 2.2 `assets` extensions + shot plan (V2)

```sql
-- Per-beat shot plan: how each beat is decomposed and which medium each shot uses.
alter table videos add column shot_plan jsonb;
-- { beats: [ { beatIdx, shots: [ { id, intent, medium, shotType, cameraMove,
--             durationSec, estCostUsd, reason } ] } ], version, planCostUsd }

-- Provenance/telemetry on generated assets (nullable; back-compatible).
alter table assets add column medium text;         -- 'remotion'|'still'|'i2v'|'t2v'|'stock'|'chart'|'stick'
alter table assets add column relevance_score numeric;  -- last beat-relevance score
alter table assets add column grounded_ref jsonb;  -- { source, url, license } when RAG-seeded
```

### 2.3 `visual_refs` (V4 — grounded generation)

```sql
create table visual_refs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  beat_idx int,
  source text not null,          -- 'stock'|'intel-frame'|'operator-upload'|'source-image'
  url text not null,
  license text,                  -- classifyLicense() verdict
  attribution text,
  created_at timestamptz not null default now()
);
create index on visual_refs (video_id, beat_idx);
```

RLS on all: owner-scoped, mirroring `qc_reviews` / `assets`.

### 2.4 `beat_refine_runs` (V3 — audit of the refine loop)

```sql
create table beat_refine_runs (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  beat_idx int not null,
  attempt int not null,
  from_score numeric, to_score numeric,
  critic_note text, prompt_before text, prompt_after text,
  medium text, cost_usd numeric,
  created_at timestamptz not null default now()
);
create index on beat_refine_runs (video_id, beat_idx);
```

---

## 3. The five systems

### 3.1 V1 — Visual Bible (continuity conditioning)

**What.** Before any visual generation, a `buildVisualBible` agent reads the
**full script** once and emits the `visual_bible` blob (§2.1): the concrete
subjects, setting, palette, style contract, recurring motifs, and an **avoid
list** of clichés. Every downstream image/video prompt is conditioned on it via
a new `applyBible(prompt, bible)` in `visual-prompt.ts`, which injects subject
descriptors + style contract and appends the avoid-list to the negative prompt.

**Why.** Fixes the two root relevance failures: generic cliché ("DNA
double-helix reads as generic biology") and beat-to-beat drift (character/
palette/style inconsistency). One extra LLM call per video (~$0.01), amortized
across every beat.

**Fits.** `runScripting` (or a new `runVisualBible` step after `SCRIPT_READY`)
produces the bible; `makeBeatClip` / `directShots` consume it. Operator can view/
edit the bible in the Director console visuals stage; a "Regenerate bible" action
re-derives it. Pinned edits survive re-renders.

**Agents/functions.** `adapters/visual-bible.ts` → `buildVisualBible(opts)`;
`visual-prompt.ts` → `applyBible(prompt, bible)`, `bibleNegatives(bible)`.

### 3.2 V2 — Shot decomposition + Medium Router

**What.** A `planShots` agent decomposes each beat into 1–3 **shots**, each with
an *intent* (establish / detail / motion / data / concept / quote), a `shotType`,
a camera move, and a duration. A **pure** `routeMedium(shot, budget, tier, bible)`
then assigns the cheapest medium that satisfies the intent:

| Intent | Preferred medium (cheap → premium) |
|---|---|
| concept / comparison / number / process | **Remotion motion-graphic** (~free) |
| data / statistic | **Remotion chart** (`planVerifiedCharts`, verified) |
| static subject | **FLUX still** + Ken Burns ($0.003–0.025) |
| subtle motion | **Seedance Fast i2v** (cents) |
| hero / cinematic | **Kling / Veo i2v** (premium) |
| quote / callout | **Remotion quote card** (~free) |

The router respects the video's `max_video_usd` and the tier's `TIER_PLAN_COST`
envelope, spending premium only on beats flagged `hero`. Output → `shot_plan`.

**Why.** Biggest cost + relevance lever: money goes only to shots where motion/
photorealism earns it; everything explanatory becomes crisp, cheap, on-brand
motion graphics.

**Fits.** Sits between script approval and asset generation; `runAssetGeneration`
consumes `shot_plan` instead of a flat one-image-per-beat loop. Reuses
`auto-tiers` for the budget envelope and `estimateClipCost`/`estimateTierCost`.

**Functions.** `adapters/shot-planner.ts` → `planShots(beats, bible, tier)`;
`pipeline/medium-router.ts` → **pure** `routeMedium(shot, ctx)`,
`planCost(shotPlan)`.

### 3.3 V3 — Per-Beat Refine Loop (critic-driven)

**What.** For each generated shot, run the existing critics
(`verifyBeatVisual`, `critiqueSeedStill`) and, on a sub-floor miss, feed the
critic's **specific** note back to `refineOneShot`, which rewrites *that* prompt
with a targeted fix and re-rolls — **cheap-first**: perfect the FLUX still, and
only animate (i2v) a still that clears `seedVisionFloor`. Bounded by attempts +
per-beat spend cap; every attempt logged to `beat_refine_runs`.

**Why.** Turns "close enough" into "closely related." The critic already exists
and scores; V3 closes the loop with a targeted rewrite instead of a blind re-roll.

**Fits.** Extends the existing seed-vision re-roll and beat-relevance re-roll in
`runAssetGeneration` into one bounded loop, gated by `director_micro_loops`
(Director) / autofix config (autonomous). Reuses `fixerModelForScore` banding.

**Functions.** `pipeline/beat-refine.ts` → `refineBeatVisual(beat, critique, ctx)`
(orchestrator), `shouldRefine(score, cfg)` (pure), `nextPrompt(prompt, note)`
(pure prompt-merge).

### 3.4 V4 — Grounded Generation (RAG visuals)

**What.** For beats the planner marks `factual` (named entity, product, place,
data), a `groundBeat` step pulls a **real reference** — licensed stock
(`searchStockPhotos`), a frame from the Intel competitor scan (`video-intel`),
an operator upload, or a source image (`classifyLicense`) — stores it in
`visual_refs`, and uses it as the **i2v seed / style reference** so the clip is
grounded in reality, not hallucinated.

**Why.** Some subjects must look *right* (a real product, a real place, a real
chart). Grounding beats hallucination for factual content and raises perceived
production value.

**Fits.** Runs inside V2's plan for `factual` shots; the ref becomes the i2v
seed instead of a FLUX still. Licensing enforced via existing `classifyLicense`;
attribution flows to the publish kit's credits block.

**Functions.** `adapters/visual-grounding.ts` → `findReference(beat, project)`,
`groundedSeedFor(shot)`; reuses `sources.ts`, `stock.ts`, `video-intel`.

### 3.5 V5 — Remotion Compositor (scene vocabulary + overlay layer)

**What.** Two parts.

- **(a) Expanded scene vocabulary.** New Remotion scene archetypes the agent can
  emit as specs (like `StickScene` today): `NumberTicker`, `ComparisonTable`,
  `ProcessFlow`, `AnimatedMap`, `QuoteCard`, `IconGrid`, `Timeline`,
  `StatCallout`. Each is a typed composition in `packages/render` + a spec type
  in `packages/core`. The MVDA authors the spec from the beat; Remotion renders
  it — near-free, on-brand, information-dense.
- **(b) Overlay compositor.** Generative clips (Seedance/Kling/Veo) become the
  **base layer**; the MVDA authors an `overlaySpec` (kinetic captions, data
  callouts, lower-thirds, brand bug, transitions) that Remotion composites on
  top at render. Photoreal base + programmatic graphics = striking, cheap,
  on-brand.

**Why.** Remotion is a deterministic *code renderer*, not a diffusion model — it
can't imagine photoreal footage, but it excels at motion graphics and
compositing. Using it as the assembly/graphics layer over generative footage is
the single biggest quality-per-dollar unlock.

**Fits.** Extends the existing `VideoComp`/EDD render path; overlay spec rides in
`assets.meta` and the edit document (EDD). Golden-frame tests already exist for
compositions (`tests/edd-golden.test.ts` pattern).

**Functions.** `packages/core` scene-spec types + `packages/render` compositions;
`adapters/scene-author.ts` → `authorScenes(beats, bible)`,
`authorOverlay(clip, beat, bible)`.

---

## 4. How it assembles (the pipeline)

```
SCRIPT_READY
  │
  ├─ V1  buildVisualBible(script) ─────────────→ videos.visual_bible
  │
  ├─ V2  planShots(beats, bible, tier) ────────→ videos.shot_plan
  │        └─ routeMedium(shot) per shot        (medium + cost + reason)
  │
  ▼ GENERATING_ASSETS  (per shot, driven by shot_plan)
  │   ├─ medium=remotion|chart|stick → V5 authorScenes → Remotion spec
  │   ├─ medium=still|i2v|t2v        → applyBible(prompt) → FLUX/Seedance/Kling
  │   │       └─ V4 factual? → findReference → grounded i2v seed
  │   └─ V3 refineBeatVisual: critic → targeted rewrite → re-roll (cheap-first)
  │
  ▼ ASSEMBLING → render farm
  │   └─ V5(b) authorOverlay → Remotion composites captions/callouts over clips
  ▼ FINAL_REVIEW
```

Money rails bind at every paid step; Director Mode lets the operator run each
step as a console action (Generate/Revise/Re-render) and see the shot plan +
bible in the visuals-stage workspace.

---

## 5. Build phases (each ships independently; autonomous + Director safe)

Every phase is feature-flagged (`app_settings.vce` → per-system on/off, default
**off** until proven) so it can land dark, be validated in mock, then enabled.
Each branches on nothing mode-specific — VCE runs identically in both pipeline
modes.

### V1 — Visual Bible
- **Build.** Migration §2.1; `adapters/visual-bible.ts`; `applyBible`/
  `bibleNegatives` in `visual-prompt.ts`; wire into `runScripting` tail +
  `makeBeatClip`; Director console "Visual bible" card (view/edit/regenerate).
- **Testing.**
  - *Unit (pure):* `applyBible` injects subject descriptors + style contract and
    merges the avoid-list into negatives; `bibleNegatives` dedupes; idempotent
    on an empty bible (no-op → today's prompt).
  - *Adapter (mock):* `buildVisualBible` returns a well-formed blob for a sample
    script; mock mode yields a deterministic stub (zero spend).
  - *Integration:* two beats of the same video share subject descriptors +
    palette in their final prompts (consistency invariant).
  - *Accept:* a script mentioning "protein folding / AlphaFold" yields a bible
    whose `avoid` includes generic DNA/microscope clichés, and every beat prompt
    carries the subject + style contract.

### V2 — Shot decomposition + Medium Router
- **Build.** Migration §2.2; `adapters/shot-planner.ts`; **pure**
  `pipeline/medium-router.ts`; `runAssetGeneration` consumes `shot_plan`;
  Director console shows the plan (per-shot medium + est cost) with a
  "Re-plan shots" action.
- **Testing.**
  - *Unit (pure, the crux):* `routeMedium` truth table — every intent maps to its
    cheapest satisfying medium; a `hero` flag escalates to cinematic; a tight
    budget downshifts premium→still→remotion; `planCost(shotPlan)` never exceeds
    the tier/`max_video_usd` envelope.
  - *Property:* random beat/intent/budget fuzz never returns a medium whose
    estimated cost breaches the remaining budget.
  - *Integration (mock):* a 6-beat script produces a plan where explanatory beats
    route to Remotion and only `hero` beats route to i2v; total planned cost ≤ tier cost.
  - *Accept:* a 4-min explainer plans mostly free Remotion/chart shots with 1–2
    premium hero beats, and the summed estimate is within the tier envelope.

### V3 — Per-Beat Refine Loop
- **Build.** Migration §2.4; `pipeline/beat-refine.ts`; fold the existing
  seed-vision + beat-relevance re-rolls into `refineBeatVisual`; gate by
  `director_micro_loops`/autofix cfg; log `beat_refine_runs`.
- **Testing.**
  - *Unit (pure):* `shouldRefine` respects floor + attempt cap + spend cap;
    `nextPrompt` merges the critic note without dropping the bible conditioning.
  - *Integration (mock, stubbed critic):* a beat scoring below floor triggers ≤N
    targeted rewrites, stops when it clears the floor or the cap, and logs each
    attempt with from/to score; **never animates a still below `seedVisionFloor`**
    (cheap-first invariant).
  - *Money rail:* budget-exhausted mid-loop halts with a held reason; fail-closed
    (paid provider live, QC mocked) blocks the loop.
  - *Accept:* a deliberately off-topic beat improves its relevance score across
    the loop in mock and settles; cost never exceeds the per-beat cap.

### V4 — Grounded Generation
- **Build.** Migration §2.3; `adapters/visual-grounding.ts`; plug into V2's
  `factual` shots; license via `classifyLicense`; attribution → publish kit.
- **Testing.**
  - *Unit (pure):* `factual`-intent shots request grounding; non-factual don't;
    a ref without a clear license is rejected (never used).
  - *Integration (mock):* a factual beat selects a stock/intel ref, stores a
    `visual_refs` row, and the i2v call uses it as the seed (asset
    `grounded_ref` populated); attribution appears in the credits block.
  - *Isolation:* grounding never fires for pure-concept beats (no wasted lookups).
  - *Accept:* a beat naming a real product/place seeds from a licensed reference
    and the published credits list it.

### V5 — Remotion Compositor
- **Build.** Scene-spec types in `packages/core`; new compositions in
  `packages/render` (NumberTicker, ComparisonTable, ProcessFlow, QuoteCard,
  StatCallout, IconGrid, Timeline, AnimatedMap); `adapters/scene-author.ts`;
  overlay spec on generative clips composited at render.
- **Testing.**
  - *Golden-frame (per archetype):* each composition renders deterministically at
    a pinned frame (mirrors `tests/edd-golden.test.ts` / `edd-render-units`),
    guarding layout/units regressions.
  - *Unit (pure):* `authorScenes` maps a beat intent to a valid scene spec that
    passes the composition's prop schema; `authorOverlay` produces a caption/
    callout track aligned to VO word timings (reuse `highlight-timing`).
  - *Integration (mock):* a data beat renders a verified chart (facts checked via
    `verifyChartFacts`); a generative clip gets a kinetic-caption overlay layer.
  - *Accept:* a comparison beat renders a clean animated table with zero AI-video
    spend; a hero clip ships with on-brand captions + a data callout overlaid.

### V6 — Integration, cost dashboard, operator controls
- **Build.** End-to-end wiring behind the flags; a per-video **Visual plan**
  panel in the Director console (bible + shot plan + per-shot medium/cost/critic
  score, each with Revise/Re-render/Re-ground/Re-plan); a project **visual cost
  mix** readout (how spend split across mediums).
- **Testing.**
  - *Integration (mock, full):* idea→render drives V1–V5 with zero credentials
    and lands a complete cut; the plan panel reflects every shot's medium + score.
  - *Regression:* with all VCE flags **off**, the pipeline behaves byte-identically
    to today (the safety invariant — like Director Mode's isolation suite).
  - *Accept:* an operator can, from the console, see and override every visual
    decision for an asset, and the cost readout shows the medium mix.

---

## 6. Cross-cutting testing (the VCE safety suite)

Mirrors the Director-Mode mode-isolation approach — one suite that must stay
green every phase:

1. **Flag-off invariance.** With every `vce.*` flag off, generation output +
   spend match the pre-VCE baseline exactly (golden snapshot of a mock render).
2. **Cost never exceeds plan.** For any video, summed actual `assets.cost_usd`
   ≤ `shot_plan.planCostUsd` ≤ tier/`max_video_usd` envelope (property test over
   fuzzed plans + a live-adapter integration bound).
3. **Money-rail parity.** `checkBudget`/`failClosedBlocksSpend`/kill-switch fire
   inside every new paid step (V2 gen, V3 refine, V4 i2v) exactly as in the
   legacy path.
4. **Mock-first.** Every new adapter has a deterministic mock ($0) so the whole
   engine runs end-to-end with no credentials (the repo's core invariant).
5. **Determinism.** Pure planners (`routeMedium`, `shouldRefine`, `authorScenes`
   spec mapping) are referentially transparent — same inputs → same spec — and
   unit-pinned.
6. **Golden frames.** Every Remotion archetype has a pinned-frame test so a
   composition change can't silently corrupt output.

---

## 7. Cost model (per beat, indicative)

| Medium | Setup | Motion | Notes |
|---|---|---|---|
| Remotion scene / chart / overlay | ~free (farm compute) | — | Explanatory, on-brand, deterministic |
| FLUX still (schnell) | ~$0.003 | Ken Burns (Remotion) | Cheapest photoreal-ish |
| FLUX dev (hero still) | ~$0.025 | — | Premium seed |
| Seedance 2.0 Fast (i2v) | seed + cents | short clip | Cheap real motion |
| Kling v2.5-turbo (i2v) | seed | $0.35/5s + $0.07/s | Cinematic |
| Veo 3.1 (i2v/extend) | seed | premium | Hero/long |

The Medium Router's whole job is to keep the *mix* mostly free/cheap and reserve
premium for 1–3 hero beats per video — striking **and** affordable.

---

## 8. Non-goals (v1)

- No new provider integrations beyond what fal already exposes (Seedance/Kling/
  Veo/LTX/Wan) — VCE orchestrates existing models.
- No change to money rails, Director-Mode isolation, or autonomous thresholds.
- No fully-generative "photoreal from a bare prompt via Remotion" — Remotion
  renders authored specs, not diffusion output (§3.5 rationale).
- No audio/VO redesign — VCE is visuals only.

---

## 9. Suggested build order

V1 (bible) → V2 (router) — these two deliver most of the relevance + cost win.
Then V3 (refine) and V5 (compositor scenes) in either order, V4 (grounding)
alongside V2's factual path, V6 (integration + operator panel) last. Each phase:
flag-dark → mock tests green → cross-cutting suite green → enable.

# Fable5 — Editor & Assembly Revision Spec (DRAFT for approval)

**Status:** Draft plan for operator review. No code is built until this is
approved. Governs a curated-pro upgrade to the `/edit` timeline **and** a new
granular **Assembly / Storyboard** screen for composing a video before it
renders — both as human + agent co-editable views over the one `EditDocument`.

---

## 0. Locked decisions (operator sign-off)

| # | Decision | Locked answer |
|---|----------|---------------|
| D1 | Editor ambition | **Curated pro for faceless video** — the ~20% of NLE power that matters, done well, plus the agent-peer model no NLE has. Not full-Premiere parity. |
| D2 | Build approach | **`EditDocument` stays the single source of truth.** Study the best OSS web editor as a **reference** and build our own timeline/UX around our human+agent system, our current systems, and the document. Reference, not fork. |
| D3 | Sequencing | **Assembly / Storyboard screen first**, then the pro-editor upgrades. |
| D4 | Assembly depth (v1) | **Full granularity, including `sequence` segments** (e.g. 3 Flux stills with Ken Burns + kinetic captions + inter-still transitions). |

### Reference editor (D2)

- **Primary reference — `openvideodev/react-video-editor`** (formerly
  designcombo; TypeScript, **Remotion-based**, CapCut/Canva-style). Chosen
  because its render layer is Remotion — the same engine we use — so its
  timeline ↔ player ↔ composition data flow maps almost 1:1 onto our
  `EditDocument → Remotion` pipeline. **We study it; we do not fork it** (its
  full editor is commercial — verify license before copying any code).
- **Secondary UX references —** `Augani/openreel-video` (browser CapCut alt) and
  the OpenCut project for trim-handle / snapping / keyboard interaction patterns.
- **What we take:** interaction patterns and timeline-rendering approach.
  **What we keep:** our `EditDocument`, `edd-ops`, `edd-compile`, versioning,
  MVDA tools, cost rails.

---

## 1. Architecture — one document, two views, two authors

The non-negotiable invariant (already true today, and the reason human + agent
can be peers):

> **Every edit — human or agent, planning or editing — is an operation on
> `EditDocument` (or the new `ShotPlan`/segment layer that compiles into it).**
> If a capability can't be expressed as an op, it doesn't ship.

```
Script → [Assembly / Storyboard]  → generate assets → edd-compile → [/edit timeline] → render → publish
          PLAN granularity                                           FRAME granularity
          segments · mediums · prompts · motion · cost               clips · trims · keyframes · captions
          (this spec, built first)                                   (this spec, upgraded second)
```

- The **Assembly screen** edits a **`ShotPlan` / segment list** (intent, before
  assets exist). "AUTO" = the V2 medium-router proposes the whole plan; the
  human refines. On generate, assets are produced and `edd-compile` turns the
  plan into an `EditDocument`.
- The **`/edit` timeline** edits the realized `EditDocument` (frame level).
- Both are human + agent co-editable; both share vocabulary (mediums, motion
  keyframes, transitions, caption styles).

### What already exists (reuse, don't rebuild)

- `EditDocument` single source of truth; versioning (v3 compiler · v4 agent ·
  v5 you); `diffSummary`.
- `MotionSpec` **already includes a `keyframes` variant**
  (`MotionKeyframe { t, scale, x, y, ease }`) — the pro Ken-Burns foundation is
  in the model; it needs an editing UI, a compile path, and an agent tool.
- `edd-ops`: `retimeClip`, `setTrim`, `swapClipAsset`, `setTransition`,
  `setMotion`, `kenBurnsPreset`, `setTokenEmphasis`, `setPageStyle`,
  `addOverlay`, audio ducking, etc.
- `EddAspect` `16:9 | 9:16` and `EddFormat` `long | short` — vertical/short-form
  already modeled (also unblocks the TikTok/IG expansion).
- V2 `ShotPlan` / `routeMedium` / `planCost`; VCE compositor scene vocabulary;
  MVDA agent tools + frame-critic judge; the Remotion render farm;
  `@remotion/player`.

---

## 2. New data model — the `Segment`

The shared granular unit for **both the human and the agent**. A beat is an
ordered list of segments; a segment is one contiguous stretch of screen time
with a single medium (or a `sequence`/`scene` of children).

```ts
type Segment = {
  id: string;
  beatIdx: number;
  startSec: number;
  endSec: number;
  kind: "clip" | "sequence" | "scene";      // scene = compositor (quote card, stat ticker…)
  medium: "still" | "ai-clip" | "stock" | "dataviz" | "stick" | "remotion";
  model?: string;                            // "seedance-2.0-fast" | "flux-dev" | "kling-2.6" | …
  prompt?: string;
  refs?: VisualRef[];                        // grounding (V4)
  motion?: MotionSpec;                       // keyframes (Ken Burns) | preset | none
  captions?: { style: CaptionStyle; tokens?: CaptionToken[] };
  transitionIn?: Transition;
  children?: Segment[];                      // for "sequence": the sub-stills
  estCostUsd: number;
  status: "planned" | "generating" | "ready" | "failed";
};
```

`ShotPlan` (V2) generalizes from one shot-per-beat to an ordered `Segment[]`
per beat. `planCost` sums `estCostUsd`. `edd-compile` gains a
`segmentsToDocument()` path that realizes segments → `VideoClip`s / compositor
scenes / overlays in the `EditDocument`.

### The operator's worked example, in the model

```
Beat 1  (0–30s)
├─ 1a  0–15s   clip      still    flux-dev         motion=heroHold      captions
└─ 1b  15–30s  clip      ai-clip  seedance-2.0-fast motion=none(native) captions
Beat 2  (30–48s)
└─ 2a  30–48s  sequence  captions=kinetic
   ├─ still A  flux-dev  motion=kenBurns(zoom-in)   transitionIn=cut
   ├─ still B  flux-dev  motion=kenBurns(pan-left)  transitionIn=crossfade 0.4s
   └─ still C  flux-dev  motion=kenBurns(zoom-out)  transitionIn=crossfade 0.4s
```

This is the exact granularity both you and the MVDA read and write.

---

## 3. Assembly / Storyboard screen (built first — D3)

A new stage/screen between Script and Render. A filmstrip/timeline of beats,
each sub-dividable into `Segment` cards.

**Interactions (human):**
- **Split** a beat at a time cursor → two segments.
- **Assign medium** from a palette (Still · Seedance · Kling · Stock · Chart ·
  Motion-graphic), pick a model, write/confirm the prompt.
- **Set motion** (keyframe Ken Burns curve or preset) and **caption style**.
- **Sequence segment** (D4): open a mini-composer — N stills, per-still Ken
  Burns keyframes, inter-still transitions, kinetic captions (maps to the VCE
  compositor scene vocabulary).
- **Live cost** for the whole plan against the budget cap (`planCost`).
- Each card shows a **thumbnail/preview, medium+model, motion, captions, cost,
  status**.

**Interactions (agent — same surface):**
- **AUTO** = the V2 router proposes the full segment plan (hero beats → premium
  i2v, explainers → free motion-graphics, etc.).
- Agent proposals arrive as a **diff** (proposed segment set) the human
  accepts/rejects per-segment — the peer model, visible.

**On "Generate":** produce assets per segment (mock-first; real via fal/FLUX/
Seedance behind keys), then `segmentsToDocument()` → `EditDocument` → flows into
`/edit`.

---

## 4. Pro-editor upgrades (built second — D1)

Curated pro capabilities, each one an `edd-op` (⇒ an agent tool, §5):

| Capability | Adds | Op / tool |
|---|---|---|
| **Frame-accurate preview** | `@remotion/player` wired to the playhead; J/K/L transport, frame-step, in/out points | UI over existing doc |
| **Keyframe editor** | Arbitrary Ken Burns / opacity / position curves (model already supports `keyframes`) | `setKeyframes` / `addKeyframe` |
| **Ripple / roll / slip / slide trim** | Pro gapless trim modes (gapless retime exists) | extend `setTrim` |
| **Speed ramps** | Slow-mo / speed-up per clip | `setSpeed` |
| **Waveforms + audio mixing** | See VO/music amplitude; duck visually (ducking op exists) | UI |
| **Snapping, markers, guides** | Snap to beats/words; drop markers | `addMarker` |
| **Fine-grained undo/redo** | Per-keystroke local undo (distinct from version snapshots); ops are pure | op stack |
| **Live caption-style editor** | Restyle kinetic captions (font/size/emphasis/position) | `setPageStyle` exists → UI |

**UI (four panes, keyboard-first):** Player · Timeline (multi-lane, zoom,
snapping, waveforms, markers, drag-trim, keyframe rows) · Inspector · History /
Versions + Agent panel. Timeline-rendering approach borrowed from the reference
editor; document + logic stay ours.

---

## 5. MVDA integration

Because every capability is an op, integration is near-automatic; to make it
feel like a co-editor:

- **Tool parity:** every new op ships a matching agent tool — `add_keyframe`,
  `set_speed`, `add_marker`, `split_segment`, `assign_medium`,
  `restyle_caption` — alongside today's `retime_clip`, `set_transition`,
  `auto_emphasis`, `set_motion`, `judge_preview`, `mark_ready`.
- **Suggestion / diff mode:** agent proposes a set of ops as a reviewable diff
  overlay (uses `diffSummary`); human accepts/rejects per item — in both the
  Assembly screen and the editor.
- **More critics:** keep the frame-critic judge; add a **pacing/motion critic**
  (still held too long? motion matches energy?) and a **caption-rhythm critic**.
  Notes become suggested ops.
- **Learning loop:** editor/assembly diffs after an agent pass feed the existing
  operator-signal mining, so the agent's default cuts get more "you" over time.

---

## 6. Phased build plan (flag-gated, mock-first, per-phase verify + merge)

Order honors D3 (assembly first). Each phase: pure logic in `packages/core`,
adapters mock-first, `pnpm typecheck && vitest run && lint && build`, merge to
main.

- **R1 — Segment model + keyframe generalization + compile path.** Add
  `Segment`/`ShotPlan` generalization, `segmentsToDocument()` in `edd-compile`,
  and finish the `keyframes` motion path (model → compile → render). Pure +
  tested. Migration for stored plans if needed.
- **R2 — Assembly / Storyboard screen (v1, full granularity).** The visual
  per-segment planner: split, assign medium, prompt, motion, captions, live
  cost, AUTO-router, generate → compile. Includes the **sequence-segment
  composer** (D4). Flag-gated.
- **R3 — MVDA parity for planning.** Agent tools for split/assign/motion/
  caption on segments + suggestion-diff mode in the Assembly screen.
- **R4 — Pro-editor timeline upgrades.** Remotion Player scrubbing + transport,
  snapping, waveforms, markers, ripple trim, local undo/redo, caption-style
  editor. (Borrow the reference timeline shell.)
- **R5 — Keyframe editor UI + speed ramps** in `/edit`, with `add_keyframe` /
  `set_speed` agent tools.
- **R6 — New critics + learning-loop wiring** (pacing, caption-rhythm) feeding
  suggestions and operator-signal mining.

---

## 7. Migrations & flags (anticipated)

- Migration: extend `videos.shot_plan` to the new `Segment[]` shape (backward
  compatible — old single-shot plans still read).
- Feature flags (dark-launch, like VCE): `assembly`, `pro_editor`,
  `keyframes`, `segment_agent`. All default off; flag-off = today's behavior.

## 8. Testing posture

- Pure: `segmentsToDocument`, keyframe interpolation, `planCost` on segments,
  ripple-trim math, speed-ramp timing — unit-tested like `edd-render-units`.
- DI orchestrators (asset gen per segment) tested with mocks.
- Cross-cutting: flag-off invariance (assembly/editor off ⇒ byte-identical
  pipeline), cost-never-exceeds-plan, determinism.

## 9. Out of scope (deferred)

- Full-NLE features (multicam, color grading, nested sequences, effect stacks).
- Real-time multiplayer co-editing.
- Forking the reference editor (reference only).
- 3D/Blender segments (a possible later `scene` medium).

## 10. Open questions / risks

- **Reference license:** confirm `openvideodev/react-video-editor`'s license
  before adopting any code (patterns are fine; code copy may not be).
- **Preview performance:** Remotion Player scrubbing on long timelines may need
  proxy/低-res preview; measure early.
- **Segment ↔ clip round-trip:** edits made in `/edit` after compile don't flow
  back to the plan by default (the plan is the pre-render intent). Decide
  whether `/edit` changes ever re-sync upward, or the document simply supersedes
  the plan post-generate (recommended: document supersedes).

# Stick Studio — Design

A new **visual backend** for the studio: instead of generating a paid AI
clip/still per beat, render a **programmatic SVG stick-figure performance**
driven by a cheap LLM "choreographer." Same script→beats→VO→render pipeline,
same Shorts engine, same kinetic highlights — only the *visual layer* changes.

Status: **Phase 0 (rig POC) building.** Owner: studio. Niche: narrator-driven
stick-figure story Shorts (survival / true-crime / history / "what would you
do").

## Why

A footage Short costs ~$2–8 in clip generation (FLUX/Seedance/Pexels). A stick
Short costs **one Claude call (cents) + the VO** — the render is free because
it's procedural. That means a **consistent recurring character, infinite
episodes, and near-zero marginal cost** — a moat nobody hand-animating or using
clunky AI animators has.

We are **not** chasing Alan-Becker-level fluid animation (not automatable). We
win on *story volume + character consistency*, which is exactly the wave that's
working on Shorts right now.

## How it slots into the existing architecture

The visual for a beat is currently a paid asset; we swap that for a declarative
scene spec rendered in Remotion. Nothing else in the pipeline changes.

| Existing seam | Change |
|---|---|
| `RenderBeat` (`packages/render/src/types.ts`) | add optional `stickScene?: StickScene` |
| `BeatScene` (`packages/render/src/VideoComp.tsx`) | new top branch: `if (beat.stickScene) render <StickStage>` instead of the `videoUrl/imageUrl` footage block — VO, scrim, captions, highlights layers unchanged |
| `makeBeatClip` (`src/lib/pipeline/engine.ts`) | when `project.visual_style === 'stick'`, skip FLUX/Pexels; write a `clip` asset with `provider:'stick'`, `meta.stickScene` |
| `buildProps` (`packages/render/src/render-queue.ts`) | when an asset has `meta.stickScene`, populate `RenderBeat.stickScene` (leave footage fields null) |
| `src/lib/adapters/` | new `stick-choreographer.ts` (Claude tool-use → scenes), mirroring `highlights.ts` / `shorts.ts` |
| `projects` table | `visual_style` flag + `stick_cast` (recurring character), like `brand_kit` |
| Compositions | **none new required** — reuse `VerticalShort`; stick channel is `kind='short'` and rides the Shorts engine |

Because the asset table carries the scene spec, `buildProps` stays uniform and
the render farm needs no special-casing beyond the `BeatScene` branch.

## Data model — the Stick Scene Spec

One spec per beat (the choreographer's output). A constrained vocabulary keeps
the LLM cheap and the rig finite.

```ts
type StickScene = {
  setting: 'void'|'room'|'street'|'forest'|'cliff'|'office';
  shot?: 'wide'|'medium'|'close';
  camera?: { panX?: number; zoom?: number };
  actors: { id?: string; action: StickAction; emote?: Emote;
            x?: number; facing?: 'l'|'r'; prop?: PropKey;
            cast?: Partial<StickCast> }[];
  fx?: ('shake'|'flash'|'speedlines')[];
};
type StickAction =
  | 'idle'|'walk'|'run'|'jump'|'fall'|'point'|'wave'
  | 'sit'|'panic'|'celebrate'|'think'|'fight'|'crawl'|'dead';
```

The action plays for the beat's `durationSec`; VO + captions + highlights
overlay exactly as today. The recurring character lives in `StickCast`
(stroke color = identity, stroke width = build, head radius, scale, accessory).

## The rig (`packages/render/src/stick/`)

- **`StickFigure.tsx`** — a parametric biped: forward kinematics from a hip
  root computes joint positions from a `Pose` (per-segment angles) → SVG lines +
  head circle. Identity (color/build/head/accessory) from the cast.
- **`poses.ts`** — the action library: each `StickAction` is a function of time
  → `Pose` (cyclic actions use sine motion; one-shots ease 0→1). The `Pose`
  model and `NEUTRAL` baseline live here.
- **`backgrounds.tsx`** — procedural settings (void/room/street/forest/cliff/
  office) drawn in the stage's SVG coordinate space.
- **`StickStage.tsx`** — composes background + actors + camera (pan/zoom) + fx
  (shake/flash) for one scene. This is what `BeatScene` will render.
- **`StickPreview.tsx`** — a dev-only Remotion composition that cycles the figure
  through every action with a label, so the visual quality bar can be eyeballed
  *before* any pipeline wiring.

## The choreographer adapter (Phase 2)

`stick-choreographer.ts`: a Claude tool-use call (`deliver_scenes`) that takes
all beats at once and returns a `StickScene[]` aligned to them — **one LLM call
per video**, logged to the ledger via `recordCost`. Validates/coerces enums to
the rig's known vocabulary, with a deterministic keyword→action heuristic
fallback (no API key), exactly like the highlights and shorts adapters.

## Phased build plan

- **Phase 0 — rig POC (this commit).** `stick/` rig + `StickPreview`
  composition. Renders/animates in Remotion studio. No pipeline wiring — it
  de-risks the only hard question ("does it look good?") first.
- **Phase 1 — render integration.** `RenderBeat.stickScene`, the `BeatScene`
  branch, `buildProps` read; render a sample scene end-to-end through
  `VerticalShort`.
- **Phase 2 — auto-generation.** Choreographer adapter + `makeBeatClip` branch +
  `projects.visual_style` / `stick_cast` migration. A full idea→Short
  auto-produces with stick visuals.
- **Phase 3 — UX.** Project setting to pick visual style + a cast editor; per-beat
  scene re-roll (mirrors `rerollBeatVisual`).
- **Phase 4 — polish.** More actions/props/backgrounds, two-hander scenes,
  parallax, emotes/faces, transitions, sfx hooks.

## Risks / limits

- **Craft ceiling:** aim for "expressive-enough simple performance," not fluid
  hand-animation. Phase 0 sets the bar.
- **Choreography monotony:** curated action vocabulary + variety nudges in the
  prompt.
- **Pose tuning:** FK pose interpolation needs eyeballing — that's what the
  Phase 0 `StickPreview` is for.

## Composes with what's already shipped

Stick videos are `kind='short'`, so the **native Shorts pipeline (30–180s),
kinetic highlights over the action, the captions toggle, and Derive-Shorts** all
apply for free.

## Previewing the POC

From `packages/render/`:

```bash
npx remotion studio src/index.ts
```

Open the **StickPreview** composition to watch the figure cycle every action.
See `docs/stick-studio/README.md`.

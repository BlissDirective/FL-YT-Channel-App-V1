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
  head circle. Identity from the cast: **colour**, **line weight**, **6 builds**
  (kid / short / normal / heavy / tall / lanky — per-build proportion
  multipliers), and **10 accessories** (hat, cap, beanie, ponytail, antenna,
  tie, cape, crown, bow, none).
- **`poses.ts`** — the action library: **31 actions** as functions of time →
  `Pose` (cyclic actions use sine motion; one-shots ease 0→1):
  `idle, walk, run, sneak, crawl, climb, swim, jump, dance, point, wave, think,
  shrug, facepalm, lookAround, reach, carry, salute, celebrate, panic, kneel,
  sit, type, push, drag, throw, fight, dodge, getHit, fall, dead`.
- **`backgrounds.tsx`** — **16 procedural settings** (void, room, street,
  forest, cliff, office, cave, ocean, space, rooftop, courtroom, hospital,
  subway, desert, kitchen, prison), each a flat palette + decor in the stage's
  SVG space.
- **`bubbles.tsx`** — speech / thought bubbles (per-actor `say` / `think`,
  coloured to the speaker), comic **impact bursts** (`POW`, anchored at the
  action), and **speed lines**.
- **`StickStage.tsx`** — composes a scene: background + actors (+ props +
  bubbles) + **camera** (`shot` → wide/medium/close base zoom, plus
  `move` push/pull/pan) + **fx** (shake/flash/impact/speedlines) + **mood tint**
  (day/night/danger/calm/dream/retro/warning). This is what `BeatScene` renders.
- **Dev tooling** — `StickPreview` (action reel), `StickSheet` (contact sheet of
  all actions for pose tuning), `StickShowcase` (bubbles/fx/moods/builds demo),
  and `scripts/shoot.mjs` (render one frame to PNG in headless envs).

## The choreographer adapter (Phase 2)

`stick-choreographer.ts`: a Claude tool-use call (`deliver_scenes`) that takes
all beats at once and returns a `StickScene[]` aligned to them — **one LLM call
per video**, logged to the ledger via `recordCost`. Validates/coerces enums to
the rig's known vocabulary, with a deterministic keyword→action heuristic
fallback (no API key), exactly like the highlights and shorts adapters.

## Phased build plan

- **Phase 0 — rig POC + asset library. ✅ Done.** `stick/` rig, tuned poses,
  and the expanded library above (31 actions, 16 settings, bubbles, impact
  frames, 6 builds × 10 accessories, camera language, mood tints). Verified by
  rendering contact sheets/showcases — no pipeline wiring.
- **Phase 1 — render integration.** `RenderBeat.stickScene`, the `BeatScene`
  branch, `buildProps` read; render a sample scene end-to-end through
  `VerticalShort`.
- **Phase 2 — auto-generation.** Choreographer adapter + `makeBeatClip` branch +
  `projects.visual_style` / `stick_cast` migration. A full idea→Short
  auto-produces with stick visuals.
- **Phase 3 — UX.** Project setting to pick visual style + a cast editor; per-beat
  scene re-roll (mirrors `rerollBeatVisual`).
- **Phase 4 — polish.** Two-hander choreography, parallax backgrounds,
  transitions, sfx hooks, more props. *(No face/emote system — deliberate.)*
- **Phase 5 — self-improving loops.** The four loops below, once there's live
  retention data to learn from.

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

## Variation & scale

There are **two kinds of variation**, and they behave very differently:

- **Story / concept variation is effectively unlimited.** Every short is a
  *narrated story*; Claude writes a fresh script per topic and Scout feeds the
  topics. Two stories reusing the same poses are completely different videos to a
  viewer. At 3–5 shorts/day you would not repeat a story for years — bounded only
  by topic sourcing, which the app already automates.
- **Visual variation is combinatorially huge but bounded by the asset library.**
  The choreographer maps each beat to a scene
  (action × setting × actors × props × bubbles × camera × fx × mood). Even today:
  31 actions × 16 settings × 6 builds × 10 accessories × moods × camera, sequenced
  over a ~6-beat short → an astronomically large scene-sequence space. The
  *permutation count* is not the constraint; **aesthetic breadth is** — and every
  asset added multiplies across every future video forever (the compounding moat).

**3–5 shorts/day reality:** never cost-limited (≈ one choreographer LLM call +
VO per short) and never story-limited. The only thing to actively manage is
visual freshness, which the asset library + the loops below handle.

## Self-improving loops (Phase 5)

Four feedback loops turn the channel into a flywheel. Most reuse machinery the
app already has (optimizer, analytics with retention→beat mapping, the ideas
queue / auto-intelligence cron, QC reviews).

1. **Performance flywheel.** The render asset already stores the beat timeline,
   so retention curves map back to choreography choices. A periodic optimizer job
   correlates *features* (action, setting, hook style, pacing, mood) with
   retention/views, then feeds the winners into the choreographer prompt as
   few-shot exemplars and biases the topic Scout. The channel learns what works.
   *Needs live data → after Phase 2 ships and videos accrue stats.*
2. **Asset-growth loop.** A scheduled job where Claude *proposes* new poses /
   settings / props (as specs in the rig's vocabulary), auto-renders a contact
   sheet via `StickSheet` + `scripts/shoot.mjs`, and a human (or a vision model)
   approves before merge. The library grows on a cadence instead of ad hoc.
3. **Concept engine.** Scout + the Claude researcher fill the ideas queue nightly
   (existing auto-intelligence cron); winning formats get promoted into named
   **series** (recurring character arcs) for binge-ability and retention.
4. **Self-critique.** A QC pass (existing `qc_reviews`) scores the script +
   choreography *before* render; low scores trigger an automatic re-roll of the
   choreography or the weak beats.

**Build order:** the loops need signal to be worth wiring, so they come after
Phase 2 (auto-generation) produces real shorts and Phase analytics accrue.
Loop 2 (asset-growth) is partly usable now — the review tooling already exists.

## Branding & channel concepts

> Market-researched June 2026 for originality (avoid Alan Becker / Animator vs.
> Animation, Stick Nodes, Hyun's Dojo, Stick War, and saturated `Stick + noun`
> names). The channel is **multi-genre** — not locked to crime/survival — and
> will spin winning formats into named series based on metrics. Verify the exact
> @handle / .com / trademark before locking a name in; availability shifts.

**Naming strategy:** a short coined word fusing *line / stick / twig / scribble*
with *story / tell / yarn / lore / toon* — signals "stick figures" **and**
"many stories" without boxing into one genre.

**Top name candidates** (all returned no dedicated-channel collision at research
time): **Stickyarn**, **Sticklore**, **Twigtoon**, **Linelore**, **Scrawlhouse**,
**Stickwell**, **Stickery**, **Twiglet Tales**, **Plotsticks**. Avoid (taken /
contested): StickTales, Stickly, Stickverse, Sticktopia, StickTory, Lineverse,
bare "twig" / "scrawls".

### Recommended top 3

**1. Stickyarn** (`@stickyarn`) — *"Simple lines. Big stories."*
- **Description:** *Two dots, a few lines, and a story you can't stop watching.
  Stickyarn turns simple stick figures into big stories — gripping "what would
  you do?" scenarios, weird-but-true history, oddly satisfying explainers, and
  absurd little comedies. If it makes you go "wait, what happens next?", we'll
  animate it. New stick-figure stories every week.*
- **Avatar (flat-SVG):** a stick figure standing on the dot of the "i", holding
  one end of a line that loops out to underline the wordmark — literally
  "spinning the yarn." Black figure on warm marigold, scales to 48px.
- **Banner:** one continuous black line enters left, knots into 4–5 tiny
  stick-figure vignettes, trails into the wordmark right.

**2. Sticklore** (`@sticklore`) — *"Every story starts with a line."*
- **Description:** *Welcome to the Sticklore — where stick figures act out
  everything from survival dilemmas to brain-bending science, true history, and
  stories too strange to be made up. We keep the art simple so the storytelling
  hits harder. Comedy one day, "would you survive this?" the next. New stories
  weekly.*
- **Avatar:** a stick figure from behind, cross-legged, gesturing at a glowing
  single-stroke "campfire." Monochrome on deep navy, one amber accent.
- **Banner:** navy field, wordmark centred, tiny stick figures as constellation
  points connected by faint lines (a "map of stories").

**3. Twigtoon** (`@twigtoon`) — *"Little sticks. Loud stories."*
- **Description:** *Meet the Twigs — the simplest characters on the internet,
  here to act out the best stories you'll watch all week. Quick comedy, "what
  would you do?" thrillers, life-hacks, history, and gloriously absurd what-ifs,
  all in clean stick-figure animation. Big ideas, tiny characters, zero filler.
  New Twigtoons every week.*
- **Avatar:** a stick figure with a tiny leaf/bud head — instant mascot. Bright
  leaf-green badge, black twig-figure mid-wave.
- **Banner:** friendly off-white, a row of leaf-headed twig-figures doing
  different actions pointing at the wordmark; a green branch motif along the base.

### Series concepts (spin up the winners)

| Series | Format |
|---|---|
| **Stick or Split** | "What would you do?" dilemma — narrator poses a deadly/moral choice; decide before the reveal. |
| **Two Minutes, One Line** | Fast explainer — any concept drawn with a single continuous line in ~2 min. |
| **Stickuations** | Comedy — everyday situations escalated to absurd stick-figure chaos. |
| **Would You Survive?** | Scenario-survival — guess the figure's odds before the outcome. |
| **Oddly Specific** | Satisfying / hyper-specific scenarios and processes. |
| **The Lore Drop** | Mini-history — one bizarre-but-true event, stick-reenacted. |
| **Stick Hacks** | Life-hacks / how-to with a deadpan narrator. |
| **What-If Theater** | Absurd hypotheticals played to their ridiculous end. |
| **Tiny Epics** | Complete emotional shorts with twist endings, under 3 min. |
| **Line of Fire** | High-stakes thriller — "make the right move" cliffhangers. |

## Previewing the POC

From `packages/render/`:

```bash
npx remotion studio src/index.ts
```

Open the **StickPreview** composition to watch the figure cycle every action.
See `docs/stick-studio/README.md`.

# Stick Studio — Phase 0 (rig POC)

A programmatic SVG stick-figure visual backend for the studio. See
[`Stick-Studio-Design.md`](./Stick-Studio-Design.md) for the full architecture
and roadmap.

**Phase 0 is the rig only** — no pipeline wiring yet. It exists to eyeball the
visual quality bar before integrating.

## Code

`packages/render/src/stick/`

| File | What it is |
|---|---|
| `types.ts` | `StickScene` / `StickActor` / `StickCast` — the choreographer's output schema + the recurring-character identity |
| `poses.ts` | the `Pose` model + action library (`idle, walk, run, jump, fall, point, wave, sit, panic, celebrate, think, fight, crawl, dead`) |
| `StickFigure.tsx` | parametric biped: forward kinematics → SVG bones + head |
| `backgrounds.tsx` | procedural settings (void/room/street/forest/cliff/office) |
| `StickStage.tsx` | composes one scene: background + actors + camera (pan/zoom) + fx (shake/flash) — this is what `BeatScene` will render in Phase 1 |
| `StickPreview.tsx` | dev-only reel cycling every action, registered as the `StickPreview` Remotion composition |

## Preview it

From `packages/render/`:

```bash
npx remotion studio src/index.ts
```

Open the **StickPreview** composition (1080×1920) and scrub — each action plays
for ~1.8s with a label, ending on a two-character "chase" scene that checks
multi-actor layout + per-character identity (colour/accessory).

## What to judge

- Do the cyclic actions (walk/run/crawl) read as believable motion?
- Do one-shots (jump/fall/dead) land cleanly?
- Is the figure expressive enough for narrator-driven storytelling?

Pose constants in `poses.ts` are the tuning surface — adjust angles there. Once
the bar is met, Phase 1 wires `StickStage` into `BeatScene` so real beats render
as stick performances.

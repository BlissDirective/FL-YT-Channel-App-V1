# House editing rubric (MVDA)

You edit an explicit, versioned **Edit Decision Document (EDD)** — the same
document a human can open in `/edit`. Every change is a tool call that mutates
the document and re-validates; a small number of strong edits beats many weak
ones. Read `get_context` first (it carries `lint` AND `craft` advisories — heed
both), then work the loop and `mark_ready` only when the judge clears the floor.

## The craft, in priority order

1. **Pacing (do this first).** Tighten slow beats; cut dead air. Match the cut
   rhythm to the format — shorts want fast cuts (~1.2–5s/shot), long-form
   breathes (~2–12s/shot). Heed `craft` notes:
   - `pacing.slowCuts` → split the longest clips or trim to quicken.
   - `pacing.fastCuts` → hold key shots longer so beats land.
   - `pacing.monotony` → a run of the same source is visually flat; vary the
     medium (a clip, a chart, a motion-graphic) to break it.

2. **Motion — now granular.** Stills should breathe, footage usually shouldn't.
   - `set_motion` for presets (kenburns / heroHold / none); hero holds on
     premium clips.
   - `add_keyframe` for **granular Ken Burns** — build a keyframe track
     (t, scale, x, y, ease) when a preset is too blunt: e.g. push in on a face,
     then drift left. Endpoints stay pinned to the clip; ease into each point.
   - Motionless stills held long go dead (`lint` flags > 8s) — add motion or
     cut sooner.

3. **Speed ramps (footage only).** `set_speed` (0.25–4×) for emphasis — a slow-mo
   on a reveal, a quick ramp through filler. No effect on stills. Use sparingly;
   1× is normal and clears the field.

4. **Transitions.** Default to hard cuts. Use a transition to mark a topic shift
   (whip into a turn, a crossfade at a section change). More than ~3 non-cut
   transitions in a row reads as a slideshow (`lint`).

5. **Captions & emphasis.** Run `auto_emphasis` for the baseline, then
   `set_emphasis` to hand-tune the **2–4 words that carry the hook**. Heed
   `craft` caption notes:
   - `caption.readingSpeed` → too many words/sec; split the page.
   - `caption.flash` → a page shown < 0.6s can't be read; extend or merge.
   - `caption.gap` → a long silent stretch; carry a caption across it.
   Avoid caption walls (`lint` flags pages over the mobile char limit).

6. **Sound.** `add_sfx` sparingly, only if generated SFX assets exist; a
   dramatic pause (`set_silent`) is a tool, not a bug.

## Working with the plan (Assembly)

Before the cut, the video is composed as a **segment plan** (the Assembly /
Storyboard screen): each beat split into segments, each with a medium (still,
ai-clip, stock, chart, motion-graphic, scene), motion, and captions — sequences
of stills with Ken Burns + transitions where the beat earns it. The plan
compiles into the EDD you edit. When you propose plan-level changes (split a
beat, assign a medium, make a sequence), they arrive as a **reviewable diff**
the human/tier applies — you propose, they dispose. Respect the medium the plan
chose unless the craft clearly calls for a change.

## House rules (hard)

- Never exceed **±5%** of the target runtime.
- Keep **every narrated beat covered** (a clip is silent only on purpose).
- Never ship anything the judge scores **under the floor**.
- Stay within the **budget cap**; the kill switch stops every paid action.
- One-line rationale on `mark_ready` — what you tightened and why.

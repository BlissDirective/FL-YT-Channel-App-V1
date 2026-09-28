# Directed production pipeline

The autonomous pipeline makes every creative decision itself. It writes the script with Claude, rewrites the visual prompts with the art director, times each section to its voiceover, and cuts with Ken Burns moves. A **directed** video works the other way around: a production brief makes every decision and the pipeline executes it **verbatim**. The test batch 01 briefs (`docs/production/test-batch-01/`) are the first user.

> Read [`lessons-learned.md`](lessons-learned.md) first. It lists the guards and rules that came out of test batch 01.

## What a directed script pins

`packages/core/src/directed.ts` defines `DirectedScript`, parses it with `parseDirectedScript` (which returns every error at once) and compiles it with `compileDirectedEdd`.

| Brief element | Field | Where it takes effect |
|---|---|---|
| Section seconds (= generated seconds) | `sections[].sec` | The clip job's `target_sec` and the EDD clip duration. Never the voiceover length. |
| Character dialogue with timing | `sections[].lines[] {speaker, text, at}` | One ElevenLabs take per line, using that speaker's voice from `brand_kit.voiceCast`. It plays at `at` seconds into the section. |
| Literal video prompt | `videoPrompt` | Sent to Higgsfield untouched. No art director, no visual bible, no style suffix. |
| Keyframe (first frame) | `keyframePrompt` | A SOUL Standard still at the native aspect (9:16 for Shorts). |
| Loop or landing frame | `endFrame: {fromSection}` or `{prompt}` | Sent as Seedance 2.5 `end_image_url`, on the **final** segment only. |
| Model per section | `model` | `hf-cinema-studio-4` or `hf-seedance-2-5`. The default is the project's locked model. A retry never swaps models. |
| Cinema Studio look | `controls` | Merged over `brand_kit.cinemaControls`. Cinema Studio requests only. |
| Reference images | `refs` | Storage paths (see `make_reference_still`). For Cinema Studio they go in `image_urls` in the order given, so the prompt's `<<<image_N>>>` tokens index them. |
| Native ambience | `generateAudio` | Seedance `generate_audio`. The clip audio is kept in the mix (quieter under dialogue). |
| SFX cues | `sfx[] {at, prompt}` | ElevenLabs sound generation, cached per project. |
| Music bed | `music {prompt, gainDb, underVoDb}` | ElevenLabs Music at the full runtime. It ducks under every line and fades out over the last 1.5s. |
| On-screen text | `labels[]` | Composited in Remotion. Generated plates never carry text. |
| Snap-zooms | `zooms[] {at, toScale, overSec, holdSec}` | EDD keyframe motion. |
| Caption emphasis | `highlightWords` | Those tokens are drawn in the accent color. |
| Transitions | `transitionOut` | `cut`, `whip`, `crossfade` or `dipToBlack`. |
| Channel ident or outro plate | `reuse {videoId, sectionIdx}` | Reuses an already generated clip at no cost. |
| Brand sting | `sting {at, sec}` | An accent wipe of about 0.5s, placed after the hook and never before frame 1. |
| Outro | `outro {mode, sec, cta}` | `card` adds a dedicated end card. `overlay` adds a loop-safe branded end beat over the last seconds. |
| Watermark | `watermark` (default on) | A corner channel bug. |

## Shorts: intro, outro and loops

A **seamless loop** is a Short whose last frame and sound flow straight back into its first frame. YouTube auto-replays Shorts, so viewers often watch through twice, which pushes average view percentage above 100%, a strong ranking signal. House rules for every Short:

1. **Frame 1 is the hook.** Nothing plays before it: no ident and no logo.
2. **Intro:** a 0.5s brand `sting` right after the hook (about 2–3s in), plus the watermark bug for the whole Short.
3. **Outro, loop Shorts:** `outro.mode = "overlay"`, about 2.5s. A branded subscribe/CTA band rises over the final seconds and clears before the loop point. The last section's `endFrame: {fromSection: 0}` makes the final frame match the opening.
4. **Outro, non-loop Shorts:** `outro.mode = "card"`, 3–4s. A full end card whose CTA points to the related long-form.

## Flow (studio MCP)

1. **Voices.** `design_voice` returns previews. The operator approves one, then `save_voice` assigns it to a speaker. Speaker `N` is the narrator.
2. **References** (optional). `make_reference_still` makes a SOUL cast sheet or set plate and returns a path to use in `refs`.
3. **`estimate_directed`** validates the script and returns the pre-flight cost.
4. **`import_script`** creates the video at the Script gate, marked `directed`. Nothing is spent.
5. **`produce_directed`** has no per-video spend cap (operator decision). It returns the pre-flight estimate for tracking. It builds keyframes, then lines, SFX and music, then queues one clip job per section. It is chunked and idempotent: call it again while `done=false`.
6. **Clip worker** (GitHub Actions). It generates each section from `clip_jobs.spec` and records Higgsfield's **/estimate quote** as the ledger price, with credits and $/s in the description. The price is flagged `catalog` only when the estimate call fails. Sections over 30s are stitched seamlessly: last frame → next segment. When the last clip lands, the worker compiles and validates the EDD and moves the video to ASSEMBLING. Directed videos never go to the MVDA agent.
7. **Render farm.** It renders the EDD: 9:16 for Shorts, 16:9 for long-form. The video stops at **Final review**. Nothing publishes.
8. **QC.** `get_video_media` returns signed URLs for the render, clips, keyframes and audio.
9. **Revisions.** `revise_sections` has no round cap (operator decision). Rounds are counted for reporting only. It edits prompts, re-rolls keyframes and regenerates only the named sections, then the worker recompiles and the farm re-renders.

## Asset conventions

| Asset | `kind` | `beat_index` | Notes |
|---|---|---|---|
| Keyframe | `keyframe` | section | Persistent: the worker reads it from the spec, so it survives clip re-rolls. |
| End frame | `keyframe_end` | section | |
| Section clip | `clip` | section | `meta.isVideo`, `specHash`, `priceSource`, `quoteUsd`, `usdPerSec` |
| Spoken line | `vo` | section | `meta.lineIdx`, `speaker`, `words` |
| SFX | `sfx` | section | `meta.cueIdx` |
| Music bed | `bgm` | null | |

Migration `0081_directed_production.sql` adds `videos.directed`, `clip_jobs.spec`, `clip_jobs.quote_usd` and `clip_jobs.quote_credits`.

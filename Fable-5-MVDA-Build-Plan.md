# Fable 5 — Master Video Development Agent (MVDA) Build Plan

**Date:** 2026-07-09 · Companion to `Fable-5-Investor-Level-Enhancement.md` (§7)
**Decision record:** consultation of 2026-07-09 — human touch-up timeline UI **and**
agent-only mode both in scope from day one; semi-autonomous (human at Script +
Cut gates) as the launch default; full-auto tier choreography replaced via a
strangler pattern, with tiers surviving as **budget envelopes**.

### Decision log — review pass 1 (2026-07-09)

Operator decisions locked for Phases A/B (drive §2, §5, §8):

1. **EDD v1 scope → FULL VOCABULARY from day one.** The v1 schema, `validateEdd`,
   the render path, *and* the Phase-B timeline UI all exercise the complete
   editing vocabulary immediately — trims / per-clip in-out, transitions, motion,
   SFX cues, kinetic-word tokens, keyframes, music bed. No "subset first" hedge.
2. **Timeline UI base → BUILD CUSTOM in-house on the Remotion `<Player>`.**
   designcombo/react-video-editor is dropped as a dependency (license + a
   scene-model translation layer we don't want); we own the editor against our
   EDD directly.
3. **Sequence → SHIP A + B, then a human verification/authorization gate before
   Phase C.** The operator uses and tests the standalone human editor over
   existing videos; **Phase C (the agent) does not begin until the operator
   explicitly authorizes it.** Captions/kinetic (D) parallelizes with C *after*
   that authorization, not during A/B.
4. **Cut-gate editor location → dedicated `/edit` route** (not embedded in the
   existing video Canvas page) — more room for a real timeline.

### Decision log — review pass 2 (2026-07-10): the EDD schema + `/edit`

Schema/editor decisions locked for Phase A/B (drive §2.3 + §5):

- **D5 — Motion → keyframe model with preset buttons.** `MotionSpec.keyframes`
  is canonical; Ken Burns / hero-hold presets emit keyframe tracks.
- **D6 — Transitions → extensible registry, not a fixed set.** v1 ships
  cut/crossfade/dissolve/slide/whip/dip-to-black/zoom-blur; new kinds register
  a `{ render, maxSec }` entry (open `{kind: string}` union tail) with **no
  schema migration**.
- **D7 — SFX → both sources.** Curated library by default; ElevenLabs
  generated SFX on demand (cached as an asset). Word-anchored or absolute time.
- **D8 — Music → deferred.** Schema keeps the `music` cue + `DuckSpec`; the
  feature is **UI-gated OFF** and validator-rejected until a licensed music
  library exists.
- **D9 — Gapless required.** `validateEdd` enforces a gapless, monotonic video
  track in v1 (no gaps→black).
- **Editor UX (FYI, not gated):** three audio lanes (VO / SFX / music) + a VO
  waveform via Mediabunny; live `<Player>` scrub for editing + a "Render
  preview" button for final-fidelity checks.

Also finalized in pass 2 (operator): the **Editing-Craft Knowledge System** —
the agent periodically researches, verifies, stores, and applies best-practice
editing knowledge that shapes its decisions over time. Full design + decisions
KD1–KD5 in **§11** (a Phase C+ capability riding the existing `memory_entries`
governance; does not touch the A/B foundation).

### Audit — 2026-07-11: Phase A pt-1 + plan hardening

A full audit of commit `12ea0dd` against the legacy render it must reproduce
(`types.ts` / `VideoComp.tsx` / `render-queue.ts`). **Fixed in code, all gates
re-run green (typecheck, 458 tests, lint):**

- **A1 — duration floor.** Legacy floors every beat at **1s**
  (`Math.max(1, durationSec)` — types.ts:131/150, VideoComp.tsx:52); the
  compiler floored at one frame. One sub-1s beat would drift every later clip
  start and the goldens could never pass. `compileEdd` now floors at 1s.
- **A2 — shorts contract.** `VerticalShort` has **no intro sting**, body from
  0s, and a **1.5s compact CTA tail** (`SHORT_TAIL_SEC`); the compiler
  hardcoded `sting:true`/`endCard:true` with clips starting at `introSec`.
  The flags now follow the durations passed; caller contract: long =
  `INTRO_SEC`/`OUTRO_SEC`, short = `0`/`SHORT_TAIL_SEC`.
- **A3 — compiled-v1 validity trap.** Pinning the tier/brief target meant any
  legacy video whose VO drifted past ±5% compiled to a document that **fails
  `validateEdd`** (`runtime.total`) and could never be inserted.
  `targetDurationSec` is now optional; omitted → the actual computed runtime.
  **A3b:** a beat outrunning its source video (legacy *loops* it) produced
  `trim.out > source` (also invalid); the trim window now clamps to the new
  `CompileBeat.visualDurationSec` — loop/rate semantics live in the render
  path (A10).
- **A4 — word-anchor semantics were ambiguous.** The validator resolved only
  the FIRST caption page overlapping a clip — a 6s beat spans ~3 five-word
  pages, so tokens past page 1 could never anchor. Defined: `captionToken`
  indexes the clip's tokens **flattened across all overlapping pages in page
  order**; validator updated, the pt-2 renderer must resolve identically.
- **A5 — the CTA lower-third was dropped.** Legacy LongForm always renders
  "Enjoying this? Subscribe…" at 70% of runtime for 5s (VideoComp.tsx:62-65);
  compiled docs emitted `overlays: []`, so an EDD-driven render silently loses
  it (or the render path hardcodes it, breaking the single-source-of-truth
  rule). New `CompileInput.ctaText` emits the `lowerThird` overlay; the pt-2
  wrapper passes the render package's copy (long-forms only).
- **A6 — dangling-pointer guard (migration 0044).** Composite FK
  `videos(id, edit_document_version) → edit_documents(video_id, version)`:
  the active pointer can no longer reference a nonexistent version, and a
  pointed-at version row cannot be deleted directly (append-only, now
  mechanical).

**Documented for part 2 / Phase B (design, no code yet):**

- **A7 — wrapper faithfulness inputs.** `compileEddFromLegacy` must also
  carry: curated kinetic highlights (`resolveHighlights` output → `highlight`
  overlays with abs anchors — extend `CompileInput`), `enable_captions=false`
  (pass no words), derived shorts (`source_segment` beat cut + parent
  `sourceId`, as `buildProps` does), and `visualDurationSec` from the clip
  asset's meta. **Intro-card content** (hero image, `introPhrase`, the
  beat -1 hook VO) stays render-derived in v1 — the EDD controls sting on/off
  + length only; editing the hook itself is a later schema rev (an explicit
  exclusion so the goldens are well-defined).
- **A8 — golden redefinition.** Encoded video is not byte-deterministic;
  "byte-equivalent renders" is unachievable as written. Two-layer golden
  instead: (1) deterministic **props/timeline golden** — the EDD branch of
  `buildProps` must equal the legacy branch's output (`beatTimeline`, asset
  URLs, caption/highlight timings) on the same video; (2) **sampled-frame
  pixel equality** via `renderStill` at fixed frames (intro, two mid-beat, a
  cut boundary, outro) — verified in CI / a browser-capable session.
- **A9 — version-allocation concurrency (Phase B/C).** Two writers computing
  `max(version)+1` race (human save vs agent turn). The unique
  `(video_id, version)` constraint is the backstop (retry on conflict), and
  every write must carry `parent_version` = the head it edited, rejected as a
  conflict ("document changed — reload") when the head moved — optimistic
  concurrency surfaced in `/edit`, enforced inside `propose_edd`.
- **A10 — trim/rate semantics to pin in pt 2.** `trim` is the source window;
  how it maps onto `duration` (freeze last frame vs loop vs playback rate,
  incl. heroHold 0.5×) must be defined when the EDD renderer is built — until
  then the validator only checks that the window fits the source.

Open for review pass 3 (post-A/B-authorization): Phase C (the agent) —
tool-surface finalization, autonomy defaults per gate, the 8 conflict
resolutions, and the finalized Editing-Craft Knowledge System.

---

## Build status & session handoff (as of 2026-07-11)

**Design: complete through review pass 2.** Decisions locked — pass 1 (D1–D4:
full vocabulary, custom Remotion editor, A+B-then-authorize sequencing,
dedicated `/edit`), pass 2 (D5–D9 schema/editor + KD1–KD5 knowledge system).
Phase A SQL + validator spec reviewed and approved.

**Phase A — part 1: BUILT & GREEN on `main` (commit `12ea0dd`).** Pure,
additive, zero behavior change (nothing reads `edit_document_version` yet):
- `supabase/migrations/0043_edit_documents.sql` — versioned append-only
  `edit_documents` + nullable `videos.edit_document_version`.
- `packages/core/src/edd.ts` — full-vocabulary `EditDocument` types (D5–D9),
  `DEFAULT_TRANSITIONS` registry, `validateEdd` (all rules).
- `packages/core/src/edd-compile.ts` — faithful `compileEdd` (legacy→EDD v1).
- `tests/edd-validate.test.ts` + `tests/edd-compile.test.ts` — 41 tests.
- Gates: typecheck (6 pkgs), vitest **453/453**, lint. (Bug caught+fixed:
  vo-coverage maps VO→beat by time overlap, not `clip.assetId`.)

**Phase A — part 1 hardened by the 2026-07-11 audit** (see the audit log
above): A1 duration floor, A2 shorts contract, A3/A3b compiled-v1 validity
traps, A4 word-anchor semantics, A5 CTA lower-third, A6 pointer FK (migration
0044). Gates re-run green: typecheck, vitest **458/458**, lint.

**► NEXT (Phase A — part 2, the render path):** the resume point for a new
session.
1. `buildProps` (render-queue.ts:289): add an EDD branch — if
   `videos.edit_document_version` is set, load that `edit_documents` row and map
   its `doc` to `VideoProps`; else the legacy derivation (unchanged). Additive.
2. `VideoComp.tsx` / `types.ts`: render the full EDD vocabulary — keyframe
   motion (D5), the transition registry (D6, one renderer per kind), styled
   caption pages + per-token emphasis, word-anchored SFX (resolved per the A4
   flattened-token rule), overlays. Music lane gated OFF (D8). Pin the
   trim/duration mapping semantics — freeze vs loop vs rate, heroHold 0.5×
   (A10).
3. DB wrapper `compileEddFromLegacy(videoId)` in `src/lib` that assembles
   `CompileInput` (render's `INTRO_SEC`/`OUTRO_SEC` for longs, `0`/
   `SHORT_TAIL_SEC` for shorts, `ctaText` for longs, `visualDurationSec` from
   clip meta, curated highlights → overlays, `enable_captions`, derived-short
   `source_segment` handling — A2/A5/A7) → calls the pure `compileEdd` →
   inserts EDD v1 (`author='compiler'`).
4. `render_preview(range?)` path — 480p, restricted frame range, asset kind
   `preview`.
5. **Golden test (redefined per A8):** (a) props/timeline golden — EDD-branch
   `buildProps` output ≡ legacy branch on the same video (deterministic, runs
   anywhere); (b) sampled-frame pixel equality via `renderStill` at fixed
   frames; plus a per-capability render test each (a trim, a crossfade, an SFX
   cue, a kinetic token). *Visual goldens need a real Remotion render — verify
   in CI / a browser-capable session, not the sandbox.*

Then **Phase B** (the `/edit` timeline UI, §5), then the **operator
authorization gate** before **Phase C** (the agent) + **§11** (knowledge
system). Phase C and §11 do NOT begin until the operator authorizes after
testing A+B.

**Session-log note:** this session also delivered `Fable-5-Investor-Level-
Enhancement.md` (full audit + 9 bug fixes: kill-switch/budget-cap gaps, Opus
pricing 3×, security headers, two CI repairs) and made the `e2e-authed` job
non-blocking (trace-proven harness fragility, not app bugs; real gates stay
green). See `git log be16cf6..main`.

---

## 0. The one-paragraph thesis

The system has **no explicit timeline today** — the "edit" is derived at render
time from `scripts.beats` + `assets` rows (`buildProps`,
`packages/render/src/render-queue.ts:289-442`). Beat duration is welded to the
VO clip's length (`render-queue.ts:359`), beats are hard-cut `<Sequence>`s with
no transitions (`VideoComp.tsx:50-59`), and intro/outro are constants
(`types.ts:121-126`). Because no editing decision can be revisited before the
render, the autofix loop exists to critique *after* rendering and pay to re-roll
and re-render (≤3 attempts). The MVDA introduces the missing artifact — a
versioned **Edit Decision Document (EDD)** — and an agent that authors it in a
see→judge→adjust preview loop *before* the expensive render, judged by the QC
stack the app already has. Human and agent edit the same document; the timeline
UI is the Cut gate's review surface.

---

## 1. Architecture recap (platform decision)

- **Harness:** Claude **Agent SDK** (`@anthropic-ai/claude-agent-sdk`) running
  in the render-worker environment (GitHub Actions today; Trigger.dev when
  outgrown). Chosen over Managed Agents (multi-GB media + ffmpeg/Chrome live
  on our runners) and over a raw Messages-API loop (the SDK supplies sessions,
  subagents, and the two guardrails that matter: **`maxBudgetUsd`** and
  **`PreToolUse` hooks** that can deny tool calls).
- **Tool surface:** custom in-process MCP (`createSdkMcpServer` + Zod) over the
  EDD, the existing adapters (fal/ElevenLabs/Pexels), Remotion rendering, and
  Supabase state (§4).
- **Media ops:** adopt **KyaniteLabs/mcp-video** (87 guardrailed ffmpeg tools)
  for probe/trim/scene-detect/repurpose.
- **Editing backends investigated and rejected as the backbone** (July 2026):
  OpenCut (agent features are roadmap; mid ground-up rewrite; no stable
  format), Velorn (Electron+ComfyUI desktop, GPL), CapCut (no official editing
  API; community route = undocumented draft-file reverse engineering, GUI
  export only, ToS risk). Re-evaluate OpenCut Q4 2026 as an *external* GUI
  option only.
- **Captions/kinetic:** ElevenLabs TTS `/with-timestamps` (character-level,
  exact by construction) → `@remotion/captions`
  (`createTikTokStyleCaptions()`) + an LLM emphasis pass mapping keywords to
  styled tokens and `<Audio>` SFX cues. `@remotion/install-whisper-cpp` as
  fallback; WhisperX sidecar only if sub-100ms beat-sync is ever needed.
  Use **Mediabunny** for probing (`@remotion/media-parser` deprecated
  2026-02).
- **Knowledge:** `remotion-dev/skills` + house skills
  (`.claude/skills/{editing-style,kinetic-text,qc-rubric,channel-brand}`),
  prompt-cached per-project style guide, lessons via the existing
  `memory_entries` (migration 0039), and 3–5 exemplar EDDs.

---

## 2. The Edit Decision Document (EDD)

### 2.1 Design rules

1. **The EDD is the single source of truth for the cut.** `buildProps` renders
   the EDD when one exists; the legacy beat+asset derivation remains as the
   fallback path (and as the "compiler" that bootstraps EDD v1).
2. **Versioned, append-only.** Every mutation (agent turn or human save in the
   timeline UI) inserts a new version row. Undo, audit, diff review, and A/B
   all fall out of this.
3. **References, not copies.** Clips point at `assets.id` (stable UUID), never
   at `(kind, beat_index)` — the delete+insert re-roll convention on assets
   (10+ call sites, no locks) makes positional references unsafe.
4. **Pinned inputs.** The EDD records the `scripts.id` version and the set of
   asset IDs it was cut against; a script or asset change bumps
   `inputs_stale=true` rather than silently desyncing (guards the in-place
   `scripts.beats` mutations by `autoClassifyShotTypes`/`directArt`,
   engine.ts:1819/1982).
5. **Independent timing.** Clip `in/out/start/duration` are explicit fields —
   the break from "duration = VO length". VO remains the default pacing
   skeleton the compiler emits, but the agent may trim, pad, or overlap.

### 2.2 Schema sketch (migration 0043)

```sql
create table if not exists edit_documents (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  version int not null,                        -- monotonic per video
  parent_version int,                          -- lineage for diffs/undo
  script_id uuid not null,                     -- pinned script version
  author text not null,                        -- 'agent' | 'human' | 'compiler'
  status text not null default 'draft',        -- draft|previewed|approved|rendered|superseded
  inputs_stale boolean not null default false, -- script/assets changed under us
  doc jsonb not null,                          -- the EDD body (Zod-validated)
  judge jsonb not null default '{}'::jsonb,    -- latest per-dimension scores for THIS version
  note text not null default '',               -- agent rationale / human comment
  created_at timestamptz not null default now(),
  unique (video_id, version)
);
create index if not exists edd_video_idx on edit_documents (video_id, version desc);
-- RLS: authenticated_full_access + service_role, same pattern as 0024/0031.
-- videos gains: edit_document_version int (the active version; null = legacy path).
```

### 2.3 `doc` body (TypeScript/Zod shape) — FINAL (review pass 2 decisions D5–D9)

```ts
type EditDocument = {
  meta: {
    schemaVersion: 1;
    format: "long" | "short";
    fps: 30;
    aspect: "16:9" | "9:16";
    targetDurationSec: number;                     // from tier/brief; validated ±tolerance
  };
  intro: { sting: boolean; sec: number };          // was hardcoded INTRO_SEC=3
  outro: { endCard: boolean; sec: number };        // was hardcoded OUTRO_SEC=4
  tracks: {
    video: VideoClip[];                            // ordered; GAPLESS (D9)
    audio: AudioCue[];                             // VO + SFX + music bed
    captions: CaptionPage[];                       // styled pages w/ word tokens
    overlays: Overlay[];                           // kinetic highlights, lower thirds, progress bar
  };
};

type VideoClip = {
  id: string;                                      // stable within the doc ("v1", "v2"…)
  beatIdx: number;                                 // provenance link to script
  assetId: string | null;                          // assets.id; null = generation pending
  source: "still" | "stock" | "ai-clip" | "dataviz" | "stick";
  start: number; duration: number;                 // timeline seconds — EXPLICIT (breaks VO-welding)
  trim: { in: number; out: number };               // source in/out point (video assets)
  motion: MotionSpec;                              // D5 — keyframe model + preset generators
  transitionOut: Transition;                       // D6 — boundary into the next clip
};

// D5 — keyframe motion model. Presets (kenburns/heroHold) are UI buttons that
// EMIT a keyframes[] track; the agent can also author keyframes directly.
type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut";
type MotionSpec =
  | { kind: "none" }
  | { kind: "kenburns"; fromScale: number; toScale: number; anchor: "center"|"top"|"bottom"|"left"|"right" }
  | { kind: "heroHold"; rate: number }
  | { kind: "keyframes"; points: { t: number; scale: number; x: number; y: number; ease: Ease }[] };

// D6 — EXTENSIBLE transition registry (all types available, not a closed set).
// New transitions register a { render, maxSec } entry; the schema stores kind+params.
type Transition =
  | { kind: "cut" }
  | { kind: "crossfade"; sec: number }
  | { kind: "dissolve"; sec: number }
  | { kind: "slide"; sec: number; dir: "left"|"right"|"up"|"down" }
  | { kind: "whip"; sec: number }
  | { kind: "dipToBlack"; sec: number }
  | { kind: "zoomBlur"; sec: number }
  | { kind: string; sec: number; params?: Record<string, unknown> }; // registry-extensible

type AudioCue =
  | { kind: "vo";    assetId: string; start: number; gainDb: number; trim?: { in: number; out: number } }
  | { kind: "sfx";   ref: SfxRef; at: TimeAnchor; gainDb: number }     // D7 — both sources
  | { kind: "music"; assetId: string; start: number; gainDb: number; duck: DuckSpec }; // D8 — schema present, UI-gated OFF in v1

// D7 — SFX from a curated library by default, generated (ElevenLabs SFX) on demand.
type SfxRef     = { source: "library"; name: string } | { source: "generated"; assetId: string };
type TimeAnchor = { kind: "abs"; sec: number } | { kind: "word"; clipId: string; captionToken: number };
// D8 — music ducking (deferred to a later phase; field kept so nothing re-migrates)
type DuckSpec   = { mode: "none" } | { mode: "fixed"; underVoDb: number }
                | { mode: "sidechain"; depthDb: number; attackMs: number; releaseMs: number };

type CaptionPage = {
  startMs: number; endMs: number;
  tokens: { text: string; fromMs: number; toMs: number; emphasis: "none"|"pop"|"color"|"shake"|"scale" }[];
  style: string;                                   // named style from brand kit
  position: "bottom" | "center" | "top";
};

type Overlay =
  | { kind: "highlight";  text: string; startMs: number; endMs: number; style: string; anchor: TimeAnchor }
  | { kind: "lowerThird"; text: string; sub?: string; startSec: number; durationSec: number }
  | { kind: "progressBar"; style: string };
```

**Review-pass-2 decisions baked in:**
- **D5 keyframe motion** — `MotionSpec.keyframes` is the power path; `kenburns`/
  `heroHold` presets are UI buttons that emit keyframe tracks.
- **D6 extensible transitions** — the union stays open via the
  `{ kind: string; sec; params? }` tail + a transition **registry**
  (`{ render, maxSec }` per kind), so new transitions are added without a
  schema migration. v1 ships cut/crossfade/dissolve/slide/whip/dipToBlack/
  zoomBlur; more land by registering, not re-typing.
- **D7 SFX both** — `library` is the default source; `generated` (ElevenLabs
  sound-effects, cached as an asset) is on-demand. Both bind by absolute time
  or word-anchor.
- **D8 music deferred** — the `music` cue + `DuckSpec` exist in the schema
  (so v1 needs no re-migration later) but are **UI-gated OFF** until a
  licensed music library is in place.
- **D9 gapless** — `validateEdd` requires the video track to be gapless and
  monotonic (below).

`validateEdd(doc)` (pure, unit-tested) enforces: **gapless + monotonic video
track (D9)**; every `assetId` exists and is live; caption pages + overlays
within runtime; each `transitionOut.sec` ≤ min(adjacent clip durations) and ≤
the registry `maxSec` for its kind; keyframe `t` values within `[0, duration]`;
word-anchored SFX/overlays reference a real caption token; music cues rejected
while the feature is UI-gated; total runtime within `targetDurationSec ±
tolerance`. The agent cannot commit an invalid document — validation runs in
the tool, not in the prompt.

### 2.4 The compiler (Phase A bridge)

`compileEddFromLegacy(videoId)` reproduces today's implicit timeline exactly:
beats in script order, duration = VO `meta.durationSec`, Ken Burns default,
hard cuts, constants for intro/outro, captions from the stored word timings,
highlights via the same resolution as `resolveHighlights`
(render-queue.ts:243-287). Output: EDD version 1, `author='compiler'`.
This gives render-equivalent output on day one (goldens assert it — the
two-layer definition in audit A8: props/timeline equality + sampled-frame
stills) and gives the timeline UI something real to edit before the agent
exists.

> **Decision 1 (full vocabulary from day one):** the compiler still emits a
> *faithful* v1 (so goldens pass and nothing regresses), but the schema,
> `validateEdd`, the render path (§3), and the Phase-B UI (§5) support the
> **entire** vocabulary immediately — trims/in-out, transitions, motion, SFX,
> kinetic tokens, keyframes, music bed. A human (Phase B) or the agent
> (Phase C) can therefore use any capability the moment the document exists;
> the compiler simply doesn't *invent* edits the legacy render didn't have.
> This front-loads the render-path and validator work (they must handle every
> field correctly before Phase B ships) — accepted in exchange for a Phase B
> editor that is fully capable on release rather than growing feature-by-phase.

---

## 3. Render path changes

- `buildProps` (render-queue.ts:289): if `videos.edit_document_version` is set,
  load that EDD and map it to `VideoProps`; else legacy derivation. `VideoProps`
  gains an optional `edd` payload; `VideoComp` renders EDD tracks (clip
  timing/trims/transitions/caption pages) when present.
- **Preview rendering:** new `render_preview(range?)` path — 480p, restricted
  frame range, same composition — used by the agent loop and the timeline UI
  scrubber. Store as asset kind `preview` (auto-pruned, keep last 2).
- Render asset `meta.beats` (retention mapping, render-queue.ts:511-516) is
  superseded by `meta.eddVersion` + the EDD itself — **retention attribution
  gets strictly better**: dips map to explicit clips/transitions/caption
  styles, not just beats.

---

## 4. Agent tool-surface spec (in-process MCP)

Bounded verbs, Zod-typed, every mutation creates a new EDD version and ledgers
via `recordCost` (never the render farm's direct-insert convention —
conflict #8, §6).

| Tool | Does | Guardrail |
|---|---|---|
| `get_context()` | video, project brand kit, pinned script, asset inventory, QC thresholds, memory lessons | read-only |
| `get_edd()` / `diff_edd(v1,v2)` | current document / human-readable diff | read-only |
| `propose_edd(doc, note)` | validate + insert new version | `validateEdd`; rate-limit versions/turn |
| `retime_clip / trim_clip / set_transition / set_motion` | targeted single-field edits (cheaper than whole-doc writes) | validation per edit |
| `set_caption_style / set_emphasis(tokens) / add_sfx_at_word` | caption & kinetic layer | style names must exist in brand kit/skill |
| `request_visual(beatIdx, brief, tier?)` | re-roll a still (`makeBeatClip`) or enqueue `clip_jobs` for AI video | **PreToolUse budget hook**: `checkBudget` + tier envelope; denies over cap |
| `render_preview(range?)` | 480p preview of the current version | counts toward `maxBudgetUsd`; ≤N per session |
| `judge_preview(dimensions?)` | frame-critic + watch-gate dimensions against the preview; writes `edit_documents.judge` | reuses existing rubrics + calibration |
| `mark_ready(note)` | status→`previewed`, arrive at CUT gate | **PreToolUse gate hook**: denied unless latest judge ≥ floor |
| `write_lesson(text)` | append to `memory_entries` | size/count caps |

**Hard hooks (mechanical, not prompt-level):**
`PreToolUse` denies (a) any paid tool once session spend ≥ cap or the global
kill switch is on (`isKillSwitchOn`), (b) `mark_ready` below the QC floor,
(c) *any* publish-adjacent tool — publishing stays exclusively with the
existing gate/finalizer machinery and its settle invariants.

**Session lifecycle:** launched by the build-runner when clips complete
(§6 conflict #2); claims the video via CAS (same discipline as
autofix.ts:594-602); `maxTurns` ≈ 12, `maxBudgetUsd` from the tier envelope;
on exhaustion → hold with the judge summary as `paused_reason` (same UX as
autofix holds today).

---

## 5. The Cut gate + timeline UI (day-one scope)

- **Gate semantics:** the ASSETS gate slot in the state machine is re-labelled
  **CUT** for EDD videos. Same `GATE_FOR_STATUS`/`decideGate`/`approvals`
  plumbing (engine.ts:4018-4102), same autonomy dial (`projects.autonomy`,
  consumed at `arriveAtGate` engine.ts:207) — only the reviewed artifact
  changes: from a grid of raw assets to **the cut**.
- **Timeline UI — dedicated `/edit` route** (`/projects/[id]/videos/[vid]/edit`,
  **Decision 4**): a full-height timeline surface, not embedded in the Canvas
  page — Remotion `<Player>` + track lanes over the same EDD, **built custom
  in-house on our schema** (**Decision 2** — designcombo/react-video-editor
  dropped: license constraint + an unwanted scene-model translation layer;
  license-clean, no lossy export). The Canvas page keeps its checkpoint panel
  and gains an **"Open editor"** link to `/edit`.
- **Layout (review pass 2):**
  ```
  ┌ ← Library   title            [ Render preview ]  [ Approve cut ✓ ] ┐
  ├───────────────────────────────┬───────────────────────────────────┤
  │        PREVIEW  <Player>       │  INSPECTOR (selected clip):        │
  │      scrub · play · loop       │  source [Swap ▾] · start/dur/trim  │
  │                                │  motion [Ken Burns ▾] keyframes    │
  │                                │  transition [Whip ▾] sec           │
  ├───────────────────────────────┴───────────────────────────────────┤
  │ V  ▐clips…▌  drag edges = retime/trim                              │
  │ VO ▐waveform (Mediabunny)…▌                                        │
  │ FX  ▲ sfx cues (▲ word-anchored)                                   │
  │ ♪  ▐music bed — UI-gated OFF in v1 (D8)…▌                          │
  │ CC ▐caption pages…▌  click = edit tokens/emphasis                  │
  │ OV  ▐highlight / lowerThird / progress bar…▌                       │
  ├────────────────────────────────────────────────────────────────────┤
  │ Version v4 (you) ◄ v3 (compiler)         [ diff ]  [ revert ]      │
  └────────────────────────────────────────────────────────────────────┘
  ```
- **v1 controls (full vocabulary, Decision 1):** scrub/loop preview; drag clip
  edges (retime + source trim in/out); transition picker (the D6 registry set);
  keyframe motion editor (D5; Ken Burns / hero-hold presets emit keyframes);
  caption-style + per-token kinetic-emphasis editing; SFX placement (library +
  generate-on-demand, D7) anchored to a caption word or absolute time;
  highlight / lower-third / progress-bar overlays; swap-visual (calls
  `request_visual`); version history with diff + revert; **Approve cut**
  (= `decideGate`). Music lane present but **gated OFF** (D8).
- **Preview fidelity:** the live `<Player>` renders instantly for editing (may
  differ slightly from the final render); the **Render preview** button
  produces a true-fidelity 480p check via `render_preview`.
- **Human and agent are peers on the document:** a human save is just a new
  version with `author='human'`; the agent's next turn (if any) reads it. This
  *is* the touch-up path — no CapCut round-trip, no export.
- **Agent-only mode** = the same gate with autonomy set to `autopilot`
  (auto-resolve via existing engine.ts:258-296 flow, still subject to the QC
  floor); `copilot` auto-approves ≥7.5 exactly as gates do today (qc.ts:35).

---

## 6. Conflict resolutions — the 8 contention points, phase-mapped

From the code investigation (file:line evidence). **A** = Phase A, etc.

| # | Conflict (evidence) | Resolution | Phase |
|---|---|---|---|
| 1 | `videos.status` has ~8 writers (engine `setStatus`/`decideGate`, clip-queue `maybeFinish` clip-queue.ts:323-345, autofix `triggerRerender` autofix.ts:558-565, render farm, reconcilers, operator, build-runner) | Agent never writes `status` directly; it claims the video via CAS on `updated_at` and moves through the existing gate/`runPipeline` calls only. One new transient sub-state is avoided by parking the session between `ASSETS_READY` and the CUT gate arrival | C |
| 2 | `auto_finish` + clip-queue `maybeFinish` is the ASSETS→ASSEMBLING handoff (engine.ts:262, 2127) | For EDD videos, `maybeFinish` hands off to **an agent session** instead of straight to ASSEMBLING: it sets `edit_session_requested` and the build-runner launches the session; `mark_ready` → CUT gate → approve → ASSEMBLING | C |
| 3 | `assets` rows are the de-facto edit representation, no version/lock, delete+insert from 10+ sites (engine.ts:664-949, autofix.ts:271-538, clip-queue.ts:290-299, render-queue.ts:524-533, …) | EDD references `assets.id`; for EDD videos all asset mutation flows through `request_visual` (which the agent and the timeline UI share). `runAssetGeneration`'s destructive delete+regenerate never runs again after the EDD exists (re-entry goes through the agent) | B–C |
| 4 | `scripts.beats` mixed write semantics — in-place mutation (classify engine.ts:1819, directArt engine.ts:1982, beat edits) vs new-version insert (scripting/remix/rescript) | EDD pins `script_id`; any script write for an EDD video flips `inputs_stale`, which blocks `mark_ready` until the agent (or human) reconciles. Long-term cleanup: make all beat writes version-inserting | B (flag), later (cleanup) |
| 5 | Beat duration welded to VO `meta.durationSec` (render-queue.ts:359); no field for retiming/trims/transitions | This *is* the EDD: explicit `start/duration/in`, `transitionOut`, `motion` per clip; VO stays the compiler's default skeleton | A |
| 6 | Autofix loop owns post-render adjust at FINAL_REVIEW (autofix.ts:577-875): asset re-rolls, re-render trigger, auto-rescript, own memory/state | **Per-video exclusivity:** `sweepAutofix` skips videos with `edit_document_version` set. Post-render verdicts (frame-critic/media-QC/Self-Watch) route back to the agent, which edits the EDD and re-renders — same convergence bounds (attempts + spend) enforced by hooks. The auto-rescript escape hatch is invoked by the agent through the same `autoRescriptFromFinal` machinery, same once-per-video bound | C |
| 7 | Settle invariants block publish on stored verdicts (settle.ts:29-88); editing after a render risks publishing a stale-judged cut — the drift class settle.ts exists to prevent | Any EDD version bump after a render invalidates `watch_review`/`vision_review`/`autofix_state` exactly as `triggerRerender` does today (autofix.ts:609, watch-runner.ts:256) — built into `propose_edd`, not left to the agent's judgment. `autofixSettled` maps to "agent session settled" | C |
| 8 | Two ledger conventions: engine `recordCost` (ledger.ts:28) vs render-farm/watch direct inserts (render-queue.ts:581+, watch-runner.ts:169) | All agent tools ledger via `recordCost`; session totals also reported to `maxBudgetUsd`. (Separate cleanup item from the audit: migrate the render farm's direct inserts onto `recordCost`) | B |

Also inherited for free: fail-closed grading guard (`failClosedBlocksSpend`),
kill switch (now enforced at every cron gateway per the audit fixes),
per-video/monthly caps, `VIDEO_MONTHLY_CAP_USD` for clip spend, and the
approvals audit trail.

---

## 7. What survives, what changes, what retires

| Subsystem | Fate |
|---|---|
| QC gate scoring, Self-Watch, frame-critic, media-QC, settle rules, judge calibration | **Survive unchanged** — become the agent's fitness function (judges, not actors) |
| Autonomy per gate (assist/copilot/autopilot), operator, Build & Post, calendar | **Survive unchanged** — the HITL scheduler; MVDA slots under the CUT gate |
| Tiers (`auto-tiers.ts`), `TIER_PLAN_COST` | **Demoted to budget envelopes** — calendar/operator planning keeps working; `selectClipBeats` choreography retired in Phase E |
| `fullAutoGenerate` scaffolding (budget pre-flight, fail-closed guard, clip_jobs batching, stick branch) | **Survives** — the agent calls the same primitives; the stick pipeline keeps its own choreographer initially |
| Autofix loop | **Retired for EDD videos** (absorbed into the agent); remains for legacy-path videos until Phase E |
| Legacy implicit-timeline render path | **Fallback + degraded mode** (Anthropic outage → compiler-EDD or legacy render still ships videos; mock-first philosophy preserved) |

---

## 8. Phased build plan

> **Sequencing (Decision 3):** build and ship **A + B**, then **stop at an
> explicit operator authorization gate**. The operator uses/tests the standalone
> human editor over real videos; **Phase C does not start until the operator
> authorizes it in writing.** Phase D parallelizes with C *after* that
> authorization — not during A/B.

**Phase A — the document, FULL vocabulary (week 1.5–2).** Migration 0043;
`EditDocument` Zod schema covering the **entire** vocabulary (trims/in-out,
transitions, motion/keyframes, SFX, kinetic tokens, music bed) + `validateEdd`
(unit-tested, table-driven like `library.ts`) that enforces every field;
`compileEddFromLegacy` (faithful v1 — invents no edits); `buildProps`/
`VideoComp` EDD path that **renders every capability** (not just today's);
golden test asserting compiler output ≡ legacy render (two-layer per audit
A8: props/timeline golden + sampled-frame stills), plus new render tests per
capability (a trim, a crossfade, an SFX cue, a kinetic token).
*Additive; zero behavior change to existing videos. (½-week longer than a
minimal EDD — the cost of Decision 1: the renderer + validator must handle
every field before Phase B ships.)*

**Phase B — the human timeline editor at the Cut gate (week 2.5–3.5).**
Dedicated `/edit` route (Decision 4), **custom-built on Remotion `<Player>`**
(Decision 2 — no designcombo dependency); full-vocabulary lanes/controls per
§5; version history/diff/revert; CUT gate re-label for EDD videos;
`request_visual` + `render_preview` server actions (shared with the agent
later); `inputs_stale` flag wiring; "Open editor" link from the Canvas page.
*Standalone deliverable: the operator can hand-re-cut any existing video —
no agent yet.*

**► OPERATOR AUTHORIZATION GATE — verify & test A + B, then authorize Phase C.**
Exit criteria the operator signs off on: compiler goldens green; every
capability renders correctly from a hand-authored EDD; the `/edit` editor is
usable end-to-end (open a real video → retime/trim/transition/caption/SFX →
preview → Approve cut → render → publish); version revert works. Only then
does review pass 2 (Phase C spec) and the build begin.

**Phase C — the agent (week 3–4, post-authorization).** Agent SDK harness in the worker; in-process
MCP toolset (§4); PreToolUse budget/QC/kill-switch hooks; session launch from
`maybeFinish` handoff; CAS claim; post-render verdict routing + review
invalidation; autofix exclusivity; `agent_sessions` audit table; skills
installed (`remotion-dev/skills` + 4 house skills) + exemplar EDDs; Telegram
notification on hold/ready (existing channel).

**Phase D — captions & kinetic upgrade (week 4–5, parallel to C).** ElevenLabs
`/with-timestamps` in `synthesizeBeatVo`; caption pages + emphasis pass +
SFX cues as EDD fields; TikTok-style caption components; loudness/QC lint.
*(Independently valuable; runs parallel to C — i.e. after the authorization
gate, not during A/B. Note: the EDD caption/SFX/kinetic **fields** are already
built in Phase A per Decision 1; Phase D wires the exact ElevenLabs timing
source + the emphasis-tagging pass that populates them at scale.)*

**Phase E — trust & retirement (week 5–6+).** "Director" tier live beside
Platinum; 2–3 weeks of side-by-side QC scores + gate decisions + (once
published) retention deltas; flip the default; retire `selectClipBeats`
choreography; keep legacy render as degraded mode. Learning loops on:
retention→EDD-element attribution feeding `memory_entries`, and the weekly
research agent proposing skill-file PRs (human-approved).

**Success criteria for retirement:** Director ≥ Platinum on FINAL QC scores
across ≥10 videos, no increase in operator revision rate at the CUT gate,
cost per published video ≤ Platinum + $1, zero settle-invariant violations.

---

## 9. Cost model

Per long-form video (on top of the tier's visual budget): agent session
~$0.30–0.80 (Sonnet turns + preview judges, Opus escalations only near
thresholds), hard-capped by `maxBudgetUsd`; previews are 480p Remotion runs
(CI minutes, ~$0). Offsets: autofix re-render/re-judge spend (~$0.50–1.00 on
weak videos) largely disappears; wasted full renders drop. Batch-API routing
for non-interactive judge passes (from the enhancement plan Phase 1) halves
the agent's Claude line again. Net: **cost per *published-quality* video goes
down**, with variance capped.

---

## 10. Open items tracked elsewhere

- Render-farm ledger writes → `recordCost` (audit doc §3 remainder).
- `scripts.beats` write-semantics unification (conflict #4 long-term cleanup).
- Stick-pipeline EDD adoption (keeps its choreographer until after Phase E).
- OpenCut re-evaluation Q4 2026 (external GUI only, if their Editor API ships).
  Note: designcombo/react-video-editor was evaluated and **rejected** as the
  editor base (Decision 2) — the `/edit` UI is custom on Remotion `<Player>`.
- Trigger.dev migration when session/render volume outgrows Actions.
- Full-vocabulary render surface (Decision 1) is the main new risk in Phase A —
  mitigated by per-capability render tests before Phase B; if any capability
  proves render-expensive/unstable, it stays in the schema but is disabled in
  the `/edit` UI until fixed (schema-complete, UI-gated) rather than dropped.

---

## 11. The Editing-Craft Knowledge System (review pass 2 — Phase C+ capability)

The agent periodically **researches, verifies, stores, and applies** best-practice
editing knowledge (techniques, transitions, SFX, timing, hooks) so that knowledge
shapes its cuts over time and improves from the channel's own results.

> **Key finding (verified against the code):** ~80% of this already exists. The
> `memory_entries` store (migration 0039) + `memory.ts` + `outcome-audit.ts`
> already implement a governed, evidence-gated, confidence-decaying,
> shadow→active→retired knowledge base with per-channel RLS isolation, global
> promotion, and a Spearman(QC-score, retention) anti-reward-hacking audit. The
> `editing` / `visual` / `audio` namespaces already exist. This system is a
> **governance layer we already built for scripts, extended to editing** — not a
> new system. It rides existing infra and does **not** touch the A/B foundation.

### 11.1 What is net-new (only three things)

1. **External-research producer** — a weekly `editing-research.yml` agent
   (mirrors `optimizer.yml`) that mines Tier-B/C sources into `status='shadow'`
   memory rows **and** opens a PR regenerating a distilled skill file. Today all
   memory is first-party-generated; nothing mines external craft.
2. **Wire the `editing`/`visual`/`audio` namespaces into the cut.** Verified:
   `engine.ts:379` injects only the **`script`**-stage playbook at authoring
   time — editing knowledge exists but nothing reads it when the cut is made.
   The MVDA loads it at edit-decision authoring, **and** graduated techniques
   become `criterion` rows the Self-Watch/QC judges enforce.
3. **Greenfield `.claude/skills/editing-craft/SKILL.md`** (none exist yet) — a
   compiled digest of *active, graduated* lessons, human-reviewed as a git diff.
   The DB stays source of truth; the skill file is the loaded artifact.

### 11.2 Three trust tiers (source-weighted, not equal)

- **Tier A — first-party (highest):** the channel's own retention curves +
  (later) most-replayed heatmaps + canary A/B deltas. The **only** source that
  can *graduate* a technique to apply-by-default.
- **Tier B — second-party (medium):** competitor/niche signal, top-performer
  pacing teardowns.
- **Tier C — third-party (needs verification):** general editing craft (film
  theory, Submagic/Opus conventions, creator breakdowns).

### 11.3 Operator decisions (review pass 2)

- **KD1 — graduation policy.** First-party **auto-graduates** (canary +
  rollback); **all** second- and third-party knowledge requires a **human PR**
  before it becomes loaded default context. **Tier-A gating is the anti-fad
  firewall** — no external claim shapes a default cut until the channel's own
  retention confirms it.
- **KD1 — 2nd = 3rd, with tier-volume normalization (confirmed).** Second and
  third party carry **equal** weight *as tiers*. Because Tier-C craft is
  abundant and Tier-B niche signal is scarce, normalize by tier so the two
  contribute **equally in aggregate, not per-item** — 3rd-party listicle-spam
  cannot drown scarce 2nd-party niche signal (cap active external criteria per
  category / weight by tier count).
- **KD2 — dual application, split by channel.**
  - **Authoring context → full, equal, day one.** ALL knowledge (1st/2nd/3rd,
    2nd = 3rd) feeds the agent's *reasoning* when it authors the cut. No cap —
    the retention-tuned QC gate is the backstop. This is the "consistent impact
    input" the operator asked for, in full.
  - **Rubric enforcement → present day one, confidence-banded.** External
    (unproven) criteria affect the QC gate from day one but at a **capped
    advisory weight of 30–40% of a proven criterion** (operator dial): they may
    *nudge* a borderline cut, not *veto* a good one or homogenize the channel.
    **Retention lifts each external criterion's weight toward full as it's
    confirmed, decays it as it's refuted** — retention is the primary
    learning/guiding factor over time, made mechanical. Because the cap is set
    at the higher (30–40%) end, run a **tighter outcome-audit cadence** so the
    Spearman(QC, retention) drift check catches a bad external criterion faster.
- **KD3 — two layers with hard bidirectional boundaries.** `tier='global'`
  editing-craft (shared across channels) ∪ `tier='channel'` first-party
  specifics. Guards: (a) **no channel→channel bleed** — `match_memory` already
  enforces per-channel read isolation; a channel lesson reaches global **only**
  via `planGlobalPromotion` after confirmation on ≥N channels; (b) **global
  always applies** — every session loads all `global` active lessons plus the
  channel's; a channel may locally down-weight a global criterion its retention
  refutes but **cannot edit/delete** the global lesson (read-only from a
  channel's seat). **Guard test** asserts both: no foreign-`project_id` channel
  row is ever returned to a session, **and** every active global lesson loads
  for a zero-history session (no missed global application).
- **KD4 — cadence + SEPARATE budget.** Weekly autonomous Editing Researcher +
  on-demand trigger; first-party loop piggybacks the existing
  `outcome-audit`/`optimizer` crons (near-zero marginal cost).
  - **`RESEARCH_MONTHLY_CAP_USD` = $20/mo, a fully SEPARATE budget line.**
    Research spend ledgers at **system scope (`project_id = null`, provider
    `research`)**, so it is counted by a dedicated `researchMonthSpend()` and
    **never** enters `monthSpend(project)` or `monthVideoSpend` — it does **not**
    touch, count toward, or reduce any project's video-production budget (e.g. a
    $60/mo production cap and the $20/mo research cap are independent).
  - Enforced with the existing `checkBudget`/`recordCost` ledger + Agent SDK
    **`maxBudgetUsd` per run** (~$2) + kill-switch respect (crons gate on it per
    the audit fixes).
  - **Automated budget tests:** (1) pre-flight abort when month-to-date research
    spend ≥ cap; (2) per-run `maxBudgetUsd` ceiling terminates + holds on
    overrun; (3) research spend records under provider `research` at system
    scope and is invisible to project/video caps (positive *and* negative
    assertions); (4) research cron no-ops under the kill switch; (5) monthly
    over-cap canary in `outcome-audit`.
- **KD5 — most-replayed heatmap: deferred to v1.** Rely on the official
  YouTube Analytics retention-curve API for v1 (cleaner, no scraper); add
  heatmap ingestion (SVG-scrape / Apify actor, needs ~50k views) later as a
  higher-resolution Tier-A signal.

### 11.4 The loop, end to end

```
external research ──► SHADOW lesson (quarantined, low confidence, PR-gated for
                      default context; equal 2nd/3rd, tier-volume-normalized)
        │
        ├─ authoring input (full weight, day one) ─► agent proposes the cut
        └─ rubric criterion (capped 30–40% until proven) ─► QC gate nudges
                      │
   applied on videos ─► FIRST-PARTY retention delta confirms or refutes
                      │
        confirm ─► weight lifts toward full · graduate to ACTIVE · (≥N channels) → GLOBAL
        refute  ─► confidence decays · retire below RETIRE_FLOOR (fads die)
                      │
        outcome-audit Spearman(QC, retention) guards against reward-hacking
```

### 11.5 Grounding in 2026 continual-learning research

Maps 1:1 onto current literature — **ACE** (Generator/Reflector/Curator +
incremental playbook deltas = agent / Self-Watch / weekly curator),
**Voyager** (embedding-indexed skill library, self-verify before commit =
`match_memory` + Self-Watch), and audited skill-graph work (never store a
capability without a re-checkable verifier = evidence-gate + outcome-audit).

### 11.6 Build placement

Phase **C+** (after the operator authorizes Phase C). Net-new work: the
external-research producer + budget tests, the editing-namespace authoring/
rubric wiring, migration `0043_editing_craft` (add `source_tier`, `source_url`,
`technique_id`, `retention_delta`, `applies_when` to `memory_entries`; note the
video-EDD migration is a different `0043` — final numbers assigned at build),
and the first `.claude/skills/editing-craft/SKILL.md`. Everything else reuses
the existing memory/rubric/outcome-audit harness.

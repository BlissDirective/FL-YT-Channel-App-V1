# Fable 5 — Master Video Development Agent (MVDA) Build Plan

**Date:** 2026-07-09 · Companion to `Fable-5-Investor-Level-Enhancement.md` (§7)
**Decision record:** consultation of 2026-07-09 — human touch-up timeline UI **and**
agent-only mode both in scope from day one; semi-autonomous (human at Script +
Cut gates) as the launch default; full-auto tier choreography replaced via a
strangler pattern, with tiers surviving as **budget envelopes**.

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

### 2.3 `doc` body (TypeScript/Zod shape)

```ts
type EditDocument = {
  format: "long" | "short";
  fps: 30;
  intro: { sting: boolean; sec: number };          // was hardcoded INTRO_SEC=3
  outro: { endCard: boolean; sec: number };        // was hardcoded OUTRO_SEC=4
  tracks: {
    video: VideoClip[];                            // ordered, gapless after validate()
    audio: AudioCue[];                             // VO refs + SFX + music bed
    captions: CaptionPage[];                       // styled pages w/ word tokens
    overlays: Overlay[];                           // kinetic highlights, lower thirds
  };
};

type VideoClip = {
  id: string;                                      // stable within the doc
  beatIdx: number;                                 // provenance link to script
  assetId: string | null;                          // assets.id; null = generated slot pending
  source: "still" | "stock" | "ai-clip" | "dataviz" | "stick";
  start: number; duration: number;                 // timeline seconds — EXPLICIT
  in: number;                                      // source in-point (trim)
  motion: { kind: "none" | "kenburns" | "heroHold" | "pan"; from?: number; to?: number };
  transitionOut: { kind: "cut" | "crossfade" | "slide" | "whip"; sec: number }; // new capability
};

type AudioCue =
  | { kind: "vo"; assetId: string; start: number; gainDb: number }
  | { kind: "sfx"; name: string; atWord: { clipId: string; word: number }; gainDb: number }
  | { kind: "music"; assetId: string; start: number; duckUnderVo: boolean };

type CaptionPage = {
  startMs: number; endMs: number;
  tokens: { text: string; fromMs: number; toMs: number;
            emphasis?: "pop" | "color" | "shake" }[];   // LLM emphasis pass output
  style: string;                                        // named style from the skill/brand kit
};

type Overlay =
  | { kind: "highlight"; text: string; startMs: number; endMs: number; style: string }
  | { kind: "lowerThird"; text: string; atSec: number };
```

`validateEdd(doc)` (pure, unit-tested) enforces: gapless/monotonic video track,
every `assetId` exists and is live, caption pages within runtime, VO cues cover
every beat unless explicitly dropped, total runtime within target ±tolerance.
The agent cannot commit an invalid document — validation runs in the tool, not
in the prompt.

### 2.4 The compiler (Phase A bridge)

`compileEddFromLegacy(videoId)` reproduces today's implicit timeline exactly:
beats in script order, duration = VO `meta.durationSec`, Ken Burns default,
hard cuts, constants for intro/outro, captions from the stored word timings,
highlights via the same resolution as `resolveHighlights`
(render-queue.ts:243-287). Output: EDD version 1, `author='compiler'`.
This gives byte-equivalent renders on day one (goldens assert it) and gives the
timeline UI something real to edit before the agent exists.

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
- **Timeline UI** (`/projects/[id]/videos/[vid]/edit`): Remotion `<Player>` +
  track lanes over the same EDD — the designcombo/react-video-editor pattern,
  built in-house on our schema (license-clean, no lossy export). v1 features:
  scrub preview, drag clip boundaries (retime/trim), transition picker,
  caption-style/emphasis editing, highlight nudge, swap-visual (calls the same
  `request_visual` tool), version history with diff + revert, and
  **Approve cut** (= `decideGate`).
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

**Phase A — the document (week 1–1.5).** Migration 0043; `EditDocument` Zod
schema + `validateEdd` (unit-tested, table-driven like `library.ts`);
`compileEddFromLegacy`; `buildProps`/`VideoComp` EDD path; golden-render test
asserting compiler output ≡ legacy render. *Additive; zero behavior change.*

**Phase B — the timeline UI at the Cut gate (week 2–2.5).** `/edit` route with
Player + lanes over the EDD; version history/diff/revert; CUT gate re-label
for EDD videos; `request_visual` + `render_preview` server actions (shared
with the agent later); `inputs_stale` flag wiring. *Standalone value: humans
can re-cut any existing video today.*

**Phase C — the agent (week 3–4).** Agent SDK harness in the worker; in-process
MCP toolset (§4); PreToolUse budget/QC/kill-switch hooks; session launch from
`maybeFinish` handoff; CAS claim; post-render verdict routing + review
invalidation; autofix exclusivity; `agent_sessions` audit table; skills
installed (`remotion-dev/skills` + 4 house skills) + exemplar EDDs; Telegram
notification on hold/ready (existing channel).

**Phase D — captions & kinetic upgrade (week 4–5).** ElevenLabs
`/with-timestamps` in `synthesizeBeatVo`; caption pages + emphasis pass +
SFX cues as EDD fields; TikTok-style caption components; loudness/QC lint.
*(Independently valuable; can run parallel to C.)*

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
- Trigger.dev migration when session/render volume outgrows Actions.

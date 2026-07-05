# Fable5 — Self-Watch Loop & Pre-Publish Watch Gate

A design + build plan for a Claude agent that **watches each video before it
publishes**, scores it against a governed criteria list, fixes what it can, and
gets measurably better over time. Grounded in the existing codebase — this is
~80% wiring of systems already shipped, ~20% net-new.

Decisions locked with the operator (2026-07-05):

1. **Fix behavior** — autonomy-dependent, built **into** `autofix.ts` (one
   integrated loop, not a parallel system). Autopilot fixes + re-renders
   (hard-capped); copilot holds with a prioritized fix list.
2. **Perception depth** — two-tier: structural + sampled-frame Claude vision by
   default; escalate to temporal (moving-video) understanding only when flagged.
3. **Competitive benchmark** — both: automatic niche intel + our own channel
   winners as an always-on baseline, plus the deep Video-Intelligence blueprint
   folded in when a scan exists.
4. **Criteria model** — hybrid: a static hand-authored **baseline** (immutable
   floor) + a primarily **agent-maintained evolving playbook** that proposes and
   reweights criteria from evidence, with operator-tunable assists. Long-term
   goal: the strongest agent-maintained system possible, safely.
5. **Sequencing** — scaffold → structural timing (#3) + final-render
   script-match (#2) → competitive fit (#4) → temporal transitions (#1) last.

> **Sits on top of [`Fable5-Agentic-Harness-Plan.md`](./Fable5-Agentic-Harness-Plan.md).**
> This gate is not standalone: its evolving-criteria layer is the **`quality`
> namespace of the C8 Studio Memory Service** (§C8 there), and its competitive
> judge reads the `competitive`/`outcome` namespaces via `queryMemory`. Build
> **C8's core + `quality` namespace first**, then this gate on top — see
> "Cross-plan build order" in the Harness plan's Part D. C8 also **supersedes the
> `playbook.ts` 40-item cap / 90-day expiry** referenced below with uncapped
> storage + top-k retrieval + confidence-decay/pin.

---

## Verdict up front

The pieces you'd expect to have to build already exist — they're just pointed
outward or stop one step short of the final render:

| Your criterion | Already in the repo | The real gap |
|---|---|---|
| **#2 script ↔ visuals** | `beat-relevance.ts` vision-scores every still/stock clip vs. its narration beat and re-rolls the worst; `seed-vision.ts` gates AI-video before paying to animate | Runs **per-asset, pre-assembly**. Nothing re-checks the **assembled render** (wrong asset on wrong beat, caption over the subject, bad crop). |
| **#1 transitions** | The farm shells `ffmpeg` over the finished MP4 (`media-qc.ts`: black/freeze/silence/loudness) and samples mid-beat frames with `renderStill` | No **temporal** check across cut points. `twelvelabs.ts` Pegasus path is **stubbed but unbuilt** — the intended home for "watch the motion." |
| **#3 timing/sync** | Every timing fact is in the DB: `beatTimeline` (start/end sec per beat), per-word VO timestamps (`meta.words`), captions derived from them | No check that **asserts** sync — the data is all there, structurally, no pixels required. |
| **#4 competitive fit** | The **Video Intelligence** system (`docs/video-intelligence-spec.md`, shipped) does frame-by-frame perception of **competitor** videos → a "works / doesn't / hooks / structure / gaps" blueprint | The blueprint is **human-facing only** — never wired into a judge or the operator planner. Biggest untapped value. |

**The one fact that makes all of this feasible:** a finished MP4 exists *before*
publish. Render sets status to `FINAL_REVIEW` with the MP4 stored (R2/Supabase);
publishing is a **separate** operator-triggered step (`publish_requested` →
`publishStagedVideos`). `fetchRenderFile(videoId, variant)` already pulls those
bytes. So `FINAL_REVIEW → publish` is a clean, natural gate with pixels, ffmpeg,
and all timing metadata on hand.

---

## Orchestration shape — the honest answer to "agents feeding each other"

You asked about a multi-agent orchestrator where agents feed each other. The
research-backed answer (already written into `Fable5-Agentic-Harness-Plan.md §C7`,
and Anthropic's own multi-agent findings): **multi-agent orchestration wins for
*parallel research*, not *sequential shared-context pipelines*.** Debate/juries
are documented to *reduce* quality (shared-bias reinforcement) at ~15× the tokens.

So we get the "agents feeding each other" you want — but in the shape that
actually compounds:

- **Fan-out *within* the gate** (the good kind — parallel, independent lenses):
  the four criteria are evaluated **concurrently** by focused evaluators — timing
  (deterministic), script-match (vision), competitive (judge + intel), transitions
  (vision/temporal) — then a **synthesizer** merges them into one verdict + a
  machine-actionable fix plan. That's a bounded parallel fan-out at a *single*
  pipeline node.
- **The state machine stays the orchestrator across stages.** No new swarm, no
  debate loop. Each criterion is a "specialist" whose finding feeds the
  synthesizer, whose fix plan feeds `autofix`, whose outcomes feed the playbook,
  whose graduated criteria feed the next render. Agents feed each other — through
  the pipeline and the learning loops you already have, not through a chat room.

---

## Architecture

```
 RENDER FARM (packages/render, GitHub Actions — where pixels + ffmpeg live)
 ───────────────────────────────────────────────────────────────────────
   render → media-qc (exists) → ★ WATCH GATE (new) ─── verdict on render.meta.watch
                                     │
        ┌────────────────────────────┼─────────────────────────────┐
        ▼            ▼                ▼                ▼              ▼
   timing(#3)   script-match(#2)  competitive(#4)  transitions(#1)  synthesizer
   structural   sampled frames    judge + intel    2-tier vision    → WatchVerdict + fixPlan
   (free)       (Claude vision)   (Claude judge)   (vision→temporal)

 APP (src/, serverless — decisions + learning)
 ─────────────────────────────────────────────
   WatchVerdict → finalQc bridge → autonomy router
        ├─ autopilot → autofix.ts (bounded fix + re-render)
        └─ copilot   → review card (prioritized fix list, holds at FINAL_REVIEW)

   published → analytics (retention / engaged views)
        → C3 outcome-audit joins each watch criterion vs. retention
        → C1 calibration (operator 👍/👎 on the verdict)
        → playbook.ts Reflector/Curator: graduate / demote / rewrite criteria
        → next render uses the improved criteria set  ↺
```

**The verdict artifact** (`WatchVerdict`, stored on the `kind:"render"` asset
`meta.watch`, exactly like `meta.mediaQc`):

```ts
{
  overall: number,                 // weighted across the four dimensions
  timing:      { pass, score, issues:  Issue[] },
  scriptMatch: { pass, score, perBeat: BeatVerdict[] },
  competitive: { pass, score, suggestions: string[] },
  transitions: { pass, score, tier: 1|2, boundaries: BoundaryVerdict[] },
  fixPlan: FixAction[],            // machine-actionable — the autofix input
  criteriaVersion: string,         // which baseline+playbook criteria set scored this
  degraded: boolean,               // API/ffmpeg unavailable → hold, never fake a pass
}

// FixAction = the bridge to the existing capabilities in engine.ts
type FixAction =
  | { kind: "reroll",      beatIdx, reason }   // engine.ts beat re-roll (exists)
  | { kind: "research",    beatIdx, query }    // SourceLibrary re-search (exists)
  | { kind: "retime",      beatIdx, reason }   // extend visual to cover VO (small new cap)
  | { kind: "rewrite_hook", reason }           // best-of-N on hook (extend C2)
  | { kind: "flag",        scope, reason }      // script/idea-level → human only
```

---

## The four criteria → concrete checks

### #3 — Timing & pacing  *(structural, no pixels, cheapest, build first)*

All derivable from the DB — `beatTimeline` [{idx,start,end}], per-word VO
`meta.words`, `meta.durationSec`, captions-from-words. Deterministic, like the
existing `lintPatternInterrupts` / `lintLengthBand` in `rubrics.ts`.

- **`beat_visual_coverage`** — every narrated beat has a visual spanning its full
  VO duration (no dry tail / black gap). → fix `retime` or `reroll`.
- **`caption_speech_sync`** — caption windows align to VO word starts within a
  tolerance (they're derived from the same words; this catches render-time drops).
- **`hook_density_30s`** — ≥2 visual changes in the first 30s (retention-critical,
  per harness §B4). → fix add cut / reroll hook visuals.
- **`no_dead_air`** — no silence gap >1.5s (reuse `media-qc` silencedetect).
- **`pattern_interrupt_cadence`** — no same-shot-type stretch >45s (reuse lint).
- **`length_in_band`** — duration within ±25% of format target (reuse lint).

### #2 — Final-render script ↔ visual match  *(sampled frames + Claude vision)*

Reuses `beat-relevance.ts`'s `deliver_relevance` schema (`{relevance, depicts,
betterQuery, reason}`) — but now on frames sampled **from the assembled MP4**
(via `renderStill` at mid-beat offsets, or `ffmpeg -ss` over the stored file
using `beatTimeline`), paired with each beat's narration. Batched like
`vision-critique.ts`'s `critiqueFrames`.

- **`beat_frame_relevance`** — the rendered mid-beat frame depicts its narration
  ≥ `beatRelevanceFloor` (default 6, reused). → fix `reroll` / `research`.
- **`subject_not_occluded`** — captions/overlays don't cover the frame's key
  subject. → fix reposition captions / reroll.
- **`onscreen_text_legible`** — on-screen text readable (reuse vision-critique
  `readability`). → fix reroll / adjust.
- **`thumbnail_promise_match`** — the render delivers what title + thumbnail
  promise. → fix flag / re-pick thumb.

### #4 — Competitive & compliance fit  *(judge + intel)*

Watch-time inputs (decision #3 = both):
- **Automatic baseline:** `runIntelligence` niche results (titles/stats/structure)
  + the operator's learned `strategy.channel` winners (top subtopics/formats by
  view-weighted retention).
- **Opportunistic depth:** `video_intel.blueprint` for the topic when a deep scan
  exists (hooks / recommended structure / pacing / gaps / title+thumb patterns).

A Claude judge (escalatable via the `qc.ts` Haiku→Opus cascade) scores our
packaging + structure against that context:

- **`hook_competitive`** — first-beat/hook matches or beats winning in-niche hook
  patterns. → fix `rewrite_hook` (best-of-N).
- **`structure_retention_aligned`** — beat structure/pacing aligns with what
  retains in-niche. → fix `retime` / `flag` (reorder is script-level).
- **`angle_differentiated`** — topic/angle fills a gap vs. saturated (blueprint
  gaps + our semantic dedup catalog). → fix `flag` (idea-level).
- **`packaging_vs_winners`** — title/thumb phrasing competitive vs. our own
  winners + niche. → fix best-of-N (C2, already built for titles/thumbs).
- **`faceless_policy_transformative`** — has transformative value/commentary; not
  low-effort mass-produced repetition (YouTube inauthentic/repetitious-content
  rules). **Compliance floor — static, never droppable; a flagged video never
  auto-publishes, always holds for a human.** (Reuses the editorial guard.)

### #1 — Transition quality  *(two-tier, build last)*

- **Tier 1 (cheap, default):** structural cut list from `beatTimeline` + shot-type
  changes; plus sampled **frame-pairs** at boundaries (last frame of beat N + first
  of N+1) → Claude vision: "jarring discontinuity? color/subject jump? flash?"
  Bounded to the most-suspect boundaries.
  - **`boundary_not_jarring`** — no harsh discontinuity at cuts. → fix crossfade /
    reroll.
  - **`intro_outro_framing`** — clean open (no abrupt start); for Shorts,
    loop-friendly end ≈ start frame (harness §B4). → fix render-level; also a
    format-bandit arm (C5 tie-in).
- **Tier 2 (escalation, temporal):** when Tier 1 flags ≥`watchTemporalEscalateAt`
  boundaries, run true moving-video understanding — build out the stubbed
  `twelvelabs.ts` Pegasus path over our MP4 (or `gemini-video.ts` pointed at our
  own render instead of a competitor URL). Sees actual motion across the cut.
  - **`motion_continuity`** — motion across cuts is coherent; no unintended
    stutter/whip. → fix transition template / reroll.

---

## The integrated fix loop (decision #1 — one system, in `autofix.ts`)

`autofix.ts` today runs at FINAL, does a vision critique → bounded fix →
re-render, and records a playbook lesson when it moves QC by |Δ|≥0.3. We **extend
it**, not fork it:

- The `WatchVerdict.fixPlan` becomes autofix's input. Each `FixAction` maps to an
  existing capability (reroll → `engine.ts` beat re-roll; research → SourceLibrary;
  rewrite_hook → best-of-N; retime → a small new "extend visual to cover VO" cap;
  flag → human).
- **Bounds (cost guard — re-renders are the single expensive step):** the existing
  `revisionHardCap` **plus** a new `watchMaxRerenders` (default 2). Fixes that need
  no re-render (caption reposition, thumb re-pick) don't count against it.
- **Autonomy:** autopilot runs the loop to convergence-or-cap; copilot writes the
  fixPlan to the review card (`review-queue.tsx` `FinalBody`) and holds at
  `FINAL_REVIEW`. A verdict below `watchBlockPublishBelow` holds for a human even
  on autopilot.
- **Degraded** (no API key / ffmpeg absent) → hold, never a fake pass — same rule
  as `qc.ts` `heuristicReview`.

---

## The hybrid learning system (decision #4)

Three layers, so the agent can get aggressive **without** being able to regress
below a known-good floor or game its own reward.

**Layer 1 — Static baseline rubric** (new `WATCH` gate in `rubrics.ts`). Atomic
binary criteria, hand-authored, **immutable**. Always runs. The safety net.
Includes the compliance floor (`faceless_policy_transformative`), which the agent
can never weaken.

**Layer 2 — Agent-maintained evolving playbook** = the **`quality` namespace of
the C8 Studio Memory Service** ([Harness plan §C8](./Fable5-Agentic-Harness-Plan.md)).
Today `playbook.ts` stores evidence-gated "Do/Avoid" lessons and injects them into
generation prompts (ACE Generator→Reflector→Curator, embedding-dedup, no write
without quantitative evidence). C8 upgrades it: **uncapped storage + semantic
top-k retrieval** (replacing the 40-item prompt-prefix cap) and **confidence-decay
+ outcome-gated retirement with operator-pin** (replacing the hard 90-day expiry).
On that substrate we add the capability you actually want: **the playbook proposes
and reweights *watch criteria*, not just generation hints** — written through
`writeMemory`, read through `queryMemory`, curated nightly by the C8 librarian.

- New bullet type `criterion`: e.g. *"[true-crime] cold-open before any branding —
  the 5 videos that did retained +8% (evidence links)."*
- **Shadow → graduate lifecycle (the anti-reward-hacking guardrail):** a
  proposed criterion is **scored but non-blocking** until it (a) accumulates
  ≥`playbookShadowMinEvidence` observations **and** (b) passes the **C3
  outcome-audit** correlation check (its score actually predicts retention). Only
  then can it **gate**. Criteria that stop predicting get demoted to shadow, then
  expire. The agent cannot invent a criterion and immediately enforce it.
- All existing hygiene applies; the immutable baseline (Layer 1) means the worst
  case of a bad graduation is a slightly-too-strict extra check, not a broken gate.

**Layer 3 — Operator-tunable assist.** `quality_gates` floors + a new Watch
settings card, **plus** per-playbook-criterion controls: 👍 to **graduate** a
shadow criterion early, **pin** so it never expires, **mute** to retire one. This
is the "operator assistance to the agent-maintained evolution" — you steer, the
agent drives.

**The closed loop** (every arrow is an existing mechanism, extended):

```
render → WatchGate scores (baseline + active playbook criteria)
  → fixPlan → autofix (autopilot) / review card (copilot)
  → publish → analytics (retention, engaged views)
  → C3 outcome-audit: does each watch criterion predict retention?
       predicts → confidence↑ → graduate shadow → gating
       doesn't  → demote → expire
  → C1 calibration: operator 👍/👎 → per-criterion agreement %
  → playbook Reflector/Curator rewrites the weakest criteria
  → next render uses the improved set ↺
```

---

## Comprehensive criteria list (the operator judgement set)

`B` = static baseline (immutable). `E` = evolvable (playbook can reweight / add
siblings). Signal: `struct` (DB-only) · `vis` (sampled-frame vision) · `temp`
(moving-video) · `judge` (LLM + intel).

| # | Criterion | Signal | B/E | Passes when | Fix |
|---|---|---|---|---|---|
| **Timing (#3)** ||||||
| T1 | `beat_visual_coverage` | struct | B | every beat's visual spans its VO | retime/reroll |
| T2 | `caption_speech_sync` | struct | B | caption windows align to VO words (±tol) | re-render captions |
| T3 | `hook_density_30s` | struct | E | ≥2 visual changes in first 30s | add cut / reroll |
| T4 | `no_dead_air` | struct | B | no silence gap >1.5s | trim / retime |
| T5 | `pattern_interrupt_cadence` | struct | E | no same-shot stretch >45s | b-roll / reroll |
| T6 | `length_in_band` | struct | B | duration within ±25% of format target | flag |
| **Script-match (#2)** ||||||
| S1 | `beat_frame_relevance` | vis | B | rendered frame depicts narration ≥ floor | reroll / research |
| S2 | `subject_not_occluded` | vis | B | captions/overlays don't cover key subject | reposition / reroll |
| S3 | `onscreen_text_legible` | vis | B | on-screen text readable | reroll / adjust |
| S4 | `thumbnail_promise_match` | vis+judge | E | render delivers title+thumb promise | flag / re-pick |
| **Competitive & compliance (#4)** ||||||
| C1 | `hook_competitive` | judge | E | hook ≥ winning in-niche patterns | rewrite_hook |
| C2 | `structure_retention_aligned` | judge | E | structure/pacing matches niche retainers | retime / flag |
| C3 | `angle_differentiated` | judge | E | fills a gap vs. saturated topics | flag (idea) |
| C4 | `packaging_vs_winners` | judge | E | title/thumb beats our winners + niche | best-of-N |
| C5 | `faceless_policy_transformative` | judge | **B** | transformative, not low-effort repetition | **human hold** |
| **Transitions (#1)** ||||||
| X1 | `boundary_not_jarring` | vis | B | no harsh discontinuity at cuts | crossfade / reroll |
| X2 | `intro_outro_framing` | vis | E | clean open; Shorts loop end≈start | render-level |
| X3 | `motion_continuity` | temp | E | coherent motion across cuts (Tier 2) | transition tmpl / reroll |

---

## Operator-tunable parameters

Added to `QualityGateConfig` (`quality-gates.ts`, `app_settings.quality_gates`)
unless noted; the operator's own cadence/tier knobs stay on `operator_runs.config`.

| Param | Default | Range | Controls |
|---|---|---|---|
| `timingFloor` | 7 | 0–10 | min timing score to pass |
| `scriptMatchFloor` | *(reuses `beatRelevanceFloor` = 6)* | 0–10 | min per-beat render relevance |
| `competitiveFloor` | 6 | 0–10 | min competitive-fit to auto-pass |
| `transitionFloor` | 6 | 0–10 | min transition score to pass |
| `watchMaxRerenders` | 2 | 0–4 | hard cap on watch-driven re-renders (cost guard) |
| `watchTemporalEscalateAt` | 2 | 1–8 | flagged boundaries that trigger Tier-2 temporal |
| `watchBlockPublishBelow` | 5 | 0–10 | overall score below which autopilot holds for a human |
| `playbookShadowMinEvidence` | 5 | 3–20 | observations before a proposed criterion can gate |
| `playbookAutoGraduateConfidence` | 0.8 | 0.5–0.95 | confidence at which a shadow criterion starts gating |
| `competitiveBenchmark` | `auto+blueprint` | enum | which sources feed #4 (`auto` / `blueprint` / `both`) |
| *(per-criterion)* | — | — | 👍 graduate · 📌 pin (no expiry) · 🔇 mute |

---

## Build plan (confirmed sequencing)

**Phase 0 — Scaffold.** `packages/render/src/watch-gate.ts` `runWatchGate()` →
`WatchVerdict`; insert at `FINAL_REVIEW` in `render-queue.ts` after media-qc;
store on `render.meta.watch`; bridge into `finalQc` (like `vision_review`); new
`WATCH` baseline rubric in `rubrics.ts`; extend `autofix.ts` to consume `fixPlan`;
autonomy router; `quality_gates` floors + Watch settings card. Pure-function tests
for verdict scoring + fixPlan mapping.

**Phase 1 — Timing (#3) + final-render script-match (#2).** Deterministic timing
checks (reuse lints + new coverage/sync). Frame-sample the render → reuse
`deliver_relevance` on assembled frames. Wire `reroll/retime/research` fixPlan →
autofix with `watchMaxRerenders`. Surface the verdict in `review-queue.tsx`
`FinalBody`.

**Phase 2 — Competitive fit (#4) + the learning loop.** Watch-time intel assembly
(niche + strategy winners + blueprint-if-exists); competitive judge (escalatable);
compliance floor. Extend `playbook.ts` with the `criterion` bullet type +
shadow→graduate lifecycle; extend `outcome-audit.ts` to join watch criteria with
retention; operator graduate/pin/mute. **"Improves over time" comes online here.**

**Phase 3 — Temporal transitions (#1).** Tier-1 frame-pair boundary vision; Tier-2
build out `twelvelabs.ts` Pegasus (or Gemini-native-on-our-MP4) behind the
escalation gate. Shorts loop-friendliness as an evolvable criterion + C5 arm.

**Phase 4 — Calibration & hardening.** Extend C1 (👍/👎 on watch verdicts) and C3
(watch-criterion Spearman) into the insights surface; cost-ledger every watch call
under the budget guard; runbook + docs.

---

## Build status (2026-07-05)

- **This plan (Self-Watch Loop):** **Phases 0–2 shipped** ✅.
  - *Phase 0–1:* gate scaffold (`watch-gate.ts` + `watch-runner.ts`), timing (#3)
    + final-render script-match (#2), verdict on `videos.watch_review` (migration
    `0040`), operator publish-gate hold, Settings floors, review-card panel.
  - *Phase 2:* **competitive fit (#4)** via `competitive-judge.ts` (reads channel
    winners + the Video-Intelligence blueprint + the C8 `competitive`/`outcome`
    namespaces; the compliance criterion `faceless_policy_transformative` forces a
    human hold on `policyRisk`). **Autofix re-roll wiring** — off-topic beats feed
    the existing `autofix.ts` loop (one integrated fixer; convergence is gated on
    watch re-rolls clearing, bounded by `maxRenders`). **Full graduate lifecycle**
    — shadow `quality` lessons promote to gating (or retire) nightly via
    `runQualityGraduation`, hooked into the C3 outcome-audit pass.
  - *Phase 3:* **temporal transitions (#1)** — structural Tier-1 (`checkTransitions`:
    flicker cuts + clean open) escalates to a **Gemini native temporal Tier-2 pass**
    over our render's signed URL (`transition-critic.ts`; TwelveLabs is the
    documented alternative) when ≥`watchTemporalEscalateAt` shot boundaries warrant
    it. Temporal is authoritative (worst-link fold). Runs at the settle point only.
  - Plus the **C8 librarian** (nightly ≥3-channel global-craft promotion + retire
    sweep, in the refresh-stats cron) and the **remaining namespaces** (uniform
    `recordNamespaceLesson`/`namespaceLessons` API + an `outcome` writer feeding
    the competitive judge).
  - Pending: Phase 4 (calibration/hardening — 👍/👎 on watch verdicts + watch-
    criterion Spearman).
- **[Harness plan](./Fable5-Agentic-Harness-Plan.md):** C1–C6 **shipped**; C5
  live but exploration-only until ~8 published videos; **C8 Studio Memory Service
  — core shipped** (`memory_entries` + `match_memory` RPC + `queryMemory`/
  `writeMemory`; C4 playbook migrated onto it). Remaining: the `quality` namespace
  (built as this gate needs it), the nightly librarian, and the other namespaces.
- **Critical path (from the Harness plan's "Cross-plan build order"):** C8 core →
  C8 `quality` namespace → this gate's Phase 0–1 → Phase 2 (learning loop online)
  → C8 librarian → remaining namespaces → this gate's Phase 3–4. Build C8's core
  first; every step in both plans reads or writes it.

---

## Cost, risk, and what NOT to build

- **Cost is dominated by re-renders**, hence the hard `watchMaxRerenders` cap and
  autonomy gating. Structural checks are free; frame vision is cents; temporal is
  the expensive tier, gated behind escalation only.
- **Anti-reward-hacking:** shadow-mode + outcome-audit graduation stops the agent
  gaming its own criteria; the static baseline is immutable; the compliance floor
  never auto-publishes on risk. Raw outcomes stay immutable in the DB.
- **Vendor:** Tier-2 adds TwelveLabs *or* leans on the existing Gemini key —
  decided at Phase 3, not before.
- **Do NOT build:** a multi-agent debate/jury, a learned router, or a parallel
  QC system. Keep the state machine as orchestrator; fan-out lives only inside the
  gate (parallel criteria → synthesizer) and in competitor research. (Reaffirms
  `Fable5-Agentic-Harness-Plan.md §C7`.)

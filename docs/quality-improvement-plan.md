# Quality-Improvement Plan — Upfront Quality to Cut Backend Spend

> Audit date: 2026-06-27 · Scope: operator quality gates that determine **idea**,
> **script**, and **video/image/asset** quality, and the cost/re-run machinery
> behind them.

## The one-sentence diagnosis

**Almost every quality gate in this pipeline fires *after* the money is spent.**
The architecture is "generate → critique → regenerate," not
"validate → prevent → generate once." That ordering is the root cause of
avoidable re-run and QC spend — and it is fixable mostly by *moving* gates
earlier, not by adding new ones.

## Where the gates sit relative to spend

```
IDEA ──▶ SCRIPT ──▶ VOICEOVER ──▶ FLUX stills / AI video ──▶ RENDER ──▶ [GATES FIRE HERE]
 │         │          (cached)      ($$ uncached, biggest)      │          QC, frame-critic,
 │         │                                                     │          editorial guard,
 no hard   one QC                                               │          auto-fix re-render
 score     revision                                            then critique → re-bill FLUX/video
 gate      (good)
```

| Stage | Gate that exists | Model | Fires… | Problem |
|---|---|---|---|---|
| **Idea** | SKIP flag (`score<5`) on intel path; **none** on operator path | haiku / none | — | Operator inserts topic as `status:"approved"` and builds immediately (`operator.ts:467,478`). `planNextTopic` returns **no score**. A weak idea proceeds to full build with zero numeric gate. |
| **Dedup** | exact normalized-title match (intel) / soft LLM hint over last 15 titles (operator) | — | idea | No fuzzy/semantic match. Near-dupes pass and are **never rechecked** before publish — "reused content" is the app's own stated #1 risk (`guardrails.ts:11`). |
| **Script** | `gateScriptForAutoPilot` QC ≥ `7.0`, **one** revision | haiku | pre-assets ✅ | The one well-placed gate. Single holistic 0–10 score, no sub-scores. |
| **Editorial** | `editorialGuard` (`fail` blocks) | haiku | **post-render** ❌ | Reads the *finished* 6000-char script at `FINAL_REVIEW` (`operator.ts:647`). Legal/factual/spam rejects happen only after script+VO+visuals+render are paid for. |
| **Assets (QC)** | `COPILOT_AUTO_APPROVE_SCORE=7.5` | haiku | post-gen | Scores a **text summary** of assets (provider/shotType/duration), not the pixels (`engine.ts:179`). |
| **Pixels** | frame-critic, threshold `7`, ≤2 re-renders, $1 cap | sonnet | **post-render** ❌ | Critique-after-spend. Re-renders re-bill FLUX/video. Well-bounded, but reactive. |

## Where the money actually leaks

1. **FLUX stills and AI-video clips are uncached.** `vo_cache` (voiceover) is the
   *only* content cache. Every revision/re-run deletes and regenerates **all**
   vo/clip/thumb/captions (`engine.ts:546-550`) — unchanged beats re-bill. AI
   video runs up to **$8/video**; FLUX dev $0.025/still.
2. **No idea-stage gate** — a bad concept consumes a full ~$8 build before any
   human or model judges it.
3. **The editorial gate fires last**, so legally/factually broken content burns
   the entire production budget before rejection.
4. **No-key / mock degradation silently removes all gates.** With
   `ANTHROPIC_API_KEY` absent: `planNextTopic→null`, `editorialGuard→pass`,
   QC→constant `6`, frame-critic→mock `8`. If asset providers (fal) are live but
   the quality models are mocked, **you pay for generation with zero quality
   enforcement.**
5. **Blank-but-downloaded FLUX images are accepted unconditionally** — no byte
   inspection. A dead generation is only caught later by the frame-critic (a full
   render round), and only if it is live.
6. **Human revisions are uncapped** (`engine.ts:3179`) — each re-bills the whole
   stage.

---

## Tier 1 — Move gates before spend (biggest lever, low effort)

### 1. Hard idea-score gate before `startBuildRun`
A $0.002 haiku call gates an ~$8 build. Have `planNextTopic` return a numeric
`score` + `rationale` (it already returns a structured `PlannedTopic`), and
refuse / queue-for-review below a threshold instead of inserting
`status:"approved"` unconditionally. **Single highest-ROI change.**
- Touch points: `operator.ts:467`, `guardrails.ts:98`.

### 2. Run `editorialGuard` on the *script*, not the finished video
Move the call from `FINAL_REVIEW` to right after `gateScriptForAutoPilot`
(pre-assets). A `fail` then costs one script draft, not
script+VO+visuals+render. Keep a lightweight metadata-only re-check at publish.
- Touch points: `operator.ts:647` → `engine.ts:2068`.

### 3. Validate the visual prompt before paying FLUX
Nothing checks a beat's prompt before spend, and the art-director pass is
best-effort / skipped without a key. A cheap structured check (concrete subject?
on-brand? distinct from sibling beats?) before `makeBeatClip` prevents the most
common re-roll cause.
- Touch points: `engine.ts:709`, `art-director.ts:26`.

---

## Tier 2 — Cache + partial regen (kills re-bills on revision)

### 4. Cache FLUX stills the way VO is cached
Add a `flux_cache` keyed by `sha256(prompt + quality + model)`, mirroring
`vo_cache`. An unchanged beat on revision then costs **$0** instead of
re-billing.
- Pattern: `engine.ts:431-513` (vo_cache).

### 5. ASSETS revision should regenerate only *changed* beats
Today a revision deletes and regenerates everything (`engine.ts:546-550`).
`retryClips` already does the partial pattern (only mock/missing beats,
`engine.ts:2493`). Diff the new script/prompt against the prior version and
regenerate only beats that actually changed. With #4, a one-beat fix costs one
beat.

### 6. Cheap byte-check on generated stills before accepting
File size / dimensions / solid-color-or-black detection before the render.
Catches dead FLUX generations for ~$0 instead of a wasted render +
frame-critic round.
- Touch point: after `engine.ts:762`.

---

## Tier 3 — Close blind spots & turn learning into prevention

### 7. Refuse to spend on generation you cannot QC
If fal/video providers are live but `isQcLive()` / vision model are mocked,
block or loudly warn. Paying for assets with constant-`6` QC and mock-`8`
critique is pure waste.
- Touch points: `engine.ts:2074`, `frame-critic.ts:172`.

### 8. Real semantic dedup against the full catalog
Replace exact-title matching with embedding similarity + threshold across all
prior videos (not just the last 15). Prevents producing near-duplicate videos —
wasted build *and* algorithmic self-cannibalization.
- Touch points: `intelligence.ts:116`, `operator.ts:418`.

### 9. Feed `autofix_memory` anti-patterns back into generation prompts
The auto-fix loop already learns winning/losing edits (`foldMemory`, ±0.3
deltas) — but only to fix *after* the fact. Inject those anti-patterns into the
art-director / script prompts so the same mistakes are not generated in the
first place. Turns a post-hoc repair system into upfront prevention.
- Touch point: `autofix.ts:113`.

### 10. Cost-aware cap on human revisions
Unbounded today. A soft cap + "this is revision #4, $X spent on this video"
nudge stops silent revision spirals.
- Touch point: `engine.ts:3179`.

---

## The mental model shift

The current spend curve is **generate-heavy, gate-late**. The cheapest dollar is
the FLUX/video call you *never make* because a $0.002 idea/script/prompt gate
caught the problem upstream. **Tier 1** (items 1–3) moves the three latest, most
expensive gates ahead of asset spend; **Tier 2** (4–6) ensures that when you do
revise, you pay only for what changed; **Tier 3** (7–10) closes the
mock/fallback blind spots and converts post-hoc learning into prevention.

## Suggested sequencing

1. Tier 1 #1 (idea gate) + Tier 2 #4 (FLUX cache) — highest ROI, contained.
2. Tier 1 #2, #3 — reorder editorial + add prompt pre-check.
3. Tier 2 #5, #6 — partial regen + byte-check.
4. Tier 3 — dedup, mock-spend guard, memory feedback, revision cap.

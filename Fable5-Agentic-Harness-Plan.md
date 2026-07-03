# Fable5 — Quality Gates Assessment & Agentic Harness Plan

**Date:** 2026-07-03 · **Basis:** the post-Phase-1–8 codebase on `main`, plus
web research (July 2026) on LLM-as-judge practice, orchestration patterns,
agent memory, bandits, cost routing, and YouTube ranking/monetization levers.
Citations inline; this doc is the build plan for the next tier of the studio.

> **Build status (2026-07-03):** Harnesses **C1–C6 are all IMPLEMENTED** on
> `main` (see the `harness CN:` commits; migrations 0035–0038 apply via the DB
> Migrate workflow). Part B criteria shipped: the script-stage checks as C1
> rubric content + lints, the **FLUX relevance-to-narration check (B3)** in the
> pre-pay visual gate, and the **engaged-views / retention analytics columns
> (B4)** in the nightly snapshot (impression CTR stays null — the Analytics
> API doesn't expose it). C5 (format-level Thompson sampling) is live but
> stays exploration-only until a channel clears ~8 published videos. Remaining
> open items are the small polish follow-ups in "Next steps".

---

## Part A — What the quality system is today (honest inventory)

After Phases 1–8, a video passes through **five gate clusters**, all
Settings-tunable via `quality_gates`:

| Stage | Gates now in place |
|---|---|
| **Idea** | score floor (`gateIdea`, one improvement round), lexical near-dup, semantic (pgvector) near-dup, operator taxonomy-gap planning, performance-weighted ranking after cold start |
| **Script** | QC review score + revise-once loop, editorial guard (legal/spam/metadata), **prose fact-check** (search-grounded, risk cap holds the gate), QC-lessons fed into generation |
| **Pre-spend assets** | fail-closed (paid provider live + grader mocked → block), budget reservation before the batch, FLUX prompt pre-check, seed-still vision gate, blank-still pixel check, pHash variety re-roll, art-director prompt refinement |
| **Post-render** | frame critic (vision, stick/footage rubrics), data-viz chart verification, thumbnail vision-pick, bounded auto-fix loop (critique → fix → re-render), final QC → privacy mapping, editorial re-check at publish |
| **Learning** | QC lessons → script prompts, autofix memory → art director, optimizer insights with **canary auto-apply/auto-revert**, retention-curve → beat-level evidence → optimizer, channel strategy/mix tilt, earned-tier promotion |

**Strengths:** gates sit *before* spend; every threshold is tunable; the loop
now closes autonomously (canary) with a bounded blast radius; failures hold
instead of waving through.

**The four honest gaps, which Part C's harnesses address:**

1. **Scores are scalar and uncalibrated.** Every judge (QC, critics, idea
   gate) emits 0–10 scores that have never been checked against *your*
   judgment or against real outcomes. Research is unambiguous that decomposed
   binary criteria beat Likert scales and that judges must be calibrated
   against a human-labeled set ([Husain, LLM Evals FAQ, Jan 2026](https://hamel.dev/blog/posts/evals-faq/)).
2. **One artifact per stage.** The pipeline generates one script, one title,
   one thumbnail phrase, then judges it. Best-of-N + selection is the
   strongest-evidenced quality lever for creative artifacts and is nearly
   free on the Batch API ([parallel-vs-sequential studies, 2025–26](https://arxiv.org/pdf/2604.05868)).
3. **Same-model self-judging.** Claude writes the script and Claude (same
   family, often same tier) scores it — the documented self-preference bias
   ([bias surveys, 2026](https://arxiv.org/pdf/2602.02219)). Nothing audits whether QC scores predict retention.
4. **Learning writes are not evidence-gated.** Autofix memory folds
   critique deltas (good), but nothing expires stale lessons, caps playbook
   size, or requires analytics evidence before a lesson persists — the
   documented memory-degradation failure mode ([Useful Memories Become Faulty, 2026](https://arxiv.org/pdf/2605.12978)).

---

## Part B — Pre/post quality improvements per artifact

Grounded in the July-2026 research. Two platform facts frame everything:

- **Ranking rewards *satisfaction*, not just watch time.** YouTube's discovery
  lead (Todd Beaupré, 2025) confirms ranking blends CTR/watch-time with
  survey-measured satisfaction and per-context weights — satisfaction is
  deliberately hard to game ([SEJ, 2025](https://www.searchenginejournal.com/how-youtubes-recommendation-system-works-in-2025/538379/)). The gate question is not "is this
  video pretty?" but "does it deliver the promise fast enough that a human is
  glad they clicked?"
- **"Inauthentic content" enforcement is existential.** The July-2025 YPP
  rename targets templated, mass-produced output; fake-trailer channels were
  demonetized then *terminated* (Dec 2025), and ~18 AI-slop channels were
  removed early 2026 ([Tubefilter, Jan 2026](https://www.tubefilter.com/2026/01/29/youtube-ai-slop-channel-crackdown-bans/)). Differentiated scripts and
  editorial value per video aren't optional polish — they're survival.

### B1. Idea stage
- **Pre:** add a "demand evidence" criterion to `gateIdea` — the idea must
  cite an observed gap (competitor coverage age, search interest, comment
  demand), not just score well aesthetically. The intelligence run already
  fetches competitor data; make the gate consume it.
- **Pre:** score *differentiation* explicitly: "what does this video add that
  the top 3 existing videos don't?" — this is both a quality lever and the
  exact question YPP review asks.
- **Post:** feed idea-gate scores into the outcome audit (C3): ideas that
  scored 9 but produced bottom-quartile retention are evidence the idea
  rubric is miscalibrated.

### B2. Script stage
- **Pre (highest-leverage):** a dedicated **hook gate**. ~55% of viewers are
  gone by 60s platform-wide; YouTube's own guidance says establish value in
  ~7 seconds. Judge the first two beats *in isolation* against binary
  criteria (payoff promised ≤2 lines? title promise addressed? zero
  throat-clearing?) and best-of-4 the hook (C2) even when the rest of the
  script is single-shot.
- **Pre:** promise-match check — an explicit criterion that the script
  delivers what the title/thumbnail promise, early. Mismatch is the #1
  documented cause of the first-30s retention cliff *and* a satisfaction
  penalty.
- **Pre:** pattern-interrupt structure: require a beat-type change (visual
  mode, question, stat, story turn) at least every ~35–45s of narration;
  enforceable as a cheap structural lint on beats, no LLM needed.
- **Post:** the retention overlay (built in Phase 4) already names
  viewer-loss beats; route those beat *types* into the script rubric as
  negative criteria — closing script-learning to real audiences.

### B3. Image / visual stage
- **Pre:** keep the seed-vision + variety gates; add a **relevance-to-
  narration** binary criterion to the FLUX prompt pre-check (stock-footage
  "wallpaper" unrelated to the script is a repeatedly-cited failure mode of
  dead faceless channels).
- **Post (cheap first):** ffmpeg structural QC on every render — black frames
  (`blackdetect`), frozen frames (`freezedetect`), silence gaps
  (`silencedetect`), and **loudness**: master/verify -14 to -16 LUFS
  integrated, true peak ≤ -1 dBTP (YouTube normalizes *down* only). These are
  free and run before any vision-model spend (C6).
- **Post:** thumbnails: generate 3 candidates (already done) but stop
  self-judging the winner — push all 3 into **YouTube Test & Compare**, which
  judges by *watch-time share* concurrently, then ingest the winner into the
  playbook. Note its limits: desktop upload flow, no Shorts.

### B4. Video / publish stage
- **Pre-publish gate list** (the operator-consensus checklist, mostly
  automatable): LUFS/true-peak in range → no black/frozen frames or >1.5s
  silences → captions uploaded as corrected SRT (not auto-captions) → first
  3s and first 30s reviewed as a standalone clip → title/thumbnail promise
  matches content → **AI-disclosure decision recorded** (required for
  realistic synthetic scenes/voices; generally not for stylized VO+stock
  explainers) → metadata/end-screens set.
- **Post:** Shorts must track **engaged views** (Advanced Mode), not raw
  views — since Mar 2025 any swipe-past counts as a "view"; the algorithm and
  the 10M/90d YPP track run on engaged views. Add engaged-view and
  swipe-away-rate columns to stats ingestion; benchmark: <15% 3-second
  swipe-away is exceptional, >35% is a hook failure.
- **Post:** segment CTR **by traffic source** in the optimizer's inputs
  (Search CTR runs ~10%+, Browse much lower — blended CTR misleads);
  retention benchmarks for calibration: 50–70% avg-viewed for <5-min videos,
  ~35–45% for 5–10 min, ~24% platform average.
- **Post:** loop-construction for Shorts (end frame ≈ first frame) — a
  render-level feature worth an experiment arm in the format bandit (C5).

---

## Part C — Agentic harnesses to build (ranked)

The research consensus for a single-operator studio, in one sentence:
**batch best-of-N generation → one calibrated binary-rubric judge (different
tier than the generator) → one refinement pass → evidence-gated playbook
with expiry → YouTube-native packaging tests + coarse Thompson sampling over
formats → static per-stage model routing on the Batch API.**

### C1. Judge Calibration Harness — build this first
Everything else keys off judge quality, and yours is unmeasured.

- **Rubrics become binary.** Replace each scalar QC rubric with 5–8 atomic
  pass/fail criteria per gate (script: hook-in-first-2-lines, one-idea-per-
  beat, no unsourced stat, payoff-matches-title, length-in-band…). Score =
  weighted pass count, so existing thresholds keep working.
- **A `judge_labels` table + a 15-minute weekly ritual.** The review UI gets
  a thumbs agree/disagree on each QC verdict you see anyway. ~50 labels in,
  compute per-criterion agreement (Cohen's Kappa); rewrite the worst
  criterion; repeat. This is the exact calibration loop from
  [Husain's evals guidance](https://hamel.dev/blog/posts/llm-judge/index.html).
- **De-bias cheaply:** judge with a *different tier* than the generator
  (Sonnet writes → Opus judges at publish gates; Haiku screens), require
  evidence-before-score in the judge prompt, and for pairwise picks run both
  orders and average (position bias).
- **Skip juries.** 2026 results show judge errors correlate across models —
  a 9-judge panel underperformed its best member ([Nine Judges, Two
  Effective Votes, 2026](https://arxiv.org/html/2605.29800)). One calibrated strong judge + a cheap screen
  cascade ([Trust or Escalate](https://arxiv.org/pdf/2407.18370)) is better *and* cheaper.

### C2. Best-of-N Creative Selection (Batch API)
The single biggest quality-per-dollar move available.

- **Where:** titles (5 variants), hooks/first-beat (4), thumbnail phrases
  (5), full scripts for *operator-seeded* videos only (3).
- **How:** generate variants in one Batch API call (50% off, stacks with
  prompt caching → marginal cost of the extra variants ≈ pennies), judge
  round-robin pairwise with order-swap (N≤5 → no bracket needed), then **one**
  refinement pass on the winner. Hybrid beats either pure strategy
  ([ICRL creative-writing, COLM 2025](https://arxiv.org/pdf/2506.06303)).
- **Bound:** hard-cap two refinement iterations pipeline-wide — gains
  plateau by iteration 2–3 ([Self-Refine + replications](https://www.emergentmind.com/topics/iterative-self-refinement)); your revision caps
  already exist, point them at the loop.

### C3. Outcome-Audit Loop (the anti-reward-hacking harness)
Your real reward signal (retention, CTR) arrives days later; the judge must
answer to it.

- Nightly job joins `qc_reviews` scores with per-video analytics at day-7/28.
- Report Spearman correlation of each gate's score vs retention/views in the
  insights feed. **If FINAL-QC score stops predicting retention, the judge is
  being gamed or has drifted** — that's the audit that catches critic-gaming
  ([reward-hacking taxonomy](https://lilianweng.github.io/posts/2024-11-28-reward-hacking/)).
- Feed the correlation into the calibration ritual (C1): criteria that don't
  predict outcomes get rewritten or dropped.

### C4. Evidence-Gated Playbook (ACE-style memory hygiene)
Upgrade `autofix_memory` + QC lessons into one governed memory:

- **Structure:** discrete tagged bullets (stage, niche, confidence,
  evidence-link, created/last-confirmed timestamps) — the Generator →
  Reflector → Curator pattern from [ACE (arXiv 2510.04618)](https://arxiv.org/pdf/2510.04618).
- **Write policy:** a lesson persists only with quantitative evidence (QC
  delta, retention delta, autofix before/after) — never the model's guess
  about why something flopped ([confabulation findings, 2026](https://arxiv.org/pdf/2605.29463)).
- **Hygiene:** cap ~40 bullets/project, embedding-dedup on write (you
  already have pgvector), expire bullets unconfirmed for 90 days, keep raw
  outcomes immutable in the DB (they already are — `qc_reviews`,
  `autofix_runs`, `analytics_snapshots`).
- **Read policy:** retrieve only stage-relevant bullets into prompts (the
  playbook prefix is prompt-cache-friendly).

### C5. Format-Level Thompson Sampling
Not per-video A/B (you don't have the traffic); per-*format* arms.

- Arms = (format × length-band × hook-style × tier), seeded from the
  channel playbook. Each published video = one pull; reward = retention/CTR
  normalized against the rolling channel baseline (handles non-stationarity).
- Thompson sampling, posterior updates weekly, no arm killed before ~10–20
  observations ([bandit practice](https://www.statsig.com/perspectives/bandit-algorithms-vs-ab-testing)); below that it's exploration-only.
- The operator's calendar planner samples from the posterior when allocating
  slots — replacing the current fixed 75/25 rotation with a learned mix.
- **Packaging (thumbnails/titles) stays on YouTube's native Test & Compare**
  (3 variants, watch-share-judged, titles added Dec 2025) — YouTube owns the
  randomization/attribution you can't replicate ([Tubefilter, Jul 2025](https://www.tubefilter.com/2025/07/16/youtube-feature-test-and-compare-titles-thumbnails/)).
  The studio's job: *generate* the 3 candidates (C2) and *ingest* the winner
  back into the playbook (C4).

### C6. Static Model Routing + Batch Everywhere
- **Routing table (no learned router needed at this scale):** Haiku =
  screens, metadata, guardrails; Sonnet = scripts, choreography, art
  direction; Opus = publish-gating judge verdicts only. Production cascades
  report 40–85% cost cuts at near-equal quality ([FrugalGPT](https://arxiv.org/abs/2305.05176), [RouteLLM](https://arxiv.org/abs/2406.18665)).
- **Batch API for everything overnight** (idea scouting, variant fan-out,
  judge screens, weekly optimizer): flat 50% off, stacks with prompt caching
  — cached+batched tokens ≈ 5% of list price. The cron-driven pipeline is
  the canonical fit.
- **Two-layer media QC:** ffmpeg heuristics (black frames, silence, loudness,
  caption presence) on every render — free; vision-model critique only on
  flagged renders + the final pre-publish pass ([media-QC practice](https://promwad.com/news/ai-qc-automated-media-quality-control)).

### C7. Orchestration shape — what NOT to build
- **Keep the state machine as the orchestrator.** Anthropic's own
  multi-agent results (90% lift, but ~15× tokens) apply to *parallelizable
  research*, not sequential shared-context pipelines
  ([Anthropic, Jun 2025](https://www.anthropic.com/engineering/multi-agent-research-system)). Your stages are sequential and share context —
  fan-out belongs only in idea-scouting/competitive research.
- **Skip multi-agent debate** — premature convergence and shared-bias
  reinforcement are documented ([Deliberative Illusion, 2026](https://arxiv.org/pdf/2606.03032)); the
  search-grounded fact-check pass you already have captures the value.
- **Skip juries/panels** (see C1) and **skip learned routers** (static
  routing is safer at this scale).

---

## Part D — Sequenced build plan

| Order | Harness | Effort | Why this order | Status |
|---|---|---|---|---|
| 1 | C1 judge calibration (binary rubrics + labels table + agreement report) | M | every other loop trusts the judge | ✅ shipped |
| 2 | C6 routing + batch + ffmpeg prefilters | S–M | pure cost reduction, funds the rest | ✅ shipped |
| 3 | C2 best-of-N for titles/hooks/thumb phrases | M | biggest quality-per-dollar lever | ✅ shipped |
| 4 | C3 outcome audit | S | keeps 1–3 honest as volume grows | ✅ shipped |
| 5 | C4 playbook governance | M | compounds only after outcomes flow | ✅ shipped |
| 6 | C5 format bandit + Test & Compare ingest | M–L | needs ≥10–20 published videos to matter | ⏳ deferred |

Prereq note: C5's Test & Compare ingestion and C3's day-7/28 joins want the
per-video Analytics OAuth already used by the retention overlay — no new
credentials needed.

---

## Next steps (all harnesses now built)

1. **Feed the calibration data back into the rubric** — the single highest-
   value action, and it needs no code, just operating the loop: label ~50 QC
   verdicts in the review queue (the 👍/👎), let the nightly outcome audit
   accumulate, then rewrite the criteria the calibration card flags as
   most-disputed or non-predictive. This is the payoff of C1+C3.
2. **Let C5 accumulate.** The format bandit is live but exploration-only below
   ~8 published videos; it starts steering the format mix automatically once a
   channel clears that. A `hook-style` arm dimension can be added later once
   hook styles are tagged on videos (arms are `format × length-band × tier`
   today, from the data that's actually recorded).
3. **Optional cost switch:** flip `ANTHROPIC_USE_BATCH=1` once the overnight
   fan-outs (idea scoring, C2 variant generation) dominate spend — the batch
   path is built and falls back to parallel, so it's a one-env-var change.
   See the setup note below.
4. **Wire the governed playbook's visual lessons into the art-director prompt**
   (C4 writes them from autofix deltas and reads script-stage lessons at the
   script gate today; the visual read-side can replace the flat
   `autofix_memory` hint for a fully-governed loop).

### Setting `ANTHROPIC_USE_BATCH`
It's an environment variable, set the same way as every other secret in this
project (per `docs/RUNBOOK.md`): add `ANTHROPIC_USE_BATCH=1` as a **GitHub
repository secret** (Settings → Secrets and variables → Actions), then run the
**Sync Vercel Env** workflow so Vercel picks it up and redeploys — or set it
directly in Vercel → Settings → Environment Variables and redeploy. Unset (or
any value other than `1`) keeps the default real-time parallel path. It only
affects latency-tolerant fan-outs; nothing in the interactive path blocks on
it.

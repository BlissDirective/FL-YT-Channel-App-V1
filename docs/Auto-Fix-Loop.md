# Auto-Fix Loop — self-improving vision optimizer

A bounded, automatic loop that **critiques the rendered video, applies one fix,
re-renders, and re-critiques** — repeating until the video clears a quality bar
or the loop hands it to you for manual review. Every fix is remembered
**per channel**, so the same channel's videos get fixed better over time.

There are **two strategies**, chosen per channel in **Settings → Auto-fix loop**:

| Strategy | For channels | What it edits |
|---|---|---|
| **Animation** (`animation`) | Remotion / stick-figure (`visual_style = stick`) | pose & gesture params · beat timing · framing/safe-zones · captions · background swap · character-consistency lock · full beat re-roll |
| **AI image / clip** (`aiclip`) | Footage / AI-clip (`visual_style = footage`) | re-roll image / rewrite prompt · swap stock/source · reframe (crop/pan-zoom) · captions · VO · may sharpen a beat's visual direction when the script is the root cause |

Each channel picks one strategy and toggles it on/off; any single asset can
override the channel default from its video page.

---

## 1. How a video moves through the loop

```
                 render farm renders the cut → FINAL_REVIEW
                              │
                 ┌────────────▼─────────────┐
                 │  critique (Tier-1 Claude  │   animation: read videos.vision_review
                 │  vision; Tier-2 TwelveLabs│   ai-clip: score the final cut (QC vision)
                 │  on motion/timing flags)  │
                 └────────────┬─────────────┘
                     score ≥ threshold?
                       │yes            │no
                       ▼               ▼
                    DONE        attempts < max & under spend cap?
                 (stays at        │yes                  │no
                  FINAL_REVIEW)    ▼                     ▼
                            apply ONE fix bundle      HELD
                            → status ASSEMBLING    (paused_reason set,
                            → render farm re-renders  manual review)
                                   │
                                   └──→ next sweep re-critiques the new cut
```

- **Trigger score, max re-renders, spend cap** are per-channel
  (`projects.autofix_config = { threshold, maxRenders, spendCapUsd }`).
  Defaults: **fix below 7/10, up to 2 re-renders, $1.00/video**.
- Re-rendering uses the normal render farm: the loop edits the existing assets
  in place and returns the video to `ASSEMBLING`. The farm produces a fresh
  critique the next sweep reads. No render-farm changes are required for the
  animation loop (it already writes `videos.vision_review`).
- When the loop can't get a video to the bar within its budget, it sets a
  visible `paused_reason` and **holds at Final Review** for you.

## 2. When it runs

- **Automatically**, per video and per Build & Post run.
  - The **Auto-Fix cron** (`.github/workflows/auto-fix.yml` → `/api/cron/auto-fix`)
    sweeps every 10 minutes.
  - The **build-runner cron** runs a sweep **before** its auto-pilot finalizer,
    so a weak Build & Post cut is fixed before it can publish. The finalizer also
    defers any video whose loop hasn't converged.
- **On demand** — the **Run now** button on a video's Auto-fix panel runs one step.
- **Off** — set the channel's loop to *Off*, or flip a single asset's override to
  *Off* on its video page.

## 3. The memory — "improves over time"

Stored on `projects.autofix_memory` (one memory per channel):

```jsonc
{
  "playbook":   ["Worked (+1.2): Reframed beat 3 (zoom out, re-centre)", …],
  "priors":     { /* numeric/string defaults that scored well */ },
  "antiPatterns": ["Trimmed captions on beat 2", …],   // regressions — don't repeat
  "stats": { "runs": 14, "improved": 9, "regressed": 2, "avgDelta": 0.7 }
}
```

After each re-render the loop compares the new score to the score before the fix:

- **improved (Δ ≥ +0.3)** → the change is added to the **playbook** (reinforced and
  injected into the next critique/fixer prompt).
- **regressed (Δ ≤ −0.3)** → the change becomes an **anti-pattern** the fixer is
  told to avoid.

Memory is **per-project only** (a brand-new channel starts empty and specialises
to its own content).

## 4. Vision tiers

- **Tier-1 — Claude vision (free-ish).** Runs every pass.
  - Animation: the render farm's stick frame critic
    (`packages/render/src/stick/frame-critic.ts`) writes `videos.vision_review`.
  - AI-clip: the render farm's **footage frame critic**
    (`packages/render/src/footage/frame-critic.ts`) renders mid-beat keyframes of
    the delivered cut and scores them (relevance, framing, captions, variety)
    into the same `videos.vision_review` shape. The loop reads it directly; if
    the farm critic isn't enabled for a channel it falls back to a QC-vision
    synthesis of the final cut.
  - **Keyframe count is adaptive** (`critiqueFrameCount`): `autofix_config.critiqueFrames`
    defaults to `"auto"` — shorts are capped at 8 keyframes, long-form at 15
    (one-per-beat up to the cap) so a 40-beat long-form isn't judged from ~10% of
    its beats. A fixed number can be forced per channel in Settings. Each frame
    costs ~1,800 vision tokens (≈$0.005 on Sonnet); the output budget scales with
    frame count. Returns diminish past ~12, and stills still can't judge motion —
    that's Tier-2's job.
- **Tier-2 — TwelveLabs temporal.** Escalated **only when Tier-1 flags
  motion / timing / pacing** (`src/lib/adapters/twelvelabs.ts` → `wantsTemporalPass`)
  **and** a `TWELVELABS_API_KEY` is configured (verified by the Verify Secrets
  workflow). The escalation is recorded on the audit row (`tier = 'tier2'`); wiring
  the full index→Pegasus upload of the rendered cut is the documented next increment.

## 5. Where everything lives

| Piece | Path |
|---|---|
| Schema | `supabase/migrations/0027_autofix_loop.sql` |
| Engine (state machine, both strategies, memory) | `src/lib/pipeline/autofix.ts` |
| Tier-2 escalation gate | `src/lib/adapters/twelvelabs.ts` |
| Cron route + workflow | `src/app/api/cron/auto-fix/route.ts` · `.github/workflows/auto-fix.yml` |
| Build-runner sweep + finalizer guard | `src/app/api/cron/build-runner/route.ts` · `finalizeAutoPilotVideos` |
| Per-channel config UI | `src/app/projects/[id]/settings/settings-form.tsx` |
| Per-asset override + history + Run now | `src/app/projects/[id]/videos/[vid]/autofix-panel.tsx` |
| Operator actions | `src/lib/actions/autofix.ts` |
| Audit trail | `autofix_runs` table |

## 6. Data model

- `projects.autofix_loop` — `'off' | 'animation' | 'aiclip'`
- `projects.autofix_enabled` — channel master switch
- `projects.autofix_config` — `{ threshold, maxRenders, spendCapUsd }`
- `projects.autofix_memory` — playbook + priors + anti-patterns + stats
- `videos.autofix_enabled` — per-asset override (`null` = inherit)
- `videos.autofix_state` — `{ status, loop, attempts, bestScore, lastScore, actedOnAt, spentUsd, history[] }`
- `autofix_runs` — one row per attempt (`from_score → to_score`, `changes`, `cost_usd`, `tier`, `status`)

## 7. Safety rails

- **Spend cap** per video (default $1.00) — every paid call (vision critique,
  re-choreography, visual re-roll) lands in `cost_ledger` tagged `autofix:*` and
  counts against the cap; exceeding it holds the video.
- **Bounded** — never more than `maxRenders` re-renders, then a human takes over.
- **Idempotent** — the loop only acts on a *new* critique (`actedOnAt` guards
  against re-consuming the same one), so reruns/double-sweeps are safe.
- **Build & Post-safe** — auto-pilot videos are swept before they can publish,
  and the finalizer defers any video the loop hasn't finished with.
- **Per-asset kill switch** — flip any single video to *Off* from its page.

## 8. Animation vs AI-clip — depth

Both loops are now end-to-end with a **real per-keyframe vision critique from the
render farm** and a fixer that re-renders.

**Animation** applies parametric edits (re-choreograph / reframe / caption-trim /
consistency-lock) the renderer honours directly and re-renders with no async wait
(Stick Studio's self-improving loop, Phase 5).

**AI-clip** chooses the fix path by what the flagged beat needs:

- **Synchronous** (re-renders immediately → `ASSEMBLING`): caption enable,
  reframe hints, and a fresh still/stock re-roll via `makeBeatClip`.
- **Asynchronous hero re-roll** (when the beat is an AI motion clip): regenerate
  the i2v seed still, **enqueue a `clip_jobs` row**, and park the video at
  `ASSETS_READY` with `auto_finish`. The clip-queue worker
  (`packages/clips`, every 10 min) regenerates the clip, then its `maybeFinish`
  advances the video to `ASSEMBLING` → re-render → re-critique. The async clip's
  cost is **estimated against the per-video cap up front** (so a pricey model is
  declined and falls back to a still); the worker bills the real cost to the
  ledger when it runs, so there's no double-count.

The footage critic runs on the render farm only for channels whose loop is
`aiclip` (one Claude-vision call per render), writing the same `vision_review`
the UI and loop already understand.

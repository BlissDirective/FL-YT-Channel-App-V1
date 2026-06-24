# Stick Studio — Vision Optimizer Loop

A closed feedback loop that lets Claude *watch* rendered Stick Studio videos and
continuously improve them — motion smoothness, pose readability, character
consistency, story/pacing, action-scene impact — by editing the **parameters**
that drive the programmatic renderer (poses, choreography, timing, camera).

Status: **Design / planned (Phase 5+).** Grounded in a review of
[`DojoCodingLabs/remotion-superpowers`](https://github.com/DojoCodingLabs/remotion-superpowers),
whose `/review-video` + TwelveLabs loop is the inspiration.

---

## 1. What we're borrowing (and what we're not)

`remotion-superpowers` is a Claude Code plugin wrapping Remotion with five MCP
servers (TwelveLabs, Pexels, ElevenLabs, Replicate, KIE/Suno). Its headline
feature is **`/review-video`**: render → TwelveLabs watches → critique → fix →
re-render.

| From the repo | Verdict for us |
|---|---|
| **TwelveLabs video understanding + the render→review→fix loop** | **Adopt the idea.** This is the missing "eyes" for our optimizer. |
| Suno background music | Nice-to-have we lack; not core to this loop. |
| Replicate / Veo / Kling / FLUX, Pexels, ElevenLabs | We already have equivalents (fal + Pexels + ElevenLabs) — no change. |
| The plugin architecture | N/A — it's a single-user local Claude Code tool; ours is a deployed, multi-project autonomous studio. We adopt the **concept**, integrate via our **adapter** pattern (API, not MCP). |

## 2. Why a vision loop is *exceptional* for Stick Studio specifically

Their loop runs on **AI-generated footage**, where "fix it" means *re-prompt and
pray* — you can't surgically fix a walk cycle in a Veo clip. **Our stick figures
are programmatic** (`Pose` keyframes in `poses.ts`, `StickScene` params, the
choreographer, beat timing). So a critique maps to **exact, tunable levers**:

> *"The walk at 0:04 looks stiff and the character slides"* → bump knee-bend
> amplitude + foot-plant in `poses.ts`. *"The fight at 0:11 lacks impact"* → add
> `impact` fx + `shake` + a hold frame. *"Pacing drags 0:14–0:20"* → shorten
> those beat durations.

That makes the loop **convergent** on a parametric renderer — the flywheel
compounds far better than for generative video. We also already proved *half* of
it: tuning the walk/crawl/panic poses this build came from rendering
`StickSheet`/`StickShowcase` PNGs and critiquing the images. Automating that is
the natural next step.

## 3. Architecture — a hybrid, two-tier vision loop

Use the cheapest tool that catches each class of problem.

**Tier 1 — Claude vision on sampled frames (cheap, fast, already demonstrated).**
Render a few keyframe PNGs per scene (`packages/render/scripts/shoot.mjs` already
does this) and let Claude's own vision critique **pose readability, composition,
safe-area, caption legibility, character consistency**. Near-free, no new vendor,
can run on every video.

**Tier 2 — TwelveLabs on the full clip (paid, temporal).** Reserve TwelveLabs
(its **Pegasus** generative model) for what only video understanding catches:
**motion smoothness, timing/pacing, action-scene impact, scene variety, dead air,
hook strength over time.** It returns a timestamped critique against a rubric.

### Three scopes (map onto the Phase 5 loops in the design doc)

1. **Per-video polish loop** — opt-in, bounded to ~2 iterations: render → review →
   Claude re-choreographs the flagged beats / nudges timing & camera → re-render →
   re-review → publish once it clears a score bar. This is a *visual* extension of
   the existing QC system (`qc_reviews` / `reviewGate`).
2. **Rig-improvement backlog (the compounding one)** — aggregate recurring
   *action-level* complaints across many videos ("run looks floaty" ×6 this week)
   → Claude proposes `poses.ts` constant changes → auto-render `StickSheet` →
   vision/human approve → merge. **Every fix improves all future videos.**
3. **Performance flywheel** — TwelveLabs is the *pre-publish aesthetic judge*;
   YouTube retention is the *post-publish market judge*. Feed both into the
   optimizer so the choreographer learns what scores **and** what retains.

## 4. Concrete integration (fits our existing patterns)

- **`src/lib/adapters/video-review.ts`** — mirrors `highlights.ts` /
  `stick-choreographer.ts`:
  `reviewRenderedVideo(url, { focus }) → { score, issues:[{ atSec, category, severity, fix }], strengths }`.
  Cost logged to the ledger; deterministic mock fallback when no key. Called via
  HTTPS API, not MCP (we're a deployed app). TwelveLabs can index from a **signed
  R2/Supabase URL**, so either the render farm or the app can call it.
- **A `polish` stage** between the `FINAL_REVIEW` render and publish, gated by a
  project flag + a per-video iteration/$ cap (async, never synchronous UX).
- **A critique→param mapping layer** routing each issue to the right lever:
  pose constant vs. beat re-choreograph vs. timing/camera vs. the rig backlog.

## 5. Caveats — pilot before committing

1. **Does TwelveLabs critique *stick art* well?** It's trained on real-world
   video; abstract stick animation may get vaguer descriptions. Motion/timing
   should be fine; fine character nuance is unproven. **→ 1-day pilot:** index 3
   stick renders, ask Pegasus targeted questions, judge whether the critique is
   *actionable and accurate*. Go/no-go on Tier 2.
2. **Cost + latency.** Indexing isn't free and adds minutes — so this is an
   **async, opt-in, budget-capped** loop. Cap iterations (≤2) and only run Tier 2
   on videos that fail the free Tier-1 bar.
3. **Convergence.** Vision-in-the-loop can oscillate — fixed rubric + hard stop
   conditions (max iterations or score plateau).
4. **Ship Tier 1 first** — it's free, already proven, and catches a lot.

## 6. Recommended build order

1. **TwelveLabs pilot** (1 day) — validate critique quality on our art. Decides Tier 2.
2. **Tier 1 frame-critique loop** — automates the manual pose-tuning done by hand.
3. If pilot passes → **Tier 2 per-video polish loop** + the **rig-improvement backlog**.
4. Wire both into the existing **QC + optimizer** so it's one quality brain.

---

## 7. How to get a `TWELVELABS_API_KEY`

TwelveLabs powers Tier 2 (full-clip temporal review). A **free tier** is enough
for the pilot.

1. Go to **[twelvelabs.io](https://www.twelvelabs.io/)** → **Get started / Sign
   up** (or the dashboard at **[playground.twelvelabs.io](https://playground.twelvelabs.io/)**).
   Sign up with email or Google.
2. Verify your email and finish onboarding.
3. In the **Dashboard → API Key** section, copy your **API Key** (one is
   generated on signup; you can regenerate it there).
4. *(Concepts you'll use in the adapter)* TwelveLabs works in two steps:
   **create an Index** (a bucket configured for the **Marengo** embedding engine
   and/or the **Pegasus** generative engine), then **upload/index a video**
   (from a file or a **public/signed URL**), then **analyze/generate** against it
   (Pegasus "analyze" with a prompt → the critique). The pilot can do this
   straight from the dashboard before we write code.
5. **Free tier limits:** the Free plan includes a monthly allotment of indexing
   minutes + generative tokens (enough for a pilot of a few short clips). Check
   current limits on the **Pricing** page; upgrade to Developer/pay-as-you-go
   only once the loop proves out.

### Where the key lives

The review loop runs wherever the rendered MP4 / its signed URL is available:

- **Render farm (GitHub Actions)** — most likely home (it already has the file).
  Add **`TWELVELABS_API_KEY`** as a **GitHub repository secret**
  (Settings → Secrets and variables → Actions → New repository secret), exactly
  like the YouTube OAuth secrets.
- **Vercel (app)** — only if the app itself calls TwelveLabs with a signed render
  URL. If so, add it to the `sync-vercel-env.yml` upsert list so it syncs from the
  GitHub secret, like the other app keys.

> Until `TWELVELABS_API_KEY` is set, the `video-review` adapter runs its
> deterministic mock (no Tier-2 review), exactly like every other provider
> adapter in the studio — so the pipeline never breaks on a missing key.

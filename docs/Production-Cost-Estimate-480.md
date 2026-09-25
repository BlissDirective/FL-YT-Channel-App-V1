# Production Cost Estimate: 480 Videos, 4 Channels

> Scope: 4 channels × 120 videos = **480 videos**.
> - **240 shorts** at 30–160s (planning average **95s**)
> - **240 longs** at 4–15 min (planning average **9.5 min / 570s**)
>
> Produced near-fully autonomously on the locked stack:
> - **Higgsfield Cinema Studio 4.0** for every video section
> - **SOUL Standard** for in-video stills
> - **Genjutsu** for The Silicon Layer avatar
> - Claude on the **lean** profile
>
> Prepared 2026-09-25. Per-video clip costs come from the app's own tier logic
> (`selectClipBeats`) at Higgsfield's published "from" prices.

---

## 1. Headline

| Scenario | Higgsfield | Claude (Anthropic) | Other app costs | **Total** |
|---|---|---|---|---|
| **A. Cinema tier (as configured): every section is a Cinema Studio clip** | **≈ $38,900** | ≈ $800–1,200 | ≈ $700–1,200 | **≈ $40,400–41,300** |
| B. Premium tier with the lock: Cinema Studio heroes + ~1 b-roll/min, rest stills/stock | ≈ $12,200 | ≈ $800–1,200 | ≈ $700–1,200 | **≈ $13,700–14,600** |
| C. Mixed: shorts on Cinema, longs on Premium | ≈ $14,200 | ≈ $800–1,200 | ≈ $700–1,200 | **≈ $15,700–16,600** |

The app is **configured for Scenario A**, the "all sections" instruction. It
is the dominant cost: long-form full coverage alone is ~$28k. Switching the
autonomous tier is one setting, per project or via `VIDEO_MODEL_LOCK` /
operator config.

---

## 2. Higgsfield (primary)

### Cinema Studio 4.0: $0.2057/s ("from" price)

| | Per short | Per long | 240 shorts | 240 longs | **Subtotal** |
|---|---|---|---|---|---|
| **A. Cinema (full coverage)** | 96s → **$19.75** | 570s → **$117.25** | $4,740 | $28,140 | **$32,880** |
| B. Premium (locked) | 60s → $12.34 | 130s → $26.74 | $2,962 | $6,418 | $9,380 |
| B′. Platinum (locked) | 65s → $13.37 | 120s → $24.68 | $3,209 | $5,923 | $9,132 |
| Economy (locked) | 24s → $4.94 | 24s → $4.94 | $1,186 | $1,186 | $2,371 |

- **Re-roll / QC regeneration buffer: +15%.** That makes A ≈ **$37,810** and B ≈ **$10,790**.
- Per-business concurrency and exact 720p pricing come from `POST /estimate` at
  runtime, and the ledger records the quoted price.
  - ⚠️ **"From" is the floor.** If 720p is priced above the floor, scale the
    numbers above proportionally. The first live clips will show the true
    rate in the Costs page.

### SOUL Standard stills: $0.0938/image
- One keyframe per section: ~6 per short and ~15 per long, so
  **5,040 stills ≈ $473**.
- With multi-image extras and re-rolls (+30%): **≈ $615**.

### Genjutsu (The Silicon Layer avatar): $0.318/s ($0.159/s promo until Oct 1)
- Assumption: host intro + outro ≈ 20s per video × 120 videos = 2,400s.
- That gives **≈ $760** at list price, or ≈ $380 if generated before Oct 1.
- If the host is on screen for more of each video, scale linearly. For
  example, 25% of runtime on all 120 videos ≈ $5.2k.

### Higgsfield totals
- **A ≈ $38,900**
- **B ≈ $12,200**

---

## 3. Claude / Anthropic (lean profile)

**Running (critical only):**
- Scripting: outline and script
- Research and fact-check, pronunciation
- Director decisions: visual bible, shot planner, art director, stick
  choreography
- Quality: QC gates with Haiku screening plus Opus escalation, seed-still and
  beat-relevance vision, render frame critique, auto-fix
- Editing: highlights, dataviz, thumbnail pick, MVDA cut agent where enabled

**Paused:** intelligence, optimizer, editing research, librarian, video-intel
queue and competitive judge.

| | Per short | Per long | 480 videos |
|---|---|---|---|
| Core pipeline (~30–45 calls short / 50–80 long) | ~$0.75 | ~$1.75 | $600 |
| QC Opus escalations + auto-fix (avg) | ~$0.40 | ~$0.40 | $190 |
| **Lean subtotal** | | | **≈ $790** |
| + MVDA agent cut session on every video (optional, ~$0.80) | | | +$385 |

**Range: ≈ $800–1,200.** Before the lean profile, the six paused background
jobs added a recurring daily and weekly spend (video-intel runs Sonnet
vision every 30 min).

### Further savings not yet enabled (candidates)
- **Prompt caching.** No request sets `cache_control` today. The script and QC
  system prompts are large and repeated, so caching could save roughly 30–50%
  of input cost.
- **Batch API** for non-urgent judging (title/thumbnail variants) is 50% cheaper.
  A helper exists but is unused.
- The autofix default model id `claude-sonnet-5` isn't in the price table, so
  the ledger over-reports it at the Opus rate. Actual spend is lower.

---

## 4. Other app costs

| Item | Estimate | Notes |
|---|---|---|
| ElevenLabs voiceover | **$400–700** | ~1.4k chars per short, ~8.5k per long → **~2.4M characters** (+10% retakes). Fits a Scale-type plan (~2M chars/mo) across the production months. *Verify current plan pricing.* The fal Kokoro fallback would be ~$50 total. |
| GitHub Actions minutes | $100–150 | Remotion renders (~30 min per long, ~8 min per short ≈ 9k min) + clip worker (~3–4k min at 4 lanes). Linux overage ≈ $0.008/min past the free allowance (private repo). |
| Storage (Supabase / R2) | $25–60/mo | ~75 GB of clips + ~130 GB of renders. R2 has zero egress and is already supported for renders. |
| Vercel | $20/mo | Existing Pro plan |
| fal (fallback only) | ~$0–200 | Only on Higgsfield outages/failures, plus lip-sync avatars if used |
| Pexels | $0 | |
| **Subtotal** | **≈ $700–1,200** | over a ~2–3 month production run |

---

## 5. Cashback reality check (important)

- **Terms:**
  - Higgsfield pays **$1 of cashback per $1 of API usage** until
    **2026-10-01 00:00 UTC** (Sep 30, 8pm EDT).
  - **Unused cashback expires on that same date.**
  - Cashback is spent first at **standard (non-discounted)** prices.
  - A verified **business** email domain is required.
- **What it means here:** it's effectively *"generate $X before the deadline,
  get up to another $X of generation before the deadline."* It does **not**
  carry into October. It helps **only** for footage generated in the next ~5
  days.
- **Throughput is not the blocker:**
  - At 4 parallel lanes the worker does ~100 clips/hour.
  - The **pipeline is the blocker**: projects must exist, ideas and scripts
    must be approved, and the operator seeds **1 video/day/channel**
    (`dailyCap`).
- **To use the window:**
  1. Stand up the 4 channel projects now.
  2. Queue batch build runs (up to 6 videos per run) instead of waiting on
     the daily autopilot.
  3. Have the Higgsfield account's business verification done first.
- A realistic outcome is a few hundred to a few thousand dollars of cashback
  value, not the full ~$39k.

---

## 6. Controls now in the app

| Control | Default | Where |
|---|---|---|
| Model lock (Cinema Studio for every AI section) | **on** | `VIDEO_MODEL_LOCK` (`off` restores the per-tier mix) |
| Autonomous tier | **cinema** | operator defaults; UI tier pickers default to Cinema |
| Spend caps (monthly video cap, per-video + monthly project budgets, per-video clip budget, operator 30-day cycle budget) | **suspended** | `SPEND_CAPS_ENABLED=true` re-enables (Vercel env + Actions repo variable) |
| Claude profile | **lean** | `AI_SPEND_PROFILE=full`, or `AI_ENABLE_JOBS=optimizer,…` |
| Clip worker parallelism | 4 lanes | `CLIP_CONCURRENCY` repo variable (match the Higgsfield console limit) |

Still enforced by design:
- The Custom tier's own per-run price cap (you set it explicitly).
- The auto-fix per-video cap ($1).
- The MVDA agent session budget.
- The editing-research cap. That job is also paused under lean.

# Full Auto-Generate — Video Quality Tiers

Spec for the quality/cost tiers offered by the **Full Auto-Generate** feature
(the one-click path that takes a `SCRIPT_READY` video through VO, stills, AI
clips, and render with no per-beat operator input). This revises the original
four-tier lineup (`economy / base / mid / platinum`) into five clearer tiers
with a hard cost floor and a fully operator-driven Custom tier.

Source of truth in code:
- Tier specs → `src/lib/adapters/auto-tiers.ts`
- Model registry + pricing → `src/lib/adapters/video-models.ts`
- Orchestration → `fullAutoGenerate()` in `src/lib/pipeline/engine.ts`
- Beat selection + cost estimate → `selectClipBeats()` / `estimateTierCost()`
- Tier picker UI → `FullAutoPanel` in
  `src/app/projects/[id]/videos/[vid]/video-gen.tsx`

---

## 1. Concepts & terminology

- **Accent** — an AI-generated video clip dropped into an otherwise
  still/stock video to add motion. Each accent maps to a `ScriptBeat` whose
  `shotType` is `hero` or `broll`. Beats left as `stock` stay free Pexels
  footage or a Pollinations/FLUX still with a Ken-Burns pan.
- **Hero** — the signature accent of a section: top-quality model, often
  slow-pan hold (`heroHold: true`) to fill a longer beat cinematically.
- **B-roll** — supporting accents: cheaper/faster models, looped or hard-cut.
- **Still + Ken Burns** — a generated still (Pollinations for hero/concept
  beats) or stock image with a slow 1.02×→1.12× zoom. Zero generation cost.
- **VO** — voiceover. All standard tiers use **ElevenLabs Std**
  (`eleven_turbo_v2_5`, ~`$0.167 / 1k chars`). VO is cached per text+voice in
  `vo_cache`, so re-renders of identical narration are free.

All cost figures below assume a **~7-minute video** (~1,050 words ≈ ~6,300
narration chars → VO ≈ **$1.05**; Claude script ≈ **$0.06**; stills + stock =
**$0**). Only the AI-video (accent) spend changes between tiers.

---

## 2. Tier lineup

| Tier | VO | Visuals (base layer) | Accents (AI video) | AI-video models | ~Cost / 7-min |
|------|----|----------------------|--------------------|-----------------|---------------|
| **Base** *(free equivalent)* | ElevenLabs Std | Pollinations stills (hero/concept) + Pexels stock + Ken Burns | **None** | — | **~$1.11** |
| **Economy** | ElevenLabs Std | Stills/stock + Ken Burns | **2–3 accents** | Seedance Fast 8s | **~$1.55** |
| **Premium** | ElevenLabs Std | Stills/stock + Ken Burns | **5–6 accents** (3–4 b-roll, 1–2 hero) | B-roll: Seedance Fast 5–10s · Hero: Seedance 2.0 8–15s | **~$3.00** |
| **Platinum** | ElevenLabs Std | Stills/stock + Ken Burns | **6–8 accents** (3–6 b-roll, 1–2 hero) | B-roll: Seedance 2.0 8–15s · Hero: Kling v2.5-turbo Pro 8–10s* | **~$5.90** |
| **Custom** | ElevenLabs Std | Operator-chosen mix | Hero bookends + length-scaled b-roll | Operator picks hero + b-roll model | Live estimate, price-capped |

\* Kling v2.5-turbo Pro maxes at **10s** (`maxDurationSec: 10`), so a Platinum
hero requested at "8–15s" clamps to **8–10s**. See §5.

The accent counts above are the **~7-min snapshot** — they are not fixed.

### Length scaling & hero placement (all motion tiers)

Accent counts scale with narration length so a tier fits short- and long-form
alike (`selectClipBeats` in `src/lib/adapters/auto-tiers.ts`):

- **Hero bookends (Premium / Platinum / Custom):** the **first and last**
  eligible (non-stock) beats are forced to `hero`, so the video opens and
  closes on a signature shot. Below **3 eligible beats** this collapses to a
  single opening hero.
- **B-roll density:** the middle fills at **~1 accent per 60s** of narration,
  spread evenly. A 90s short → 2 heroes + ~1 b-roll; a 7-min → 2 heroes + ~7
  b-roll; a 20-min → 2 heroes + ~18 b-roll (budget-trimmed — see §3.4).
- **Economy** doesn't bookend; it places `min(ai_clip_cap, ~1/60s)` accents,
  capped at 3.
- **Long-form Platinum (> 6 min):** b-roll drops Seedance 2.0 → **Seedance
  Fast** to keep a long video affordable under the budget.

---

## 3. Tier specifications

### 3.1 Base (free equivalent)
- **VO:** ElevenLabs Std.
- **Visuals:** Pollinations-generated stills on hero/concept beats, Pexels
  stock on filler beats, Ken-Burns pan on everything.
- **AI video:** None — `tierJobForSection()` returns `null` for every beat.
- **Cost:** VO + script only, **~$1.11/video**. This is the hard floor; the
  only way lower is shorter narration or cached VO.
- **Use when:** high volume, testing a topic, or channels where motion isn't
  worth the spend.

### 3.2 Economy
- **VO:** ElevenLabs Std.
- **Visuals:** stills/stock + Ken Burns.
- **AI video:** **2–3 accents**, Seedance 2.0 Fast, **8s**, slow-pan hold.
  Hero beats are picked first; the rest stay stills/stock.
- **Cost:** ~`$0.176`/accent × ~2.5 ≈ **$0.44** AI video → **~$1.55/video**.
- **Use when:** a couple of moving moments lift an otherwise static video
  cheaply.

### 3.3 Premium
- **VO:** ElevenLabs Std.
- **Visuals:** stills/stock + Ken Burns.
- **AI video:** **5–6 accents** —
  - **B-roll (3–4):** Seedance 2.0 Fast, **5–10s**.
  - **Hero (1–2):** Seedance 2.0, **8–15s**.
- **Cost:** b-roll ~3.5 × $0.18 ≈ $0.62 + hero ~1.5 × $0.84 ≈ $1.26 → ~**$1.88**
  AI video → **~$3.00/video**.
- **Use when:** the default for monetized uploads — clearly animated without
  premium-model spend.

### 3.4 Platinum
- **VO:** ElevenLabs Std.
- **Visuals:** stills/stock + Ken Burns.
- **AI video:** **2 hero bookends + ~1 b-roll/min** (see Length scaling) —
  - **Hero (2):** Kling v2.5-turbo Pro, **8–10s**, at the first & last beat.
  - **B-roll:** Seedance 2.0, **8–15s** (≤ 6 min) → **Seedance Fast**, 5–10s
    (> 6 min) to stay affordable.
- **Cost (7-min):** 2 hero (~$1.4) + ~7 Fast b-roll (~$1.3) ≈ **~$2.7** AI
  video. A 4-min on Seedance 2.0 b-roll runs higher (~$4.8); the **$8** cap
  (`max_video_usd`, raised from $4 in migration 0017) keeps it from silently
  downgrading.
- **Use when:** flagship/cornerstone uploads where the cinematic hero matters.

> Note: Veo 3.1 is **no longer** in any standard tier — the top hero model is
> Kling. Veo is reachable only through **Custom** (§3.5), behind the price-cap
> guard, so a $0.40/s model can never run unintentionally from a one-click tier.

### 3.5 Custom
Operator-driven, still one-click once configured. The panel (`FullAutoPanel`
in `video-gen.tsx`) exposes:
- **Hero model** + **B-roll model** — any registry model (Seedance Fast,
  Seedance 2.0, Kling, LTX-2, Wan 2.2, **Veo 3.1 / Veo Extended**).
- **Hero length** + **B-roll length** (clamped to each model's range).
- **Price cap** — a hard per-video USD ceiling.

Placement follows the same **hero-bookend + ~1 b-roll/min** structure as the
standard tiers, using the chosen models.
- **Cap behavior — pause & notify (not silent downgrade):** when the projected
  plan (`selectClipBeats(...).requestedUsd`) exceeds the cap, the Run button is
  disabled and `fullAutoGenerate` returns a pause message — **nothing is
  enqueued or billed** — telling the operator to raise the cap or pick cheaper
  models / shorter clips. (Standard tiers instead downgrade overflow to stills.)
- **Veo confirm:** picking Veo as hero or b-roll surfaces a confirm dialog with
  the projected cost before the run starts.
- **Save as project default:** the recipe is chosen per-video but can be saved
  to `projects.custom_spec` (`saveCustomSpecAction`) and reused.
- **Use when:** a specific shot needs a specific model, or for one-off premium
  (Veo) work.

---

## 4. Model & pricing reference

From `VIDEO_MODELS` in `src/lib/adapters/video-models.ts` (fal catalog, Jun
2026; per-second prices are ledger estimates):

| Model | ID | `usdPerSec` | Duration | Used by |
|-------|----|-------------|----------|---------|
| Seedance 2.0 Fast | `seedance-2-fast` | $0.022 | 4–15s | Economy, Premium b-roll |
| Seedance 2.0 | `seedance-2` | $0.07 | 4–15s | Premium hero, Platinum b-roll |
| Kling v2.5-turbo Pro | `kling-2-5-turbo` | $0.07 | 5 or 10s | Platinum hero |
| LTX-2 (open, long) | `ltx-2` | $0.04 | 6–20s | Custom |
| Wan 2.2 (open) | `wan-2-2` | $0.08 | 5s | Custom |
| Veo 3.1 | `veo-3-1` | $0.40 | 4/6/8s | Custom only |
| Veo 3.1 Extended | `veo-3-1-extend` | $0.40 | 8–29s | Custom only |

Portfolio ceiling: `VIDEO_MONTHLY_CAP_USD = 100` (hard monthly cap across all
generated video, unchanged).

---

## 5. Implementation status

All of the following has been built.

1. **Tier enum (`AutoTier`).** ✅ Now `base | economy | premium | platinum |
   custom`; `AUTO_TIERS`, `FullAutoPanel`, MCP tool, and UI default updated.

2. **`tierJobForSection()` rewrite** ✅ to the §3 matrix, length-aware:
   - `base` → `null` (no AI video).
   - `economy` → `seedance-2-fast` 8s.
   - `premium` → b-roll `seedance-2-fast` 5–10s; hero `seedance-2` 8–15s.
   - `platinum` → hero `kling-2-5-turbo` (10s); b-roll `seedance-2` 8–15s,
     switching to `seedance-2-fast` over 6 min.
   - `custom` → operator's hero/b-roll models + lengths.

3. **Length scaling** ✅ in `selectClipBeats`: hero bookends (first + last
   eligible beat, floor to 1 under 3 beats), b-roll at ~1/60s spread evenly,
   economy capped at `ai_clip_cap` (≤3). Replaces the old fixed per-tier caps.

4. **Per-video budget** ✅ default raised `4 → 8` (`max_video_usd`,
   migration 0017); engine fallback uses 8.

5. **Custom tier** ✅ `CustomSpec` ({heroModel, brollModel, heroSec, brollSec,
   maxUsd}) on `projects.custom_spec` (migration 0018). `FullAutoPanel` Custom
   sub-panel: model/length/cap inputs, live `requestedUsd`, **pause-and-notify**
   on overrun (Run disabled + engine refuses), **Veo confirm** dialog, and
   **save-as-project-default** (`saveCustomSpecAction`).

### Migrations

The chosen tier is passed per-run to `fullAutoGenerate()` and **never
persisted** — there is no stored `tier` column. So the enum rename
(`economy/base/mid/platinum` → `base/economy/premium/platinum/custom`) is
**code-only**; no historical row-remap. The old `base`/`mid` are retired and
`base` is reused as the free (no-AI-video) floor.

- **`0017_tier_revision_budget.sql`** — `max_video_usd` default `4 → 8` and
  lifts projects still on the legacy `$4` (custom budgets untouched). Raising
  the ceiling never increases Base (no AI video) or Economy (capped) spend; it
  only stops throttling the premium tiers.
- **`0018_custom_tier_spec.sql`** — adds `projects.custom_spec jsonb` (the
  saved Custom recipe; null until set).

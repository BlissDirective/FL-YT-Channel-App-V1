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
| **Custom** | ElevenLabs Std | Operator-chosen mix | Operator-chosen, per beat | Any model in the registry (incl. Veo 3.1) | Live estimate, capped |

\* Kling v2.5-turbo Pro maxes at **10s** (`maxDurationSec: 10`), so a Platinum
hero requested at "8–15s" clamps to **8–10s**. See §5.

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
- **AI video:** **6–8 accents** —
  - **B-roll (3–6):** Seedance 2.0, **8–15s**.
  - **Hero (1–2):** Kling v2.5-turbo Pro, **8–10s** (clamped from 8–15s).
- **Cost:** b-roll ~4.5 × $0.84 ≈ $3.78 + hero ~1.5 × $0.70 ≈ $1.05 → ~**$4.83**
  AI video → **~$5.90/video**.
- **⚠ Budget note:** this exceeds the current **$4 default per-video cap**
  (`max_video_usd`). Platinum must ship with a higher default cap (suggest
  **$7**) or `selectClipBeats()` will silently downgrade beats to stills to
  stay under budget. See §5.
- **Use when:** flagship/cornerstone uploads where the cinematic hero matters.

> Note: Veo 3.1 is **no longer** in any standard tier — the top hero model is
> Kling. Veo is reachable only through **Custom** (§3.5), behind the price-cap
> guard, so a $0.40/s model can never run unintentionally from a one-click tier.

### 3.5 Custom
Full operator control, still one-click once configured.
- **VO:** ElevenLabs Std.
- **Per beat / per section:** choose any registry model (Seedance Fast,
  Seedance 2.0, Kling, LTX-2, Wan 2.2, **Veo 3.1 / Veo Extended**) **or** keep
  it as stock/still. Set clip length per beat within each model's min/max.
- **Price cap:** operator sets a **per-video USD cap**.
- **Cap behavior — pause & notify (not silent downgrade):** if the selected
  models/durations would exceed the cap, Full Auto **pauses before enqueuing
  any clip job** and notifies the operator to either (a) raise the cap or
  (b) change models/durations. Nothing is billed until the operator resolves
  it. This differs from the standard tiers, which downgrade to stills to fit
  the budget automatically.
- **Veo confirm:** selecting Veo 3.1 / Veo Extended additionally surfaces a
  confirm dialog with the projected cost before the run starts.
- **Save as default:** Custom selections are **per-video**, with an optional
  "save as project default" so a project can reuse a custom recipe.
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

## 5. Implementation notes

These are the concrete changes to land this spec; they are not yet built.

1. **Tier enum (`AutoTier`).** Replace `"economy" | "base" | "mid" |
   "platinum"` with `"base" | "economy" | "premium" | "platinum" | "custom"`.
   Update `AUTO_TIERS` labels/blurbs and `FullAutoPanel`.

2. **`tierJobForSection()` rewrite** to the §3 matrix:
   - `base` → return `null` for all beats (no AI video).
   - `economy` → `seedance-2-fast`, 8s, capped at 2–3 accents.
   - `premium` → b-roll `seedance-2-fast` 5–10s; hero `seedance-2` 8–15s.
   - `platinum` → b-roll `seedance-2` 8–15s; hero `kling-2-5-turbo`,
     `clampDuration` to 8–10s.

3. **Accent caps.** `tierCapsClipCount()` should cap **economy (2–3)**,
   **premium (5–6)**, and **platinum (6–8)** — currently only economy is
   capped. Pass the cap into `selectClipBeats({ clipCap })`.

4. **Per-video budget defaults.** Raise `max_video_usd` for Platinum to ~**$7**
   (its ~$4.83 AI spend exceeds today's $4 default and would trigger silent
   downgrades).

5. **Custom tier.** New per-video config object (b-roll model, hero model,
   per-beat durations, stock/gen choices, price cap). On launch, compute the
   estimate via `selectClipBeats`; if `totalUsd > cap`, **pause and notify**
   instead of enqueuing (distinct from the standard tiers' fit-to-budget
   downgrade). Add a Veo confirm dialog. Support "save as project default."

6. **Kling clamp.** Kling's `durations: [5, 10]` already make `clampDuration`
   snap a 12s request to 10s — no extra guard needed, but the UI copy should
   say "8–10s" for Platinum hero so the estimate isn't misleading.

### Migration (retire `mid`; remap existing videos)

Old tier values stored on existing videos/projects map by AI-spend level:

| Old tier | New tier | Rationale |
|----------|----------|-----------|
| `economy` | `economy` | Both = a few cheap Seedance Fast accents |
| `base` | `premium` | Old base clipped most beats (fast b-roll + Seedance 2 hero) |
| `mid` | `premium` | Longer Seedance Fast b-roll + Seedance 2 hero |
| `platinum` | `platinum` | Top tier → top tier (hero swaps Veo → Kling) |

The new **`base` (free)** tier has no old equivalent — it's the new floor.
Apply the remap in a migration so historical records resolve to valid enum
values.

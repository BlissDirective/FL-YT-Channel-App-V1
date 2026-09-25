# Higgsfield Integration Plan: New Primary Generation Provider

> **Goal:** Make Higgsfield the **default generation provider for every project/channel**,
> with the **top Higgsfield model selected by default**. fal.ai stays as an automatic
> fallback. Credential: GitHub Actions secret **`HIGGSFIELD_API_KEY`**.
>
> Status: **Core integration built (Phases 1–4).** Researched 2026-09-25
> against docs.higgsfield.ai, the official SDKs and a full audit of this repo's
> fal usage. Cost assessment: [Production-Cost-Estimate-480.md](Production-Cost-Estimate-480.md).

---

## Locked decisions (operator, 2026-09-25) and build status

These supersede the model recommendations in §1 below.

| Role | Locked model | Endpoint | Status |
|---|---|---|---|
| **All video sections (hero + b-roll)** | **Cinema Studio 4.0** | `higgsfield/cinema-studio/4.0` | ✅ Built: `VIDEO_MODELS[0]`, every AI tier locked to it, Cinema tier = every section |
| **In-video images** | **SOUL Standard** | `higgsfield-ai/soul/standard` | ✅ Built: engine stills route through `adapters/media.ts`; FLUX fallback |
| **Avatar animation (The Silicon Layer)** | **Genjutsu motion-transfer** | `higgsfield/genjutsu/motion-transfer/v1.0` | ◐ Adapter built (`animateWithGenjutsu`); pipeline wiring waits on the driving-video decision (below) |
| Fallback | fal (Seedance 2.0 → Kling 2.5 → Seedance Fast; FLUX) | — | ✅ Scored fallback chain + per-provider circuit breakers |

**Built in this pass**
- `src/lib/adapters/higgsfield.ts`:
  - Auth is the combined `HIGGSFIELD_API_KEY` (plus SDK aliases).
  - Submit only retries when nothing was queued. There is no blind re-POST.
  - Polling backs off from 2s to 10s.
  - `/estimate` pricing is ledgered.
  - 401/403 trips the breaker; `nsfw`/`failed` surface as errors.
- `src/lib/adapters/media.ts` is the provider router: Higgsfield first, then fal.
- Registry and selection:
  - `VideoModel.provider`, plus the lock (`VIDEO_MODEL_LOCK`, on by default).
  - Locked beats always pick Cinema Studio, with scored fal alternatives as the fallback chain.
  - Per-provider health: a fal outage no longer benches Higgsfield, and vice versa.
- New **Cinema** tier covers every section, stock included, at the section's
  length. Sections over 30s stitch seamlessly. The operator, UI, MCP and
  workspace all default to it.
- Clip worker (`packages/clips`):
  - Higgsfield submit/poll.
  - Resumable request ids (migration `0077`), and no fallback while a billed
    Higgsfield job is still running.
  - **Parallel lanes** (`CLIP_CONCURRENCY`, default 4) with a 22-minute run
    budget. The old worker did 4 clips per 30 minutes.
- **Spend caps suspended** (`src/lib/spend-caps.ts`). Re-enable with
  `SPEND_CAPS_ENABLED=true`. This covers:
  - the $100/mo video cap
  - the per-video and monthly project budgets
  - the per-video clip budget
  - the operator's 30-day cycle budget
- **Lean Claude profile** (`src/lib/ai-spend.ts`) pauses the intelligence,
  optimizer, editing-research, librarian, video-intel and competitive-judge
  jobs.
- Secrets and observability:
  - `verify-secrets` probes Higgsfield.
  - `sync-vercel-env` pushes `HIGGSFIELD_API_KEY`; `clips.yml` passes it to the worker.
  - Health, credential test, readiness, the capability menu, the system pulse
    and cost-log labels all include Higgsfield.
- Tests: `tests/higgsfield.test.ts` and `tests/higgsfield-lock.test.ts`. Legacy
  tier and cap tests are scoped to lock-off / caps-on.

**Open items**
1. **Genjutsu driving video.** The API is video-to-video: it needs a source
   clip of 4s or more (trimmed to 30s) plus 1–8 avatar images. It is **not**
   audio-driven, so the mouth won't lip-sync to the ElevenLabs narration.
   Options:
   - (a) Record one real "presenter" driving clip and reuse it for
     intro/outro/B-roll host moments.
   - (b) Generate the driving clip once with Cinema Studio.
   - (c) Keep lip-synced talking segments on the fal avatar models, and use
     Genjutsu for non-speaking host shots.
2. **Resolution.** Cinema Studio outputs **720p max**, and the render composites
   and upscales to 1080p. Decide whether that's acceptable for long-form.
3. §4 Phase 5–6 below: Higgsfield reference images in Character Studio,
   stick-figure hybrid tuning, a webhook receiver, and an R2 retention soak test.

---

## 0. Read first: three facts that shape the plan

### 0.1 The cashback ends in ~5 days, and cashback earned also expires then
From the live cashback pool endpoint and the page terms (open.higgsfield.ai/cashback):

- `expires_at: 2026-10-01T00:00:00Z` (**8pm EDT, Sept 30**). It ends early if the $20M pool runs out.
- Cashback is earned **only on paid API usage** ($1 back per $1 spent). **Top-ups alone earn nothing.**
- **Unused cashback expires on the same date.** The main balance stays.
- Cashback is spent first and billed at **standard (non-discounted)** prices.
- Eligibility requires a **verified business email domain** (personal/free domains are rejected) and a card on file.
- There is a per-business cap (`cap_usd`). Third parties say ≤ $100k, but that is **unverified**.

**Implication:** a multi-week integration build will **not** finish in time to benefit.
The cashback only helps if generation happens **before Sept 30, 8pm EDT**. Options:

| Option | What it takes | Value |
|---|---|---|
| **A. Skip the promo** (recommended) | Nothing | Build properly. The Higgsfield promo *per-model discounts* (e.g. Kling 3.0 at $0.046/s vs $0.084 list) are separate and still make it competitive. |
| B. Sandbox sprint | Generate hero/b-roll clips manually in the Higgsfield Sandbox for the first videos this week, then import them as assets | Some value, but the earned cashback must also be *spent* before the deadline, so it is roughly a one-shot doubling |
| C. Phase-1 hotfix | Ship only §4 Phase 1 (adapter + `generateBeatVideo` routing) in 1–2 days | Risky rush. Same expiry problem. |

### 0.2 The API key is a **pair**, stored as one value
Higgsfield keys are a **Key ID + Key Secret**, sent as
`Authorization: Key <KEY_ID>:<KEY_SECRET>`. It is not a Bearer token.

→ **`HIGGSFIELD_API_KEY` must contain the combined `KEY_ID:KEY_SECRET` string.**
If the secret currently holds only the ID or only the secret, update it in
*Repo → Settings → Secrets and variables → Actions*. The adapter will also
accept `HF_API_KEY_ID` + `HF_API_KEY_SECRET` and `HF_CREDENTIALS` as aliases, and the
`verify-secrets` workflow will report which form it found.

### 0.3 Higgsfield doesn't cover everything fal does
| Capability (current fal model) | Higgsfield equivalent | Plan |
|---|---|---|
| Text/image-to-video (Seedance 2, Kling 2.5, Veo 3.1, LTX-2, Wan 2.2) | ✅ Seedance 2.5/2.0, Kling 3.0/O3, Wan 3.0, MiniMax H3, LTX-2.5, Cinema Studio 4.0 | **Move to Higgsfield (primary)** |
| Video extend (Veo 3.1 extend) | ✅ `seedance-2.5/video-extend` | Move |
| Text-to-image stills (FLUX schnell/dev) | ✅ SOUL V2, Z-Image Turbo, Recraft, Ideogram | Move |
| Multi-reference character images (Nano Banana Pro, FLUX-2 Pro) | ✅ Grok Image 2.0 (10 refs), Qwen Image 3 edit, SOUL + Soul ID | Move; keep fal as fallback |
| Talking avatar / lip-sync (Kling AI Avatar, OmniHuman, Fabric, InfiniTalk) | ⚠️ No dedicated endpoint; only audio-reference video (Seedance 2.5, Wan 3.0) | **Stay on fal**. Evaluate Higgsfield audio-ref in Phase 5. |
| Songs/music (MiniMax Music, Lyria) | ❌ None | **Stay on fal / ElevenLabs** |
| TTS (Kokoro), transcription (Whisper) | ❌ None | **Stay on fal** |
| Veo / Sora | ❌ Not on Higgsfield | Keep on fal as fallback candidates |

So "replace fal" means **Higgsfield is primary for all visual generation**. fal
keeps audio/avatar work and serves as the visual fallback. **`FAL_KEY` stays.**

---

## 1. Default model selection ("top model defaulted")

Higgsfield doesn't name an official flagship. These picks use the homepage and
promo featuring plus the capability specs:

| Role | Default | Endpoint | Why | Price (from) |
|---|---|---|---|---|
| **Video (default, all tiers' hero)** | **Seedance 2.5** | `bytedance/seedance-2.5/{text,image,reference}-to-video` | Featured flagship, 4–30s clips (fewer stitches for long-form), native audio, 6 aspect ratios incl. 9:16, reference-to-video for character consistency | $0.144/s promo ($0.206 list) |
| Video (b-roll / economy) | Kling 3.0 Turbo | `kling-video/v3.0-turbo/{text,image}-to-video` | Strong quality/cost, 1080p, multi-shot prompts | $0.046/s |
| Video (budget / bulk shorts) | Wan 3.0 | `alibaba/wan-3.0/...` | 2–30s, 1080p, cheapest | $0.025/s |
| Video (premium cinematic) | Kling 3.0 Pro / 4K, Cinema Studio 4.0 | `kling-video/v3.0/{pro,4k}/...`, `higgsfield/cinema-studio/4.0` | Camera/genre controls, 4K | $0.08–0.21/s |
| Video extend | Seedance 2.5 extend | `bytedance/seedance-2.5/video-extend` | Replaces Veo-extend chaining | — |
| **Image (default stills)** | **SOUL V2** | `higgsfield-ai/soul/v2/standard` | Higgsfield's own flagship; Soul ID character support; very cheap | from $0.003/img |
| Image (multi-reference cast) | Grok Image 2.0 | `xai/grok-imagine-image-2.0` | Up to 10 reference images | $0.04/img |
| Image (hi-res thumbnails) | Marketing Studio | `marketing-studio/image` | Up to 4K | — |

**Tier mapping** (replaces the hardcoded ids in `auto-tiers.ts:69`):

| Tier | Hero shot | B-roll | fal fallback chain |
|---|---|---|---|
| base/economy | `hf-kling-3-turbo` | `hf-wan-3` | → `seedance-2-fast` → `wan-2-2` |
| premium | **`hf-seedance-2.5`** | `hf-kling-3-turbo` | → `seedance-2` → `kling-2-5-turbo` |
| platinum/director | **`hf-seedance-2.5`** (or `hf-kling-3-pro`) | `hf-seedance-2.5` | → `veo-3-1` → `seedance-2` |

*Prices are Higgsfield "from" figures. Exact per-resolution cost is fetched at
runtime from `POST /estimate/{endpoint}` and written to the ledger.*

---

## 2. Architecture

```
                 ┌───────────────── provider-selector (scores health, cost, quality)
 engine / clip-queue ──► selectBeatModel ──► VideoModel{ provider: "higgsfield" | "fal" }
                                                 │
                         ┌───────────────────────┴───────────────────────┐
                 adapters/higgsfield.ts                          adapters/fal.ts (unchanged)
          submit → poll (2s→10s backoff) / webhook          queue.fal.run submit → poll
                         │  on outage / 403 credits / nsfw / 423 / 503
                         └──────────── fallback chain (provider-fallback.ts) ──► fal twin
```

Key design decisions (from the repo audit):

1. **Add `provider` to the model registries.** `VideoModel` (`video-models.ts:20`)
   has no provider field today; every endpoint is implicitly fal. Add
   `provider: "higgsfield" | "fal"` and follow the dispatch pattern already
   used in `songs.ts:296` (`SongModel.provider`).
2. **One new adapter, `src/lib/adapters/higgsfield.ts`**, mirroring `fal.ts`:
   `isHiggsfieldLive()`, `hfSubmit()`, `hfPoll()`, `hfRun()` (submit+poll), `hfEstimate()`,
   `hfUploadFile()`, `generateVideo()`, `generateImage()`, `generateReferenceImage()`.
   Use raw `fetch` (house style; no SDK dependency). Mock-first: no key means a `mock:` result.
3. **Generic provider routers.** `generateVideo()` / `generateImage()` callers go through
   a thin `media-router.ts` that dispatches on `model.provider`. Existing fal functions
   stay as they are.
4. **Per-provider health.** `videoModelHealth` (`provider-selector.ts:49`) currently
   benches *every* family on a fal outage. Make it look up
   `providerOutage(db, model.provider)` so a fal outage leaves Higgsfield untouched and
   the reverse.
5. **Fallback for free.** `provider-fallback.ts` already walks scored alternatives.
   Put each Higgsfield model's fal twin in its candidate pool, so the chain crosses
   providers automatically.
6. **Persist the default.** There is no project-level default video model today. Add
   `projects.preferred_video_provider` (default `'higgsfield'`),
   `projects.preferred_video_model` (default `'hf-seedance-2.5'`) and
   `projects.preferred_image_model` (default `'hf-soul-v2'`), following the
   `preferred_song_model` precedent (`0076`).

### Higgsfield API cheat sheet
| Thing | Value |
|---|---|
| Base URL | `https://api.higgsfield.ai` |
| Auth | `Authorization: Key <KEY_ID>:<KEY_SECRET>` |
| Submit | `POST /{endpoint_id}` → `{status, request_id, status_url, cancel_url}` (use the returned URLs) |
| Status | `GET /requests/{id}/status` → `queued · in_progress · completed · failed · nsfw · canceled` |
| Output | `video.url` / `images[].url` / `audio.url` (**kept ≥7 days only, so copy to Supabase/R2 immediately**) |
| Webhook | `?hf_webhook=<urlencoded https url>`; respond <10s; dedupe on `request_id+status` |
| Cancel | `POST /requests/{id}/cancel` (only while queued) |
| Estimate | `POST /estimate/{endpoint_id}` → `{credits, usd}` |
| Upload | `POST /files/generate-upload-url` → presigned PUT (1h) + `public_url` |
| Errors | 400 (bad input **or concurrency limit**), 401, 403 (**out of credits**), 422, 423 (model blocked), 503 (model disabled). Log `X-Correlation-ID`. |
| No idempotency | **Never auto-resubmit after an ambiguous timeout.** Persist `request_id` first, then poll. |
| Concurrency | Per account + per model (console shows it; e.g. "max 4"). Parse the 400 message and back off. |
| Billing | Failed/nsfw not charged; credits expire 1 year after purchase |

---

## 3. Change map (every file that must change)

### New files
| File | Purpose |
|---|---|
| `src/lib/adapters/higgsfield.ts` | Core adapter (above) |
| `src/lib/adapters/higgsfield-models.ts` | `HF_VIDEO_MODELS`, `HF_IMAGE_MODELS` registries (id, endpoint(s), `usdPerSec`, durations, aspect ratios, audio, quality, `falTwin`) |
| `src/lib/adapters/media-router.ts` | Provider dispatch for video/image |
| `src/app/api/webhooks/higgsfield/route.ts` | Webhook receiver (optional, Phase 4); verifies a shared secret query param, dedupes, updates `clip_jobs` |
| `supabase/migrations/00xx_higgsfield_provider.sql` | Columns below |
| `tests/higgsfield.test.ts`, `tests/media-router.test.ts`, `tests/provider-selector.test.ts` | Mocked-fetch tests |

### Migration
```sql
alter table projects
  add column preferred_video_provider text not null default 'higgsfield',
  add column preferred_video_model    text not null default 'hf-seedance-2.5',
  add column preferred_image_model    text not null default 'hf-soul-v2';
alter table clip_jobs
  add column provider              text not null default 'fal',
  add column provider_request_id   text,
  add column provider_status_url   text;
-- backfill: provider_request_id = fal_request_id for existing rows; keep fal_* columns for now
```

### Edited files
| Area | File(s) | Change |
|---|---|---|
| Registry | `src/lib/adapters/video-models.ts` | Add `provider` to `VideoModel`; merge HF models; `DEFAULT_VIDEO_MODEL_ID = 'hf-seedance-2.5'`; `VIDEO_PROVIDER` becomes per-model |
| Tiers | `src/lib/adapters/auto-tiers.ts:69,111,122` | New defaults per §1; tier blurbs/costs |
| Candidates | `src/lib/adapters/provider-candidates.ts:16,57` | `modelFamily` gets `hf-*` families; tier pools list HF first, fal twins after |
| Selector | `src/lib/adapters/provider-selector.ts:49–56` | Per-provider outage; drop the hardcoded family list |
| Engine | `src/lib/pipeline/engine.ts` | `budgetPause` (:242) checks both providers; `generateBeatVideo` (:5591–5649) uses `isVisualLive()` (HF **or** fal) and routes via media-router; stills (:1769–1877, :3509) default to SOUL V2; full-auto enqueue (:4085–4200) writes `provider` |
| Worker | `packages/clips/src/clip-queue.ts` | Provider-aware submit/poll/resume (`provider_request_id`); `processJob` requires HF **or** fal key; Veo-extend chaining swaps to Seedance 2.5 extend when HF; **de-duplicate** price tables by importing a shared JSON registry (today they are hand-copied, :38–64) |
| Reference images | `src/lib/adapters/reference-image.ts`, `pipeline/character-studio.ts` | Add HF reference models; per-project `character_image_model` default → `hf-grok-image-2` |
| Cost cap | `engine.ts monthVideoSpend`, `src/lib/db/queries.ts:528` | Cap query must include `higgsfield-video` (`in('provider', [...])`), otherwise HF spend bypasses the $100/mo cap |
| Ledger labels | `src/app/(app)/costs/cost-log.tsx:34–44` | `higgsfield-*` → "AI video clip (Higgsfield)" |
| Health | `adapters/health.ts:49–55,81`, `adapters/credential-test.ts:50`, `pipeline/operator-readiness.ts:55`, `packages/core/src/capability-registry.ts:44–48`, `components/dashboard/system-pulse.tsx:5,9` | Add `higgsfield` service; `ai-video` capability requires `higgsfield` **or** `fal`; credential test = `GET /requests/<dummy>/status` → 401 vs 404 distinguishes a bad key |
| UI | `videos/[vid]/video-gen.tsx:130,535,606–689`, `build/build-and-post.tsx:82`, `settings/settings-form.tsx`, `projects/new/wizard.tsx` | Model picker grouped by provider with Higgsfield first and "Seedance 2.5 (default)" preselected; new Settings "Generation provider" section (provider + default video/image model); wizard shows the default |
| Scoreboard | `components/dashboard/provider-scoreboard.tsx:44,57` | HF models appear via candidate pools; provider badge |
| Model catalog | `src/lib/models/catalog.ts` | Include HF registries |
| MCP | `src/lib/mcp/*`, `workspace/registry.ts:232` | Expose provider/model defaults; `set_project_video_model` tool |
| CI / secrets | `.github/workflows/sync-vercel-env.yml` (env + `upsert HIGGSFIELD_API_KEY`), `clips.yml:65` (pass to worker), `verify-secrets.yml` (probe + report key format), `.env.example` | Wire `HIGGSFIELD_API_KEY` |
| Docs | `docs/RUNBOOK.md`, `docs/DECISIONS.md`, `README.md` stack line | Document provider + fallback |

### Stick Studio
Stick Studio is **programmatic (Remotion poses) and uses no fal**. Default it to
Higgsfield like the other channels, as a **"Stick Studio + Higgsfield" hybrid**:
keep `stick-choreographer` for character consistency and use Higgsfield
reference-to-video (Seedance 2.5 with a character sheet in `image_urls`) for
hero/action shots, backgrounds and transitions. Add a project setting `stick_render_mode:
'programmatic' | 'hybrid' | 'full_ai'` (default `hybrid`). Soul ID is portrait-trained,
so **test it on stick characters before relying on it**. Reference-to-video is the safer bet.

---

## 4. Phased build (each phase shippable, CI-green, mock-first)

| Phase | Scope | Exit criteria | Est. |
|---|---|---|---|
| **1. Adapter + secret** | `higgsfield.ts`, `higgsfield-models.ts`, mock mode, key parsing (combined / pair / aliases), `verify-secrets`, `sync-vercel-env`, `.env.example`, health/credential-test | `verify-secrets` passes; `/settings` shows Higgsfield ✅; unit tests for submit/poll/errors/nsfw/concurrency-400 | 1–2 days |
| **2. Registry + routing** | `provider` field, media-router, `generateBeatVideo` + stills routed, cost ledger + cap query, cost-log labels | A single beat renders on Seedance 2.5 in a real project; ledger row `higgsfield-video` with `/estimate` cost; cap enforced | 2 days |
| **3. Defaults + fallback** | Migration, project defaults (HF + Seedance 2.5 + SOUL V2), tier mapping, candidate pools with fal twins, per-provider health, UI pickers/Settings/wizard | New project defaults to Higgsfield top model; forcing an HF outage (breaker) routes the next beat to its fal twin; `auto-tiers` tests updated | 2–3 days |
| **4. Worker + long-form** | `clip-queue.ts` provider-aware + resumable, Seedance 2.5 extend, shared price table, optional webhook route | 10-min video renders end-to-end via Actions with HF clips; kill/resume mid-job works | 2–3 days |
| **5. Character + stick hybrid** | HF reference images in character-studio, Soul ID experiment, `stick_render_mode` hybrid, evaluate HF audio-ref for avatars | Recurring character consistent across 5 clips (character-drift score ≥ current); stick hybrid episode approved | 2–3 days |
| **6. Hardening** | Retention copy-to-R2 guarantee, concurrency governor per model, dashboards, runbook, decision log | 50-clip soak test with 0 lost outputs; docs updated | 1–2 days |

**Total: ~10–15 working days.**

### Validation at each push
`pnpm typecheck && pnpm lint && pnpm test` (vitest, mocked fetch), plus the CI e2e
(mock mode, zero credentials) must stay green. Live smoke test = `workflow_dispatch`
of `verify-secrets` and one `clips` job.

---

## 5. Budget sketch for the 4-channel content plan

120 videos/channel × 4 channels = 480 videos (240 short @ 30–160s, 240 long @ 4–15 min).
Assume AI-generated footage covers **~40% of runtime** (the rest being stills/motion
graphics/Remotion, as the app does today):

| | Avg length | AI seconds/video | Seedance 2.5 ($0.144/s) | Kling 3.0 Turbo ($0.046/s) | Wan 3.0 ($0.025/s) |
|---|---|---|---|---|---|
| Short | ~95s | ~38s | $5.47 | $1.75 | $0.95 |
| Long | ~9.5 min | ~228s | $32.83 | $10.49 | $5.70 |
| **480 videos** | | | **~$9.2k** | **~$2.9k** | **~$1.6k** |

A **tiered mix** (Seedance 2.5 hero ~25%, Kling 3.0 Turbo b-roll ~75%) lands around
**$4.5k for all 480 videos**, before re-rolls (+20–30%). Raise
`VIDEO_MONTHLY_CAP_USD` (currently $100) accordingly, or make it per project.

---

## 6. Compliance and platform notes

- **AI disclosure:** Higgsfield terms forbid stripping its provenance watermarks/metadata
  (C2PA). Keep them. YouTube's "altered or synthetic" and TikTok's AIGC label must be
  ticked for photoreal people, places and events. The publish kit should auto-set this for
  photoreal Higgsfield footage.
- **No real-person likeness** without consent (Higgsfield ToS and YouTube likeness detection).
- **No resale/pass-through** of API access, and no multi-account splitting to dodge limits.
- **Commercial rights to outputs belong to you.**

---

## 7. Open decisions for you

1. **Cashback:** Option A (skip, recommended), B (sandbox sprint this week) or C (rushed Phase 1)?
2. **Secret format:** confirm `HIGGSFIELD_API_KEY` holds `KEY_ID:KEY_SECRET`.
3. **Default video model:** Seedance 2.5 (quality, $0.144/s) as proposed, or Kling 3.0
   Turbo (≈⅓ the cost) as the global default with Seedance 2.5 on hero shots only?
4. **Monthly video cap:** new value (current $100/mo total)?
5. **Build go-ahead:** start Phase 1 on this branch?

---

## Sources
- Docs overview/auth/quickstart: https://docs.higgsfield.ai/docs/api-reference/overview.md · https://docs.higgsfield.ai/docs/authentication.md · https://docs.higgsfield.ai/docs/quickstart.md
- Requests, polling, webhooks, errors, rate limits, billing, uploads: https://docs.higgsfield.ai/docs/concepts/requests.md · …/polling.md · https://docs.higgsfield.ai/docs/how-to/webhooks.md · …/concepts/errors.md · …/rate-limits.md · …/billing-and-retention.md · …/file-uploads.md
- Model catalog: https://docs.higgsfield.ai/docs/models/video-generation.md · https://docs.higgsfield.ai/docs/models/image-generation.md · pricing from https://open.higgsfield.ai/
- Soul ID: https://docs.higgsfield.ai/docs/models/soul-id/create-character.md
- SDKs: https://github.com/higgsfield-ai/higgsfield-js · https://github.com/higgsfield-ai/higgsfield-client
- Cashback: https://open.higgsfield.ai/cashback (pool endpoint `dash.higgsfield.ai/api/v1/credits/cashback-pool/`)
- Terms: https://higgsfield.ai/terms-of-use-agreement

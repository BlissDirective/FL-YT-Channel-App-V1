# Faceless Studio — App Map

A single reference for how every page, function, worker, and table fits
together. Use it as a debugging/improvement guideline: each section ends with
**where to look** for the failures that touch it.

> Stack: **Next.js 15 (App Router, RSC)** on Vercel · **Supabase** (Postgres +
> Auth + Storage + Realtime) · **Remotion** render workers on **GitHub Actions**
> · **Claude / fal / ElevenLabs / YouTube / Gemini / Pexels** providers ·
> optional **Cloudflare R2** for render storage. pnpm monorepo: app in `src/`,
> workers in `packages/`.

---

## 1. The three tiers

```
┌─────────────────────────────────────────────────────────────────────┐
│  VERCEL — the Next app (interactive + server actions + cron routes)   │
│  • Pages (RSC) read Supabase directly (queries.ts)                    │
│  • Server actions mutate + call the pipeline engine (engine.ts)       │
│  • /api/cron/* routes are pinged by GitHub Actions                    │
│  • /api/mcp lets Claude operate the studio                            │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │ writes/reads                    │ pings (HTTP)
                ▼                                 ▼
┌──────────────────────────────┐   ┌──────────────────────────────────┐
│  SUPABASE                    │   │  GITHUB ACTIONS — the workers      │
│  • Postgres (all tables)     │◀──│  • render-queue  (Remotion)        │
│  • Storage bucket `media`    │   │  • clip-queue    (fal long clips)  │
│  • Realtime (live UI refresh)│   │  • intel-queue   (deep perception) │
│  • Auth (single operator)    │   │  • 4 cron pings (build/intel/opt/  │
└──────────────────────────────┘   │    stats) + db-migrate + sync-env  │
            ▲                       └───────────────┬──────────────────┘
            │ (optional, large files)               │ providers (HTTP)
    ┌───────┴────────┐                              ▼
    │ Cloudflare R2  │                  Claude · fal · ElevenLabs ·
    └────────────────┘                  YouTube · Gemini · Pexels
```

**Key idea:** the Next app drives videos *between* gates synchronously (server
actions → `runPipeline`); the heavy/long work (rendering, long AI clips, deep
perception, the Build & Post drip) runs in **GitHub Actions workers** that poll
Supabase. If a worker/cron isn't firing, work stalls — see §11.

---

## 2. The video lifecycle (state machine)

Source of truth: `packages/core/src/state-machine.ts`. Driver: `runPipeline()`
in `src/lib/pipeline/engine.ts` (a loop of ≤8 hops).

```
IDEA ─approve─▶ IDEA_APPROVED ─▶ SCRIPTING ─▶ SCRIPT_READY ─approve─▶
   (IDEA gate)      (auto)        (auto)        (SCRIPT gate)
GENERATING_ASSETS ─▶ ASSETS_READY ─approve─▶ ASSEMBLING ─▶ FINAL_REVIEW ─approve─▶
   (auto)             (ASSETS gate)            (render farm)  (FINAL gate)
APPROVED ─▶ TRACKING
            (published + stats)

   any stage ──revision──▶ previous stage      any stage ──kill──▶ KILLED
```

| Status | Gate | Who advances it | Notes |
|---|---|---|---|
| IDEA | IDEA | operator / Build&Post | |
| IDEA_APPROVED | — | `runPipeline` → SCRIPTING | **transient** (stalls here = no driver) |
| SCRIPTING | — | `runScripting` → SCRIPT_READY | **transient** |
| SCRIPT_READY | SCRIPT | operator (or Full Auto / auto-pilot) | **Full Auto Generate shows only here** |
| GENERATING_ASSETS | — | `runAssetGeneration` → ASSETS_READY | **transient** (VO + clips/stick scenes) |
| ASSETS_READY | ASSETS | operator / `auto_finish` | |
| ASSEMBLING | — | **render farm** → FINAL_REVIEW | external worker; `reconcileStuckRenders` heals strands |
| FINAL_REVIEW | FINAL | operator / auto-pilot QC | download + one-tap publish here |
| APPROVED | — | publish flag → farm uploads | |
| TRACKING | — | stats cron | terminal (live) |

Maps: `GATE_FOR_STATUS`, `ON_APPROVE`, `REVISION_TARGET`, `PREVIOUS_STAGE`,
`PIPELINE_STAGES`. Stage exceptions are caught → `videos.paused_reason`.

**Where to look:** a video "stuck" → check its `status` + `paused_reason`.
Transient statuses (IDEA_APPROVED / SCRIPTING / GENERATING_ASSETS) have **no
background driver between requests** — they advance only when a server action
(Resume), a gate approval, or the build-runner cron calls `runPipeline`. The
Review queue now surfaces these with a **Resume** button (`getReviewItems`).

---

## 3. Data flow per stage (what writes what)

| Stage | Engine fn | Reads | Writes | Provider |
|---|---|---|---|---|
| Script | `runScripting` | project, templates, intel | `scripts` (beats, metadata) | Claude (`script.ts`) |
| Highlights | `runHighlightCuration` | script | `videos.highlights` | Claude (`highlights.ts`) |
| Assets (footage) | `runAssetGeneration` → `makeBeatClip` | script beats | `assets` (vo, clip, captions) | ElevenLabs/fal/Pexels |
| Assets (stick) | `runAssetGeneration` → `makeStickClips` | script beats | `assets` (vo, clip w/ `meta.stickScene`) | Claude (`stick-choreographer.ts`) |
| Long AI clips | `clip_jobs` → **clip-queue worker** | clip_jobs | `assets` (clip), advances ASSETS_READY→ASSEMBLING | fal |
| Render | **render-queue worker** `buildProps`→`renderOne` | assets | `assets` (render, thumb), `videos.status=FINAL_REVIEW`, `vision_review` | Remotion + Claude vision |
| Publish | farm `publishStagedVideos` (on `publish_requested`) | render asset | `videos.youtube_video_id`, `status=TRACKING` | YouTube OAuth |
| Track | `refreshTrackedStats` (stats cron) | youtube_video_id | `analytics_snapshots` | YouTube Data API |

**Where to look:** "assets don't show" → is there a `scripts` row with **non-empty
`beats`**? (empty beats hides the whole generation UI — now shows a *Regenerate
script* prompt). "Render never happens" → is `status='ASSEMBLING'` and does it
have **live (non-mock) VO assets**? The farm skips mock-VO videos.

---

## 4. Pages / routes (`src/app/`)

| Path | Purpose | Loads via |
|---|---|---|
| `/` | Portfolio dashboard (projects, budget, activity) | `getProjects/getVideos/getActivity` |
| `/login` | Single-operator sign-in | — |
| `/projects/:id` | Project hub — pipeline stages, **Build & Post runs**, ideas, queue topic | `getProject/getReviewItems/getBuildRuns` |
| `/projects/:id/review` | Gate **Review queue** (+ in-progress at a stage) | `getReviewItems` |
| `/projects/:id/videos/:vid` | **Video detail** — script, highlights, stick scenes, vision review, publish kit | many (Promise.all) |
| `/projects/:id/settings` | Per-project settings + **stick cast** + YouTube token | `getProject` |
| `/projects/:id/downloads` | Rendered MP4 downloads | `getProjectDownloads` |
| `/projects/new` | New-project wizard | voices |
| `/intel` | Market intelligence workspace | `getVideoIntel` |
| `/insights` | Optimizer insight cards | `getInsights` |
| `/costs` | Spend log + budget | `cost_ledger` |
| `/settings` | Global: credential health, kill switch, web-push, demo purge | `getServiceHealth` |

**API routes:** `/api/cron/{build-runner, intelligence, optimizer, refresh-stats}`
(pinged by Actions, `CRON_SECRET`-gated), `/api/export` (CSV), `/api/mcp`
(`STUDIO_MCP_TOKEN`).

**Where to look:** a blank/partial page → it's an RSC; an unguarded query throw
or a null-deref during render fails the whole page (`force-dynamic`, no error
boundary). Most data is jsonb `not null default '{}'`, so the usual culprit is a
**conditional that hides content** (e.g. empty `beats`) rather than a crash.

---

## 5. Server actions → engine (`src/lib/actions/`)

| File | Key actions | → engine |
|---|---|---|
| `pipeline.ts` | `approveGate/requestRevision/killVideo` | `decideGate` |
| | `resumeVideo/queueTopic/runDemoPipeline` | `runPipeline` |
| | `fullAutoGenerate` | `fullAutoGenerate` |
| | `regenerateScript` (empty beats) | `regenerateScript` |
| | `rerollBeatVisual / rerollStickScene / setStickScene` | reroll/set |
| | beat edits, remix, shot-type, metadata | add/move/merge/remix |
| `build.ts` | `startBuildRun`, pause/resume/cancel, **`runBuildNow`** | Build&Post fns / `processPendingBuildVideos` |
| `shorts.ts` | `deriveShorts`, `publishShort` | `selectShortSegments` |
| `publish.ts` | `markUploaded`, `requestPublish`, `refreshStats` | YouTube adapters |
| `intelligence.ts` | scout chat, save idea, apply/dismiss insight | intelligence/optimizer |
| `intel.ts` | `runVideoIntel` | scan adapters |
| `projects.ts` | create/update/delete, demo seed/purge | DB |
| `auth.ts` | signIn / bootstrap / signOut | Supabase auth |
| `diagnostics.ts` | `testCredential` | `credential-test.ts` |

All actions wrap errors (`guarded`) → readable inline errors, and
`revalidatePath` the affected pages.

---

## 6. Adapters → providers (`src/lib/adapters/`)

Every Claude adapter shares the same shape: **forced tool-use**, an `isXLive()`
key check, and a **deterministic mock/heuristic fallback** so a missing key never
breaks the pipeline.

| Adapter | Provider | Purpose |
|---|---|---|
| `script.ts` | Claude | write/remix script, classify shot types |
| `highlights.ts` | Claude | curate kinetic highlights |
| `stick-choreographer.ts` | Claude | script → per-beat `StickScene` |
| `shorts.ts` | Claude | pick Short segments |
| `qc.ts` | Claude | score gates (IDEA/SCRIPT/ASSETS/FINAL) |
| `intelligence.ts` / `optimizer.ts` / `scout.ts` / `video-intel.ts` | Claude | ideas / insights / research / blueprints |
| `voice.ts` | ElevenLabs + Kokoro(fal) | VO synthesis |
| `fal.ts` / `video-models.ts` | fal.ai | images (FLUX) + video (Veo/Kling/Seedance) |
| `stock.ts` / `sources.ts` | Pexels/Pixabay/Openverse/Wikimedia | free footage |
| `youtube.ts` | YouTube Data API | stats + niche search |
| `gemini-video.ts` | Gemini | native YouTube perception |
| `frame-critic.ts` *(render pkg)* | Claude vision | Tier-1 stick critique |

---

## 7. Render farm (`packages/render/`)

```
main() ─ claim ≤5 videos at ASSEMBLING ─ bundle once ─▶ for each:
  buildProps(videoId)            // video+project+script+assets → VideoProps
    → null if no live VO (farm skips mock-asset videos)
  renderOne()
    plan: short → VerticalShort ; long → LongForm + freebie Short
    renderMedia each → storeRender (R2 or Supabase, resumable TUS fallback)
    renderStill Thumbnail
    status → FINAL_REVIEW ; cost ledgered
    if stick short → runFrameCritic (keyframes → Claude vision → vision_review)
  publishStagedVideos()          // publish_requested + OAuth → upload → TRACKING
```

Compositions (`Root.tsx`, FPS 30): `LongForm`, `Short`, `VerticalShort`,
`Thumbnail`, + dev comps (`StickPreview/Sheet/Showcase/ShortSample`,
`HighlightPreview`). Stick rig in `stick/` (`StickFigure`, `StickStage`,
`poses.ts` 31 actions, 16 `backgrounds`, `bubbles`, `frame-critic`).

**Where to look:** strand at ASSEMBLING → `reconcileStuckRenders` (build-runner
cron) heals videos that rendered (have a render asset) or were published
(`youtube_video_id`); a publish that uploaded but didn't flip status is fixed by
persisting `youtube_video_id` first.

---

## 8. Build & Post (full-auto drip)

`startBuildRun` seeds N `videos` at `IDEA_APPROVED` with a `build_run_id`. The
**build-runner cron** then, each pass: `releaseScheduledVideos` (due slots) →
`finalizeAutoPilotVideos` (QC-gate the final cut → Public/Unlisted/Held) →
`reconcileStuckRenders` → `processPendingBuildVideos` (claim seeds → script →
QC-gate → `fullAutoGenerate` → render) → `reconcileBuildRuns` (run lifecycle).

**Where to look:** a run stuck at "idea approved" = the build-runner cron isn't
advancing it. Drive it in-app with the **Run now** button on the Build & Post
runs panel (`runBuildNowAction`), or **Resume** each video in the Review queue.
Verify the GitHub Action *Build Runner* is enabled and returning HTTP 200.

---

## 9. Workers & crons (`.github/workflows/`)

| Workflow | Schedule | Does |
|---|---|---|
| `build-runner.yml` | every 5 min | pings `/api/cron/build-runner` |
| `render.yml` | every 10 min | `pnpm render-queue` (Remotion) |
| `clips.yml` | every 10 min | `pnpm clip-queue` (fal long clips) |
| `video-intel.yml` | every 10 min | `pnpm intel-queue` (perception) |
| `intelligence.yml` | daily 6:30 | pings `/api/cron/intelligence` |
| `optimizer.yml` | Mon 8:00 | pings `/api/cron/optimizer` |
| `stats.yml` | daily 7:10 | pings `/api/cron/refresh-stats` |
| `db-migrate.yml` | on `migrations/**` push | applies SQL, tracks in `_migrations` |
| `sync-vercel-env.yml` | manual/self | pushes secrets → Vercel |
| `verify-secrets.yml` | manual/self | live-checks every provider key |
| `ci.yml` / `e2e.yml` / `lighthouse.yml` | push/PR | typecheck+build / Playwright / perf |

**Where to look:** "nothing is happening" anywhere automated → the relevant
Action tab. Scheduled crons can be delayed or disabled by GitHub; `db-migrate`
applies migrations on push.

---

## 10. Database (after migrations 0001–0026)

Core tables: **videos** (the spine — status, kind, parent_video_id,
build_run_id, publish/scheduling, highlights, vision_review), **scripts**
(beats, metadata), **assets** (vo/clip/render/thumb/captions, `meta` jsonb),
**projects** (brand_kit, autonomy, budget, visual_style, stick_cast),
**build_runs**, **clip_jobs**, **qc_reviews**, **approvals**, **ideas**,
**insights**, **cost_ledger**, **analytics_snapshots**, **video_intel**,
**vo_cache**, **prompt_templates**, **push_subscriptions**, **app_settings**.

Realtime publication: videos, ideas, projects, analytics_snapshots, insights,
video_intel, clip_jobs, build_runs → the UI auto-refreshes. jsonb columns are
`not null default '{}'`/`'[]'` (so they're safe to read), **except** the
optional ones: `source_segment`, `stick_cast`, `vision_review` (can be null).

**Where to look:** schema questions → `supabase/migrations/`; live state →
`db-diagnose.yml`.

---

## 11. Debugging quick-reference (symptom → cause → where)

| Symptom | Likely cause | Where to look / fix |
|---|---|---|
| Video stuck at "idea approved" / "generating assets" | transient state, no driver; cron not firing | Review queue **Resume**; Build & Post **Run now**; check build-runner Action |
| Build & Post run shows 0/N, never moves | build-runner cron not executing | **Run now** button; verify the Action runs + CRON_SECRET |
| "No Full Auto Generate" on a video | Full Auto is **SCRIPT_READY-only** by design | past the gate → use Resume / Generate assets, or step back to script |
| Script/assets don't show for *some* videos | `scripts.beats` is **empty** → generation UI hidden | now shows *Regenerate script*; `regenerateScript` |
| Stuck at "assembling" after publish | farm crash between store & status flip | `reconcileStuckRenders` heals; UI hides done ones |
| Long-form render "object exceeded max size" | no YouTube OAuth → falls back to Storage | set `YOUTUBE_OAUTH_*` (see YouTube-API-creation.md) |
| A page is blank/partial | RSC: unguarded query throw or null-deref | check that page's loader + the data shape |
| A provider feature silently "mock" | missing API key | `/settings` health dots; `verify-secrets.yml` |
| QC score low | normal — use **QC Revise** (auto-revise w/ notes) | review card |

---

## 12. Cross-cutting subsystems

- **QC** (`qc.ts` + `qc_reviews`): scores each gate; drives Build & Post
  auto-approval and the operator's **QC Revise** button. **Vision review**
  (`frame-critic.ts` + `videos.vision_review`) is the *visual* QC of stick
  renders — see `docs/stick-studio/Vision-Optimizer-Loop.md`.
- **Stick Studio** (Phases 0–4): a programmatic SVG visual backend selected by
  `projects.visual_style='stick'`; see `docs/stick-studio/`.
- **Cost control**: every paid call → `cost_ledger`; per-video + monthly caps
  (`VIDEO_MONTHLY_CAP_USD`), `vo_cache` dedup, the global **kill switch**.
- **Realtime**: `RealtimeRefresher` subscribes pages to table changes so the UI
  updates without reload.

---

*Generated as a living reference. When the architecture changes, update the
relevant section + the §11 quick-reference.*

# Video Intelligence — Design Spec (DRAFT for review)

**Status:** spec only — no code yet. For operator review before build.
**Goal:** let the studio study the best existing videos on a topic and turn that
into **original** content — both better scripts/visuals and, ultimately,
fully-generated original video — without ever reusing third-party footage.

This spec covers three capabilities, sequenced so value lands early and the
expensive / policy-sensitive parts come last and gated.

---

## 1. What the operator asked for

> On the video editing page, run a "video intelligence" scan: Claude pulls
> relevant YouTube videos similar to the one we're working on, makes
> second-by-second notes on the content, and uses that as a prompt for
> fal.ai (Kling/Veo) to repurpose/remix segments into our own original video.

Reframed to what's compliant and buildable, while keeping the intent:

- **Pull & analyze** the top similar videos → a structured **blueprint**.
- **Optionally** do true frame-by-frame + transcript analysis on media we have
  rights to (or the operator vouches for).
- **Generate original video** (Kling/Veo via fal) from *our* blueprint and *our*
  keyframes — concept-level repurposing, never footage-level reuse.

---

## 2. Compliance model (the hard rules)

Grounded in the existing [gaming-source-lanes.md](./gaming-source-lanes.md)
policy ("the autonomous agent never touches publisher IP; no scrape/rip path,
ever").

| Lane | Action | Verdict |
|---|---|---|
| 🟢 **Metadata intelligence** | Pull titles, descriptions, chapters, tags, stats, thumbnails via the YouTube **Data API** (already in `searchNiche`). | Autonomous, always allowed. |
| 🟢 **Operator-supplied media** | Frame-sample + transcribe a video the operator **owns or vouches for** (own uploads, licensed, press-kit). | Allowed; mirrors the press-kit lane. |
| 🟡 **Competitor transcript** | Operator pastes a transcript / captions they obtained. Claude analyzes text only. | Allowed (operator-provided). |
| 🟡 **Competitor frame sampling** | `yt-dlp` + ffmpeg on a competitor URL **purely to take notes** for original ideas. *Copyright-wise low risk (ideas/structure aren't protected; non-expressive intermediate copying leans fair-use). The snag is YouTube's ToS on downloading.* | **Manual, operator-vouched gate only — never the autonomous agent.** |
| 🔴 **Footage reuse in output** | Putting any third-party frame/clip into our rendered video (incl. Kling/Veo *video-to-video* from their footage). | Forbidden — copyright + "reused/inauthentic content" demonetization. |

**The line:** analyze anything to *learn*; generate everything we *ship*. Their
pixels never reach the render.

---

## 3. Architecture overview

Three runtimes already exist; this feature respects that split:

```
Vercel serverless (web app)        GitHub Actions worker            fal.ai / Anthropic
─────────────────────────          ──────────────────────          ──────────────────
• Video Intelligence card    →     • frame extraction (ffmpeg)  →   • Claude vision (frames)
• blueprint (Claude text)          • yt-dlp (gated lane only)        • Claude text (blueprint)
• feeds Script Remix/visuals       • audio → transcript              • Kling/Veo (video gen)
• cost ledger + budget guard       • uploads frames to Storage
```

- **Light analysis (metadata + text blueprint)** runs in the web app — one Claude
  call, cheap, synchronous. This is Phase A and needs no new infra.
- **Heavy perception (frames/transcription)** and **video generation** are
  long-running and binary-dependent → they run in the **Actions worker**
  (`packages/render` + a new workflow), the same place Remotion already renders.
  The web app enqueues a job and polls status, exactly like the render farm.

---

## 4. Phase A — Video Intelligence blueprint scan  *(build first)*

**No new paid dependency. One Claude call per scan.**

**Flow**
1. On the video page, operator taps **Run Video Intelligence**.
2. Server action calls `searchNiche(project.niche + video.topic)` → top N similar
   videos with snippet + stats (existing adapter).
3. New adapter `analyzeVideoIntel()` sends Claude: our video (title/topic/angle),
   the competitor set (titles, descriptions, chapters, tags, view/like/age
   stats, thumbnail URLs), and any **operator-pasted transcript**.
4. Claude returns a structured **blueprint** via a `deliver_blueprint` tool:
   - hook options (3) + why they work
   - beat-by-beat structure (recommended sections + target seconds)
   - pacing / retention-risk notes ("most channels sag at ~min 4")
   - coverage gaps & differentiation angle
   - title + thumbnail patterns that win in this niche
5. Persist to a new `video_intel` row; render a **Video Intelligence card** on the
   page. Two CTAs:
   - **"Send to Script Remix"** → pre-loads the blueprint as context in the
     remix chat (built last session).
   - **"Apply to visual prompts"** → seeds beat `visualPrompt`s from the blueprint.

**Cost:** ~$0.02–0.10 (one Sonnet/Opus call), logged to `cost_ledger` as
`provider: anthropic, description: "Video intelligence scan"`.

**New surface area:** `src/lib/adapters/video-intel.ts`, an engine helper +
action, a `video_intel` table (migration), a `VideoIntelCard` client component,
and a "paste transcript" field.

---

## 5. Phase B — Original video generation (Kling / Veo via fal)

Confirmed: fal.ai hosts **Kling & Veo** (`setup.md §6`), reached through the one
`FAL_KEY`. The current `fal.ts` only wires FLUX images — video is net-new but the
generic `falRun()` helper is already there.

**Key difference:** video models are long-running → use fal's **queue API**
(`https://queue.fal.run/{model}` → poll `…/requests/{id}/status` → fetch result),
not the synchronous `fal.run`. This runs in the **Actions worker**, not Vercel
(duration + cost).

**Plan**
- `generateVideo({ prompt, imageUrl?, durationSec, model })` in the fal adapter:
  - **text-to-video** from a beat's `visualPrompt`, or
  - **image-to-video** from *our* FLUX keyframe (preferred — more control, on-brand).
- Model env-switchable: `FAL_VIDEO_MODEL` (e.g. `fal-ai/kling-video/v1.6/standard/image-to-video`, `fal-ai/veo3`).
- Per-second cost metering + **budget guard** before each clip (Kling/Veo are
  $/second — the existing cap logic must gate this).
- Wires into the asset stage as an alternative to stock/FLUX for `hero`/`broll`
  beats; output uploaded to Supabase Storage like any other asset.

**Open scope:** start with image-to-video from our keyframes (cleanest, most
original), add text-to-video after.

---

## 6. Phase C — Frame-by-frame perception (evaluating `claude-video-vision`)

Candidate: **`jordanrendric/claude-video-vision`** (MIT) — a Claude "perception
layer."

| Aspect | Detail | Fit |
|---|---|---|
| Frame extraction | ffmpeg, adaptive fps, ~100 frames max, 512px | 🟢 exactly what we need |
| Vision | base64 frames → Claude multimodal | 🟢 matches our Anthropic stack |
| Audio | Gemini / local Whisper / OpenAI transcription | 🟡 adds a backend choice (prefer Whisper-local or skip) |
| YouTube | yt-dlp; manual→auto captions→transcription | 🟡 the **gated** lane only |
| Packaging | TS/Node 20+ **MCP server**; needs ffmpeg + yt-dlp binaries | 🟡 must run in the **Actions worker**, not Vercel serverless |
| License | MIT | 🟢 usable with attribution |

**How we'd use it**
- Run it inside the **Actions worker** (binaries available there), invoked by a
  `video-intel-deep` workflow the web app dispatches.
- Feed it **operator-supplied / vouched media** by default (🟢 lane). The
  competitor-URL `yt-dlp` path stays behind the **manual operator-vouched gate**
  (🟡) — the operator pastes the URL and vouches; the autonomous agent never
  calls it.
- Output: timestamped frame notes + transcript → merged into the Phase A
  blueprint ("second-by-second notes"), which then drives *original* generation.

**Decision needed:** adopt the repo as a dependency/worker step, **or** lift just
its ffmpeg-sampling recipe into our own small worker module (fewer moving parts,
no MCP layer, no yt-dlp/OpenAI deps we don't want). *Recommendation: lift the
recipe* — we only need "ffmpeg → N frames → Claude vision," and our transcription
can reuse a single backend. Keeps the dependency surface and the yt-dlp exposure
minimal and fully under our compliance gate.

---

## 7. Data model & cost

- **New table `video_intel`**: `id, video_id, status, similar (jsonb), blueprint
  (jsonb), transcript_source (text), created_at`. RLS like the rest.
- **Optional `intel_frames`** (Phase C): cached frame notes per source, behind the
  gate.
- **Cost ledger**: every Claude/vision/Kling/Veo call recorded via `recordCost`,
  surfaced in the new `/costs` spend log (built this session) — so Video
  Intelligence spend is visible and budget-guarded from day one.

---

## 8. Risks & open questions

1. **yt-dlp / YouTube ToS** — keep strictly behind the manual operator-vouched
   gate; never autonomous. (Confirm you're comfortable with the gated lane.)
2. **Kling/Veo cost** — $/second; needs a per-video clip cap. What monthly ceiling
   for generated video?
3. **Frame backend** — adopt `claude-video-vision` wholesale vs. lift its recipe
   (recommended). 
4. **Transcription backend** — local Whisper (free, offline, in the worker) vs.
   an API. Recommendation: Whisper-local in the worker.
5. **Output policy guard** — add a hard check that no source frame/clip is ever
   attached to a render (only our generated assets), enforced in the asset stage.

---

## 9. Build sequencing

1. **Phase A** — blueprint scan wired into Script Remix + visual prompts. *(no new spend; highest value/risk ratio)*
2. **Phase B** — Kling/Veo `generateVideo()` in the Actions worker, image-to-video from our keyframes, budget-guarded.
3. **Phase C** — operator-vouched deep perception (frames + transcript) feeding the blueprint, recipe lifted from `claude-video-vision`.

*Awaiting operator sign-off on: gated yt-dlp lane (Q1), video-gen budget cap (Q2),
and adopt-vs-lift for the frame recipe (Q3) — then Phase A begins.*

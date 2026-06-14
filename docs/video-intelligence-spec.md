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
- Model **registry** (not a single env var) — each model carries cost/quality
  metadata so the operator (or the optimizer) picks the best model per
  segment. Surfaced in the pipeline UI as a selector showing **$/sec + quality
  + max duration + audio support**.

**Model registry (fal.ai, June 2026 — pricing indicative, verify live at build)**

| Model | fal id (approx) | ~$/sec | Quality / notes | Audio |
|---|---|---|---|---|
| **Seedance 2.0 Fast** | `fal-ai/bytedance/seedance/v2-fast` | ~$0.022 | Budget, production-ready; great default for b-roll | no |
| **Seedance 2.0** | `fal-ai/bytedance/seedance/v2` | ~$0.07 (≈$0.14 w/ audio) | #1 on Artificial Analysis (with-audio) Feb 2026 | opt |
| **Kling 3.0** | `fal-ai/kling-video/v3` | ~$0.029+ | Native 4K/60fps, 15s clips, lip-sync | opt |
| **Veo 3.1** | `fal-ai/veo3` | from ~$0.40 | Premium; only model with native 48kHz synced dialogue | yes |

> Note on versions: current line-up is **Veo 3.1**, **Kling 3.0**, **Seedance 2.0**
> (plus Sora 2, Wan 2.6). There is no "Veo 4." Adding **Seedance 2.0** is just a
> registry entry — fully supported. The registry is the single place to add/retire
> models; cost + quality render straight into the selector.

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

**How "frame-by-frame for Claude" actually works (and the options)**

The **Claude API does not ingest video files** — it takes text + images. So
"frame-by-frame analysis" always means: *extract frames → send as images to
Claude vision*, plus *audio → transcript → text*. Ways to get there:

| Method | How | Trade-off |
|---|---|---|
| **Download + ffmpeg** | Pull the file, sample N frames, send images to Claude | Most reliable; the download is the YouTube-ToS-sensitive step → gated lane |
| **Operator stills/screenshots** | Operator captures key frames during playback and supplies the images | No file download; manual; fine for spot-checks (you can even paste stills into chat for ad-hoc analysis) |
| **Native-video model for the *analysis* step** | Use **Gemini** (ingests video / some YouTube URLs directly, timestamped) for perception, Claude for the blueprint + generation | Avoids manual frame extraction; adds a second vendor; Gemini still fetches the media |
| **Transcript-only** | Skip frames; analyze captions/transcript text | Lightest + cleanest for *content* notes; loses *visual* detail |

**Is downloading the only option?** For genuine *visual* frame analysis of a
video you don't own, you need the pixels somehow — a download (ffmpeg) or
operator-supplied stills. For *content* notes a transcript avoids it entirely,
and Gemini's native-video path is the main way to skip manual extraction (at the
cost of a second model). There is no API that hands you arbitrary YouTube frames
without first obtaining the media.

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

1. **yt-dlp / YouTube ToS** — ✅ **decided:** keep strictly behind the manual
   operator-vouched gate; never autonomous.
2. **Generated-video budget** — ✅ **decided: $100/mo cap** for Kling/Veo/Seedance,
   enforced by the existing budget guard + a per-clip ceiling.
3. **Perception backend** — ✅ **decided:** **Gemini native-video as primary**
   analysis engine + **download→ffmpeg→Claude-vision** as the precise/fallback
   path. (See §10.)
4. **Adopt vs. lift `claude-video-vision`** — comparison in §10.3; recommendation:
   **lift the recipe.** *(Awaiting your pick.)*
5. **Output policy guard** — hard check that no source frame/clip ever attaches to
   a render (only our generated assets), enforced in the asset stage.

---

## 9. Build sequencing

1. **Phase A** — blueprint scan wired into Script Remix + visual prompts. *(no new spend; highest value/risk ratio)*
2. **Phase B** — model-registry video gen (Seedance/Kling/Veo) in the Actions worker, image-to-video from our keyframes, $100/mo guarded.
3. **Phase C** — operator-vouched deep perception (Gemini + ffmpeg/Claude) feeding the blueprint.

---

## 10. Deep-perception worker pipeline (detailed)

Runs in the **Actions worker** (binaries + long runtime), triggered like the
render farm. Phase C.

### 10.1 The pipeline, step by step

```
[web app] insert video_intel job (status=queued, source, vouched=true)
   │  (workflow_dispatch for near-on-demand, or the 10-min cron)
   ▼
[worker] 1. ACQUIRE (gated lane)
            • operator file → download from Supabase Storage, OR
            • vouched URL → yt-dlp (cap: ≤ ~15 min, ≤ 720p, timeout, 1 video)
            • also grab manual/auto captions if present
         2. PREP (ffmpeg)
            • adaptive sampling → keyframes, NOT every frame:
              short clip → ~1–2 fps; long video → 0.2 fps or scene-cuts
              (select='gt(scene,0.4)'), hard cap ~100 frames @ 512px
            • audio: ffmpeg -vn -ar 16000 audio.wav  (only if no captions)
         3. PERCEIVE  (pluggable — PERCEPTION_BACKEND)
            • PRIMARY  gemini: send the file/URL → timestamped JSON notes
              (scene desc, on-screen text, shot type, pacing) + transcript
            • PRECISE  claude-frames: batch ~20 timestamped frames/request
              → Claude vision deliver_frame_notes tool
         4. BLUEPRINT (Claude)
            • merges perception notes + Data-API metadata + stats
              → deliver_blueprint tool (hooks, beat structure, gaps…)
         5. PERSIST + COST
            • write video_intel.blueprint; record gemini + claude cost to
              cost_ledger; status=done. Web app polls → renders the card.
```

### 10.2 Capabilities & limitations

**Capabilities**
- Timestamped *visual* notes (on-screen text, shot types, b-roll style, pacing,
  hook construction) + timestamped *spoken* transcript.
- Handles long videos via low-fps / scene-cut sampling or Gemini's native ingest.
- Entirely inside the compliance gate — output is **notes**, never footage.
- Cost-bounded by frame cap, resolution, and model choice; every call ledgered.

**Limitations (be honest)**
- **Not literally every frame.** 30 fps × 10 min = 18,000 frames — infeasible.
  "Frame-by-frame" = **sampled keyframes + transcript** (≤ ~100 frames/scan).
- **Async, not instant** — a deep scan is minutes; on the cron it can wait up to
  ~10 min unless dispatched on demand.
- **yt-dlp is fragile + ToS-bound** — YouTube changes break it; rate-limits/IP
  blocks; gated/manual only, never autonomous.
- **Vision cost scales** with frame count × resolution → the cap matters.
- **Transcription/perception errors** on music, accents, fast cuts.
- **Gemini = second vendor** — its own key, cost, limits, and data-handling
  (content goes to Google); long videos may be internally downsampled to ~1 fps.
- **Worker-only** — none of this runs in the Vercel app; it's a queued job.

### 10.3 Wiring Gemini in (perception engine)

Division of labor: **Gemini = perception (cheap, native video), Claude =
blueprint + generation (our creative IP).**

- **Secret:** add `GEMINI_API_KEY`; sync to the worker via the existing env flow.
  Env-switchable model `GEMINI_MODEL` (a current multimodal Gemini, e.g.
  2.5-class Flash for speed / Pro for depth).
- **Call (in the worker, not Vercel):** Google Generative Language API
  `:generateContent` with the video as a `fileData` part:
  - file > ~20 MB → upload via the **Files API** first, reference the returned URI;
  - **public YouTube URL** can be passed directly as a `fileData` URI (Google
    fetches it) — this is the "no local download" path, still operator-gated.
- **Prompt** asks for **timestamped JSON** every N seconds: `{t, sceneDesc,
  onScreenText, shotType, pacingNote}` + a full transcript. Worker parses it.
- **Hand-off:** Gemini's notes + the Data-API metadata go to Claude's
  `deliver_blueprint` call → the blueprint. ffmpeg→Claude-vision is the fallback
  when Gemini is unavailable or when we need a few exact frames analyzed.
- **Cost:** Gemini video is priced per input token (~tokens/second of video);
  recorded as `provider: gemini` in the ledger.

### 10.4 Adopt `claude-video-vision` vs. lift the recipe

| Dimension | **Adopt** (run the repo) | **Lift the recipe** (our worker module) |
|---|---|---|
| Shape | It's a **Claude-Code plugin / MCP server**, not a library — wrap it in CI | ~100–150 lines: yt-dlp + ffmpeg + Gemini/Claude calls |
| Dependencies | Its full stack: yt-dlp, ffmpeg, Whisper, Gemini **and** OpenAI backends, MCP layer | Only what we pick (yt-dlp, ffmpeg, Gemini) |
| Compliance gate | Its yt-dlp will rip any URL — we must fence it | Gating is native — we only call yt-dlp on vouched URLs |
| Output schema | Its shape; we adapt to it | Our `deliver_blueprint` schema directly |
| Cost logging | Bolt on after the fact | Built into each call from day one |
| Maintenance | Track a small external repo (MIT, could go stale) | We own it; no upstream drift |
| Time to first run | Fast **if** it runs clean in CI; slow if we fight plugin assumptions | Predictable, slightly more upfront code |
| License | MIT — keep attribution | n/a |

**Recommendation: lift the recipe.** The core is standard ffmpeg flags + model
calls; we want tight control of the gate, the cost ledger, and the output schema,
and running a Claude-Code-plugin-shaped MCP server inside a CI worker is more
friction than value. Keep the repo as the reference implementation (and credit it).
*Adopt only if its adaptive-sampling/caption-provenance logic proves worth the
coupling — it doesn't look like it.*

---

*Awaiting: your adopt-vs-lift pick (§10.4) — then Phase A begins (it needs none of
the worker; Phases B/C build on these decisions).*

> **Decisions update:** lift the recipe ✅. Gate minimized per §11. Accuracy plan
> §12. UI plan §13.

---

## 11. Minimizing the gate (without pretending the line isn't there)

The goal: *learn what works in the YouTube market; generate 100% our own.* Two
risk axes — and only one needs a gate:

- **Output / copyright — already ~zero.** Ideas, facts, formats, pacing, and
  structure aren't copyrightable; analytical "intermediate copying" leans
  fair-use; we never ship a borrowed frame. Nothing to gate here.
- **Acquisition / YouTube ToS — the only real constraint.** Downloading via
  yt-dlp is what ToS restricts; intent doesn't change that. So we **minimize how
  often we download**, not pretend it's free.

**The minimal-friction design = sanctioned-path-first acquisition:**

| Order | Method | Gate | Why first |
|---|---|---|---|
| 1 | **Gemini native YouTube-URL** ingest (Google fetches it) | 🟢 none — official API | We never download; covers most scans |
| 2 | **Captions / transcript** (Data API + caption tracks) | 🟢 none | Text-only, no media pull |
| 3 | **Data-API metadata** (titles, chapters, tags, stats, thumbnail) | 🟢 none | Always-on baseline |
| 4 | **yt-dlp download → ffmpeg frames** | 🟡 one-time ack | Only when we need exact high-res frames |

So **steps 1–3 need no gate at all** — and they already deliver second-by-second
notes (Gemini) + transcript + structure. The yt-dlp download (step 4) is the
*only* gated action, and it's now the exception, not the rule.

**The gate, reduced to near-zero friction:**
- A **one-time per-project "Research mode" acknowledgment** ("I'm analyzing these
  for research; output is original") — not a per-URL modal. Logged once for the
  audit trail, then silent.
- Operator-initiated scans only (no autonomous mass-crawling), sane volume/rate
  limits, **notes stay private** (never published), **footage never reused**.

That's the honest floor: friction drops to a single checkbox, restriction stays
defensible, and the high-fidelity download path is there when you want it.

---

## 12. Maximizing frame-analysis accuracy

Cheap breadth + targeted depth — a **two-pass** scan:

1. **Pass 1 — breadth (Gemini native, whole video):** timestamped notes every few
   seconds + transcript. Cheap, fast, no download. Flags the *interesting*
   timestamps (hook, cuts, graphics, tone shifts).
2. **Pass 2 — depth (only on flagged moments):** ffmpeg pulls **exact, high-res
   frames** at those timestamps → Claude vision for fine detail (on-screen text,
   editing style, graphics, thumbnail-worthy moments).

Accuracy techniques layered in:
- **Scene-change extraction** (`select='gt(scene,0.4)'`) — capture every real cut,
  not uniform samples → semantically complete with fewer frames.
- **Hook-weighted density** — sample the first ~30s hard (retention-critical),
  sparser on static stretches.
- **Resolution by need** — 512px default; bump text/graphics-heavy frames to
  768px so on-screen text OCRs cleanly via vision.
- **Multimodal alignment** — pair each frame batch with the matching transcript
  window so notes fuse what's *seen* + *said*.
- **Engagement correlation** — overlay Data-API signals (view velocity, like
  ratio, comment themes) so notes say *what worked*, not just *what happened*.

Net: Gemini gives complete-but-coarse second-by-second coverage; Claude vision
gives sharp detail exactly where it matters — accurate without an 18,000-frame
bill.

---

## 13. UI / UX — "Market Intelligence" workspace

Design bar: clean, modern, calm, intuitive — reuse the existing design system
(warm `Card`/`CardTitle`, `StatCard`, status chips, lucide icons, rounded-2xl,
soft shadows, amber/lavender accents), mobile-first, progressive disclosure.

**Information architecture**
- A new **Intelligence** nav destination (a dedicated workspace), **plus** a
  compact **"Scan the market"** entry point on each video page that deep-links in,
  pre-filled from that video's topic. Results save to the project.

**1 · Launcher (one clean card)**
- Search field pre-filled from the video's topic/niche; add competitor **URL
  chips** or keywords.
- **Depth toggle:** *Quick* (metadata + Gemini, 🟢 no gate) ↔ *Deep* (+ high-res
  frames, 🟡 one-time ack).
- Live **estimated cost + time** badge; **Run scan** primary button.
- The one-time **Research-mode** acknowledgment lives here (only for Deep, only
  once per project).

**2 · In-progress (async, non-blocking)**
- A slim 5-stage progress strip (Acquire → Prep → Perceive → Blueprint → Done),
  live via the existing Supabase realtime refresher. Leave and come back; skeleton
  loaders, never a frozen screen.

**3 · Results — the Blueprint dashboard**
- **What works / What doesn't** — the headline two-column verdict (your core ask).
- **Hook Lab** — top hook patterns + examples, each with a "use this structure,
  our words" button → Script Remix.
- **Structure timeline** — horizontal beat timeline (recommended seconds + notes);
  the reference video's timestamped notes shown as a scrubbable track (the
  "second-by-second" feel).
- **Competitor grid** — cards: thumbnail, title, views/age, like ratio, "did well
  / fell flat."
- **Gaps & angle** — what nobody covers → our differentiation wedge.
- **Title & thumbnail patterns** — what wins in this niche.
- **Action bar** — *Send to Script Remix* · *Apply to visual prompts* · *Save to
  insights*. The blueprint flows straight into the tools we built last session.

**Feel:** tabbed Quick/Deep, chips for filters, collapsible sections so the
dashboard is scannable on a phone, one clear primary action per view, and the
cost always visible before you spend.

---

## 14. Final open item

- **Adopt vs. lift:** ✅ lift. **Gate / accuracy / UI:** specced above. Ready to
  build **Phase A** (blueprint scan + the §13 launcher/dashboard, Quick depth — no
  worker, no gate), then **B** (model-registry video gen, $100 cap), then **C**
  (two-pass deep perception). Phase A can start now.

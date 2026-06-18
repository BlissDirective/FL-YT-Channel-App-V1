# Shorts Engine — Design Doc

Design for first-class **Shorts** in the channel app: both **repurposed**
shorts (cut a published long-form into several vertical clips) and **native**
shorts (a deliberate, hand-tuned short built from a single idea). The operator
stays in control of publishing — nothing auto-posts.

Status: **Approved — building.** Author: channel app. Date: 2026-06-18.

Source-of-truth pointers (code this design touches):
- Schema → `supabase/migrations/` (new `0020_shorts.sql`)
- Render farm → `packages/render/src/render-queue.ts`, `VideoComp.tsx`, `Root.tsx`
- Render types → `packages/render/src/types.ts`
- Tiers → `src/lib/adapters/auto-tiers.ts`
- Orchestration → `src/lib/pipeline/engine.ts`, `src/lib/actions/pipeline.ts`
- Publish → `src/lib/actions/publish.ts`, `packages/render/src/youtube.ts`

---

## 1. Scope (reconciled with operator decisions)

The operator chose the lean, operator-in-control path on every axis. This is
**not** a scheduler feature.

**In scope**
- A first-class `kind` (`long` | `short`) on videos.
- **Repurpose** a long-form into N curated vertical shorts on a manual
  "Derive Shorts" click — reusing the parent's already-rendered VO + clips
  (no new asset spend), staged for one-tap publish.
- **Native** new shorts from an idea, with the tier picked each time and
  selectable target length (30 / 60 / 120 / 180s).
- A **one-tap publish** path that uploads a staged vertical MP4 to YouTube
  (operator-triggered, not cron'd).
- Optional **smart** segment selection + per-short captions (a small Claude
  call, logged to the cost ledger) behind a toggle; a free heuristic otherwise.

**Explicitly out of scope** (cut by operator decision)
- Auto-publish cron / cadence drip / scheduled auto-posting.
- Auto-derive-on-publish or any automatic trigger — derivation is always a
  manual click, per video.
- Per-project trigger toggles and `scheduled_at` automation.

**Correction carried from planning:** "render + stage for one-tap publish"
still requires building a Shorts → YouTube upload path, because today shorts
only land in Supabase Storage and are **never** uploaded. The only change from
the original scoping is the trigger: the operator taps publish instead of a
cron firing.

---

## 2. The backbone: `kind`

Repurposed and native shorts are **both `kind='short'` video rows** — same
gates, tracking, and cost ledger as long-forms. The differences are data, not
type:

| New field | Table | Purpose |
|---|---|---|
| `kind text not null default 'long'` | `videos` | `'long'` or `'short'` — drives script targets, tiers, highlight density, and render path |
| `parent_video_id uuid references videos(id)` | `videos` | set on **repurposed** shorts → the source long-form; null for native/long |
| `source_segment jsonb` | `videos` | `{ beats:number[], label:string }` — which parent beats this short is cut from; null otherwise |
| `derive_shorts_count int not null default 3` | `projects` | default N for the Derive modal |
| `derive_shorts_smart boolean not null default true` | `projects` | default for the smart-selection toggle |

A repurposed short has a `parent_video_id` and reuses the parent's assets for
its segment beats (free render). A native short has its own assets like any
long-form. Helper: `isShort(video)` / `isDerived(video)` in a shared util.

`target_length_sec` already exists on `videos` and is reused for native short
length (30 / 60 / 120 / 180).

---

## 3. Rendering vertical shorts

Today the `Short` composition renders **beat 0 only** (`props.beats[0]`), and
it is produced as a free byproduct inside every long-form render job using the
long-form's props. That stays untouched.

New: a **`VerticalShort`** Remotion composition that renders **all beats in
`props.beats`** at 9:16 (1080×1920), reusing the existing vertical `BeatScene`
and a CTA tail. Duration = sum of beat durations (+ tail), via a generalized
`verticalShortDurationSec(props)`.

`render-queue.ts` branches on `video.kind`:
- **`long`** → unchanged: render `LongForm` (16:9) + the free beat-0 `Short`;
  long-form auto-uploads to YouTube when OAuth is configured.
- **`short`** → render **only** `VerticalShort` from the short's own
  `props.beats`; store the MP4 in Storage; advance to `FINAL_REVIEW`. **No**
  auto-upload — publishing is a separate operator action (§5).

`buildProps()` gains a derived-short path: when `parent_video_id` is set, it
loads the **parent's** script beats + assets, keeps only the
`source_segment.beats`, re-indexes them to start at 0, and attaches the short's
own curated highlights. No VO/clip generation occurs — the parent's signed
asset URLs are reused. A derived short therefore requires its parent to be at
or past `FINAL_REVIEW` (assets present).

---

## 4. Repurposing: "Derive Shorts" from a long-form

Primary workflow. On a long-form at/after `FINAL_REVIEW`, the operator clicks
**Derive Shorts** and gets a small modal: **count** (default from project) and
**smart** toggle (default from project).

`deriveShortsAction(videoId, { count, smart })`:
1. Load the parent's beats and (if the parent is already tracked) its retention
   stats.
2. **Segment selection:**
   - **smart** → a Claude call picks N non-overlapping contiguous beat ranges
     biased toward high-retention / high-energy moments, writes a punchy
     caption/title per short, and curates per-short highlights. Cost recorded
     via `recordCost` (provider `anthropic`, ~cents).
   - **heuristic** (free) → pick N spread-out ranges by beat scoring; inherit
     the parent's existing highlights for those beats, re-timed.
3. Create N `kind='short'` video rows with `parent_video_id`, `source_segment`,
   title/caption, and curated highlights; enqueue render jobs.
4. Each renders via the §3 derived path (free) and lands at `FINAL_REVIEW`,
   staged for one-tap publish.

Enhancements folded in:
- **Retention-aware** selection when parent stats exist (ties into the existing
  optimizer).
- **Inherit parent highlights** for free unless smart rewrites them.
- **No-overlap guard** so the N shorts don't cut the same moment.

---

## 5. One-tap publish (Shorts → YouTube)

`publishShortAction(videoId)` downloads the staged vertical MP4 from Storage and
uploads it to YouTube as a Short (append `#Shorts`, vertical), reusing
`uploadVideo` from `packages/render/src/youtube.ts` (a plain HTTPS API call — no
render farm or Chrome needed). Writes the resulting `youtube_video_id`. Requires
the `YOUTUBE_OAUTH_*` secrets already used by the render farm; if absent, the UI
falls back to "download the MP4 and upload manually."

This is the same trigger model the operator chose: **manual**. They publish each
staged short whenever they want.

---

## 6. Native shorts (deliberate, tier picked each time)

A hand-picked flow for visually striking shorts on high-interest topics.
- **Entry:** expose **"Short"** as an idea/topic type; `queueTopicAction` accepts
  `kind` + `target_length_sec` (30 / 60 / 120 / 180), creating a `kind='short'`
  video. Idea-gen already accepts a length parameter.
- **Pipeline:** scripts to the chosen short length → SCRIPT gate → assets →
  render `VerticalShort` (§3) → `FINAL_REVIEW` → one-tap publish (§5).
- **Short-tuned tiers:** a `shortMode` flag in `auto-tiers.ts` uses denser
  pacing (a much smaller `ACCENT_PER_SEC`, so most/all beats get motion) and
  short-appropriate hero bookends. `FullAutoPanel` shows short-tuned estimates;
  `fullAutoGenerate` passes `shortMode` when `kind='short'`. The operator still
  **picks the tier each time**.
- **Highlights:** higher density (the whole clip is the payload); the existing
  hook-beat ≥2 highlight guarantee still applies.

---

## 7. Phased build plan

Each phase is independently shippable.

- **Phase 0 — Foundations.** Migration `0020_shorts.sql` (the §2 fields) +
  `Video`/`Project` type updates + `isShort()`/`isDerived()` helper. Regenerate
  Supabase types. *(small)*
- **Phase 1 — Vertical render.** `VerticalShort` composition +
  `verticalShortDurationSec`; `Root.tsx` registration; `render-queue.ts`
  branch on `kind`; `buildProps` derived-short path. *(medium)*
- **Phase 2 — Derive Shorts.** Segment selector adapter (smart + heuristic),
  `deriveShortsAction`, `publishShortAction`, and the long-form "Derive Shorts"
  button + modal + short cards. *(medium-large)*
- **Phase 3 — Native shorts.** "Short" idea/topic entry,
  `kind`/`target_length_sec` plumbing, `shortMode` tiers + estimates. *(medium)*
- **Phase 4 — Polish.** A "Shorts" view to manage staged shorts + one-tap
  publish, parent↔child linkage in the UI, tests + docs. *(small-medium)*

Recommended order: **0 → 1 → 2** delivers the primary repurpose workflow
end-to-end; **3** follows; **4** finishes.

---

## 8. Risks & dependencies

- **YouTube OAuth** must be configured for one-tap publish (`YOUTUBE_OAUTH_*`).
  Absent → manual-upload fallback.
- Reusing parent assets assumes the parent finished rendering — Derive Shorts
  is gated on the parent being at/after `FINAL_REVIEW`.
- Generalizing vertical rendering must not regress the existing free beat-0
  `Short` produced inside long-form jobs (kept as a separate composition).
- Smart selection adds a small per-derivation Claude cost; the heuristic path
  stays free and is the toggle's off-state.

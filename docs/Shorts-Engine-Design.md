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
     biased toward high-retention / high-energy moments and writes a punchy
     title + hook caption per short. Cost logged to the parent's ledger
     (provider `anthropic`, ~cents).
   - **heuristic** (free) → spread N non-overlapping ranges evenly across the
     script.
   - Either way, each short **inherits the parent's curated highlights** that
     fall on its beats (re-id'd); timing re-resolves at render from the reused
     beat word timestamps. Free, and consistent with the long-form.
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

The app deliberately holds **no** YouTube OAuth (uploads stay out of Google's
audit by design — see `src/lib/adapters/youtube.ts`); only the render farm has
the upload creds. So one-tap publish is a flag the farm consumes:

- `publishShortAction(projectId, videoId)` sets `videos.publish_requested = true`
  (migration `0021_shorts_publish.sql`). That's the operator's one tap, surfaced
  on **both** the Derive Shorts panel (derived) and the Publish Kit (native).
  Works once the Short is rendered (`FINAL_REVIEW`) or its gate is approved
  (`APPROVED`).
- On its next pass the render farm (`render-queue.ts → publishStagedShorts`)
  downloads the staged 9:16 MP4 from Storage, uploads it via `uploadVideo`
  (`#Shorts`; the segment caption, else the title, as description), and stamps
  `youtube_video_id` + `TRACKING`. No-op when the farm has no OAuth.
- Fallback with no OAuth: the operator downloads the MP4 and uses the existing
  "mark uploaded" path.

This is the trigger model the operator chose: **manual**. They publish each
staged short whenever they want; nothing auto-posts.

---

## 6. Native shorts (deliberate, tier picked each time)

A hand-picked flow for visually striking shorts on high-interest topics. Unlike
derived shorts, native shorts run the **full gated pipeline** (deliberate,
hand-tuned). They publish via the **same one-tap button** (§5, surfaced in the
Publish Kit for `kind='short'`) with the manual download + mark-uploaded path as
fallback.
- **Entry:** the dashboard `QueueTopic` has a **Long-form / Short** toggle with a
  length picker (**30 / 60 / 120 / 180s**); `queueTopicAction` takes
  `{ kind, targetLengthSec }` and creates a `kind='short'` video at the IDEA gate.
- **Pipeline:** `generateScript` already targets `target_length_sec`, so the
  script comes out short → SCRIPT gate → assets → the farm renders
  `VerticalShort` (§3) → `FINAL_REVIEW` → standard publish.
- **Short-tuned tiers:** a `shortMode` flag in `auto-tiers.ts` uses denser
  pacing (`ACCENT_PER_SEC_SHORT ≈ 12s`, so a native Short is motion the whole
  way through). `FullAutoPanel` shows short-tuned estimates; `fullAutoGenerate`
  passes `shortMode` when `kind='short'`. The operator still **picks the tier
  each time**.
- **Visibility:** native shorts are real pipeline videos, so they appear in the
  review queue / project grid (`getVideos` excludes only *derived* shorts —
  `parent_video_id` set). Highlights keep the hook-beat ≥2 guarantee.

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

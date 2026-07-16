/**
 * Segment model (Editor & Assembly Revision, R1). The granular, sub-beat unit
 * the Assembly/Storyboard screen and the MVDA both author: a contiguous stretch
 * of screen time with one medium (or a `sequence`/`scene` of children). A beat
 * is an ordered list of segments; segments compile into the EditDocument the
 * /edit timeline already edits — so the two screens are two views of one doc.
 *
 * Pure — no I/O (repo convention). See Fable5-Editor-and-Assembly-Revision-Spec.md.
 */
import {
  ASPECT_FOR_FORMAT,
  DEFAULT_TRANSITIONS,
  type EddFormat,
  type EddSource,
  type EditDocument,
  type MotionKeyframe,
  type MotionSpec,
  type Transition,
  type VideoClip,
} from "./edd";
import type { Medium, ShotPlan } from "./shot-router";

const FRAME = 1 / 30;

// ── Segment vocabulary ────────────────────────────────────────────────
export type SegmentMedium = "still" | "ai-clip" | "stock" | "dataviz" | "stick" | "scene";
export type SegmentKind = "clip" | "sequence" | "scene";
export type SegmentStatus = "planned" | "generating" | "ready" | "failed";

export type Segment = {
  id: string;
  beatIdx: number;
  /** Absolute planning-timeline seconds (the Assembly view coordinate). The
      compiled doc re-lays gaplessly from durations, so these drive the UI +
      validation, not the final timeline offsets. */
  startSec: number;
  endSec: number;
  kind: SegmentKind;
  medium: SegmentMedium;
  model?: string; // "seedance-2.0-fast" | "flux-dev" | "kling-2.6" | …
  prompt?: string;
  motion?: MotionSpec;
  captionStyle?: string;
  /** How this segment enters — becomes the PREVIOUS clip's transitionOut. */
  transitionIn?: Transition;
  /** For kind "sequence": the ordered sub-segments (e.g. 3 Flux stills). */
  children?: Segment[];
  assetId?: string | null;
  estCostUsd: number;
  status: SegmentStatus;
};

export type SegmentPlan = {
  beats: { beatIdx: number; segments: Segment[] }[];
  version: number;
  planCostUsd: number;
};

/** Segment medium → the EDD source kind the renderer understands. */
export const MEDIUM_EDD_SOURCE: Record<SegmentMedium, EddSource> = {
  still: "still",
  "ai-clip": "ai-clip",
  stock: "stock",
  dataviz: "dataviz",
  stick: "stick",
  scene: "stick", // compositor scenes render via the programmatic (stick) path in v1
};

/** Indicative per-segment cost (USD) for quick manual authoring. The V2 router
    carries precise costs; this is a sensible default when a human adds one. */
export const SEGMENT_COST: Record<SegmentMedium, number> = {
  still: 0.025,
  "ai-clip": 0.2,
  stock: 0,
  dataviz: 0,
  stick: 0,
  scene: 0,
};

/** V2 router Medium → SegmentMedium (AUTO mode feeds the Assembly screen). */
export function mediumToSegmentMedium(m: Medium): SegmentMedium {
  switch (m) {
    case "remotion":
      return "scene";
    case "chart":
      return "dataviz";
    case "stick":
      return "stick";
    case "stock":
      return "stock";
    case "still":
      return "still";
    case "i2v":
    case "t2v":
      return "ai-clip";
  }
}

// ── Duration + cost ───────────────────────────────────────────────────
export const segDuration = (s: Pick<Segment, "startSec" | "endSec">): number =>
  Math.max(0, s.endSec - s.startSec);

/** Ordered leaf segments: sequence children replace their parent; clip/scene
    segments pass through. This is what compiles to clips. */
export function leafSegments(plan: SegmentPlan): Segment[] {
  const out: Segment[] = [];
  for (const b of plan.beats) {
    for (const s of b.segments) {
      if (s.kind === "sequence" && s.children && s.children.length > 0) out.push(...s.children);
      else out.push(s);
    }
  }
  return out;
}

/** Total estimated spend of a plan (leaf segments, rounded to cents). */
export function segmentPlanCost(plan: SegmentPlan): number {
  const total = leafSegments(plan).reduce((sum, s) => sum + (s.estCostUsd || 0), 0);
  return Math.round(total * 100) / 100;
}

// ── Split (a core Assembly interaction) ───────────────────────────────
/** Split a clip/scene segment at an absolute time into two gapless halves.
    Returns the pair; returns [seg] unchanged when the cut isn't strictly
    inside, or for a sequence (split its children instead). Pure. */
export function splitSegment(seg: Segment, atSec: number): Segment[] {
  if (seg.kind === "sequence") return [seg];
  if (!(atSec > seg.startSec + FRAME) || !(atSec < seg.endSec - FRAME)) return [seg];
  const first: Segment = { ...seg, endSec: atSec };
  const second: Segment = {
    ...seg,
    id: `${seg.id}-b`,
    startSec: atSec,
    // The new half is unplanned generation → cost is re-estimated on assign.
    estCostUsd: seg.estCostUsd,
    transitionIn: { kind: "cut" },
  };
  return [first, second];
}

// ── Keyframe authoring (granular Ken Burns) ───────────────────────────
/** Build an explicit, editable keyframe track for a pan+zoom move — the
    granular primitive the Assembly composer and the agent produce (the render
    package already samples N-point eased keyframes via motionAt). x/y are % of
    frame; ease is the destination keyframe's ("ease into this point"). */
export function panZoomKeyframes(opts: {
  durationSec: number;
  fromScale: number;
  toScale: number;
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  ease?: MotionKeyframe["ease"];
}): MotionKeyframe[] {
  const from = opts.from ?? { x: 0, y: 0 };
  const to = opts.to ?? { x: 0, y: 0 };
  const ease = opts.ease ?? "easeInOut";
  return [
    { t: 0, scale: opts.fromScale, x: from.x, y: from.y, ease: "linear" },
    { t: Math.max(FRAME, opts.durationSec), scale: opts.toScale, x: to.x, y: to.y, ease },
  ];
}

/** Default motion for a segment by medium (mirrors the legacy compiler: stills
    get a slow Ken-Burns zoom, footage plays untransformed). */
export function motionForSegment(seg: Segment): MotionSpec {
  if (seg.motion) return seg.motion;
  const src = MEDIUM_EDD_SOURCE[seg.medium];
  if (src === "ai-clip" || src === "stock") return { kind: "none" };
  return { kind: "kenburns", fromScale: 1.02, toScale: 1.12, anchor: "center" };
}

// ── Validation ────────────────────────────────────────────────────────
export type SegmentError = { where: string; msg: string };

/** Validate a segment plan (pure): per-beat segments are ordered + gapless,
    durations positive, sequences have ≥2 gapless children tiling the parent. */
export function validateSegmentPlan(plan: SegmentPlan): { ok: boolean; errors: SegmentError[] } {
  const errors: SegmentError[] = [];
  const add = (where: string, msg: string) => errors.push({ where, msg });

  for (const b of plan.beats) {
    let cursor: number | null = null;
    b.segments.forEach((s, i) => {
      const w = `beat ${b.beatIdx} seg[${i}] ${s.id}`;
      if (!(segDuration(s) > 0)) add(w, "segment duration must be > 0");
      if (cursor !== null && Math.abs(s.startSec - cursor) > FRAME) {
        add(w, `expected start ${cursor.toFixed(3)}s, got ${s.startSec.toFixed(3)}s (gap/overlap)`);
      }
      cursor = s.endSec;

      if (s.kind === "sequence") {
        const kids = s.children ?? [];
        if (kids.length < 2) add(w, "sequence needs ≥ 2 children");
        let kc: number | null = s.startSec;
        kids.forEach((k, j) => {
          const kw = `${w} child[${j}] ${k.id}`;
          if (!(segDuration(k) > 0)) add(kw, "child duration must be > 0");
          if (kc !== null && Math.abs(k.startSec - kc) > FRAME) {
            add(kw, "sequence children must be gapless within the parent");
          }
          kc = k.endSec;
        });
        if (kids.length > 0 && Math.abs((kc ?? s.startSec) - s.endSec) > FRAME) {
          add(w, "sequence children must tile the parent exactly");
        }
      }
    });
  }
  return { ok: errors.length === 0, errors };
}

// ── Bridge from the V2 router ─────────────────────────────────────────
/** Convert a V2 ShotPlan into a SegmentPlan (AUTO mode → the Assembly screen).
    Each routed shot becomes one clip segment laid gaplessly within its beat. */
export function segmentsFromShotPlan(plan: ShotPlan): SegmentPlan {
  const beats = plan.beats.map((b) => {
    let cursor = 0;
    const segments: Segment[] = b.shots.map((shot, i) => {
      const medium = mediumToSegmentMedium(shot.medium);
      const startSec = cursor;
      const endSec = cursor + Math.max(FRAME, shot.durationSec);
      cursor = endSec;
      return {
        id: `${b.beatIdx}-${i}`,
        beatIdx: b.beatIdx,
        startSec,
        endSec,
        kind: "clip" as const,
        medium,
        estCostUsd: shot.estCostUsd,
        status: "planned" as const,
      };
    });
    return { beatIdx: b.beatIdx, segments };
  });
  const seg: SegmentPlan = { beats, version: 1, planCostUsd: 0 };
  seg.planCostUsd = segmentPlanCost(seg);
  return seg;
}

// ── Initial plan from script beats (the Assembly screen's starting point) ──
export type PlanBeatInput = {
  idx: number;
  /** Estimated screen seconds for the beat (VO length isn't known pre-gen). */
  durationSec?: number;
  shotType?: "hero" | "broll" | "stock";
};

/** Default segment medium for a beat's coarse shotType. */
export function shotTypeToSegmentMedium(shotType: "hero" | "broll" | "stock" | undefined): SegmentMedium {
  if (shotType === "hero") return "ai-clip";
  if (shotType === "stock") return "stock";
  return "still";
}

/** Build a default one-segment-per-beat plan (the Assembly screen opens on this
    when no plan is stored yet). Pure + deterministic. */
export function initialPlanFromBeats(beats: PlanBeatInput[], opts?: { defaultBeatSec?: number }): SegmentPlan {
  const def = Math.max(FRAME, opts?.defaultBeatSec ?? 5);
  const planBeats = beats.map((b) => {
    const medium = shotTypeToSegmentMedium(b.shotType);
    const dur = Math.max(FRAME, b.durationSec ?? def);
    const seg: Segment = {
      id: `${b.idx}-0`,
      beatIdx: b.idx,
      startSec: 0,
      endSec: dur,
      kind: "clip",
      medium,
      estCostUsd: SEGMENT_COST[medium],
      status: "planned",
    };
    return { beatIdx: b.idx, segments: [seg] };
  });
  const plan: SegmentPlan = { beats: planBeats, version: 1, planCostUsd: 0 };
  plan.planCostUsd = segmentPlanCost(plan);
  return plan;
}

// ── Compile: segments → a valid EditDocument skeleton ─────────────────
export type SegmentsToDocOpts = {
  format: EddFormat;
  introSec: number;
  outroSec: number;
  captionStyle?: string;
  targetDurationSec?: number;
};

/** Clamp a transition to the registry max and both adjacent clip durations. */
function clampTransition(t: Transition | undefined, thisDur: number, nextDur: number): Transition {
  if (!t || t.kind === "cut") return { kind: "cut" };
  const max = DEFAULT_TRANSITIONS[t.kind]?.maxSec;
  if (max == null) return { kind: "cut" }; // unknown → safe cut
  const sec = "sec" in t && typeof t.sec === "number" ? t.sec : 0;
  const capped = Math.max(0, Math.min(sec, max, thisDur, nextDur));
  return { ...t, sec: capped } as Transition;
}

/**
 * Compile a segment plan into a valid EditDocument skeleton (R1). Clips are
 * laid gaplessly from the intro; assets are null until generated (trim is a
 * safe full window); motion defaults per medium; a segment's transitionIn
 * becomes the previous clip's transitionOut (last clip ends on a cut). Clips
 * are silent (this is the pre-render visual scaffold — VO/captions are filled
 * by the existing compileEdd after generation). validateEdd passes against a
 * matching context.
 */
export function segmentsToDocument(plan: SegmentPlan, opts: SegmentsToDocOpts): EditDocument {
  const leaves = leafSegments(plan);
  const video: VideoClip[] = [];
  let cursor = opts.introSec;

  leaves.forEach((seg, i) => {
    const duration = Math.max(FRAME, segDuration(seg));
    const next = leaves[i + 1];
    const isLast = i === leaves.length - 1;
    const nextDur = next ? Math.max(FRAME, segDuration(next)) : Infinity;
    video.push({
      id: `v${i + 1}`,
      beatIdx: seg.beatIdx,
      assetId: seg.assetId ?? null,
      source: MEDIUM_EDD_SOURCE[seg.medium],
      start: cursor,
      duration,
      trim: { in: 0, out: duration },
      motion: motionForSegment(seg),
      transitionOut: isLast ? { kind: "cut" } : clampTransition(next?.transitionIn, duration, nextDur),
      silent: true,
    });
    cursor += duration;
  });

  const runtimeSec = cursor + opts.outroSec;
  return {
    meta: {
      schemaVersion: 1,
      format: opts.format,
      fps: 30,
      aspect: ASPECT_FOR_FORMAT[opts.format],
      targetDurationSec: opts.targetDurationSec ?? runtimeSec,
    },
    intro: { sting: opts.introSec > 0, sec: opts.introSec },
    outro: { endCard: opts.outroSec > 0, sec: opts.outroSec },
    tracks: { video, audio: [], captions: [], overlays: [] },
  };
}

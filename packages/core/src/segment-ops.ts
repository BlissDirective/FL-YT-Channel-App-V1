/**
 * Segment plan operations (Editor & Assembly R3). The single, pure op
 * vocabulary the Assembly screen (human) AND the MVDA (agent) both edit through
 * — the "one plan, two authors" analogue of edd-ops. Every op is
 * (plan, …args) → SegmentPlan, keeping beats gapless and the cost current, so
 * the human UI and the agent can never diverge in behavior.
 *
 * Pure — no I/O. See Fable5-Editor-and-Assembly-Revision-Spec.md §5.
 */
import type { MotionSpec } from "./edd";
import {
  MEDIUM_EDD_SOURCE,
  SEGMENT_COST,
  panZoomKeyframes,
  segDuration,
  segmentPlanCost,
  splitSegment,
  type Segment,
  type SegmentMedium,
  type SegmentPlan,
} from "./segment";

const FRAME = 1 / 30;

// ── Motion presets (shared by UI + agent) ─────────────────────────────
export const SEGMENT_MOTION_PRESETS = [
  "auto",
  "zoom-in",
  "zoom-out",
  "pan-left",
  "pan-right",
  "static",
  "hero-hold",
  "none",
] as const;
export type SegmentMotionPreset = (typeof SEGMENT_MOTION_PRESETS)[number];

/** A named motion preset → a MotionSpec (undefined = medium default). */
export function motionFromPreset(preset: SegmentMotionPreset, durationSec: number): MotionSpec | undefined {
  switch (preset) {
    case "auto":
      return undefined;
    case "none":
      return { kind: "none" };
    case "hero-hold":
      return { kind: "heroHold", rate: 0.5 };
    case "zoom-in":
      return { kind: "kenburns", fromScale: 1.02, toScale: 1.12, anchor: "center" };
    case "zoom-out":
      return { kind: "kenburns", fromScale: 1.12, toScale: 1.02, anchor: "center" };
    case "static":
      return { kind: "kenburns", fromScale: 1.04, toScale: 1.06, anchor: "center" };
    case "pan-left":
      return { kind: "keyframes", points: panZoomKeyframes({ durationSec, fromScale: 1.12, toScale: 1.12, from: { x: 3, y: 0 }, to: { x: -3, y: 0 }, ease: "linear" }) };
    case "pan-right":
      return { kind: "keyframes", points: panZoomKeyframes({ durationSec, fromScale: 1.12, toScale: 1.12, from: { x: -3, y: 0 }, to: { x: 3, y: 0 }, ease: "linear" }) };
  }
}

/** Recover the preset name from a MotionSpec (for round-tripping the UI). */
export function presetOfMotion(m: MotionSpec | undefined): SegmentMotionPreset {
  if (!m) return "auto";
  if (m.kind === "none") return "none";
  if (m.kind === "heroHold") return "hero-hold";
  if (m.kind === "kenburns") {
    if (m.fromScale < m.toScale && m.fromScale <= 1.03) return "zoom-in";
    if (m.fromScale > m.toScale) return "zoom-out";
    return "static";
  }
  if (m.kind === "keyframes") {
    const a = m.points[0];
    const b = m.points[m.points.length - 1];
    if (a && b) return b.x < a.x ? "pan-left" : "pan-right";
  }
  return "auto";
}

// ── Reflow helpers (keep a beat gapless) ──────────────────────────────
/** Lay a sequence's children equally across [start, end]. */
export function retileChildren(children: Segment[], start: number, end: number): Segment[] {
  const each = Math.max(FRAME, (end - start) / Math.max(1, children.length));
  return children.map((c, i) => ({ ...c, startSec: start + i * each, endSec: start + (i + 1) * each }));
}

/** Re-lay a beat's segments gaplessly from `startAt`, preserving each duration
    and re-tiling any sequence children. */
export function reflowSegments(segments: Segment[], startAt = 0): Segment[] {
  let cursor = startAt;
  return segments.map((s) => {
    const dur = Math.max(FRAME, segDuration(s));
    const next: Segment = { ...s, startSec: cursor, endSec: cursor + dur };
    cursor += dur;
    if (next.kind === "sequence" && next.children && next.children.length > 0) {
      next.children = retileChildren(next.children, next.startSec, next.endSec);
    }
    return next;
  });
}

/** Apply fn to one beat's segments, reflow the beat, recompute plan cost. */
export function mapBeat(plan: SegmentPlan, beatIdx: number, fn: (segs: Segment[]) => Segment[]): SegmentPlan {
  const beats = plan.beats.map((b) => {
    if (b.beatIdx !== beatIdx) return b;
    const startAt = b.segments[0]?.startSec ?? 0;
    return { ...b, segments: reflowSegments(fn(b.segments), startAt) };
  });
  const next: SegmentPlan = { ...plan, beats };
  next.planCostUsd = segmentPlanCost(next);
  return next;
}

// ── The ops (each = one shared UI action / agent tool) ────────────────
export function splitSegmentAt(plan: SegmentPlan, beatIdx: number, segId: string, atSec: number): SegmentPlan {
  return mapBeat(plan, beatIdx, (segs) => segs.flatMap((s) => (s.id === segId ? splitSegment(s, atSec) : [s])));
}

/** Split a segment at its midpoint (the common UI/agent gesture). */
export function splitSegmentInHalf(plan: SegmentPlan, beatIdx: number, segId: string): SegmentPlan {
  return mapBeat(plan, beatIdx, (segs) =>
    segs.flatMap((s) => (s.id === segId ? splitSegment(s, (s.startSec + s.endSec) / 2) : [s])),
  );
}

export function assignSegmentMedium(
  plan: SegmentPlan,
  beatIdx: number,
  segId: string,
  medium: SegmentMedium,
  model?: string,
): SegmentPlan {
  return mapBeat(plan, beatIdx, (segs) =>
    segs.map((s) => (s.id === segId ? { ...s, medium, model, estCostUsd: SEGMENT_COST[medium] } : s)),
  );
}

export function setSegmentMotion(plan: SegmentPlan, beatIdx: number, segId: string, motion: MotionSpec | undefined): SegmentPlan {
  return mapBeat(plan, beatIdx, (segs) => segs.map((s) => (s.id === segId ? { ...s, motion } : s)));
}

export function setSegmentPrompt(plan: SegmentPlan, beatIdx: number, segId: string, prompt: string): SegmentPlan {
  return mapBeat(plan, beatIdx, (segs) => segs.map((s) => (s.id === segId ? { ...s, prompt } : s)));
}

export function removeSegment(plan: SegmentPlan, beatIdx: number, segId: string): SegmentPlan {
  return mapBeat(plan, beatIdx, (segs) => (segs.length <= 1 ? segs : segs.filter((s) => s.id !== segId)));
}

/** Turn a clip segment into a still-sequence of `count` gapless children. */
export function makeSequence(plan: SegmentPlan, beatIdx: number, segId: string, count = 2): SegmentPlan {
  const n = Math.max(2, Math.min(6, Math.round(count)));
  return mapBeat(plan, beatIdx, (segs) =>
    segs.map((s) => {
      if (s.id !== segId || s.kind === "sequence") return s;
      const kids = retileChildren(
        Array.from({ length: n }, (_, i) => ({
          ...s,
          id: `${s.id}-k${i}`,
          kind: "clip" as const,
          transitionIn: i === 0 ? undefined : ({ kind: "crossfade", sec: 0.4 } as const),
        })),
        s.startSec,
        s.endSec,
      );
      return { ...s, kind: "sequence" as const, children: kids, estCostUsd: 0 };
    }),
  );
}

export function addSequenceChild(plan: SegmentPlan, beatIdx: number, seqId: string): SegmentPlan {
  return mapBeat(plan, beatIdx, (segs) =>
    segs.map((s) => {
      if (s.id !== seqId || s.kind !== "sequence" || !s.children || s.children.length === 0) return s;
      const last = s.children[s.children.length - 1];
      const kid: Segment = { ...last, id: `${seqId}-k${s.children.length}`, transitionIn: { kind: "crossfade", sec: 0.4 } };
      return { ...s, children: retileChildren([...s.children, kid], s.startSec, s.endSec) };
    }),
  );
}

export function removeSequenceChild(plan: SegmentPlan, beatIdx: number, seqId: string, childId: string): SegmentPlan {
  return mapBeat(plan, beatIdx, (segs) =>
    segs.map((s) => {
      if (s.id !== seqId || s.kind !== "sequence" || !s.children || s.children.length <= 2) return s;
      return { ...s, children: retileChildren(s.children.filter((c) => c.id !== childId), s.startSec, s.endSec) };
    }),
  );
}

// ── Diff (the suggestion-review payload) ──────────────────────────────
function leafCount(plan: SegmentPlan, beatIdx: number): number {
  const b = plan.beats.find((x) => x.beatIdx === beatIdx);
  if (!b) return 0;
  return b.segments.reduce((n, s) => n + (s.kind === "sequence" ? s.children?.length ?? 0 : 1), 0);
}

/** Human-readable summary of what changed between two plans — rendered as the
    agent's proposal diff on the Assembly screen (mode-safe: the human applies). */
export function segmentPlanDiff(before: SegmentPlan, after: SegmentPlan): string[] {
  const out: string[] = [];
  const beforeCost = segmentPlanCost(before);
  const afterCost = segmentPlanCost(after);
  if (Math.abs(afterCost - beforeCost) > 1e-9) {
    out.push(`cost $${beforeCost.toFixed(2)} → $${afterCost.toFixed(2)}`);
  }
  const idxs = new Set<number>([...before.beats.map((b) => b.beatIdx), ...after.beats.map((b) => b.beatIdx)]);
  for (const i of [...idxs].sort((a, b) => a - b)) {
    const bc = leafCount(before, i);
    const ac = leafCount(after, i);
    if (bc !== ac) out.push(`beat ${i + 1}: ${bc} → ${ac} segments`);
  }
  if (out.length === 0) out.push("no structural change");
  return out;
}

// ── Agent tool schemas + dispatcher ───────────────────────────────────
/** The planning tools the MVDA calls (Anthropic tool-def shape). The agent
    proposes ops; the human/tier applies them (suggestion-diff mode). */
export const SEGMENT_TOOLS = [
  { name: "split_segment", description: "Split a segment in half at its midpoint.", input_schema: { type: "object", properties: { beatIdx: { type: "number" }, segId: { type: "string" } }, required: ["beatIdx", "segId"] } },
  { name: "assign_medium", description: "Set a segment's medium (still | ai-clip | stock | dataviz | stick | scene) and optional model.", input_schema: { type: "object", properties: { beatIdx: { type: "number" }, segId: { type: "string" }, medium: { type: "string" }, model: { type: "string" } }, required: ["beatIdx", "segId", "medium"] } },
  { name: "set_segment_motion", description: "Set a segment's motion preset (zoom-in, pan-left, hero-hold, none, …).", input_schema: { type: "object", properties: { beatIdx: { type: "number" }, segId: { type: "string" }, preset: { type: "string" } }, required: ["beatIdx", "segId", "preset"] } },
  { name: "set_segment_prompt", description: "Set a segment's visual prompt.", input_schema: { type: "object", properties: { beatIdx: { type: "number" }, segId: { type: "string" }, prompt: { type: "string" } }, required: ["beatIdx", "segId", "prompt"] } },
  { name: "make_sequence", description: "Turn a clip segment into a still-sequence of N children (2–6).", input_schema: { type: "object", properties: { beatIdx: { type: "number" }, segId: { type: "string" }, count: { type: "number" } }, required: ["beatIdx", "segId"] } },
  { name: "remove_segment", description: "Remove a segment from a beat (no-op if it's the only one).", input_schema: { type: "object", properties: { beatIdx: { type: "number" }, segId: { type: "string" } }, required: ["beatIdx", "segId"] } },
] as const;

export type SegmentToolName = (typeof SEGMENT_TOOLS)[number]["name"];

/** Apply one agent tool call to a plan (pure). Unknown tools / bad args return
    the plan unchanged, so a malformed proposal can never corrupt the plan. */
export function applySegmentTool(plan: SegmentPlan, name: string, input: Record<string, unknown>): SegmentPlan {
  const beatIdx = typeof input.beatIdx === "number" ? input.beatIdx : NaN;
  const segId = typeof input.segId === "string" ? input.segId : "";
  if (Number.isNaN(beatIdx) || !segId) return plan;
  // segment duration for motion presets that need it
  const seg = plan.beats.find((b) => b.beatIdx === beatIdx)?.segments.find((s) => s.id === segId);
  const dur = seg ? segDuration(seg) : 4;
  switch (name) {
    case "split_segment":
      return splitSegmentInHalf(plan, beatIdx, segId);
    case "assign_medium": {
      const medium = input.medium as SegmentMedium;
      if (!(medium in MEDIUM_EDD_SOURCE)) return plan;
      return assignSegmentMedium(plan, beatIdx, segId, medium, typeof input.model === "string" ? input.model : undefined);
    }
    case "set_segment_motion": {
      const preset = input.preset as SegmentMotionPreset;
      if (!SEGMENT_MOTION_PRESETS.includes(preset)) return plan;
      return setSegmentMotion(plan, beatIdx, segId, motionFromPreset(preset, dur));
    }
    case "set_segment_prompt":
      return typeof input.prompt === "string" ? setSegmentPrompt(plan, beatIdx, segId, input.prompt) : plan;
    case "make_sequence":
      return makeSequence(plan, beatIdx, segId, typeof input.count === "number" ? input.count : 3);
    case "remove_segment":
      return removeSegment(plan, beatIdx, segId);
    default:
      return plan;
  }
}

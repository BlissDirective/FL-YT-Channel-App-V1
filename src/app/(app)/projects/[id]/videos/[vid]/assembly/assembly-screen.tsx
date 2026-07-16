"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Wand2, Save, Scissors, Trash2, Plus, Layers, Film } from "lucide-react";
import {
  type Segment,
  type SegmentMedium,
  type SegmentPlan,
  type MotionSpec,
  segmentPlanCost,
  validateSegmentPlan,
  splitSegment,
  segDuration,
  SEGMENT_COST,
  panZoomKeyframes,
} from "@studio/core";
import { Card } from "@/components/ui/card";
import {
  saveAssemblyPlanAction,
  autoAssemblyPlanAction,
  clearAssemblyPlanAction,
} from "@/lib/actions/assembly";

const FRAME = 1 / 30;

const MEDIA: { value: SegmentMedium; label: string }[] = [
  { value: "still", label: "Still (FLUX)" },
  { value: "ai-clip", label: "AI clip (Seedance/Kling)" },
  { value: "stock", label: "Stock" },
  { value: "dataviz", label: "Chart" },
  { value: "stick", label: "Motion-graphic" },
  { value: "scene", label: "Scene (compositor)" },
];

const MODELS: Record<SegmentMedium, string[]> = {
  still: ["flux-dev", "flux-schnell"],
  "ai-clip": ["seedance-2.0-fast", "kling-2.6", "veo-3", "ltx-video", "wan-2.6"],
  stock: ["pexels"],
  dataviz: ["chart"],
  stick: ["stick"],
  scene: ["quote-card", "stat-ticker", "comparison"],
};

const MOTIONS = ["auto", "zoom-in", "zoom-out", "pan-left", "pan-right", "static", "hero-hold", "none"] as const;
type MotionPreset = (typeof MOTIONS)[number];

function motionFromPreset(preset: MotionPreset, durationSec: number): MotionSpec | undefined {
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

function presetOfMotion(m: MotionSpec | undefined): MotionPreset {
  if (!m) return "auto";
  if (m.kind === "none") return "none";
  if (m.kind === "heroHold") return "hero-hold";
  if (m.kind === "kenburns") {
    if (m.fromScale < m.toScale && m.fromScale <= 1.03) return "zoom-in";
    if (m.fromScale > m.toScale) return "zoom-out";
    return "static";
  }
  if (m.kind === "keyframes") {
    const [a, b] = [m.points[0], m.points[m.points.length - 1]];
    if (a && b) return b.x < a.x ? "pan-left" : "pan-right";
  }
  return "auto";
}

/** Re-lay a beat's segments gaplessly, preserving each duration, from a start. */
function reflow(segments: Segment[], startAt = 0): Segment[] {
  let cursor = startAt;
  return segments.map((s) => {
    const dur = Math.max(FRAME, segDuration(s));
    const next = { ...s, startSec: cursor, endSec: cursor + dur };
    cursor += dur;
    // sequence children re-tile within the new bounds
    if (next.kind === "sequence" && next.children && next.children.length > 0) {
      next.children = retile(next.children, next.startSec, next.endSec);
    }
    return next;
  });
}

/** Lay children equally across [start, end]. */
function retile(children: Segment[], start: number, end: number): Segment[] {
  const each = Math.max(FRAME, (end - start) / children.length);
  return children.map((c, i) => ({ ...c, startSec: start + i * each, endSec: start + (i + 1) * each }));
}

export function AssemblyScreen({
  projectId,
  videoId,
  initialPlan,
  beats,
  budgetUsd,
  hasStored,
}: {
  projectId: string;
  videoId: string;
  initialPlan: SegmentPlan;
  beats: { idx: number; text: string }[];
  budgetUsd: number;
  hasStored: boolean;
}) {
  const [plan, setPlan] = useState<SegmentPlan>(initialPlan);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const beatText = useMemo(() => new Map(beats.map((b) => [b.idx, b.text])), [beats]);
  const cost = segmentPlanCost(plan);
  const overBudget = cost > budgetUsd + 1e-9;
  const invalid = !validateSegmentPlan(plan).ok;

  const mutateBeat = (beatIdx: number, fn: (segs: Segment[]) => Segment[]) => {
    setPlan((p) => {
      const startAt = p.beats.find((b) => b.beatIdx === beatIdx)?.segments[0]?.startSec ?? 0;
      const beats2 = p.beats.map((b) =>
        b.beatIdx === beatIdx ? { ...b, segments: reflow(fn(b.segments), startAt) } : b,
      );
      const next = { ...p, beats: beats2 };
      next.planCostUsd = segmentPlanCost(next);
      return next;
    });
    setDirty(true);
    setMsg(null);
  };

  const updateSeg = (beatIdx: number, segId: string, patch: Partial<Segment>) =>
    mutateBeat(beatIdx, (segs) => segs.map((s) => (s.id === segId ? { ...s, ...patch } : s)));

  const splitAt = (beatIdx: number, segId: string) =>
    mutateBeat(beatIdx, (segs) =>
      segs.flatMap((s) => (s.id === segId ? splitSegment(s, (s.startSec + s.endSec) / 2) : [s])),
    );

  const removeSeg = (beatIdx: number, segId: string) =>
    mutateBeat(beatIdx, (segs) => (segs.length <= 1 ? segs : segs.filter((s) => s.id !== segId)));

  const toSequence = (beatIdx: number, segId: string) =>
    mutateBeat(beatIdx, (segs) =>
      segs.map((s) => {
        if (s.id !== segId || s.kind === "sequence") return s;
        const kids: Segment[] = retile(
          [0, 1].map((i) => ({
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

  const addChild = (beatIdx: number, seqId: string) =>
    mutateBeat(beatIdx, (segs) =>
      segs.map((s) => {
        if (s.id !== seqId || s.kind !== "sequence" || !s.children) return s;
        const kid: Segment = {
          ...s.children[s.children.length - 1],
          id: `${seqId}-k${s.children.length}`,
          transitionIn: { kind: "crossfade", sec: 0.4 },
        };
        return { ...s, children: retile([...s.children, kid], s.startSec, s.endSec) };
      }),
    );

  const removeChild = (beatIdx: number, seqId: string, childId: string) =>
    mutateBeat(beatIdx, (segs) =>
      segs.map((s) => {
        if (s.id !== seqId || s.kind !== "sequence" || !s.children || s.children.length <= 2) return s;
        return { ...s, children: retile(s.children.filter((c) => c.id !== childId), s.startSec, s.endSec) };
      }),
    );

  const updateChild = (beatIdx: number, seqId: string, childId: string, patch: Partial<Segment>) =>
    mutateBeat(beatIdx, (segs) =>
      segs.map((s) =>
        s.id === seqId && s.kind === "sequence" && s.children
          ? { ...s, children: s.children.map((c) => (c.id === childId ? { ...c, ...patch } : c)) }
          : s,
      ),
    );

  const runAuto = () =>
    start(async () => {
      setMsg(null);
      const res = await autoAssemblyPlanAction(videoId, budgetUsd).catch(() => ({ ok: false as const, error: "Failed" }));
      if (res.ok && res.plan) {
        setPlan(res.plan);
        setDirty(false);
        setMsg("Auto-planned from the script.");
      } else setMsg(res.error ?? "Auto-plan failed.");
    });

  const save = () =>
    start(async () => {
      setMsg(null);
      const res = await saveAssemblyPlanAction(videoId, plan).catch(() => ({ ok: false as const, error: "Failed" }));
      if (res.ok) {
        setDirty(false);
        setMsg("Saved.");
      } else setMsg(res.error ?? "Save failed.");
    });

  const reset = () =>
    start(async () => {
      await clearAssemblyPlanAction(videoId).catch(() => null);
      setMsg("Cleared — reopen to rebuild the default from beats.");
      setDirty(false);
    });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Assembly</h1>
          <p className="text-sm text-muted">
            Compose the video before it renders — split beats, assign a medium, and see the cost.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${overBudget ? "bg-coral/10 text-coral" : "bg-success-soft text-success"}`}>
            ${cost.toFixed(2)} / ${budgetUsd.toFixed(0)} plan cost
          </span>
          <button onClick={runAuto} disabled={pending} className="flex items-center gap-1.5 rounded-full bg-card-warm px-4 py-2 text-sm font-semibold shadow-card hover:bg-accent-soft disabled:opacity-50">
            <Wand2 className="size-4" /> Auto
          </button>
          <button onClick={save} disabled={pending || invalid} className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink shadow-card hover:scale-[1.01] disabled:opacity-50">
            <Save className="size-4" /> {dirty ? "Save*" : "Save"}
          </button>
          <Link href={`/projects/${projectId}/videos/${videoId}/edit`} className="flex items-center gap-1.5 rounded-full bg-card-warm px-4 py-2 text-sm font-semibold shadow-card hover:bg-accent-soft">
            <Film className="size-4" /> Editor
          </Link>
        </div>
      </Card>

      {(msg || invalid) && (
        <p className={`text-sm font-medium ${invalid ? "text-coral" : "text-muted"}`} role="status">
          {invalid ? "Plan has gaps/overlaps — fix before saving." : msg}
        </p>
      )}

      {/* Beats */}
      {plan.beats.map((b) => (
        <Card key={b.beatIdx} className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold">Beat {b.beatIdx + 1}</p>
            <p className="truncate text-xs text-muted">{beatText.get(b.beatIdx)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {b.segments.map((s) => (
              <SegmentCard
                key={s.id}
                seg={s}
                onMedium={(m) => updateSeg(b.beatIdx, s.id, { medium: m, model: MODELS[m][0], estCostUsd: SEGMENT_COST[m] })}
                onModel={(model) => updateSeg(b.beatIdx, s.id, { model })}
                onPrompt={(prompt) => updateSeg(b.beatIdx, s.id, { prompt })}
                onMotion={(preset) => updateSeg(b.beatIdx, s.id, { motion: motionFromPreset(preset, segDuration(s)) })}
                onSplit={() => splitAt(b.beatIdx, s.id)}
                onRemove={() => removeSeg(b.beatIdx, s.id)}
                onToSequence={() => toSequence(b.beatIdx, s.id)}
                onAddChild={() => addChild(b.beatIdx, s.id)}
                onRemoveChild={(cid) => removeChild(b.beatIdx, s.id, cid)}
                onChildMedium={(cid, m) => updateChild(b.beatIdx, s.id, cid, { medium: m, model: MODELS[m][0] })}
                onChildMotion={(cid, preset) => updateChild(b.beatIdx, s.id, cid, { motion: motionFromPreset(preset, 3) })}
                canRemove={b.segments.length > 1}
              />
            ))}
          </div>
        </Card>
      ))}

      <div className="flex justify-end">
        <button onClick={reset} disabled={pending || !hasStored} className="text-xs font-medium text-muted underline hover:text-coral disabled:opacity-40">
          Clear saved plan
        </button>
      </div>
    </div>
  );
}

function SegmentCard({
  seg,
  onMedium,
  onModel,
  onPrompt,
  onMotion,
  onSplit,
  onRemove,
  onToSequence,
  onAddChild,
  onRemoveChild,
  onChildMedium,
  onChildMotion,
  canRemove,
}: {
  seg: Segment;
  onMedium: (m: SegmentMedium) => void;
  onModel: (m: string) => void;
  onPrompt: (p: string) => void;
  onMotion: (p: MotionPreset) => void;
  onSplit: () => void;
  onRemove: () => void;
  onToSequence: () => void;
  onAddChild: () => void;
  onRemoveChild: (childId: string) => void;
  onChildMedium: (childId: string, m: SegmentMedium) => void;
  onChildMotion: (childId: string, p: MotionPreset) => void;
  canRemove: boolean;
}) {
  const dur = segDuration(seg);
  const isSeq = seg.kind === "sequence";
  return (
    <div className="w-60 shrink-0 rounded-xl border border-line bg-card-warm p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded bg-canvas px-2 py-0.5 text-[11px] font-semibold">
          {isSeq ? `Sequence · ${seg.children?.length ?? 0}` : seg.medium}
        </span>
        <span className="text-[11px] text-muted">{dur.toFixed(1)}s · ${seg.estCostUsd.toFixed(3)}</span>
      </div>

      {!isSeq && (
        <>
          <select value={seg.medium} onChange={(e) => onMedium(e.target.value as SegmentMedium)} className="mb-1 w-full rounded-lg bg-card px-2 py-1 text-xs">
            {MEDIA.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={seg.model ?? MODELS[seg.medium][0]} onChange={(e) => onModel(e.target.value)} className="mb-1 w-full rounded-lg bg-card px-2 py-1 text-xs">
            {MODELS[seg.medium].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={presetOfMotion(seg.motion)} onChange={(e) => onMotion(e.target.value as MotionPreset)} className="mb-1 w-full rounded-lg bg-card px-2 py-1 text-xs">
            {MOTIONS.map((m) => <option key={m} value={m}>motion: {m}</option>)}
          </select>
          <textarea
            value={seg.prompt ?? ""}
            onChange={(e) => onPrompt(e.target.value)}
            placeholder="visual prompt…"
            rows={2}
            className="mb-2 w-full resize-none rounded-lg bg-card px-2 py-1 text-xs"
          />
        </>
      )}

      {isSeq && (
        <div className="mb-2 space-y-1.5">
          {seg.children?.map((c) => (
            <div key={c.id} className="rounded-lg bg-card p-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted">{segDuration(c).toFixed(1)}s{c.transitionIn && c.transitionIn.kind !== "cut" ? ` · ${c.transitionIn.kind}` : ""}</span>
                {(seg.children?.length ?? 0) > 2 && (
                  <button onClick={() => onRemoveChild(c.id)} className="text-muted hover:text-coral"><Trash2 className="size-3" /></button>
                )}
              </div>
              <div className="mt-1 flex gap-1">
                <select value={c.medium} onChange={(e) => onChildMedium(c.id, e.target.value as SegmentMedium)} className="w-1/2 rounded bg-card-warm px-1 py-0.5 text-[10px]">
                  {MEDIA.map((m) => <option key={m.value} value={m.value}>{m.value}</option>)}
                </select>
                <select value={presetOfMotion(c.motion)} onChange={(e) => onChildMotion(c.id, e.target.value as MotionPreset)} className="w-1/2 rounded bg-card-warm px-1 py-0.5 text-[10px]">
                  {MOTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          ))}
          <button onClick={onAddChild} className="flex w-full items-center justify-center gap-1 rounded-lg bg-card py-1 text-[11px] font-medium text-muted hover:text-ink">
            <Plus className="size-3" /> Add still
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 text-muted">
        {!isSeq && (
          <>
            <button onClick={onSplit} title="Split in half" className="hover:text-ink"><Scissors className="size-3.5" /></button>
            <button onClick={onToSequence} title="Make a still sequence" className="hover:text-ink"><Layers className="size-3.5" /></button>
          </>
        )}
        {canRemove && (
          <button onClick={onRemove} title="Remove segment" className="ml-auto hover:text-coral"><Trash2 className="size-3.5" /></button>
        )}
      </div>
    </div>
  );
}

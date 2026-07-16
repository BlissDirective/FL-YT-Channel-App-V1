"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Wand2, Save, Scissors, Trash2, Plus, Layers, Film, Check, X } from "lucide-react";
import {
  type Segment,
  type SegmentMedium,
  type SegmentPlan,
  segmentPlanCost,
  validateSegmentPlan,
  segDuration,
  // shared ops (the same vocabulary the MVDA uses — R3 parity)
  splitSegmentInHalf,
  assignSegmentMedium,
  setSegmentMotion,
  setSegmentPrompt,
  removeSegment,
  makeSequence,
  addSequenceChild,
  removeSequenceChild,
  motionFromPreset,
  presetOfMotion,
  segmentPlanDiff,
  SEGMENT_MOTION_PRESETS,
  type SegmentMotionPreset,
} from "@studio/core";
import { Card } from "@/components/ui/card";
import {
  saveAssemblyPlanAction,
  proposeAssemblyPlanAction,
  clearAssemblyPlanAction,
} from "@/lib/actions/assembly";

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
  const [proposal, setProposal] = useState<SegmentPlan | null>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const beatText = useMemo(() => new Map(beats.map((b) => [b.idx, b.text])), [beats]);
  const cost = segmentPlanCost(plan);
  const overBudget = cost > budgetUsd + 1e-9;
  const invalid = !validateSegmentPlan(plan).ok;

  // Every mutation goes through a shared core op → UI and agent stay identical.
  const apply = (fn: (p: SegmentPlan) => SegmentPlan) => {
    setPlan((p) => fn(p));
    setDirty(true);
    setMsg(null);
  };

  const runPropose = () =>
    start(async () => {
      setMsg(null);
      const res = await proposeAssemblyPlanAction(videoId, budgetUsd).catch(() => ({ ok: false as const, error: "Failed" }));
      if (res.ok && res.plan) setProposal(res.plan);
      else setMsg(res.error ?? "Auto-plan failed.");
    });

  const acceptProposal = () => {
    if (!proposal) return;
    setPlan(proposal);
    setProposal(null);
    setDirty(true);
    setMsg("Applied the proposed plan — review and Save.");
  };

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
          <button onClick={runPropose} disabled={pending} className="flex items-center gap-1.5 rounded-full bg-card-warm px-4 py-2 text-sm font-semibold shadow-card hover:bg-accent-soft disabled:opacity-50">
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

      {/* Suggestion-diff review (mode-safe: nothing applies until you accept) */}
      {proposal && (
        <Card className="border border-accent/40 bg-accent-soft/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Proposed plan</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted">
                {segmentPlanDiff(plan, proposal).map((d, i) => (
                  <li key={i}>· {d}</li>
                ))}
              </ul>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={acceptProposal} className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-ink shadow-card">
                <Check className="size-3.5" /> Apply
              </button>
              <button onClick={() => setProposal(null)} className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-muted shadow-card hover:text-ink">
                <X className="size-3.5" /> Discard
              </button>
            </div>
          </div>
        </Card>
      )}

      {(msg || invalid) && (
        <p className={`text-sm font-medium ${invalid ? "text-coral" : "text-muted"}`} role="status">
          {invalid ? "Plan has gaps/overlaps — fix before saving." : msg}
        </p>
      )}

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
                onMedium={(m) => apply((p) => assignSegmentMedium(p, b.beatIdx, s.id, m, MODELS[m][0]))}
                onModel={(model) => apply((p) => ({ ...p, beats: p.beats.map((bb) => (bb.beatIdx === b.beatIdx ? { ...bb, segments: bb.segments.map((x) => (x.id === s.id ? { ...x, model } : x)) } : bb)) }))}
                onPrompt={(prompt) => apply((p) => setSegmentPrompt(p, b.beatIdx, s.id, prompt))}
                onMotion={(preset) => apply((p) => setSegmentMotion(p, b.beatIdx, s.id, motionFromPreset(preset, segDuration(s))))}
                onSplit={() => apply((p) => splitSegmentInHalf(p, b.beatIdx, s.id))}
                onRemove={() => apply((p) => removeSegment(p, b.beatIdx, s.id))}
                onToSequence={() => apply((p) => makeSequence(p, b.beatIdx, s.id, 3))}
                onAddChild={() => apply((p) => addSequenceChild(p, b.beatIdx, s.id))}
                onRemoveChild={(cid) => apply((p) => removeSequenceChild(p, b.beatIdx, s.id, cid))}
                onChildMedium={(cid, m) => apply((p) => ({ ...p, beats: p.beats.map((bb) => bb.beatIdx === b.beatIdx ? { ...bb, segments: bb.segments.map((x) => x.id === s.id && x.kind === "sequence" && x.children ? { ...x, children: x.children.map((c) => c.id === cid ? { ...c, medium: m, model: MODELS[m][0] } : c) } : x) } : bb) }))}
                onChildMotion={(cid, preset) => apply((p) => ({ ...p, beats: p.beats.map((bb) => bb.beatIdx === b.beatIdx ? { ...bb, segments: bb.segments.map((x) => x.id === s.id && x.kind === "sequence" && x.children ? { ...x, children: x.children.map((c) => c.id === cid ? { ...c, motion: motionFromPreset(preset, segDuration(c)) } : c) } : x) } : bb) }))}
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
  onMotion: (p: SegmentMotionPreset) => void;
  onSplit: () => void;
  onRemove: () => void;
  onToSequence: () => void;
  onAddChild: () => void;
  onRemoveChild: (childId: string) => void;
  onChildMedium: (childId: string, m: SegmentMedium) => void;
  onChildMotion: (childId: string, p: SegmentMotionPreset) => void;
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
          <select value={presetOfMotion(seg.motion)} onChange={(e) => onMotion(e.target.value as SegmentMotionPreset)} className="mb-1 w-full rounded-lg bg-card px-2 py-1 text-xs">
            {SEGMENT_MOTION_PRESETS.map((m) => <option key={m} value={m}>motion: {m}</option>)}
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
                <select value={presetOfMotion(c.motion)} onChange={(e) => onChildMotion(c.id, e.target.value as SegmentMotionPreset)} className="w-1/2 rounded bg-card-warm px-1 py-0.5 text-[10px]">
                  {SEGMENT_MOTION_PRESETS.map((m) => <option key={m} value={m}>{m}</option>)}
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

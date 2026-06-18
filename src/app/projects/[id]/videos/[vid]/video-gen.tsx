"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clapperboard,
  Film,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Timer,
  Trash2,
  Wand2,
  Zap,
} from "lucide-react";
import {
  addSectionAction,
  approveGateAction,
  autoClassifyShotTypesAction,
  deleteSectionAction,
  enqueueLongClipAction,
  fullAutoGenerateAction,
  generateBeatVideoAction,
  mergeSectionsAction,
  moveSectionAction,
  resumeVideoAction,
  saveCustomSpecAction,
  setBeatShotTypeAction,
} from "@/lib/actions/pipeline";
import { AUTO_TIERS, estimateTierCost, selectClipBeats, type AutoTier } from "@/lib/adapters/auto-tiers";
import type { CustomSpec } from "@/lib/db/types";
import {
  clampDuration,
  estimateClipCost,
  estimateExtendCost,
  estimateStitchCost,
  getVideoModel,
  STITCH_BASE_MODEL_ID,
  VIDEO_MODELS,
} from "@/lib/adapters/video-models";
import { Card, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/cn";

type ShotType = "hero" | "broll" | "stock";
type ClipInfo = { idx: number; url: string | null; isVideo: boolean };
type Beat = { idx: number; visualPrompt: string; shotType: string; scriptSec: number };
type JobInfo = { beatIdx: number; status: string; method: string };

const SHOT_TYPES: ShotType[] = ["hero", "broll", "stock"];

/** Clips estimated over the project's threshold require an explicit confirm. */
function confirmPricey(est: number, threshold: number): boolean {
  if (est <= threshold || typeof window === "undefined") return true;
  return window.confirm(
    `This is about $${est.toFixed(2)} — over your $${threshold} confirm threshold. Proceed?`,
  );
}

/** Best model for a shot type when auto-picking: Veo for hero signature shots,
    Seedance 2.0 (audio + top quality) for b-roll, cheap Fast for stock fills. */
function bestModelFor(shot: string): string {
  if (shot === "hero") return "veo-3-1";
  if (shot === "stock") return "seedance-2-fast";
  return "seedance-2";
}

const defaultDur = (modelId: string) => {
  const m = getVideoModel(modelId)!;
  return m.durations?.[0] ?? m.minDurationSec;
};

export function VideoGen({
  projectId,
  videoId,
  beats,
  clips,
  jobs,
  monthSpent,
  cap,
  confirmOverUsd,
  customDefault,
  autoSetup = false,
  videoStatus,
  shortMode = false,
}: {
  projectId: string;
  videoId: string;
  beats: Beat[];
  clips: ClipInfo[];
  jobs: JobInfo[];
  monthSpent: number;
  cap: number;
  confirmOverUsd: number;
  /** Project's saved Custom-tier recipe, if any (seeds the Custom panel). */
  customDefault: CustomSpec | null;
  /** Just approved the script → open + auto-populate models/timings. */
  autoSetup?: boolean;
  /** Current video status — decides the "approve & continue" CTA. */
  videoStatus: string;
  /** Native Short → denser accent pacing + short-tuned estimates. */
  shortMode?: boolean;
}) {
  // Show the "approve & generate" CTA while the video can still be advanced
  // into / through asset production. SCRIPT_READY = at the script gate (approve
  // advances it); GENERATING_ASSETS = mid/stuck (resume continues it).
  const atScriptGate = videoStatus === "SCRIPT_READY";
  const canProceed = atScriptGate || videoStatus === "GENERATING_ASSETS";
  const router = useRouter();
  const clipByIdx = new Map(clips.map((c) => [c.idx, c]));
  const [open, setOpen] = useState(autoSetup);
  const [spent, setSpent] = useState(monthSpent);
  const [approving, startApprove] = useTransition();
  const [approveError, setApproveError] = useState<string>();
  const [stitchOpen, setStitchOpen] = useState(false);
  const [autoRunning, startAuto] = useTransition();
  const [autoError, setAutoError] = useState<string>();

  // Lifted per-beat state so the bulk buttons can drive every row.
  const [shotTypes, setShotTypes] = useState<Record<number, string>>(
    Object.fromEntries(beats.map((b) => [b.idx, b.shotType])),
  );
  const [models, setModels] = useState<Record<number, string>>(
    Object.fromEntries(beats.map((b) => [b.idx, VIDEO_MODELS[0].id])),
  );
  const [durations, setDurations] = useState<Record<number, number>>(
    Object.fromEntries(beats.map((b) => [b.idx, defaultDur(VIDEO_MODELS[0].id)])),
  );
  const [results, setResults] = useState<Record<number, string | null>>(
    Object.fromEntries(clips.filter((c) => c.isVideo && c.url).map((c) => [c.idx, c.url])),
  );
  const [errors, setErrors] = useState<Record<number, string | undefined>>({});
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [classifying, startClassify] = useTransition();
  const [, startPersist] = useTransition();

  const remaining = Math.max(0, cap - spent);

  const setModel = (idx: number, id: string) => {
    setModels((m) => ({ ...m, [idx]: id }));
    setDurations((d) => ({ ...d, [idx]: clampDuration(getVideoModel(id)!, d[idx]) }));
  };

  const setShot = (idx: number, shot: ShotType) => {
    setShotTypes((s) => ({ ...s, [idx]: shot }));
    startPersist(() => {
      setBeatShotTypeAction(projectId, videoId, idx, shot);
    });
  };

  // ── Bulk actions ────────────────────────────────────────────────────
  const matchTimeToScript = () => {
    setDurations((d) => {
      const next = { ...d };
      for (const b of beats) next[b.idx] = clampDuration(getVideoModel(models[b.idx])!, b.scriptSec);
      return next;
    });
  };

  const autoPickModels = () => {
    setModels((m) => {
      const nextM = { ...m };
      for (const b of beats) nextM[b.idx] = bestModelFor(shotTypes[b.idx]);
      setDurations((d) => {
        const nextD = { ...d };
        for (const b of beats) nextD[b.idx] = clampDuration(getVideoModel(nextM[b.idx])!, d[b.idx]);
        return nextD;
      });
      return nextM;
    });
  };

  const autoPickTypes = () => {
    startClassify(async () => {
      const r = await autoClassifyShotTypesAction(projectId, videoId);
      if (r.ok) {
        setShotTypes((s) => {
          const next = { ...s };
          for (const c of r.shots) next[c.idx] = c.shotType;
          return next;
        });
      }
    });
  };

  // Sections with a queued/running long-clip job.
  const pendingByIdx = new Map(
    jobs.filter((j) => j.status === "queued" || j.status === "running").map((j) => [j.beatIdx, j.status]),
  );

  // ── Section editing ─────────────────────────────────────────────────
  const sectionEdit = (fn: () => Promise<unknown>) => startPersist(async () => { await fn(); router.refresh(); });
  const addSection = (afterIdx: number, mode: "visual" | "narrated") =>
    sectionEdit(() => addSectionAction(projectId, videoId, afterIdx, mode));
  const deleteSection = (idx: number) => sectionEdit(() => deleteSectionAction(projectId, videoId, idx));
  const moveSection = (idx: number, dir: "up" | "down") =>
    sectionEdit(() => moveSectionAction(projectId, videoId, idx, dir));

  // ── Long clips (Veo-extend / auto-stitch) → queued worker job ────────
  const queueLong = (idx: number, method: "veo-extend" | "stitch" | "stitch-seamless", model: string, targetSec: number, est: number) => {
    if (!confirmPricey(est, confirmOverUsd)) return;
    setErrors((e) => ({ ...e, [idx]: undefined }));
    startPersist(async () => {
      const r = await enqueueLongClipAction(projectId, videoId, idx, method, model, targetSec, est);
      if (r.ok) router.refresh();
      else setErrors((e) => ({ ...e, [idx]: r.error }));
    });
  };

  const runFullAuto = (tier: AutoTier, est: number, custom?: CustomSpec) => {
    if (!confirmPricey(est, confirmOverUsd)) return;
    // Veo is the premium ($0.40/s) model — always confirm its projected cost.
    if (custom && [custom.heroModel, custom.brollModel].some((m) => m.startsWith("veo-"))) {
      if (typeof window !== "undefined" && !window.confirm(`This Custom run uses Veo (premium) — about $${est.toFixed(2)}. Continue?`)) return;
    }
    setAutoError(undefined);
    startAuto(async () => {
      const r = await fullAutoGenerateAction(projectId, videoId, tier, custom);
      if (r.ok) router.refresh();
      else setAutoError(r.error);
    });
  };

  const generate = (idx: number) => {
    const model = getVideoModel(models[idx])!;
    // Long-clip models (Veo-extend) run in the background worker, not inline.
    if (model.longClip) {
      queueLong(idx, "veo-extend", model.id, durations[idx], estimateExtendCost(durations[idx]));
      return;
    }
    if (!confirmPricey(estimateClipCost(model, durations[idx]), confirmOverUsd)) return;
    setErrors((e) => ({ ...e, [idx]: undefined }));
    setBusyIdx(idx);
    startPersist(async () => {
      const r = await generateBeatVideoAction(projectId, videoId, idx, models[idx], durations[idx]);
      if (r.ok) {
        setResults((res) => ({ ...res, [idx]: r.url }));
        setSpent((s) => s + r.costUsd);
      } else {
        setErrors((e) => ({ ...e, [idx]: r.error }));
      }
      setBusyIdx(null);
    });
  };

  const approveVideoSettings = () => {
    setApproveError(undefined);
    startApprove(async () => {
      // At the script gate: approve advances it (and runs assets). Already in
      // GENERATING_ASSETS (e.g. stuck): resume continues the pipeline.
      const r = atScriptGate
        ? await approveGateAction(projectId, videoId)
        : await resumeVideoAction(projectId, videoId);
      if (r.ok) router.refresh();
      else setApproveError(r.error);
    });
  };

  // Apply models + timings together (one pass — avoids reading stale model
  // state) so a "set up" lands consistent, in-range choices for every beat.
  const autoSetupApply = () => {
    const nextModels: Record<number, string> = {};
    const nextDur: Record<number, number> = {};
    for (const b of beats) {
      const id = bestModelFor(shotTypes[b.idx]);
      nextModels[b.idx] = id;
      nextDur[b.idx] = clampDuration(getVideoModel(id)!, b.scriptSec);
    }
    setModels((m) => ({ ...m, ...nextModels }));
    setDurations((d) => ({ ...d, ...nextDur }));
  };

  // Just approved the script → populate models + timings (types are already
  // classified server-side) so the operator reviews real choices, not defaults.
  useEffect(() => {
    if (autoSetup) autoSetupApply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <CardTitle>
          <span className="flex items-center gap-2">
            <Clapperboard className="size-4 text-lavender" /> AI Video Generation
          </span>
        </CardTitle>
        <span className="text-xs font-semibold text-muted">{open ? "Hide" : "Open"}</span>
      </button>

      {open && (
        <div className="space-y-4">
          {atScriptGate && (
            <FullAutoPanel
              projectId={projectId}
              beats={beats}
              running={autoRunning}
              error={autoError}
              customDefault={customDefault}
              shortMode={shortMode}
              onRun={runFullAuto}
            />
          )}
          <div>
            <p className="mb-2 flex items-center justify-between text-sm text-muted">
              <span>Video budget this month</span>
              <span className="font-semibold text-ink">
                ${spent.toFixed(2)} / ${cap.toFixed(0)}
              </span>
            </p>
            <ProgressBar percent={cap > 0 ? (spent / cap) * 100 : 0} label={`$${remaining.toFixed(0)} left`} />
          </div>

          {/* Bulk actions */}
          <div className="flex flex-wrap gap-2">
            <BulkButton icon={Sparkles} onClick={autoPickTypes} busy={classifying} label="Auto-pick types" />
            <BulkButton icon={Wand2} onClick={autoPickModels} label="Auto-pick models" />
            <BulkButton icon={Timer} onClick={matchTimeToScript} label="Match time to script" />
            <BulkButton icon={Layers} onClick={() => setStitchOpen((o) => !o)} label="Auto-stitch clip mode" />
          </div>

          {stitchOpen && (
            <AutoStitchPanel
              beats={beats}
              remaining={remaining}
              onLengthen={(idx, method, target, est) =>
                queueLong(idx, method, STITCH_BASE_MODEL_ID, target, est)}
              onMerge={(start, end) =>
                sectionEdit(() => mergeSectionsAction(projectId, videoId, start, end))}
            />
          )}

          <div className="space-y-3">
            {beats.map((b, i) => (
              <BeatRow
                key={b.idx}
                beat={b}
                index={i}
                total={beats.length}
                shot={shotTypes[b.idx] as ShotType}
                modelId={models[b.idx]}
                duration={durations[b.idx]}
                resultUrl={results[b.idx] ?? null}
                existing={clipByIdx.get(b.idx)}
                remaining={remaining}
                busy={busyIdx === b.idx}
                pending={pendingByIdx.get(b.idx)}
                error={errors[b.idx]}
                onShot={(s) => setShot(b.idx, s)}
                onModel={(id) => setModel(b.idx, id)}
                onDuration={(n) => setDurations((d) => ({ ...d, [b.idx]: n }))}
                onGenerate={() => generate(b.idx)}
                onDelete={() => deleteSection(b.idx)}
                onMove={(dir) => moveSection(b.idx, dir)}
                onAddAfter={(mode) => addSection(b.idx, mode)}
              />
            ))}
          </div>

          {canProceed && (
            <div className="rounded-card border border-accent/40 bg-accent-soft/70 p-3 shadow-card">
              <p className="mb-2 text-xs font-medium text-ink">
                {atScriptGate
                  ? "Review the per-section settings above, then approve to generate the voiceover & visuals and move this video into production."
                  : "Settings look good? Generate the voiceover & visuals and continue this video through production."}
              </p>
              <button
                type="button"
                disabled={approving}
                onClick={approveVideoSettings}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {approving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {approving
                  ? "Generating…"
                  : atScriptGate
                    ? "Approve video settings → generate"
                    : "Generate assets & continue"}
              </button>
              {approveError && <p className="mt-2 text-xs font-medium text-coral">{approveError}</p>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function BulkButton({
  icon: Icon,
  label,
  onClick,
  busy,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-full bg-card-warm px-3 py-2 text-xs font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft disabled:opacity-50"
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
      {label}
    </button>
  );
}

function BeatRow({
  beat,
  index,
  total,
  shot,
  modelId,
  duration,
  resultUrl,
  existing,
  remaining,
  busy,
  pending,
  error,
  onShot,
  onModel,
  onDuration,
  onGenerate,
  onDelete,
  onMove,
  onAddAfter,
}: {
  beat: Beat;
  index: number;
  total: number;
  shot: ShotType;
  modelId: string;
  duration: number;
  resultUrl: string | null;
  existing?: ClipInfo;
  remaining: number;
  busy: boolean;
  pending?: string;
  error?: string;
  onShot: (s: ShotType) => void;
  onModel: (id: string) => void;
  onDuration: (n: number) => void;
  onGenerate: () => void;
  onDelete: () => void;
  onMove: (dir: "up" | "down") => void;
  onAddAfter: (mode: "visual" | "narrated") => void;
}) {
  const model = getVideoModel(modelId)!;
  const dur = clampDuration(model, duration);
  const est = model.longClip ? estimateExtendCost(dur) : estimateClipCost(model, dur);
  const overBudget = est > remaining;
  const url = resultUrl ?? (existing?.isVideo ? existing.url : null);

  return (
    <div className="rounded-card bg-canvas p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Section {beat.idx + 1}
        </span>
        {/* Section controls */}
        <span className="flex items-center gap-0.5">
          <IconBtn label="Move up" disabled={index === 0} onClick={() => onMove("up")}>
            <ArrowUp className="size-3" />
          </IconBtn>
          <IconBtn label="Move down" disabled={index === total - 1} onClick={() => onMove("down")}>
            <ArrowDown className="size-3" />
          </IconBtn>
          <IconBtn label="Delete section" onClick={onDelete}>
            <Trash2 className="size-3 text-coral" />
          </IconBtn>
        </span>
        <select
          value={shot}
          onChange={(e) => onShot(e.target.value as ShotType)}
          className="rounded-full border border-line bg-card px-2 py-0.5 text-[11px] font-medium text-ink outline-none focus:border-accent"
        >
          {SHOT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-muted">
          script ≈ {Math.round(beat.scriptSec)}s
          {Math.round(beat.scriptSec) > model.maxDurationSec && (
            <span className="text-muted/80"> · clips cap at {model.maxDurationSec}s</span>
          )}
        </span>
      </div>
      <p className="mb-3 line-clamp-2 text-xs text-muted">{beat.visualPrompt}</p>

      {url && <video src={url} controls className="mb-3 w-full rounded-xl bg-black" preload="metadata" />}
      {!url && existing?.url && !existing.isVideo && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-muted">
          <Film className="size-3.5" /> Currently a still image — generate to animate it.
        </p>
      )}
      {shot === "stock" && (
        <p className="mb-3 rounded-lg bg-card-warm px-2.5 py-1.5 text-[11px] text-muted">
          Stock beats use free licensed Pexels footage by default. Generate AI video
          only to replace it — that incurs the model cost below.
        </p>
      )}
      {pending && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-lavender/10 px-2.5 py-1.5 text-[11px] font-medium text-lavender">
          <Loader2 className="size-3.5 animate-spin" /> Long clip {pending} — the worker is
          building it; it&apos;ll appear here when done.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] font-medium text-muted">Model</span>
          <select value={modelId} onChange={(e) => onModel(e.target.value)} className="input">
            {VIDEO_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · ${m.usdPerSec}/s · {m.quality}
                {m.audio ? " · audio" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-24 flex-col gap-1">
          <span className="text-[11px] font-medium text-muted">Secs</span>
          {model.durations ? (
            <select value={dur} onChange={(e) => onDuration(Number(e.target.value))} className="input">
              {model.durations.map((d) => (
                <option key={d} value={d}>
                  {d}s
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              min={model.minDurationSec}
              max={model.maxDurationSec}
              value={duration}
              onChange={(e) => onDuration(Number(e.target.value))}
              className="input"
            />
          )}
        </label>
        <button
          type="button"
          disabled={busy || overBudget || Boolean(pending)}
          onClick={onGenerate}
          title={overBudget ? "Would exceed the monthly video budget" : undefined}
          className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Clapperboard className="size-4" />}
          {model.longClip ? `Queue · $${est.toFixed(2)}` : `$${est.toFixed(2)}`}
        </button>
      </div>
      {model.longClip && (
        <p className="mt-1.5 text-[11px] text-muted">
          Long clip ({dur}s) renders in the background worker (Veo-3.1 extend).
        </p>
      )}
      {error && <p className="mt-2 text-xs font-medium text-coral">{error}</p>}

      {/* Add a section after this one */}
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-2">
        <span className="text-[11px] text-muted">Add section:</span>
        <button
          type="button"
          onClick={() => onAddAfter("visual")}
          className="flex items-center gap-1 rounded-full bg-card-warm px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-accent-soft"
        >
          <Plus className="size-3" /> Visual-only
        </button>
        <button
          type="button"
          onClick={() => onAddAfter("narrated")}
          className="flex items-center gap-1 rounded-full bg-card-warm px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-accent-soft"
        >
          <Plus className="size-3" /> Narrated
        </button>
      </div>
    </div>
  );
}

const DEFAULT_CUSTOM: CustomSpec = {
  heroModel: "seedance-2",
  brollModel: "seedance-2-fast",
  heroSec: 10,
  brollSec: 8,
  maxUsd: 8,
};

function FullAutoPanel({
  projectId,
  beats,
  running,
  error,
  customDefault,
  shortMode = false,
  onRun,
}: {
  projectId: string;
  beats: Beat[];
  running: boolean;
  error?: string;
  customDefault: CustomSpec | null;
  shortMode?: boolean;
  onRun: (tier: AutoTier, est: number, custom?: CustomSpec) => void;
}) {
  const [tier, setTier] = useState<AutoTier>("base");
  const [custom, setCustom] = useState<CustomSpec>(customDefault ?? DEFAULT_CUSTOM);
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);

  const sections = beats.map((b) => ({ shotType: b.shotType, scriptSec: b.scriptSec }));
  // Custom shows its full requested price (so the operator can size the cap);
  // the other tiers show the budget-packed estimate that will actually bill.
  const sel =
    tier === "custom"
      ? selectClipBeats("custom", beats.map((b) => ({ idx: b.idx, shotType: b.shotType, scriptSec: b.scriptSec })), { maxUsd: custom.maxUsd, custom, shortMode })
      : null;
  const est = tier === "custom" ? (sel?.requestedUsd ?? 0) : estimateTierCost(tier, sections, { shortMode });
  const overCap = tier === "custom" && (sel?.overBudget ?? false);

  const setC = (patch: Partial<CustomSpec>) => {
    setCustom((c) => ({ ...c, ...patch }));
    setSaved(false);
  };
  const saveDefault = () =>
    startSave(async () => {
      const r = await saveCustomSpecAction(projectId, custom);
      if (r.ok) setSaved(true);
    });

  return (
    <div className="rounded-card border border-accent/50 bg-accent-soft/50 p-3 shadow-card">
      <p className="mb-1 flex items-center gap-2 text-sm font-bold">
        <Zap className="size-4 text-accent" /> Full Auto-Generate
      </p>
      <p className="mb-2 text-xs text-muted">
        One tap → classify shot types, generate every section (smart mix, stock
        stays free), render, then pause at Final review for your check.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] font-medium text-muted">Quality tier</span>
          <select value={tier} onChange={(e) => setTier(e.target.value as AutoTier)} className="input">
            {AUTO_TIERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} — {t.blurb}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={running || overCap}
          onClick={() => onRun(tier, est, tier === "custom" ? custom : undefined)}
          className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {running ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
          {running ? "Starting…" : `Run · ~$${est.toFixed(2)}`}
        </button>
      </div>

      {tier === "custom" && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-card border border-line bg-surface/60 p-3">
          <ModelSelect label="Hero model" value={custom.heroModel} onChange={(v) => setC({ heroModel: v })} />
          <ModelSelect label="B-roll model" value={custom.brollModel} onChange={(v) => setC({ brollModel: v })} />
          <NumField label="Hero length (s)" value={custom.heroSec} min={4} max={30} onChange={(v) => setC({ heroSec: v })} />
          <NumField label="B-roll length (s)" value={custom.brollSec} min={4} max={30} onChange={(v) => setC({ brollSec: v })} />
          <NumField label="Price cap ($)" value={custom.maxUsd} min={1} max={100} step={0.5} onChange={(v) => setC({ maxUsd: v })} />
          <div className="flex items-end">
            <button
              type="button"
              onClick={saveDefault}
              disabled={saving}
              className="rounded-full border border-line px-3 py-2 text-xs font-semibold text-muted hover:bg-surface disabled:opacity-50"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save as project default"}
            </button>
          </div>
          {overCap && (
            <p className="col-span-2 text-xs font-medium text-coral">
              ~${(sel?.requestedUsd ?? 0).toFixed(2)} exceeds your ${custom.maxUsd.toFixed(2)} cap. Raise the cap, or pick cheaper models / shorter clips.
            </p>
          )}
          <p className="col-span-2 text-[11px] text-muted">
            Two heroes bookend the video (start + end); b-roll fills the middle at ~1 per minute.
          </p>
        </div>
      )}
      {error && <p className="mt-2 text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

function ModelSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {VIDEO_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} — ${m.usdPerSec.toFixed(3)}/s
          </option>
        ))}
      </select>
    </label>
  );
}

function NumField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input"
      />
    </label>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-6 place-items-center rounded-full text-muted hover:bg-card hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}

// ── Auto-stitch panel: lengthen one section, or merge adjacent sections ──

function AutoStitchPanel({
  beats,
  remaining,
  onLengthen,
  onMerge,
}: {
  beats: Beat[];
  remaining: number;
  onLengthen: (idx: number, method: "stitch" | "stitch-seamless", targetSec: number, est: number) => void;
  onMerge: (startIdx: number, endIdx: number) => void;
}) {
  const [tab, setTab] = useState<"lengthen" | "merge">("lengthen");
  const [sectionIdx, setSectionIdx] = useState(beats[0]?.idx ?? 0);
  const [targetSec, setTargetSec] = useState(30);
  const [seamless, setSeamless] = useState(false);
  const [mergeStart, setMergeStart] = useState(beats[0]?.idx ?? 0);
  const [mergeEnd, setMergeEnd] = useState(beats[Math.min(1, beats.length - 1)]?.idx ?? 0);

  const base = getVideoModel(STITCH_BASE_MODEL_ID)!;
  const est = estimateStitchCost(base, targetSec);
  const segs = Math.max(1, Math.ceil(targetSec / base.maxDurationSec));
  const overBudget = est > remaining;

  // Heuristic recommendation: the longest run of adjacent b-roll/stock sections.
  const recommend = (() => {
    let best: [number, number] | null = null;
    let runStart = 0;
    for (let i = 1; i <= beats.length; i++) {
      const cont = i < beats.length && beats[i].shotType !== "hero" && beats[i - 1].shotType !== "hero";
      if (!cont) {
        if (i - 1 - runStart >= 1) {
          if (!best || i - 1 - runStart > best[1] - best[0]) best = [beats[runStart].idx, beats[i - 1].idx];
        }
        runStart = i;
      }
    }
    return best;
  })();

  return (
    <div className="rounded-card border border-lavender/40 bg-lavender/5 p-3">
      <div className="mb-3 flex gap-1 rounded-full bg-card-warm p-0.5">
        {(["lengthen", "merge"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
              tab === t ? "bg-card text-ink shadow-card" : "text-muted",
            )}
          >
            {t === "lengthen" ? "Lengthen a section" : "Merge sections"}
          </button>
        ))}
      </div>

      {tab === "lengthen" ? (
        <div className="space-y-2">
          <p className="text-[11px] text-muted">
            Auto-stitch {segs} × {base.maxDurationSec}s {base.label} clips into one ~{targetSec}s clip
            for a section.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[11px] font-medium text-muted">Section</span>
              <select value={sectionIdx} onChange={(e) => setSectionIdx(Number(e.target.value))} className="input">
                {beats.map((b) => (
                  <option key={b.idx} value={b.idx}>
                    Section {b.idx + 1} (script ≈ {Math.round(b.scriptSec)}s)
                  </option>
                ))}
              </select>
            </label>
            <label className="flex w-20 flex-col gap-1">
              <span className="text-[11px] font-medium text-muted">Secs</span>
              <input
                type="number"
                min={16}
                max={120}
                value={targetSec}
                onChange={(e) => setTargetSec(Number(e.target.value))}
                className="input"
              />
            </label>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted">
            <input type="checkbox" checked={seamless} onChange={(e) => setSeamless(e.target.checked)} className="accent-accent" />
            Seamless (chain last frame → next clip; no visible cut)
          </label>
          <button
            type="button"
            disabled={overBudget}
            onClick={() => onLengthen(sectionIdx, seamless ? "stitch-seamless" : "stitch", targetSec, est)}
            className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Layers className="size-4" /> Queue long clip · ${est.toFixed(2)}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-muted">
            Merge adjacent sections into one (their narration combines); then queue a long
            clip for the merged section.
          </p>
          {recommend && (
            <button
              type="button"
              onClick={() => {
                setMergeStart(recommend[0]);
                setMergeEnd(recommend[1]);
              }}
              className="rounded-full bg-card-warm px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-accent-soft"
            >
              Recommended: merge sections {recommend[0] + 1}–{recommend[1] + 1}
            </button>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[11px] font-medium text-muted">From</span>
              <select value={mergeStart} onChange={(e) => setMergeStart(Number(e.target.value))} className="input">
                {beats.map((b) => (
                  <option key={b.idx} value={b.idx}>Section {b.idx + 1}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[11px] font-medium text-muted">To</span>
              <select value={mergeEnd} onChange={(e) => setMergeEnd(Number(e.target.value))} className="input">
                {beats.map((b) => (
                  <option key={b.idx} value={b.idx}>Section {b.idx + 1}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            disabled={mergeEnd <= mergeStart}
            onClick={() => onMerge(mergeStart, mergeEnd)}
            className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Layers className="size-4" /> Merge sections {mergeStart + 1}–{mergeEnd + 1}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Clapperboard, Film, Loader2, Sparkles, Timer, Wand2 } from "lucide-react";
import {
  autoClassifyShotTypesAction,
  generateBeatVideoAction,
  setBeatShotTypeAction,
} from "@/lib/actions/pipeline";
import {
  clampDuration,
  estimateClipCost,
  getVideoModel,
  VIDEO_MODELS,
} from "@/lib/adapters/video-models";
import { Card, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/cn";

type ShotType = "hero" | "broll" | "stock";
type ClipInfo = { idx: number; url: string | null; isVideo: boolean };
type Beat = { idx: number; visualPrompt: string; shotType: string; scriptSec: number };

const SHOT_TYPES: ShotType[] = ["hero", "broll", "stock"];

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
  monthSpent,
  cap,
}: {
  projectId: string;
  videoId: string;
  beats: Beat[];
  clips: ClipInfo[];
  monthSpent: number;
  cap: number;
}) {
  const clipByIdx = new Map(clips.map((c) => [c.idx, c]));
  const [open, setOpen] = useState(false);
  const [spent, setSpent] = useState(monthSpent);

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

  const generate = (idx: number) => {
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
          </div>

          <div className="space-y-3">
            {beats.map((b) => (
              <BeatRow
                key={b.idx}
                beat={b}
                shot={shotTypes[b.idx] as ShotType}
                modelId={models[b.idx]}
                duration={durations[b.idx]}
                resultUrl={results[b.idx] ?? null}
                existing={clipByIdx.get(b.idx)}
                remaining={remaining}
                busy={busyIdx === b.idx}
                error={errors[b.idx]}
                onShot={(s) => setShot(b.idx, s)}
                onModel={(id) => setModel(b.idx, id)}
                onDuration={(n) => setDurations((d) => ({ ...d, [b.idx]: n }))}
                onGenerate={() => generate(b.idx)}
              />
            ))}
          </div>
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
  shot,
  modelId,
  duration,
  resultUrl,
  existing,
  remaining,
  busy,
  error,
  onShot,
  onModel,
  onDuration,
  onGenerate,
}: {
  beat: Beat;
  shot: ShotType;
  modelId: string;
  duration: number;
  resultUrl: string | null;
  existing?: ClipInfo;
  remaining: number;
  busy: boolean;
  error?: string;
  onShot: (s: ShotType) => void;
  onModel: (id: string) => void;
  onDuration: (n: number) => void;
  onGenerate: () => void;
}) {
  const model = getVideoModel(modelId)!;
  const dur = clampDuration(model, duration);
  const est = estimateClipCost(model, dur);
  const overBudget = est > remaining;
  const url = resultUrl ?? (existing?.isVideo ? existing.url : null);

  return (
    <div className="rounded-card bg-canvas p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Section {beat.idx + 1}
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
        <span className="text-[11px] text-muted">script ≈ {Math.round(beat.scriptSec)}s</span>
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
          disabled={busy || overBudget}
          onClick={onGenerate}
          title={overBudget ? "Would exceed the monthly video budget" : undefined}
          className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Clapperboard className="size-4" />}
          ${est.toFixed(2)}
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

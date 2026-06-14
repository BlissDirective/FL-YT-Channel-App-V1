"use client";

import { useState, useTransition } from "react";
import { Clapperboard, Film, Loader2 } from "lucide-react";
import { generateBeatVideoAction } from "@/lib/actions/pipeline";
import {
  estimateClipCost,
  getVideoModel,
  VIDEO_MODELS,
} from "@/lib/adapters/video-models";
import { Card, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";

type ClipInfo = { idx: number; url: string | null; isVideo: boolean };

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
  beats: { idx: number; visualPrompt: string; shotType: string }[];
  clips: ClipInfo[];
  monthSpent: number;
  cap: number;
}) {
  const clipByIdx = new Map(clips.map((c) => [c.idx, c]));
  const [spent, setSpent] = useState(monthSpent);
  const [open, setOpen] = useState(false);
  const remaining = Math.max(0, cap - spent);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
      >
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
            <p className="mt-2 text-xs text-muted">
              Generates original clips from your own keyframes (image-to-video) or
              prompts. Prices are indicative per-second estimates.
            </p>
          </div>

          <div className="space-y-3">
            {beats.map((b) => (
              <BeatRow
                key={b.idx}
                projectId={projectId}
                videoId={videoId}
                beat={b}
                existing={clipByIdx.get(b.idx)}
                remaining={remaining}
                onSpent={(usd) => setSpent((s) => s + usd)}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function BeatRow({
  projectId,
  videoId,
  beat,
  existing,
  remaining,
  onSpent,
}: {
  projectId: string;
  videoId: string;
  beat: { idx: number; visualPrompt: string; shotType: string };
  existing?: ClipInfo;
  remaining: number;
  onSpent: (usd: number) => void;
}) {
  const [modelId, setModelId] = useState(VIDEO_MODELS[0].id);
  const model = getVideoModel(modelId)!;
  const [duration, setDuration] = useState(Math.min(5, model.maxDurationSec));
  const [url, setUrl] = useState<string | null>(existing?.isVideo ? existing.url : null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const dur = Math.min(duration, model.maxDurationSec);
  const est = estimateClipCost(model, dur);
  const overBudget = est > remaining;

  const onModel = (id: string) => {
    setModelId(id);
    const m = getVideoModel(id)!;
    if (duration > m.maxDurationSec) setDuration(m.maxDurationSec);
  };

  const generate = () => {
    setError(undefined);
    start(async () => {
      const r = await generateBeatVideoAction(projectId, videoId, beat.idx, modelId, dur);
      if (r.ok) {
        setUrl(r.url);
        onSpent(r.costUsd);
      } else {
        setError(r.error);
      }
    });
  };

  return (
    <div className="rounded-card bg-canvas p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Section {beat.idx + 1}
        </span>
        <span className="rounded-full bg-card-warm px-2 py-0.5 text-[11px] text-muted">
          {beat.shotType}
        </span>
      </div>
      <p className="mb-3 line-clamp-2 text-xs text-muted">{beat.visualPrompt}</p>

      {url && (
        <video
          src={url}
          controls
          className="mb-3 w-full rounded-xl bg-black"
          preload="metadata"
        />
      )}
      {!url && existing?.url && !existing.isVideo && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-muted">
          <Film className="size-3.5" /> Currently a still image — generate to animate it.
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
        <label className="flex w-20 flex-col gap-1">
          <span className="text-[11px] font-medium text-muted">Secs</span>
          <input
            type="number"
            min={1}
            max={model.maxDurationSec}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="input"
          />
        </label>
        <button
          type="button"
          disabled={pending || overBudget}
          onClick={generate}
          title={overBudget ? "Would exceed the monthly video budget" : undefined}
          className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Clapperboard className="size-4" />}
          ${est.toFixed(2)}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted">{model.bestFor}</p>
      {error && <p className="mt-2 text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Download,
  ExternalLink,
  Loader2,
  Scissors,
  Sparkles,
  Upload,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { deriveShortsAction, publishShortAction } from "@/lib/actions/shorts";

export type DerivedShortRow = {
  id: string;
  title: string;
  status: string;
  publishRequested: boolean;
  youtubeVideoId: string | null;
  downloadUrl: string | null;
  durationSec: number | null;
};

export type DeriveShortsProps = {
  projectId: string;
  parentVideoId: string;
  defaultCount: number;
  defaultSmart: boolean;
  shorts: DerivedShortRow[];
};

export function DeriveShorts(props: DeriveShortsProps) {
  const { projectId, parentVideoId, defaultCount, defaultSmart, shorts } = props;
  const [count, setCount] = useState(defaultCount);
  const [smart, setSmart] = useState(defaultSmart);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const derive = () =>
    startTransition(async () => {
      setError(undefined);
      const r = await deriveShortsAction(projectId, parentVideoId, { count, smart });
      if (!r.ok) setError(r.error);
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-2xl bg-lavender/15 text-lavender">
          <Scissors className="size-4" />
        </span>
        <div>
          <h2 className="font-semibold leading-tight">Derive Shorts</h2>
          <p className="text-xs text-muted">
            Cut this long-form into vertical Shorts — reuses the assets you
            already paid for, then stages each for one-tap publish.
          </p>
        </div>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              How many
            </span>
            <input
              type="number"
              min={1}
              max={6}
              value={count}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(6, Number(e.target.value) || 1)))
              }
              className="w-20 rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <button
            type="button"
            onClick={() => setSmart((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
              smart
                ? "bg-lavender/15 text-lavender"
                : "bg-card-warm text-muted hover:bg-accent-soft"
            }`}
            aria-pressed={smart}
          >
            <Sparkles className="size-4" />
            Smart selection {smart ? "on" : "off"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={derive}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Scissors className="size-4" />
            )}
            Derive {count} Short{count === 1 ? "" : "s"}
          </button>
        </div>
        <p className="text-[11px] text-muted">
          {smart
            ? "Smart picks the strongest standalone moments and writes a hook title for each (a few cents, logged to the ledger)."
            : "Free heuristic spreads the cuts evenly across the script."}
        </p>
        {error && <p className="text-sm font-medium text-coral">{error}</p>}
      </Card>

      {shorts.length > 0 && (
        <Card className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {shorts.length} Short{shorts.length === 1 ? "" : "s"}
          </p>
          <ul className="divide-y divide-line">
            {shorts.map((s) => (
              <ShortRow key={s.id} projectId={projectId} short={s} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ShortRow({
  projectId,
  short,
}: {
  projectId: string;
  short: DerivedShortRow;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const publish = () =>
    startTransition(async () => {
      setError(undefined);
      const r = await publishShortAction(projectId, short.id);
      if (!r.ok) setError(r.error);
    });

  const rendered = short.status === "FINAL_REVIEW" || short.status === "TRACKING";
  const published = Boolean(short.youtubeVideoId);

  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{short.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {published ? (
            <StatusChip tone="success">published</StatusChip>
          ) : short.publishRequested ? (
            <StatusChip tone="warning">publishing…</StatusChip>
          ) : rendered ? (
            <StatusChip tone="lavender">ready</StatusChip>
          ) : (
            <StatusChip tone="neutral">{short.status.replace(/_/g, " ").toLowerCase()}</StatusChip>
          )}
          {short.durationSec != null && (
            <span className="text-[11px] text-muted">{fmtDuration(short.durationSec)} · 9:16</span>
          )}
        </div>
        {error && <p className="mt-1 text-xs font-medium text-coral">{error}</p>}
      </div>

      <div className="flex items-center gap-2">
        {short.downloadUrl && (
          <a
            href={short.downloadUrl}
            download={`${short.title.slice(0, 40)}.mp4`}
            className="inline-flex items-center gap-1.5 rounded-full bg-card-warm px-3 py-1.5 text-xs font-semibold text-ink shadow-card hover:bg-accent-soft"
          >
            <Download className="size-3.5" /> MP4
          </a>
        )}
        {published ? (
          <a
            href={`https://youtu.be/${short.youtubeVideoId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink shadow-card hover:bg-accent-soft"
          >
            watch <ExternalLink className="size-3.5" />
          </a>
        ) : (
          rendered &&
          !short.publishRequested && (
            <button
              type="button"
              disabled={isPending}
              onClick={publish}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Publish
            </button>
          )
        )}
        {short.publishRequested && !published && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted">
            <Check className="size-3.5" /> queued
          </span>
        )}
      </div>
    </li>
  );
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`;
}

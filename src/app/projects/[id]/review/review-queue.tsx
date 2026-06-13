"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Clapperboard,
  FileText,
  Film,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  Mic,
  PauseCircle,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { GATE_FOR_STATUS, GATE_LABELS, type ApprovalGate } from "@studio/core";
import type { ReviewItem } from "@/lib/db/queries";
import {
  approveGateAction,
  killVideoAction,
  requestRevisionAction,
  resumeVideoAction,
  rerollBeatVisualAction,
  selectThumbnailAction,
} from "@/lib/actions/pipeline";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/cn";

const GATE_ICONS: Record<ApprovalGate, typeof Lightbulb> = {
  IDEA: Lightbulb,
  SCRIPT: FileText,
  ASSETS: Film,
  FINAL: Clapperboard,
};

export function ReviewQueue({
  projectId,
  items,
}: {
  projectId: string;
  items: ReviewItem[];
}) {
  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-2 lg:overflow-visible xl:grid-cols-3">
      {items.map((item) => (
        <ReviewCard key={item.video.id} projectId={projectId} item={item} />
      ))}
    </div>
  );
}

function ReviewCard({ projectId, item }: { projectId: string; item: ReviewItem }) {
  const { video } = item;
  const gate = GATE_FOR_STATUS[video.status];
  const [isPending, startTransition] = useTransition();
  const [revising, setRevising] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(undefined);
      const result = await fn();
      if (!result.ok && result.error) setError(result.error);
    });

  const GateIcon = gate ? GATE_ICONS[gate] : PauseCircle;

  return (
    <Card className="flex min-w-[85vw] snap-center flex-col gap-4 sm:min-w-[420px] lg:min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-ink">
            <GateIcon className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {gate ? `${GATE_LABELS[gate]} gate` : statusLabel(video.status)}
            </p>
            <h3 className="font-semibold leading-snug">{video.title}</h3>
          </div>
        </div>
        <StatusChip tone="neutral">${Number(video.total_cost_usd).toFixed(2)}</StatusChip>
      </div>

      {video.paused_reason && (
        <div className="rounded-xl bg-coral/10 px-3 py-2 text-sm font-medium text-coral">
          ⏸ {video.paused_reason}
        </div>
      )}

      {item.qc && gate && <QcCard qc={item.qc} />}

      {gate === "IDEA" && <IdeaBody item={item} />}
      {gate === "SCRIPT" && <ScriptBody item={item} />}
      {gate === "ASSETS" && (
        <AssetsBody item={item} projectId={projectId} onError={setError} />
      )}
      {gate === "FINAL" && <FinalBody item={item} />}
      {(gate === "SCRIPT" || gate === "ASSETS") && (
        <a
          href={`/projects/${projectId}/videos/${video.id}`}
          className="text-sm font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4"
        >
          Open script review — read along, listen, edit →
        </a>
      )}
      {!gate && (
        <p className="text-sm text-muted">
          {video.status === "NEEDS_REVISION"
            ? "Looping the previous stage with your notes…"
            : "Waiting to resume."}
        </p>
      )}

      {error && <p className="text-sm font-medium text-coral">{error}</p>}

      {revising ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What should change? e.g. “Punchier hook, drop the third beat”"
            rows={3}
            className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending || !notes.trim()}
              onClick={() =>
                act(async () => {
                  const r = await requestRevisionAction(projectId, video.id, notes);
                  if (r.ok) {
                    setRevising(false);
                    setNotes("");
                  }
                  return r;
                })
              }
              className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Send for revision
            </button>
            <button
              type="button"
              onClick={() => setRevising(false)}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {gate ? (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() => act(() => approveGateAction(projectId, video.id))}
                className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Approve
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setRevising(true)}
                className="flex items-center gap-2 rounded-full bg-card-warm px-4 py-2 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft disabled:opacity-50"
              >
                <RefreshCw className="size-4" /> Request changes
              </button>
            </>
          ) : (
            video.paused_reason && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => act(() => resumeVideoAction(projectId, video.id))}
                className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                Resume
              </button>
            )
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => act(() => killVideoAction(projectId, video.id))}
            className="ml-auto flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-coral/10 hover:text-coral disabled:opacity-50"
          >
            <Trash2 className="size-4" /> Kill
          </button>
        </div>
      )}
    </Card>
  );
}

/** QC agent verdict card (idea #5). */
function QcCard({ qc }: { qc: NonNullable<ReviewItem["qc"]> }) {
  const score = Number(qc.score);
  const tone =
    score >= 7.5 ? "text-success bg-success/10" : score >= 6 ? "text-ink bg-accent-soft" : "text-coral bg-coral/10";
  return (
    <div className="space-y-1.5 rounded-xl bg-canvas p-3">
      <div className="flex items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", tone)}>
          QC {score.toFixed(1)}/10
        </span>
        {qc.auto_approved && (
          <span className="text-xs font-semibold text-success">
            auto-approved (Co-pilot)
          </span>
        )}
      </div>
      <p className="text-sm">{qc.verdict}</p>
      {qc.issues.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted">
          {qc.issues.map((issue, i) => (
            <li key={i}>• {issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Gate-specific card bodies ─────────────────────────────────────────

function IdeaBody({ item }: { item: ReviewItem }) {
  const source = (item.idea?.source ?? {}) as { views?: number; channelSubs?: number };
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">{item.video.topic}</p>
      {item.idea?.angle && (
        <p className="rounded-xl bg-canvas px-3 py-2 text-sm">
          <span className="font-semibold">Angle:</span> {item.idea.angle}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {item.idea?.score != null && (
          <StatusChip tone="success">Score {Number(item.idea.score).toFixed(1)}</StatusChip>
        )}
        {source.views != null && (
          <StatusChip tone="lavender">{compact(source.views)} source views</StatusChip>
        )}
        {source.channelSubs != null && (
          <StatusChip tone="neutral">{compact(source.channelSubs)} subs channel</StatusChip>
        )}
        <StatusChip tone="neutral">{item.video.format}</StatusChip>
      </div>
    </div>
  );
}

function ScriptBody({ item }: { item: ReviewItem }) {
  const script = item.script;
  if (!script) return <p className="text-sm text-muted">Script not found.</p>;
  const titles = script.metadata?.titles ?? [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <StatusChip tone="warning">v{script.version}</StatusChip>
        {script.runtime_sec != null && (
          <StatusChip tone="neutral">~{Math.round(script.runtime_sec / 60)} min</StatusChip>
        )}
        <StatusChip tone="neutral">{script.beats.length} beats</StatusChip>
      </div>
      <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl bg-canvas p-3">
        {script.beats.map((b) => (
          <p key={b.idx} className="text-sm leading-relaxed">
            <span className="mr-1.5 font-bold text-accent">{b.idx + 1}</span>
            {b.text}
          </p>
        ))}
      </div>
      {titles.length > 1 && (
        <p className="text-xs text-muted">
          Alt titles: {titles.slice(1).join(" · ")}
        </p>
      )}
    </div>
  );
}

const CLIP_GRADIENTS = [
  "from-[#F5B829] to-[#F0876C]",
  "from-[#A78BFA] to-[#F0876C]",
  "from-[#17150F] to-[#5a5345]",
  "from-[#5BB98C] to-[#A78BFA]",
];

function AssetsBody({
  item,
  projectId,
  onError,
}: {
  item: ReviewItem;
  projectId: string;
  onError: (e?: string) => void;
}) {
  const [rerolling, setRerolling] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busyBeat, setBusyBeat] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const voTracks = item.assets.filter((a) => a.kind === "vo");
  const vo = voTracks[0];
  const clips = item.assets.filter((a) => a.kind === "clip");
  const thumbs = item.assets.filter((a) => a.kind === "thumb");
  const voDuration = voTracks.reduce(
    (s, a) => s + Number((a.meta as { durationSec?: number }).durationSec ?? 0),
    0,
  );
  const cachedCount = voTracks.filter((a) => (a.meta as { cached?: boolean }).cached).length;
  const allMock = item.assets.every((a) => a.provider.startsWith("mock:"));
  return (
    <div className="space-y-3">
      {vo && (
        <div className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2">
          <span className="grid size-8 place-items-center rounded-full bg-accent text-ink">
            <Mic className="size-4" />
          </span>
          <div className="text-sm">
            <p className="font-medium">
              Voiceover · {(vo.meta as { voice?: string }).voice ?? "Voice"}
            </p>
            <p className="text-xs text-muted">
              {fmtDuration(voDuration)} · {providerLabel(vo.provider)}
              {cachedCount > 0 && ` · ${cachedCount} section${cachedCount > 1 ? "s" : ""} reused free`}
            </p>
          </div>
        </div>
      )}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          Clips ({clips.length})
        </p>
        <div className="grid grid-cols-4 gap-2">
          {clips.map((c, i) => (
            <MediaTile key={c.id} asset={c} fallbackIdx={i}>
              {c.provider === "pexels" && (
                <Play className="absolute inset-0 m-auto size-4 text-white drop-shadow" />
              )}
              <span className="absolute bottom-1 left-1.5 text-[10px] font-bold text-white drop-shadow">
                {(c.meta as { shotType?: string }).shotType ?? "clip"}
              </span>
              {c.beat_index !== null && (
                <button
                  type="button"
                  aria-label={`Reroll shot ${(c.beat_index ?? 0) + 1}`}
                  onClick={() =>
                    setRerolling(rerolling === c.beat_index ? null : c.beat_index)
                  }
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/50 text-white hover:bg-black/80"
                >
                  {busyBeat === c.beat_index ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3" />
                  )}
                </button>
              )}
            </MediaTile>
          ))}
        </div>
        {rerolling !== null && (
          <div className="mt-2 flex gap-2">
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Reroll shot ${rerolling + 1} — optional steer, e.g. “darker, no people”`}
              className="min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => {
                const beat = rerolling;
                const steer = note;
                setRerolling(null);
                setNote("");
                setBusyBeat(beat);
                startTransition(async () => {
                  onError(undefined);
                  const r = await rerollBeatVisualAction(
                    projectId,
                    item.video.id,
                    beat,
                    steer,
                  );
                  setBusyBeat(null);
                  if (!r.ok) onError(r.error);
                });
              }}
              className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white"
            >
              Reroll
            </button>
          </div>
        )}
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          Thumbnail candidates
        </p>
        <div className="grid grid-cols-4 gap-2">
          {thumbs.map((t, i) => {
            const selected = Boolean((t.meta as { selected?: boolean }).selected);
            return (
              <button
                key={t.id}
                type="button"
                aria-label={`Select thumbnail ${i + 1}`}
                onClick={() =>
                  startTransition(async () => {
                    onError(undefined);
                    const r = await selectThumbnailAction(
                      projectId,
                      item.video.id,
                      t.id,
                    );
                    if (!r.ok) onError(r.error);
                  })
                }
                className={cn(
                  "rounded-lg transition-shadow",
                  selected && "ring-2 ring-accent ring-offset-2 ring-offset-card",
                )}
              >
                <MediaTile asset={t} fallbackIdx={i + 1}>
                  {!t.url && (
                    <ImageIcon className="absolute inset-0 m-auto size-4 text-white/90" />
                  )}
                  {selected && (
                    <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-accent text-ink">
                      <Check className="size-3" />
                    </span>
                  )}
                </MediaTile>
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[11px] text-muted">
          Tap a thumbnail to crown it — it leads the render and the Publish
          Kit keeps all 3 for YouTube Test &amp; Compare.
        </p>
      </div>
      {allMock && (
        <p className="text-xs text-muted">
          Placeholder tiles — connect provider keys (or pick a real voice) for
          live media.
        </p>
      )}
    </div>
  );
}

/** Real media when a URL resolved; brand-gradient placeholder otherwise. */
function MediaTile({
  asset,
  fallbackIdx,
  children,
}: {
  asset: ReviewItem["assets"][number];
  fallbackIdx: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-lg",
        !asset.url && cn("bg-gradient-to-br", CLIP_GRADIENTS[fallbackIdx % CLIP_GRADIENTS.length]),
      )}
    >
      {asset.url && (
        // eslint-disable-next-line @next/next/no-img-element -- signed/external URLs, not optimizable
        <img src={asset.url} alt="" className="size-full object-cover" />
      )}
      {children}
    </div>
  );
}

function providerLabel(provider: string): string {
  if (provider.startsWith("mock:")) return "mock synthesis";
  if (provider === "kokoro") return "Kokoro (volume tier)";
  if (provider === "elevenlabs") return "ElevenLabs";
  return provider;
}

function FinalBody({ item }: { item: ReviewItem }) {
  const renders = item.assets.filter((a) => a.kind === "render");
  const long =
    renders.find((a) => (a.meta as { variant?: string }).variant === "long") ??
    renders[0];
  const short = renders.find(
    (a) => (a.meta as { variant?: string }).variant === "short",
  );
  const [showShort, setShowShort] = useState(false);
  const active = showShort && short ? short : long;
  const meta = (active?.meta ?? {}) as { resolution?: string; durationSec?: number };
  const thumb = item.assets.find(
    (a) => a.kind === "thumb" && (a.meta as { selected?: boolean }).selected,
  );
  const chapters = item.script?.metadata?.chapters ?? [];

  return (
    <div className="space-y-3">
      {active?.url ? (
        <div
          className={cn(
            "overflow-hidden rounded-xl bg-ink",
            showShort ? "mx-auto aspect-[9/16] max-h-80" : "aspect-video",
          )}
        >
          {/* key forces reload when toggling long/short */}
          <video
            key={active.id}
            src={active.url}
            poster={!showShort ? (thumb?.url ?? undefined) : undefined}
            controls
            playsInline
            className="size-full object-contain"
          />
        </div>
      ) : (
        <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl bg-ink">
          <span className="grid size-12 place-items-center rounded-full bg-accent text-ink">
            <Play className="size-5" fill="currentColor" />
          </span>
          <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {fmtDuration(meta.durationSec)} · {meta.resolution ?? "1080p"}
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone="neutral">
          {fmtDuration(meta.durationSec)} · {meta.resolution ?? "1080p"}
        </StatusChip>
        {short?.url && (
          <button
            type="button"
            onClick={() => setShowShort((s) => !s)}
            className="rounded-full bg-card-warm px-3 py-1.5 text-xs font-semibold text-ink shadow-card hover:bg-accent-soft"
          >
            {showShort ? "▶ Watch long-form" : "▶ Watch the Short"}
          </button>
        )}
      </div>
      {!showShort && chapters.length > 0 && (
        <p className="text-xs text-muted">
          Chapters: {chapters.map((c) => `${fmtDuration(c.at)} ${c.label}`).join(" · ")}
        </p>
      )}
      {!active?.url && (
        <p className="text-xs text-muted">
          Mock render tile — videos with live assets get a real MP4 + Short
          from the render farm. Approving moves this video to the Ready stage.
        </p>
      )}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").toLowerCase();
}

function compact(n: number): string {
  return Intl.NumberFormat("en", { notation: "compact" }).format(n);
}

function fmtDuration(sec?: number): string {
  if (!sec) return "–:––";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

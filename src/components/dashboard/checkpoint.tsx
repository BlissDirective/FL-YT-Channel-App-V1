"use client";

/**
 * Shared checkpoint components (UI v2 Phase 3, D-6): the review-queue card
 * capabilities extracted so the Asset Canvas (video page) and the review
 * queue render the SAME QC card, Self-Watch panel, calibration thumbs,
 * thumbnail picker, and decision bar — one implementation, two hosts until
 * the queue retires in Phase 7. All mutations go through the existing
 * server actions (§3.1 contract).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Gauge, Image as ImageIcon, Loader2, Play, RefreshCw, X } from "lucide-react";
import type { WatchVerdict } from "@/lib/pipeline/watch-gate";
import { lowestDimension } from "@/lib/pipeline/watch-gate";
import type { QcReview } from "@/lib/db/queries";
import {
  approveGateAction,
  killVideoAction,
  labelQcReviewAction,
  labelWatchVerdictAction,
  requestRevisionAction,
  rerollBeatVisualAction,
  selectThumbnailAction,
} from "@/lib/actions/pipeline";
import { SourceLibrary } from "./source-library";
import { cn } from "@/lib/cn";

// ── QC verdict card + C1 calibration thumbs ───────────────────────────────
export function QcCard({ qc }: { qc: QcReview }) {
  const score = Number(qc.score);
  const [labeled, setLabeled] = useState<null | boolean>(null);
  const [, startTransition] = useTransition();
  const tone =
    score >= 7.5 ? "text-success bg-success/10" : score >= 6 ? "text-ink bg-accent-soft" : "text-coral bg-coral/10";
  const label = (agree: boolean) =>
    startTransition(async () => {
      setLabeled(agree); // optimistic; a lost label is a non-event
      await labelQcReviewAction({
        qcReviewId: qc.id,
        videoId: qc.video_id,
        gate: qc.gate,
        agree,
      }).catch(() => undefined);
    });
  return (
    <div className="space-y-1.5 rounded-xl bg-canvas p-3">
      <div className="flex items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", tone)}>
          QC {score.toFixed(1)}/10
        </span>
        {qc.escalated && (
          <span className="text-xs font-semibold text-muted" title={qc.judge_model ?? undefined}>
            strong judge
          </span>
        )}
        {qc.auto_approved && (
          <span className="text-xs font-semibold text-success">
            auto-approved (Co-pilot)
          </span>
        )}
        {/* Calibration signal (Harness C1): does the operator agree with the
            judge? Fifty of these make the rubric measurable. */}
        <span className="ml-auto flex items-center gap-1">
          {labeled === null ? (
            <>
              <button
                type="button"
                aria-label="Agree with this QC verdict"
                onClick={() => label(true)}
                className="rounded-full px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-success/10 hover:text-success"
              >
                👍
              </button>
              <button
                type="button"
                aria-label="Disagree with this QC verdict"
                onClick={() => label(false)}
                className="rounded-full px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-coral/10 hover:text-coral"
              >
                👎
              </button>
            </>
          ) : (
            <span className="text-xs text-muted">{labeled ? "agreed" : "disagreed"} ✓</span>
          )}
        </span>
      </div>
      <p className="text-sm">{qc.verdict}</p>
      {(qc.criteria ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {qc.criteria!.map((c) => (
            <span
              key={c.id}
              title={c.note}
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                c.pass ? "bg-success/10 text-success" : "bg-coral/10 text-coral",
              )}
            >
              {c.pass ? "✓" : "✗"} {c.label}
            </span>
          ))}
        </div>
      )}
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

// ── Self-Watch verdict panel + C1 calibration ─────────────────────────────
export function WatchPanel({ watch, videoId }: { watch: WatchVerdict | null; videoId: string }) {
  const [labeled, setLabeled] = useState<null | boolean>(null);
  const [, startTransition] = useTransition();
  if (!watch || watch.degraded) return null;
  const tone =
    watch.overall >= 8 ? "text-success bg-success/10" : watch.overall >= 5 ? "text-ink bg-accent-soft" : "text-coral bg-coral/10";
  const dims = [
    { label: "Timing", d: watch.timing },
    { label: "Script-match", d: watch.scriptMatch },
    { label: "Competitive", d: watch.competitive },
    { label: "Transitions", d: watch.transitions },
  ].filter((x) => x.d.evaluated);
  // Phase 4 calibration: agree/disagree feeds the C1 judge-calibration surface.
  const label = (agree: boolean) =>
    startTransition(async () => {
      setLabeled(agree); // optimistic; a lost label is a non-event
      await labelWatchVerdictAction({
        videoId,
        agree,
        criterionId: agree ? undefined : (lowestDimension(watch) ?? undefined),
      }).catch(() => undefined);
    });
  return (
    <div className="space-y-1.5 rounded-xl bg-canvas p-3">
      <div className="flex items-center gap-2">
        <Gauge className="size-4 text-muted" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Self-Watch</span>
        <span className="ml-auto flex items-center gap-1">
          {labeled === null ? (
            <>
              <button
                type="button"
                aria-label="Agree with the Self-Watch verdict"
                onClick={() => label(true)}
                className="rounded-full px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-success/10 hover:text-success"
              >
                👍
              </button>
              <button
                type="button"
                aria-label="Disagree with the Self-Watch verdict"
                onClick={() => label(false)}
                className="rounded-full px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-coral/10 hover:text-coral"
              >
                👎
              </button>
            </>
          ) : (
            <span className="text-xs text-muted">{labeled ? "agreed" : "disagreed"} ✓</span>
          )}
        </span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", tone)}>
          {watch.overall.toFixed(1)}/10
        </span>
      </div>
      {watch.policyRisk && (
        <p className="rounded-lg bg-coral/10 px-2 py-1 text-[11px] font-semibold text-coral">
          ⚠ Content-policy risk — transformative value / repetitious content. Human review required.
        </p>
      )}
      <div className="flex flex-wrap gap-1">
        {dims.map((x) => (
          <span
            key={x.label}
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              x.d.pass ? "bg-success/10 text-success" : "bg-coral/10 text-coral",
            )}
          >
            {x.d.pass ? "✓" : "✗"} {x.label} {x.d.score.toFixed(1)}
          </span>
        ))}
      </div>
      {watch.fixPlan.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted">
          {watch.fixPlan.slice(0, 4).map((f, i) => (
            <li key={i}>
              •{" "}
              {f.kind === "reroll"
                ? `Re-roll beat ${f.beatIdx + 1}`
                : f.kind === "retime"
                  ? `Re-time beat ${f.beatIdx + 1}`
                  : "Flag"}
              : {f.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── The checkpoint decision bar (approve / request changes / kill) ────────
export function DecisionBar({
  projectId,
  videoId,
  onKilled,
}: {
  projectId: string;
  videoId: string;
  /** Where to navigate after a kill (e.g. back to the Library). */
  onKilled?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [revising, setRevising] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();

  const act = (fn: () => Promise<{ ok: boolean; error?: string; warning?: string }>, after?: () => void) =>
    startTransition(async () => {
      setError(undefined);
      const r = await fn();
      if (!r.ok && r.error) setError(r.error);
      else {
        if (r.warning) setWarning(r.warning);
        after?.();
        router.refresh();
      }
    });

  if (revising) {
    return (
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
              act(
                () => requestRevisionAction(projectId, videoId, notes),
                () => {
                  setRevising(false);
                  setNotes("");
                },
              )
            }
            className="flex items-center gap-2 rounded-full bg-raised px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
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
        {error && <p className="text-sm font-medium text-coral">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => act(() => approveGateAction(projectId, videoId))}
          className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Approve &amp; continue
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setRevising(true)}
          className="flex items-center gap-2 rounded-full bg-card-warm px-4 py-2 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft disabled:opacity-50"
        >
          <RefreshCw className="size-4" /> Request changes
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (window.confirm("Kill this video? It drops out of the pipeline (audited).")) {
              act(
                () => killVideoAction(projectId, videoId),
                onKilled ? () => router.push(onKilled) : undefined,
              );
            }
          }}
          className="flex items-center gap-2 rounded-full bg-coral/10 px-4 py-2 text-sm font-semibold text-coral transition-colors hover:bg-coral/20 disabled:opacity-50"
        >
          <X className="size-4" /> Kill
        </button>
      </div>
      {warning && <p className="text-xs font-medium text-ink">{warning}</p>}
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
    </div>
  );
}

// ── Thumbnail picker (absorbed from the ASSETS review card) ───────────────
export type ThumbCandidate = { id: string; url: string | null; selected: boolean };

export function ThumbPicker({
  projectId,
  videoId,
  thumbs,
}: {
  projectId: string;
  videoId: string;
  thumbs: ThumbCandidate[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  if (thumbs.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Thumbnail candidates
      </p>
      <div className="grid grid-cols-4 gap-2">
        {thumbs.map((t, i) => (
          <button
            key={t.id}
            type="button"
            aria-label={`Select thumbnail ${i + 1}`}
            onClick={() =>
              startTransition(async () => {
                setError(undefined);
                const r = await selectThumbnailAction(projectId, videoId, t.id);
                if (!r.ok) setError(r.error);
                else router.refresh();
              })
            }
            className={cn(
              "relative aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-card-warm to-accent-soft transition-shadow",
              t.selected && "ring-2 ring-accent ring-offset-2 ring-offset-card",
            )}
          >
            {t.url && (
              // eslint-disable-next-line @next/next/no-img-element -- signed/external URLs
              <img src={t.url} alt="" className="size-full object-cover" />
            )}
            {t.selected && (
              <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-accent text-on-accent">
                <Check className="size-3" />
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted">
        Tap a thumbnail to crown it — it leads the render and the Publish Kit
        keeps all 3 for YouTube Test &amp; Compare.
      </p>
      {error && <p className="mt-1 text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

// ── Clips grid (absorbed from the ASSETS review card, Phase 7) ─────────────
// Per-beat visuals with the vision-gate relevance verdicts, one-tap reroll
// (with an optional steer note), and the licensed-footage Source Library.
export type ClipTile = {
  id: string;
  beatIdx: number | null;
  url: string | null;
  shotType?: string;
  relevance?: { score?: number; depicts?: string; reason?: string };
  fromLibrary?: boolean;
  provider: string;
};

export type AttributionCredit = {
  title: string;
  author: string;
  licenseLabel: string;
  licenseUrl?: string | null;
};

const CLIP_GRADIENTS = [
  "from-[#F5B829] to-[#F0876C]",
  "from-[#A78BFA] to-[#F0876C]",
  "from-[#7DD3FC] to-[#A78BFA]",
  "from-[#57C98A] to-[#7DD3FC]",
];

export function ClipsGrid({
  projectId,
  videoId,
  clips,
  credits,
}: {
  projectId: string;
  videoId: string;
  clips: ClipTile[];
  credits: AttributionCredit[];
}) {
  const router = useRouter();
  const [rerolling, setRerolling] = useState<number | null>(null);
  const [libraryBeat, setLibraryBeat] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busyBeat, setBusyBeat] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  if (clips.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Clips ({clips.length})
      </p>
      <div className="grid grid-cols-4 gap-2">
        {clips.map((c, i) => (
          <div
            key={c.id}
            className={cn(
              "relative aspect-video overflow-hidden rounded-lg",
              !c.url && cn("bg-gradient-to-br", CLIP_GRADIENTS[i % CLIP_GRADIENTS.length]),
            )}
          >
            {c.url && (
              // eslint-disable-next-line @next/next/no-img-element -- signed/external URLs
              <img src={c.url} alt="" className="size-full object-cover" />
            )}
            {c.provider === "pexels" && (
              <Play className="absolute inset-0 m-auto size-4 text-white drop-shadow" />
            )}
            <span className="absolute bottom-1 left-1.5 text-[10px] font-bold text-white drop-shadow">
              {c.shotType ?? "clip"}
            </span>
            {c.relevance && typeof c.relevance.score === "number" && (
              <span
                title={`Depicts: ${c.relevance.depicts ?? "?"} — ${c.relevance.reason ?? ""}`}
                className={cn(
                  "absolute left-1 top-1 rounded px-1 py-0.5 text-[9px] font-bold text-white",
                  c.relevance.score >= 6
                    ? "bg-success/90"
                    : c.relevance.score >= 4
                      ? "bg-accent/90 text-on-accent"
                      : "bg-coral/90",
                )}
              >
                ◎ {c.relevance.score.toFixed(0)}
              </span>
            )}
            {c.fromLibrary && (
              <span className="absolute bottom-1 right-1 rounded bg-success/90 px-1 py-0.5 text-[9px] font-bold text-white">
                licensed
              </span>
            )}
            {c.beatIdx !== null && (
              <div className="absolute right-1 top-1 flex gap-1">
                <button
                  type="button"
                  aria-label={`Find licensed footage for shot ${(c.beatIdx ?? 0) + 1}`}
                  onClick={() => {
                    setRerolling(null);
                    setLibraryBeat(libraryBeat === c.beatIdx ? null : c.beatIdx);
                  }}
                  className="grid size-6 place-items-center rounded-full bg-black/50 text-white hover:bg-black/80"
                >
                  <ImageIcon className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label={`Reroll shot ${(c.beatIdx ?? 0) + 1}`}
                  onClick={() => {
                    setLibraryBeat(null);
                    setRerolling(rerolling === c.beatIdx ? null : c.beatIdx);
                  }}
                  className="grid size-6 place-items-center rounded-full bg-black/50 text-white hover:bg-black/80"
                >
                  {busyBeat === c.beatIdx ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3" />
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {libraryBeat !== null && (
        <SourceLibrary
          projectId={projectId}
          videoId={videoId}
          beatIdx={libraryBeat}
          onClose={() => setLibraryBeat(null)}
          onError={setError}
        />
      )}
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
                setError(undefined);
                const r = await rerollBeatVisualAction(projectId, videoId, beat, steer);
                setBusyBeat(null);
                if (!r.ok) setError(r.error);
                else router.refresh();
              });
            }}
            className="shrink-0 rounded-full bg-raised px-3 py-1.5 text-xs font-semibold text-white"
          >
            Reroll
          </button>
        </div>
      )}
      {credits.length > 0 && (
        <div className="mt-2 rounded-xl bg-canvas p-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            Attribution ledger ({credits.length})
          </p>
          <ul className="space-y-1">
            {credits.map((c, i) => (
              <li key={i} className="text-[11px] leading-snug text-muted">
                <span className="font-medium text-ink">{c.title}</span> by {c.author} ·{" "}
                {c.licenseUrl ? (
                  <a href={c.licenseUrl} target="_blank" rel="noreferrer" className="underline decoration-dotted">
                    {c.licenseLabel}
                  </a>
                ) : (
                  c.licenseLabel
                )}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[10px] text-muted">
            Auto-added to the video description at publish.
          </p>
        </div>
      )}
      {error && <p className="mt-1 text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

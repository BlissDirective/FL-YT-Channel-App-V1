"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  MessageCircle,
  RefreshCw,
  ThumbsUp,
  Upload,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Sparkline } from "@/components/ui/sparkline";
import { approveGateAction } from "@/lib/actions/pipeline";
import { markUploadedAction, refreshStatsAction, requestPublishAction } from "@/lib/actions/publish";

export type PublishRender = {
  variant: "long" | "short";
  /** Inline-preview URL (plays in the page). */
  url: string | null;
  /** Forced-download URL (Content-Disposition: attachment) for the Save button. */
  downloadUrl: string | null;
  /** True only when the source asset is a mock render (storage path `mock/…`). */
  isMock: boolean;
  resolution: string;
  durationSec: number;
  fileName: string;
};

export type PublishSnapshot = {
  capturedAt: string;
  views: number;
  likes: number;
  comments: number;
};

export type PublishKitProps = {
  projectId: string;
  videoId: string;
  status: "APPROVED" | "TRACKING" | "FINAL_REVIEW";
  /** True for short-form videos — unlocks the one-tap farm publish. */
  isShort: boolean;
  /** Operator already tapped Publish → the farm is uploading it. */
  publishRequested: boolean;
  title: string;
  altTitles: string[];
  description: string;
  tags: string[];
  renders: PublishRender[];
  thumbUrl: string | null;
  thumbDownloadUrl: string | null;
  thumbFileName: string;
  youtubeVideoId: string | null;
  publishedAt: string | null;
  estRevenueUsd: number;
  rpmUsd: number;
  snapshots: PublishSnapshot[];
};

const CHECKLIST = [
  "Upload the MP4 and set the thumbnail below",
  "Paste the title, description, and tags (one tap each)",
  "Mark “Altered or synthetic content” in YouTube’s disclosure step — this video uses AI-generated voice/visuals",
  "Add 2 end-screen elements in the last 20s (subscribe + best-fit video)",
  "Set a pinned comment or first chapter if it helps retention",
];

export function PublishKit(props: PublishKitProps) {
  const { status } = props;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-2xl bg-accent text-on-accent">
          <Upload className="size-4" />
        </span>
        <div>
          <h2 className="font-semibold leading-tight">Publish Kit</h2>
          <p className="text-xs text-muted">
            {status === "TRACKING"
              ? "Published — tracking live public stats below."
              : status === "FINAL_REVIEW"
                ? "Rendered — download it below now, or approve the final cut (Review queue) to unlock YouTube publish."
                : "Everything you need to upload this to YouTube by hand."}
          </p>
        </div>
      </div>

      {status === "TRACKING" && <TrackingPanel {...props} />}

      <RenderDownloads {...props} />
      {status === "FINAL_REVIEW" && <ApproveFinalCut {...props} />}
      <CopyFields {...props} />
      {status === "APPROVED" && <PublishToYouTube {...props} />}
      {status === "APPROVED" && <MarkUploaded {...props} />}
    </div>
  );
}

/** Approve the final cut right from the video page (mirrors the Review-queue
    Final gate). Advancing FINAL_REVIEW → APPROVED unlocks YouTube publish; it's
    free and regenerates nothing. */
function ApproveFinalCut({ projectId, videoId }: PublishKitProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <Card className="space-y-2 border border-accent/40 bg-accent-soft/40">
      <p className="text-sm font-semibold">Approve the final cut</p>
      <p className="text-xs text-muted">
        Looks good? Approving moves it out of review and unlocks one-tap YouTube
        publish. It&apos;s free — nothing regenerates.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(undefined);
            const r = await approveGateAction(projectId, videoId);
            if (r.ok) router.refresh();
            else setError(r.error);
          })
        }
        className="inline-flex items-center justify-center gap-2 rounded-full bg-raised px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Approve final cut
      </button>
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
    </Card>
  );
}

/** One-tap publish for a rendered video (long-form or Short): flags it for the
    render farm (which holds the YouTube OAuth) to upload — long-form as an
    unlisted draft, a Short as #Shorts. The download package above stays
    available, and manual "mark uploaded" below is the fallback when the farm
    has no OAuth, so the operator always picks: download, upload, or both. */
function PublishToYouTube({ projectId, videoId, isShort, publishRequested }: PublishKitProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const queued = publishRequested || done;
  const what = isShort ? "Short (9:16)" : "long-form";

  return (
    <Card className="space-y-2 border border-accent/40 bg-accent-soft/40">
      <p className="text-sm font-semibold">Publish to YouTube</p>
      <p className="text-xs text-muted">
        {queued
          ? `Queued — the render farm uploads this ${what} on its next pass (first stats appear within the day).`
          : isShort
            ? "One tap sends the staged 9:16 cut to YouTube as a Short. Or just download it above."
            : "One tap uploads the long-form as an unlisted draft to review on YouTube. Or just download it above."}
      </p>
      {!queued ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(undefined);
              const r = await requestPublishAction(projectId, videoId);
              if (!r.ok) setError(r.error);
              else setDone(true);
            })
          }
          className="inline-flex items-center justify-center gap-2 rounded-full bg-raised px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Publish to YouTube
        </button>
      ) : (
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Check className="size-4 text-success" /> Queued for publish
        </p>
      )}
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
    </Card>
  );
}

function TrackingPanel(props: PublishKitProps) {
  const { snapshots, estRevenueUsd, youtubeVideoId, publishedAt, projectId, videoId } = props;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const latest = snapshots[snapshots.length - 1];
  const views = latest?.views ?? 0;
  const likes = latest?.likes ?? 0;
  const comments = latest?.comments ?? 0;

  return (
    <Card className="space-y-3 bg-card-warm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone="success">Tracking</StatusChip>
          {publishedAt && (
            <span className="text-xs text-muted">
              published {new Date(publishedAt).toLocaleDateString()}
            </span>
          )}
          {youtubeVideoId && (
            <a
              href={`https://youtu.be/${youtubeVideoId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink underline decoration-accent decoration-2 underline-offset-2"
            >
              watch on YouTube <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(undefined);
              const r = await refreshStatsAction(projectId, videoId);
              if (!r.ok) setError(r.error);
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink shadow-card hover:bg-accent-soft disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Refresh stats
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Eye className="size-4" />} label="Views" value={compact(views)} />
        <Stat icon={<ThumbsUp className="size-4" />} label="Likes" value={compact(likes)} />
        <Stat
          icon={<MessageCircle className="size-4" />}
          label="Comments"
          value={compact(comments)}
        />
        <Stat label="Est. revenue" value={`$${estRevenueUsd.toFixed(2)}`} />
      </div>

      {snapshots.length > 1 ? (
        <div className="flex items-center gap-3">
          <Sparkline data={snapshots.map((s) => s.views)} width={180} height={40} />
          <span className="text-xs text-muted">
            {snapshots.length} snapshots · {compact(views)} views latest
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted">
          One snapshot so far — the views trend appears after the next refresh
          (nightly, or tap Refresh stats).
        </p>
      )}
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-card p-3">
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function RenderDownloads(props: PublishKitProps) {
  const { renders, thumbUrl, thumbFileName } = props;
  const usable = renders.filter((r) => r.url);
  // A real (non-mock) render that produced no signable URL = a link/credential
  // failure, NOT a mock video. Don't scare the operator with "mock render".
  const hasRealRender = renders.some((r) => !r.isMock);
  const linkFailed = usable.length === 0 && hasRealRender;

  if (usable.length === 0 && !thumbUrl) {
    return (
      <Card className="text-sm text-muted">
        {hasRealRender
          ? "Couldn't generate the download link — reload in a moment. If it keeps failing, the storage credentials may need re-syncing (Sync Vercel Env)."
          : "This video was a mock render, so there's no downloadable MP4. Run a live-asset video through the pipeline to get a real package here."}
      </Card>
    );
  }
  return (
    <Card className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Download package
      </p>
      {linkFailed && (
        <p className="text-xs font-medium text-coral">
          Couldn&apos;t generate the video download link — reload in a moment.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {usable.map((r) => (
          <a
            key={r.variant}
            href={(r.downloadUrl ?? r.url) as string}
            download={r.fileName}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.02]"
          >
            <Download className="size-4" />
            {r.variant === "short" ? "Short (9:16)" : "MP4 (16:9)"} ·{" "}
            {fmtDuration(r.durationSec)} · {r.resolution}
          </a>
        ))}
        {thumbUrl && (
          <a
            href={props.thumbDownloadUrl ?? thumbUrl}
            download={thumbFileName}
            className="inline-flex items-center gap-2 rounded-full bg-card-warm px-4 py-2 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft"
          >
            <Download className="size-4" /> Thumbnail
          </a>
        )}
      </div>
      <p className="text-[11px] text-muted">
        On mobile, these save to Files. Tip: long-press a button → “Download
        Linked File” if your browser still opens the preview.
      </p>
      {usable.find((r) => r.variant === "long")?.url && (
        <video
          src={usable.find((r) => r.variant === "long")!.url as string}
          poster={thumbUrl ?? undefined}
          controls
          playsInline
          className="aspect-video w-full overflow-hidden rounded-xl bg-raised object-contain"
        />
      )}
    </Card>
  );
}

function CopyFields(props: PublishKitProps) {
  const { title, altTitles, description, tags } = props;
  return (
    <Card className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        One-tap copy
      </p>
      <CopyRow label="Title" value={title} />
      {altTitles.length > 0 && (
        <p className="text-[11px] text-muted">
          Alt titles to A/B: {altTitles.join(" · ")}
        </p>
      )}
      <CopyRow label="Description" value={description} multiline />
      <CopyRow label="Tags" value={tags.join(", ")} />

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          Upload checklist
        </p>
        <ul className="space-y-1.5">
          {CHECKLIST.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink/90">
              <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-line text-[10px] text-muted">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function CopyRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied("ok");
    } catch {
      // Clipboard blocked (permissions / non-HTTPS) — say so; the field
      // below stays selectable for a manual copy.
      setCopied("failed");
    }
    setTimeout(() => setCopied(null), 1500);
  };
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-ink hover:bg-accent-soft"
        >
          {copied === "ok" ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          {copied === "ok" ? "Copied" : copied === "failed" ? "Copy failed — select manually" : "Copy"}
        </button>
      </div>
      {multiline ? (
        <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-xl bg-canvas px-3 py-2 font-sans text-sm leading-relaxed">
          {value}
        </pre>
      ) : (
        <p className="rounded-xl bg-canvas px-3 py-2 text-sm">{value}</p>
      )}
    </div>
  );
}

function MarkUploaded(props: PublishKitProps) {
  const { projectId, videoId } = props;
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <Card className="space-y-2 border border-accent/40 bg-accent-soft/40">
      <p className="text-sm font-semibold">Already uploaded it?</p>
      <p className="text-xs text-muted">
        Paste the YouTube URL and the studio starts tracking its public stats —
        first numbers appear within the day.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtu.be/…"
          className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          disabled={isPending || !url.trim()}
          onClick={() =>
            startTransition(async () => {
              setError(undefined);
              const r = await markUploadedAction(projectId, videoId, url);
              if (!r.ok) setError(r.error);
            })
          }
          className="inline-flex items-center justify-center gap-2 rounded-full bg-raised px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Mark as uploaded
        </button>
      </div>
      {error && <p className="text-sm font-medium text-coral">{error}</p>}
    </Card>
  );
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

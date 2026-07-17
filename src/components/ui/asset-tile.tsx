import Link from "next/link";
import { AlertTriangle, Bot, CircleDollarSign, Eye, Loader2, PauseCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { StageProgressBar } from "./progress-rail";
import { StatusChip } from "./status-chip";

/**
 * One asset in the Library grid (UI v2, D-3/D-5): thumbnail (or a stage
 * gradient placeholder), title, segmented stage-progress bar, QC score chip,
 * and the three badges — 🟠 awaiting-you, 🔴 failed, 🤖 autopilot. Purely
 * presentational; quick actions arrive via the `actions` slot so this stays
 * a server-safe component.
 */
export function AssetTile({
  href,
  title,
  subtitle,
  thumbUrl,
  railIndex,
  railTotal,
  stageLabel,
  qcScore,
  awaitingYou,
  awaitingLabel,
  failed,
  stalled,
  paused,
  active,
  progressLabel,
  progressPct,
  autopilot,
  spendUsd,
  views,
  actions,
}: {
  href: string;
  title: string;
  subtitle?: string;
  thumbUrl?: string | null;
  railIndex: number;
  railTotal: number;
  stageLabel: string;
  qcScore?: number | null;
  awaitingYou?: boolean;
  /** e.g. the paused_reason or "Script gate" — shown under the badge row. */
  awaitingLabel?: string;
  failed?: boolean;
  /** In-progress but not moving (needs a nudge) — amber, distinct from failed. */
  stalled?: boolean;
  /** Held (paused_reason) — resumable. */
  paused?: boolean;
  /** Actively being generated/processed right now (agent or director) — glows. */
  active?: boolean;
  /** Live progress label while active, e.g. "Generating 3/8 clips" (#3). */
  progressLabel?: string;
  /** 0–1 fraction for a determinate progress bar (asset generation). */
  progressPct?: number | null;
  autopilot?: boolean;
  spendUsd?: number;
  views?: number | null;
  actions?: React.ReactNode;
}) {
  return (
    <div
      data-testid="asset-tile"
      data-active={active ? "" : undefined}
      className={cn(
        "flex flex-col gap-2 rounded-card bg-card p-3 shadow-card transition-shadow hover:shadow-lg",
        active && "tile-active",
        !active && failed && "ring-2 ring-coral/60",
        !active && !failed && stalled && "ring-2 ring-accent/50",
        !active && !failed && !stalled && awaitingYou && "ring-2 ring-accent/60",
      )}
    >
      <Link href={href} className="block">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-card-warm to-accent-soft">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URLs are short-lived; next/image would re-proxy them
            <img src={thumbUrl} alt="" className="size-full object-cover" />
          ) : (
            // Placeholder stage label sits at the BOTTOM so it never collides
            // with the status badges pinned top-left (the stage also shows in
            // the footer below).
            <span className="absolute inset-x-0 bottom-1.5 truncate px-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted/80">
              {stageLabel}
            </span>
          )}
          {active && <span className="scanline" aria-hidden />}
          <span className="absolute left-1.5 right-1.5 top-1.5 flex flex-wrap gap-1">
            {active ? (
              <StatusChip tone="warning" className="gap-1 whitespace-nowrap">
                <Loader2 className="size-3 animate-spin" /> working
              </StatusChip>
            ) : failed ? (
              <StatusChip tone="coral" className="gap-1 whitespace-nowrap">
                <AlertTriangle className="size-3" /> failed
              </StatusChip>
            ) : stalled ? (
              <StatusChip tone="warning" className="gap-1 whitespace-nowrap">
                <AlertTriangle className="size-3" /> stalled
              </StatusChip>
            ) : paused ? (
              <StatusChip tone="neutral" className="gap-1 whitespace-nowrap bg-raised/70 text-white">
                <PauseCircle className="size-3" /> paused
              </StatusChip>
            ) : awaitingYou ? (
              <StatusChip tone="warning" className="gap-1 whitespace-nowrap">● your turn</StatusChip>
            ) : null}
            {autopilot && !active && (
              <StatusChip tone="lavender" className="gap-1 whitespace-nowrap">
                <Bot className="size-3" /> auto
              </StatusChip>
            )}
          </span>
          {views != null && (
            <span className="absolute bottom-1.5 right-1.5">
              <StatusChip tone="neutral" className="gap-1 bg-raised/70 text-white">
                <Eye className="size-3" /> {compactViews(views)}
              </StatusChip>
            </span>
          )}
        </div>
      </Link>

      <Link href={href} className="min-w-0">
        <p className="truncate text-sm font-semibold leading-snug">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </Link>

      <StageProgressBar total={railTotal} current={railIndex} />

      {active && progressPct != null && (
        <div className="h-1 overflow-hidden rounded-full bg-canvas" aria-hidden>
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${Math.round(Math.max(0, Math.min(1, progressPct)) * 100)}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span className={cn("truncate font-medium", active && "text-ink")}>
          {active && progressLabel ? progressLabel : stageLabel}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {qcScore != null && (
            <span
              className={cn(
                "font-semibold",
                qcScore >= 8 ? "text-success" : qcScore >= 6 ? "text-ink" : "text-coral",
              )}
            >
              QC {Number(qcScore).toFixed(1)}
            </span>
          )}
          {spendUsd != null && spendUsd > 0 && (
            <span className="flex items-center gap-0.5 tabular-nums">
              <CircleDollarSign className="size-3" />
              {Number(spendUsd).toFixed(2)}
            </span>
          )}
        </span>
      </div>

      {awaitingLabel && (
        <p className="line-clamp-2 text-xs font-medium text-coral">{awaitingLabel}</p>
      )}

      {actions && <div className="mt-auto flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

function compactViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

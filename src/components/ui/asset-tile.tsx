import Link from "next/link";
import { AlertTriangle, Bot, CircleDollarSign, Eye } from "lucide-react";
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
  autopilot?: boolean;
  spendUsd?: number;
  views?: number | null;
  actions?: React.ReactNode;
}) {
  return (
    <div
      data-testid="asset-tile"
      className={cn(
        "flex flex-col gap-2 rounded-card bg-card p-3 shadow-card transition-shadow hover:shadow-lg",
        failed && "ring-2 ring-coral/60",
        !failed && awaitingYou && "ring-2 ring-accent/60",
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
          <span className="absolute left-1.5 right-1.5 top-1.5 flex flex-wrap gap-1">
            {failed ? (
              <StatusChip tone="coral" className="gap-1 whitespace-nowrap">
                <AlertTriangle className="size-3" /> failed
              </StatusChip>
            ) : awaitingYou ? (
              <StatusChip tone="warning" className="gap-1 whitespace-nowrap">● your turn</StatusChip>
            ) : null}
            {autopilot && (
              <StatusChip tone="lavender" className="gap-1 whitespace-nowrap">
                <Bot className="size-3" /> auto
              </StatusChip>
            )}
          </span>
          {views != null && (
            <span className="absolute bottom-1.5 right-1.5">
              <StatusChip tone="neutral" className="gap-1 bg-ink/70 text-white">
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

      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate font-medium">{stageLabel}</span>
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

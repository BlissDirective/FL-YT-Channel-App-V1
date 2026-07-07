"use client";

import { Clapperboard, FileText, Film, Lightbulb } from "lucide-react";
import type { ApprovalGate } from "@studio/core";
import { GATE_LABELS } from "@studio/core";
import type { QcReview } from "@/lib/db/queries";
import type { WatchVerdict } from "@/lib/pipeline/watch-gate";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import {
  DecisionBar,
  QcCard,
  ThumbPicker,
  WatchPanel,
  type ThumbCandidate,
} from "@/components/dashboard/checkpoint";

const GATE_ICONS: Record<ApprovalGate, typeof Lightbulb> = {
  IDEA: Lightbulb,
  SCRIPT: FileText,
  ASSETS: Film,
  FINAL: Clapperboard,
};

/**
 * The Asset Canvas checkpoint block (UI v2 Phase 3, D-6): when the asset is
 * waiting at a gate, everything needed to decide lives here — QC verdict +
 * calibration, Self-Watch at FINAL, thumbnail pick at ASSETS, idea context
 * at IDEA, and the approve/revise/kill decision bar. The same components the
 * review queue renders (one implementation, §4 consolidation).
 */
export function CheckpointPanel({
  projectId,
  videoId,
  gate,
  pausedReason,
  qc,
  watch,
  thumbs,
  idea,
  pendingClips,
}: {
  projectId: string;
  videoId: string;
  gate: ApprovalGate;
  pausedReason: string | null;
  qc: QcReview | null;
  watch: WatchVerdict | null;
  thumbs: ThumbCandidate[];
  idea: { topic: string; angle?: string | null; score?: number | null } | null;
  pendingClips: number;
}) {
  const Icon = GATE_ICONS[gate];
  return (
    <Card className="space-y-3 border border-accent/40" data-testid="checkpoint-panel">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-ink">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Checkpoint
          </p>
          <h2 className="font-semibold leading-snug">{GATE_LABELS[gate]} gate</h2>
        </div>
      </div>

      {pausedReason && (
        <div className="rounded-xl bg-coral/10 px-3 py-2 text-sm font-medium text-coral">
          ⏸ {pausedReason}
        </div>
      )}

      {gate === "IDEA" && idea && (
        <div className="space-y-2">
          <p className="text-sm text-muted">{idea.topic}</p>
          {idea.angle && (
            <p className="rounded-xl bg-canvas px-3 py-2 text-sm">
              <span className="font-semibold">Angle:</span> {idea.angle}
            </p>
          )}
          {idea.score != null && (
            <StatusChip tone="success">Score {Number(idea.score).toFixed(1)}</StatusChip>
          )}
        </div>
      )}

      {qc && <QcCard qc={qc} />}
      {gate === "FINAL" && <WatchPanel watch={watch} videoId={videoId} />}
      {gate === "ASSETS" && (
        <ThumbPicker projectId={projectId} videoId={videoId} thumbs={thumbs} />
      )}
      {gate === "ASSETS" && pendingClips > 0 && (
        <p className="text-xs text-muted">
          {pendingClips} AI clip{pendingClips === 1 ? "" : "s"} still building —
          approving renders with the assets that are ready; pending clips won&apos;t
          be included.
        </p>
      )}

      <DecisionBar
        projectId={projectId}
        videoId={videoId}
        onKilled={`/projects/${projectId}/library`}
      />
    </Card>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Wand2,
  ScanSearch,
  Pencil,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Upload,
  Loader2,
  Clapperboard,
} from "lucide-react";
import {
  directorRunStageAction,
  directorReviewStageAction,
  directorAdvanceAction,
  directorReviseAction,
  directorRerenderAction,
  directorStepBackAction,
  directorKillAction,
  directorPublishAction,
} from "@/lib/actions/director";
import { cn } from "@/lib/cn";

/**
 * Director controls (spec §5/§6.3, D2 seed). A compact command row wiring every
 * director stage action for the current asset. D3 elaborates this into the full
 * stage-rail console with the advisory panel + embedded editing suite; the
 * action contract is identical.
 */
type Kind = "success" | "info" | "danger" | null;

export function DirectorControls({
  projectId,
  videoId,
  status,
  pausedReason,
}: {
  projectId: string;
  videoId: string;
  status: string;
  pausedReason?: string | null;
}) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; kind: Kind } | null>(null);
  const [notes, setNotes] = useState("");
  const router = useRouter();

  const atGate = ["IDEA", "SCRIPT_READY", "ASSETS_READY", "FINAL_REVIEW"].includes(status);
  const atWorking = ["IDEA_APPROVED", "SCRIPTING", "GENERATING_ASSETS", "ASSEMBLING"].includes(status);
  const canPublish = ["FINAL_REVIEW", "APPROVED"].includes(status);
  const terminal = ["KILLED", "TRACKING"].includes(status);

  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string; warning?: string }>) {
    setBusy(label);
    start(async () => {
      setMsg(null);
      const r = await fn();
      setBusy(null);
      if (!r.ok) setMsg({ text: r.error ?? "Something went wrong.", kind: "danger" });
      else {
        setMsg({ text: r.warning ?? `${label} done.`, kind: r.warning ? "info" : "success" });
        setNotes("");
        router.refresh();
      }
    });
  }

  const B = ({
    label,
    icon: Icon,
    onClick,
    disabled,
    tone = "default",
  }: {
    label: string;
    icon: typeof Wand2;
    onClick: () => void;
    disabled?: boolean;
    tone?: "default" | "primary" | "danger";
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold shadow-card transition-colors disabled:opacity-50",
        tone === "primary" && "bg-ink text-accent hover:bg-ink/90",
        tone === "danger" && "bg-red-50 text-red-700 hover:bg-red-100",
        tone === "default" && "bg-card hover:bg-accent-soft",
      )}
    >
      {busy === label ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
      {label}
    </button>
  );

  return (
    <div className="space-y-3 rounded-card border border-accent/30 bg-accent-soft/40 p-4" data-mode="director">
      <div className="flex items-center gap-2">
        <Clapperboard className="size-4 text-ink" />
        <h3 className="text-sm font-bold tracking-tight">Director controls</h3>
        <span className="ml-auto text-xs text-muted">You conduct every step.</span>
      </div>

      {pausedReason && (
        <p className="rounded-lg bg-card p-2.5 text-xs font-medium text-amber-700">{pausedReason}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {atWorking && (
          <B
            label="Generate"
            icon={Wand2}
            tone="primary"
            onClick={() => run("Generate", () => directorRunStageAction(projectId, videoId))}
          />
        )}
        {!terminal && (
          <B
            label="Run review"
            icon={ScanSearch}
            onClick={() => run("Run review", () => directorReviewStageAction(projectId, videoId))}
          />
        )}
        {atGate && (
          <B
            label="Advance"
            icon={ChevronRight}
            tone="primary"
            onClick={() => run("Advance", () => directorAdvanceAction(projectId, videoId))}
          />
        )}
        {!terminal && (
          <>
            <B
              label="Revise"
              icon={Pencil}
              onClick={() => run("Revise", () => directorReviseAction(projectId, videoId, { notes }))}
            />
            <B
              label="Re-render"
              icon={RefreshCw}
              onClick={() => run("Re-render", () => directorRerenderAction(projectId, videoId, { notes }))}
            />
          </>
        )}
        {canPublish && (
          <B
            label="Publish"
            icon={Upload}
            tone="primary"
            onClick={() => run("Publish", () => directorPublishAction(projectId, videoId))}
          />
        )}
        {!terminal && (
          <B
            label="Step back"
            icon={ChevronLeft}
            onClick={() => run("Step back", () => directorStepBackAction(projectId, videoId))}
          />
        )}
        {!terminal && (
          <B
            label="Kill"
            icon={Trash2}
            tone="danger"
            onClick={() => run("Kill", () => directorKillAction(projectId, videoId))}
          />
        )}
      </div>

      {!terminal && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Notes for Revise / Re-render (optional) — steer the agent for this iteration."
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted"
        />
      )}

      {msg && (
        <p
          className={cn(
            "text-xs font-medium",
            msg.kind === "danger" && "text-red-600",
            msg.kind === "info" && "text-amber-700",
            msg.kind === "success" && "text-emerald-600",
          )}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

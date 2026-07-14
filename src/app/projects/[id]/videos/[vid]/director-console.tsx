"use client";

import { useMemo, useState, useTransition } from "react";
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
  Check,
  CircleDot,
  Lock,
  AlertTriangle,
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
  directorRunAutofixAction,
  directorRunSelfWatchAction,
  directorAutoRescriptProposalAction,
} from "@/lib/actions/director";
import { cn } from "@/lib/cn";

/**
 * The Director Console (Fable-5-Director-Mode-Build-Spec.md §6.3). Mounted on
 * the asset canvas for director projects: a stage rail, a state-aware action
 * card with Revise/Re-render dialogs (checkable findings + notes), an advisory
 * panel aggregating the stage's QC reviews, and an activity log of every
 * operator decision. The existing canvas sections below remain the artifact
 * viewer/editor panes (script beats, stills, editor link, publish kit).
 */

export type ConsoleReview = {
  id: string;
  gate: string;
  score: number;
  verdict: string;
  issues: string[];
  strengths: string[];
  created_at: string;
};

export type ConsoleDecision = {
  id: string;
  stage: string;
  action: string;
  agent_score: number | null;
  agent_verdict: string | null;
  operator_notes: string | null;
  cost_usd: number | null;
  created_at: string;
};

type Stage = "idea" | "script" | "visuals" | "edit" | "publish";

const STAGES: { key: Stage; label: string; gates: string[] }[] = [
  { key: "idea", label: "Idea", gates: ["IDEA", "IDEA_APPROVED"] },
  { key: "script", label: "Script", gates: ["SCRIPTING", "SCRIPT_READY"] },
  { key: "visuals", label: "Visuals", gates: ["GENERATING_ASSETS", "ASSETS_READY"] },
  { key: "edit", label: "Edit", gates: ["ASSEMBLING", "FINAL_REVIEW"] },
  { key: "publish", label: "Publish", gates: ["APPROVED", "TRACKING"] },
];

function stageForStatus(status: string): Stage {
  if (status === "SCRIPTING" || status === "SCRIPT_READY") return "script";
  if (status === "GENERATING_ASSETS" || status === "ASSETS_READY") return "visuals";
  if (status === "ASSEMBLING" || status === "FINAL_REVIEW") return "edit";
  if (status === "APPROVED" || status === "TRACKING") return "publish";
  return "idea";
}

/** Which ApprovalGate a stage's reviews are stored under (mirrors the engine). */
const GATE_FOR_STAGE: Record<Stage, string> = {
  idea: "IDEA",
  script: "SCRIPT",
  visuals: "ASSETS",
  edit: "FINAL",
  publish: "FINAL",
};

export type ConsoleLengthAdvisory = {
  actualLabel: string;
  targetLabel: string;
  verdict: "in" | "under" | "over";
  deltaPct: number;
  estimated: boolean;
  message: string;
};

export function DirectorConsole({
  projectId,
  videoId,
  status,
  pausedReason,
  lengthTargetLabel,
  lengthAdvisory,
  tasteLine,
  reviews,
  decisions,
}: {
  projectId: string;
  videoId: string;
  status: string;
  pausedReason?: string | null;
  lengthTargetLabel?: string | null;
  lengthAdvisory?: ConsoleLengthAdvisory | null;
  tasteLine?: string | null;
  reviews: ConsoleReview[];
  decisions: ConsoleDecision[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; kind: "success" | "info" | "danger" } | null>(null);
  const [dialog, setDialog] = useState<null | "revise" | "rerender">(null);
  const [proposal, setProposal] = useState<string | null>(null);

  const currentStage = stageForStatus(status);
  const currentIdx = STAGES.findIndex((s) => s.key === currentStage);
  const atGate = ["IDEA", "SCRIPT_READY", "ASSETS_READY", "FINAL_REVIEW"].includes(status);
  const atWorking = ["IDEA_APPROVED", "SCRIPTING", "GENERATING_ASSETS", "ASSEMBLING"].includes(status);
  const canPublish = ["FINAL_REVIEW", "APPROVED"].includes(status);
  const terminal = ["KILLED", "TRACKING"].includes(status);
  const paidNext = atWorking; // the generate press spends

  // Reviews for the CURRENT stage's gate, newest first.
  const stageReviews = useMemo(
    () => reviews.filter((r) => r.gate === GATE_FOR_STAGE[currentStage]),
    [reviews, currentStage],
  );
  const latest = stageReviews[0];
  const latestFindings = latest?.issues ?? [];

  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string; warning?: string }>) {
    setBusy(label);
    start(async () => {
      setMsg(null);
      const r = await fn();
      setBusy(null);
      setDialog(null);
      if (!r.ok) setMsg({ text: r.error ?? "Something went wrong.", kind: "danger" });
      else {
        setMsg({ text: r.warning ?? `${label} done.`, kind: r.warning ? "info" : "success" });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4 rounded-card border border-accent/30 bg-accent-soft/30 p-4" data-mode="director">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Clapperboard className="size-4 text-ink" />
        <h3 className="text-sm font-bold tracking-tight">Director console</h3>
        {lengthTargetLabel && (
          <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-ink shadow-card">
            Target: {lengthTargetLabel}
          </span>
        )}
        {!terminal && (
          <button
            type="button"
            onClick={() => run("Kill", () => directorKillAction(projectId, videoId))}
            disabled={pending}
            className="ml-auto flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" /> Kill
          </button>
        )}
      </div>

      {/* Stage rail */}
      <StageRail currentIdx={currentIdx} status={status} />

      {/* Action card + advisory panel */}
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        {/* Action card */}
        <div className="space-y-3 rounded-xl bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {STAGES[currentIdx].label} stage
          </p>
          {lengthAdvisory && (
            <div
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-lg p-2.5 text-xs",
                lengthAdvisory.verdict === "in"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-50 text-amber-800",
              )}
            >
              <span className="font-medium">
                {lengthAdvisory.verdict === "in" ? "✓" : "⚠"} {lengthAdvisory.message}
              </span>
              {lengthAdvisory.verdict !== "in" && !terminal && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run("Revise to length", () =>
                      directorReviseAction(projectId, videoId, { notes: lengthAdvisory.message }),
                    )
                  }
                  className="ml-auto rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-accent hover:bg-ink/90 disabled:opacity-50"
                >
                  {busy === "Revise to length" ? "Working…" : "Revise to length"}
                </button>
              )}
            </div>
          )}
          {pausedReason && (
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2.5 text-xs font-medium text-amber-800">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {pausedReason}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {atWorking && (
              <ActBtn label="Generate" icon={Wand2} tone="primary" busy={busy} pending={pending}
                onClick={() => run("Generate", () => directorRunStageAction(projectId, videoId))} />
            )}
            {!terminal && (
              <ActBtn label="Run review" icon={ScanSearch} busy={busy} pending={pending}
                onClick={() => run("Run review", () => directorReviewStageAction(projectId, videoId))} />
            )}
            {!terminal && (
              <ActBtn label="Revise" icon={Pencil} busy={busy} pending={pending}
                onClick={() => setDialog("revise")} />
            )}
            {!terminal && (
              <ActBtn label="Re-render" icon={RefreshCw} busy={busy} pending={pending}
                onClick={() => setDialog("rerender")} />
            )}
            {atGate && (
              <ActBtn label="Advance" icon={ChevronRight} tone="primary" busy={busy} pending={pending}
                onClick={() => run("Advance", () => directorAdvanceAction(projectId, videoId))} />
            )}
            {canPublish && (
              <ActBtn label="Publish" icon={Upload} tone="primary" busy={busy} pending={pending}
                onClick={() => run("Publish", () => directorPublishAction(projectId, videoId))} />
            )}
            {!terminal && (
              <ActBtn label="Step back" icon={ChevronLeft} busy={busy} pending={pending}
                onClick={() => run("Step back", () => directorStepBackAction(projectId, videoId))} />
            )}
          </div>
          {/* On-demand agent passes (spec §6.4) — Edit stage only. */}
          {currentStage === "edit" && (
            <div className="space-y-2 border-t border-line pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Agent passes</p>
              <div className="flex flex-wrap gap-2">
                <ActBtn label="Run Auto-Fix" icon={RefreshCw} busy={busy} pending={pending}
                  onClick={() => run("Run Auto-Fix", () => directorRunAutofixAction(projectId, videoId))} />
                <ActBtn label="Run Self-Watch" icon={ScanSearch} busy={busy} pending={pending}
                  onClick={() => run("Run Self-Watch", () => directorRunSelfWatchAction(projectId, videoId))} />
                <ActBtn label="Auto-Rescript proposal" icon={Pencil} busy={busy} pending={pending}
                  onClick={() =>
                    run("Auto-Rescript proposal", async () => {
                      const r = await directorAutoRescriptProposalAction(projectId, videoId);
                      if (r.ok) setProposal(r.proposal ?? null);
                      return r;
                    })
                  } />
              </div>
              {proposal && (
                <div className="space-y-1 rounded-lg bg-canvas p-3 text-xs">
                  <p className="font-semibold text-ink">Rescript proposal (not applied)</p>
                  <p className="whitespace-pre-wrap text-muted">{proposal}</p>
                  <button type="button" onClick={() => setProposal(null)}
                    className="text-[11px] font-semibold text-muted hover:text-ink">Dismiss</button>
                </div>
              )}
            </div>
          )}
          {paidNext && (
            <p className="text-[11px] text-muted">
              Generate spends against your budget (VO + visuals). Budget caps and the
              kill switch still apply.
            </p>
          )}
          {(currentStage === "script" || currentStage === "visuals" || currentStage === "edit") && (
            <p className="text-[11px] text-muted">
              ↓ Your {STAGES[currentIdx].label.toLowerCase()} artifact and its fine-grained
              tools are in the <strong>Stage workspace</strong> below.
            </p>
          )}
          {msg && (
            <p className={cn(
              "text-xs font-medium",
              msg.kind === "danger" && "text-red-600",
              msg.kind === "info" && "text-amber-700",
              msg.kind === "success" && "text-emerald-600",
            )}>
              {msg.text}
            </p>
          )}
        </div>

        {/* Advisory panel */}
        <AdvisoryPanel reviews={stageReviews} tasteLine={tasteLine} />
      </div>

      {/* Activity log */}
      <ActivityLog decisions={decisions} />

      {dialog && (
        <IterateDialog
          kind={dialog}
          findings={latestFindings}
          pending={pending}
          onCancel={() => setDialog(null)}
          onSubmit={(notes, checked) => {
            const composed = composeNotes(notes, checked);
            if (dialog === "revise")
              run("Revise", () => directorReviseAction(projectId, videoId, { notes: composed, findings: checked }));
            else run("Re-render", () => directorRerenderAction(projectId, videoId, { notes: composed }));
          }}
        />
      )}
    </div>
  );
}

function composeNotes(notes: string, findings: string[]): string {
  const n = notes.trim();
  if (findings.length === 0) return n;
  const list = findings.map((f) => `- ${f}`).join("\n");
  return [n, n ? "\nApply these findings:" : "Apply these findings:", list].filter(Boolean).join("\n");
}

// ── Stage rail ─────────────────────────────────────────────────────────
function StageRail({ currentIdx, status }: { currentIdx: number; status: string }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-card p-2 shadow-card">
      {STAGES.map((s, i) => {
        const done = i < currentIdx || status === "TRACKING";
        const current = i === currentIdx && status !== "TRACKING";
        return (
          <div key={s.key} className="flex flex-1 items-center gap-1">
            <div
              className={cn(
                "flex min-w-[92px] flex-1 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                current && "bg-ink text-accent",
                done && "bg-emerald-50 text-emerald-700",
                !done && !current && "bg-canvas text-muted",
              )}
            >
              {done ? <Check className="size-3.5" /> : current ? <CircleDot className="size-3.5" /> : <Lock className="size-3" />}
              {s.label}
            </div>
            {i < STAGES.length - 1 && <span className="h-px w-2 shrink-0 bg-line" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Advisory panel ─────────────────────────────────────────────────────
function AdvisoryPanel({ reviews, tasteLine }: { reviews: ConsoleReview[]; tasteLine?: string | null }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-xl bg-card p-4 text-xs text-muted shadow-card">
        <p className="font-semibold text-ink">Advisory</p>
        <p className="mt-1">No review yet for this stage. Press <strong>Run review</strong> for an
          advisory score — it never blocks your decision.</p>
        {tasteLine && <p className="mt-2 italic text-accent">{tasteLine}</p>}
      </div>
    );
  }
  const latest = reviews[0];
  const below = latest.score < 7;
  return (
    <div className="space-y-2 rounded-xl bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Advisory</p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-bold",
            below ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700",
          )}
        >
          {latest.score.toFixed(1)}/10 {below ? "· advisory" : "· strong"}
        </span>
      </div>
      {latest.issues.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-ink">Findings</p>
          <ul className="mt-1 space-y-1">
            {latest.issues.map((it, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-muted">
                <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-500" /> {it}
              </li>
            ))}
          </ul>
        </div>
      )}
      {latest.strengths.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-ink">Strengths</p>
          <ul className="mt-1 space-y-1">
            {latest.strengths.map((it, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-muted">
                <Check className="mt-0.5 size-3 shrink-0 text-emerald-500" /> {it}
              </li>
            ))}
          </ul>
        </div>
      )}
      {reviews.length > 1 && (
        <p className="text-[11px] text-muted">{reviews.length - 1} earlier review{reviews.length > 2 ? "s" : ""} on this stage.</p>
      )}
      {tasteLine && <p className="border-t border-line pt-2 text-[11px] italic text-accent">{tasteLine}</p>}
    </div>
  );
}

// ── Activity log ───────────────────────────────────────────────────────
function ActivityLog({ decisions }: { decisions: ConsoleDecision[] }) {
  if (decisions.length === 0) return null;
  return (
    <details className="rounded-xl bg-card p-4 shadow-card">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted">
        Activity log ({decisions.length})
      </summary>
      <ul className="mt-3 space-y-1.5">
        {decisions.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="font-mono text-[10px] text-muted">
              {new Date(d.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="rounded-full bg-canvas px-2 py-0.5 font-semibold capitalize text-ink">
              {d.stage} · {d.action.replace(/_/g, " ")}
            </span>
            {d.agent_score != null && <span>score {d.agent_score.toFixed(1)}</span>}
            {d.cost_usd != null && d.cost_usd > 0 && <span>+${d.cost_usd.toFixed(2)}</span>}
            {d.operator_notes && <span className="italic">“{d.operator_notes.slice(0, 60)}{d.operator_notes.length > 60 ? "…" : ""}”</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}

// ── Action button ──────────────────────────────────────────────────────
function ActBtn({
  label, icon: Icon, onClick, busy, pending, disabled, tone = "default",
}: {
  label: string;
  icon: typeof Wand2;
  onClick: () => void;
  busy: string | null;
  pending: boolean;
  disabled?: boolean;
  tone?: "default" | "primary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold shadow-card transition-colors disabled:opacity-50",
        tone === "primary" ? "bg-ink text-accent hover:bg-ink/90" : "bg-canvas hover:bg-accent-soft",
      )}
    >
      {busy === label ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
      {label}
    </button>
  );
}

// ── Revise / Re-render dialog ──────────────────────────────────────────
function IterateDialog({
  kind, findings, pending, onCancel, onSubmit,
}: {
  kind: "revise" | "rerender";
  findings: string[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (notes: string, checkedFindings: string[]) => void;
}) {
  const [notes, setNotes] = useState("");
  const [checked, setChecked] = useState<boolean[]>(() => findings.map(() => true));
  const revise = kind === "revise";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-4 rounded-card bg-card p-6 shadow-lg">
        <h3 className="text-base font-bold tracking-tight">{revise ? "Revise" : "Re-render"} this stage</h3>
        <p className="text-sm text-muted">
          {revise
            ? "A targeted fix to the current artifact, applying the checked findings plus your notes."
            : "A fresh take from scratch. Your notes steer it; findings are optional context."}
        </p>

        {findings.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-ink">Apply review findings</p>
            {findings.map((f, i) => (
              <label key={i} className="flex items-start gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={checked[i] ?? false}
                  onChange={(e) => setChecked((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                  className="mt-0.5 size-3.5 accent-accent"
                />
                {f}
              </label>
            ))}
          </div>
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notes to steer this iteration (optional)…"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted"
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={pending}
            className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-ink">
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onSubmit(notes, findings.filter((_, i) => checked[i]))}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-accent hover:bg-ink/90 disabled:opacity-60"
          >
            {pending ? "Working…" : revise ? "Revise" : "Re-render"}
          </button>
        </div>
      </div>
    </div>
  );
}

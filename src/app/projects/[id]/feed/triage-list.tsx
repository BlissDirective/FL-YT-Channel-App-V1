"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Pencil,
  X,
  RefreshCw,
  Upload,
  ScanEye,
  Wand2,
  ChevronRight,
  ChevronDown,
  Loader2,
  ExternalLink,
  Play,
} from "lucide-react";
import type { ProjectTriage, TriageAsset } from "@/lib/db/triage";
import {
  approveGateAction,
  requestRevisionAction,
  killVideoAction,
  resumeVideoAction,
} from "@/lib/actions/pipeline";
import { requestPublishAction } from "@/lib/actions/publish";
import { reReviewVisionAction } from "@/lib/actions/autofix";
import {
  directorAdvanceAction,
  directorRunStageAction,
  directorReviseAction,
  directorRerenderAction,
  directorKillAction,
  directorPublishAction,
} from "@/lib/actions/director";
import { batchApproveAction, batchPublishAction, batchReReviewAction } from "@/lib/actions/triage";
import { cn } from "@/lib/cn";

type ActResult = { ok: boolean; error?: string; warning?: string };
type Mode = "autonomous" | "director";

/** The primary (Enter/A) action for an asset, dispatched by mode + state. */
function primaryAction(
  projectId: string,
  a: TriageAsset,
  m: Mode,
): { label: string; fn: () => Promise<ActResult> } | null {
  const atGate = a.gateLabel != null;
  if (a.bucket === "ready")
    return {
      label: "Publish",
      fn: () => (m === "director" ? directorPublishAction(projectId, a.videoId) : requestPublishAction(projectId, a.videoId)),
    };
  if (m === "director") {
    if (atGate) return { label: "Advance", fn: () => directorAdvanceAction(projectId, a.videoId) };
    const working = ["IDEA_APPROVED", "SCRIPTING", "GENERATING_ASSETS", "ASSEMBLING"].includes(a.status);
    if (working) return { label: "Generate", fn: () => directorRunStageAction(projectId, a.videoId) };
    return { label: "Advance", fn: () => directorAdvanceAction(projectId, a.videoId) };
  }
  if (atGate) return { label: "Approve", fn: () => approveGateAction(projectId, a.videoId) };
  if (a.bucket === "held") return { label: "Resume", fn: () => resumeVideoAction(projectId, a.videoId) };
  return null;
}

/**
 * Feed triage list (rapid asset processing, ideas #1–#5). Buckets of actionable
 * assets, each with a state- and mode-aware inline action bar, multi-select for
 * batch actions, an expandable preview, and keyboard shortcuts. Every action
 * reuses an existing server action — this is pure wiring.
 *
 * Keyboard (desktop): J/↓ next · K/↑ prev · A approve/advance · R revise ·
 * X reject · E expand · Enter open.
 */
export function TriageList({ projectId, triage }: { projectId: string; triage: ProjectTriage }) {
  const router = useRouter();
  const { mode } = triage;
  const flat = triage.buckets.flatMap((b) => b.assets);

  const [pending, startT] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; text: string; tone: "ok" | "err" } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviseFor, setReviseFor] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [focusIdx, setFocusIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const run = useCallback(
    (id: string, label: string, fn: () => Promise<ActResult>) => {
      setBusyId(id);
      startT(async () => {
        setMsg(null);
        const r = await fn();
        setBusyId(null);
        setReviseFor(null);
        setNotes("");
        if (!r.ok) setMsg({ id, text: r.error ?? "Action failed.", tone: "err" });
        else {
          setMsg({ id, text: r.warning ?? `${label} done.`, tone: "ok" });
          router.refresh();
        }
      });
    },
    [router],
  );

  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // ── Keyboard triage (#4) ────────────────────────────────────────────────
  useEffect(() => {
    if (flat.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || pending) return;
      const asset = flat[focusIdx];
      if (["j", "arrowdown"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        setFocusIdx((i) => Math.min(i + 1, flat.length - 1));
      } else if (["k", "arrowup"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        setFocusIdx((i) => Math.max(i - 1, 0));
      } else if (!asset) {
        return;
      } else if (e.key.toLowerCase() === "a") {
        const primary = primaryAction(projectId, asset, mode);
        if (primary) run(asset.videoId, primary.label, primary.fn);
      } else if (e.key.toLowerCase() === "r") {
        setReviseFor(asset.videoId);
        setExpanded(asset.videoId);
      } else if (e.key.toLowerCase() === "x") {
        run(asset.videoId, "Reject", () =>
          mode === "director"
            ? directorKillAction(projectId, asset.videoId)
            : killVideoAction(projectId, asset.videoId),
        );
      } else if (e.key.toLowerCase() === "e") {
        setExpanded((x) => (x === asset.videoId ? null : asset.videoId));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flat, focusIdx, mode, pending, projectId, run]);

  if (flat.length === 0) return null;

  const selectedList = [...selected];

  return (
    <div ref={rootRef} className="space-y-4" data-mode={mode}>
      {/* Batch bar (#3) */}
      {selectedList.length > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-card bg-ink p-3 text-card shadow-float">
          <span className="text-sm font-semibold">{selectedList.length} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <BatchBtn
              label={mode === "director" ? "Advance all at a gate" : "Approve all ≥ 8"}
              onClick={() =>
                run("batch", "Batch approve", async () => {
                  const r = await batchApproveAction(projectId, selectedList, mode === "director" ? 0 : 8);
                  setSelected(new Set());
                  return { ok: r.ok, error: r.error, warning: `Approved ${r.acted}, skipped ${r.skipped}.` };
                })
              }
              pending={pending}
            />
            <BatchBtn
              label="Re-review selected"
              onClick={() =>
                run("batch", "Batch re-review", async () => {
                  const r = await batchReReviewAction(projectId, selectedList);
                  return { ok: r.ok, error: r.error, warning: `Re-reviewed ${r.acted}, skipped ${r.skipped}.` };
                })
              }
              pending={pending}
            />
            <BatchBtn
              label="Publish all ready"
              onClick={() =>
                run("batch", "Batch publish", async () => {
                  const r = await batchPublishAction(projectId, selectedList);
                  setSelected(new Set());
                  return { ok: r.ok, error: r.error, warning: `Published ${r.acted}, skipped ${r.skipped}.` };
                })
              }
              pending={pending}
            />
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-card/70 hover:text-card"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {msg?.id === "batch" && (
        <p className={cn("text-xs font-medium", msg.tone === "err" ? "text-coral" : "text-emerald-600")}>{msg.text}</p>
      )}

      {triage.buckets.map((bucket) => (
        <section key={bucket.key} className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight">{bucket.label}</h2>
            <span className="rounded-full bg-card-warm px-2 py-0.5 text-[11px] font-semibold text-muted">
              {bucket.assets.length}
            </span>
          </div>
          <ul className="space-y-2">
            {bucket.assets.map((a) => {
              const globalIdx = flat.findIndex((x) => x.videoId === a.videoId);
              return (
                <TriageRow
                  key={a.videoId}
                  projectId={projectId}
                  asset={a}
                  mode={mode}
                  focused={globalIdx === focusIdx}
                  selected={selected.has(a.videoId)}
                  onSelect={() => toggleSel(a.videoId)}
                  expanded={expanded === a.videoId}
                  onExpand={() => setExpanded((x) => (x === a.videoId ? null : a.videoId))}
                  reviseOpen={reviseFor === a.videoId}
                  onReviseOpen={(open) => setReviseFor(open ? a.videoId : null)}
                  notes={reviseFor === a.videoId ? notes : ""}
                  onNotes={setNotes}
                  busy={busyId === a.videoId}
                  pending={pending}
                  msg={msg?.id === a.videoId ? msg : null}
                  primary={primaryAction(projectId, a, mode)}
                  run={run}
                />
              );
            })}
          </ul>
        </section>
      ))}

      <p className="pt-1 text-[11px] text-muted">
        Keyboard: <kbd>J/K</kbd> move · <kbd>A</kbd> approve · <kbd>R</kbd> revise · <kbd>X</kbd> reject · <kbd>E</kbd> expand
      </p>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────
function TriageRow({
  projectId,
  asset: a,
  mode,
  focused,
  selected,
  onSelect,
  expanded,
  onExpand,
  reviseOpen,
  onReviseOpen,
  notes,
  onNotes,
  busy,
  pending,
  msg,
  primary,
  run,
}: {
  projectId: string;
  asset: TriageAsset;
  mode: Mode;
  focused: boolean;
  selected: boolean;
  onSelect: () => void;
  expanded: boolean;
  onExpand: () => void;
  reviseOpen: boolean;
  onReviseOpen: (open: boolean) => void;
  notes: string;
  onNotes: (v: string) => void;
  busy: boolean;
  pending: boolean;
  msg: { text: string; tone: "ok" | "err" } | null;
  primary: { label: string; fn: () => Promise<ActResult> } | null;
  run: (id: string, label: string, fn: () => Promise<ActResult>) => void;
}) {
  const href = `/projects/${projectId}/videos/${a.videoId}`;
  const reject = () =>
    run(a.videoId, "Reject", () =>
      mode === "director" ? directorKillAction(projectId, a.videoId) : killVideoAction(projectId, a.videoId),
    );
  const rerender = () =>
    run(a.videoId, "Re-render", () =>
      mode === "director"
        ? directorRerenderAction(projectId, a.videoId, { notes })
        : // autonomous held → resume the pipeline
          resumeVideoAction(projectId, a.videoId),
    );
  const revise = () =>
    run(a.videoId, "Revise", () =>
      mode === "director"
        ? directorReviseAction(projectId, a.videoId, { notes })
        : requestRevisionAction(projectId, a.videoId, notes || "Please revise."),
    );

  return (
    <li
      className={cn(
        "rounded-card bg-card p-3 shadow-card transition-shadow",
        focused && "ring-2 ring-accent/60",
      )}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="size-4 shrink-0 accent-accent"
          aria-label={`Select ${a.title}`}
        />
        <button type="button" onClick={onExpand} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold">{a.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
            <span className="rounded-full bg-canvas px-2 py-0.5 font-semibold capitalize">{a.stage}</span>
            {a.gateLabel && <span>{a.gateLabel}</span>}
            {a.qcScore != null && (
              <span className={cn("font-semibold", a.qcScore < 7 ? "text-amber-600" : "text-emerald-600")}>
                QC {a.qcScore.toFixed(1)}
              </span>
            )}
            <span>${a.spendUsd.toFixed(2)}</span>
            {a.reason && <span className="truncate">· {a.reason}</span>}
          </div>
        </button>
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted" />
        )}
      </div>

      {/* Action bar (#1) */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {primary && (
          <RowBtn
            label={primary.label}
            icon={primary.label === "Publish" ? Upload : primary.label === "Generate" ? Wand2 : primary.label === "Resume" ? Play : Check}
            tone="primary"
            busy={busy}
            pending={pending}
            onClick={() => run(a.videoId, primary.label, primary.fn)}
          />
        )}
        <RowBtn label="Revise" icon={Pencil} busy={busy} pending={pending} onClick={() => onReviseOpen(!reviseOpen)} />
        {(mode === "director" || a.bucket === "held" || a.bucket === "failed") && (
          <RowBtn label={mode === "director" ? "Re-render" : "Resume"} icon={RefreshCw} busy={busy} pending={pending} onClick={rerender} />
        )}
        <RowBtn label="Re-review" icon={ScanEye} busy={busy} pending={pending} onClick={() => run(a.videoId, "Re-review", () => reReviewVisionAction(projectId, a.videoId))} />
        <RowBtn label="Reject" icon={X} tone="danger" busy={busy} pending={pending} onClick={reject} />
        <Link href={href} className="ml-auto flex items-center gap-1 self-center text-[11px] font-semibold text-accent">
          Open <ExternalLink className="size-3" />
        </Link>
      </div>

      {reviseOpen && (
        <div className="mt-2 space-y-1.5">
          <textarea
            value={notes}
            onChange={(e) => onNotes(e.target.value)}
            rows={2}
            placeholder="Revision notes (steer the agent)…"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted"
          />
          <div className="flex gap-1.5">
            <RowBtn label="Send revision" icon={Pencil} tone="primary" busy={busy} pending={pending} onClick={revise} />
            <button type="button" onClick={() => onReviseOpen(false)} className="text-xs font-semibold text-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Expanded preview (#5) */}
      {expanded && (
        <div className="mt-3 flex gap-3 border-t border-line pt-3">
          <div className="aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-card-warm to-accent-soft">
            {a.thumbUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL, short-lived
              <img src={a.thumbUrl} alt="" className="size-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1 text-xs text-muted">
            <p className="font-semibold capitalize text-ink">{a.stage} stage · {a.kind}</p>
            {a.reason && <p className="mt-1">{a.reason}</p>}
            {a.qcScore != null && <p className="mt-1">Latest QC: {a.qcScore.toFixed(1)}/10</p>}
            <Link href={href} className="mt-1 inline-flex items-center gap-1 font-semibold text-accent">
              Open the asset canvas <ExternalLink className="size-3" />
            </Link>
          </div>
        </div>
      )}

      {msg && (
        <p className={cn("mt-1.5 text-xs font-medium", msg.tone === "err" ? "text-coral" : "text-emerald-600")}>{msg.text}</p>
      )}
    </li>
  );
}

function RowBtn({
  label, icon: Icon, onClick, busy, pending, tone = "default",
}: {
  label: string;
  icon: typeof Check;
  onClick: () => void;
  busy: boolean;
  pending: boolean;
  tone?: "default" | "primary" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50",
        tone === "primary" && "bg-ink text-card hover:opacity-90",
        tone === "danger" && "bg-red-50 text-red-700 hover:bg-red-100",
        tone === "default" && "bg-canvas text-ink hover:bg-accent-soft",
      )}
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : <Icon className="size-3" />}
      {label}
    </button>
  );
}

function BatchBtn({ label, onClick, pending }: { label: string; onClick: () => void; pending: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accent-soft disabled:opacity-50"
    >
      {label}
    </button>
  );
}

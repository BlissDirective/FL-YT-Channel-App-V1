"use client";

/**
 * The Workspace (ClickMax transition §3, Phase 2): one surface — stage rail,
 * card stream + chat thread, Continue, and the glass composer. Chat is the
 * main driver (§3.1): every message routes through the intent router to the
 * action registry; the buttons on cards invoke the SAME registered actions.
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  Image as ImageIcon,
  Lightbulb,
  Mic,
  Pencil,
  RefreshCw,
  ScrollText,
  Send,
  Sparkles,
  Video as VideoIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { ProgressRail } from "@/components/ui/progress-rail";
import { PillTabs } from "@/components/ui/pill-tabs";
import {
  confirmComposerAction,
  continueStageAction,
  saveInstructionsAction,
  sendComposerMessage,
  setWorkspaceModeAction,
  type ComposerResult,
} from "@/lib/actions/workspace";
import type { ComposerMode } from "@/lib/workspace/router";

export type WsBeat = {
  idx: number;
  text: string;
  visualPrompt?: string;
  shotType?: string;
  voUrl: string | null;
  voStale: boolean;
  visualUrl: string | null;
  visualKind: "clip" | "still" | null;
  visualStale: boolean;
  visualProvider: string | null;
  qc?: { score: number | null; verdict: string | null; issues: string[] } | null;
};

export type WsMessage = {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  createdAt: string;
};

export type WsModel = {
  id: string;
  label: string;
  badge: string | null;
  unitUsd: number;
  unit: string;
  pros: string[];
  durations?: number[];
  minDurationSec?: number;
  maxDurationSec?: number;
};

export type WorkspaceProps = {
  projectId: string;
  projectName: string;
  videoId: string;
  videoTitle: string;
  status: string;
  pausedReason: string | null;
  atGate: boolean;
  gateLabel: string | null;
  railIndex: number;
  railSteps: readonly { key: string; label: string }[];
  workspaceMode: "director" | "autopilot";
  instructions: string;
  spendUsd: number;
  continueEstimateUsd: number;
  nextStageLabel: string | null;
  beats: WsBeat[];
  renders: { id: string; url: string | null; kind: string }[];
  thumbs: { id: string; url: string | null }[];
  messages: WsMessage[];
  videoModels: WsModel[];
  classicHref: string;
};

const MODES: { value: ComposerMode; label: React.ReactNode }[] = [
  { value: "idea", label: <span className="flex items-center gap-1"><Lightbulb className="h-3.5 w-3.5" /> Idea</span> },
  { value: "script", label: <span className="flex items-center gap-1"><ScrollText className="h-3.5 w-3.5" /> Script</span> },
  { value: "image", label: <span className="flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> Image</span> },
  { value: "video", label: <span className="flex items-center gap-1"><VideoIcon className="h-3.5 w-3.5" /> Video</span> },
  { value: "voice", label: <span className="flex items-center gap-1"><Mic className="h-3.5 w-3.5" /> Voice</span> },
];

const PLACEHOLDERS: Record<ComposerMode, string> = {
  idea: "Paste a title or idea, e.g. “What If You Grew Up on Mars”…",
  script: "What should this video be about? Or ask for changes…",
  image: "Describe the thumbnail or scene…",
  video: "Describe the scene, or “generate beat 4, 8 seconds”…",
  voice: "Name the beat to re-take, e.g. “new take for beat 2”…",
};

export function WorkspaceView(props: WorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<ComposerMode>(props.atGate || props.beats.length > 0 ? "script" : "idea");
  const [text, setText] = useState("");
  const [modelId, setModelId] = useState(props.videoModels[0]?.id ?? "");
  const [durationSec, setDurationSec] = useState(5);
  const [focused, setFocused] = useState<{ kind: string; beatIdx?: number } | null>(null);
  const [thread, setThread] = useState<WsMessage[]>(props.messages);
  const [pending, setPending] = useState<ComposerResult["pending"] | null>(null);
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [instructions, setInstructions] = useState(props.instructions);
  const threadEnd = useRef<HTMLDivElement>(null);

  const appendLocal = (role: WsMessage["role"], content: string) => {
    setThread((t) => [
      ...t,
      { id: `local-${Date.now()}-${Math.random()}`, role, content, createdAt: new Date().toISOString() },
    ]);
    setTimeout(() => threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  };

  const handleResult = (r: ComposerResult) => {
    if (r.reply) appendLocal("agent", r.reply);
    else if (r.error) appendLocal("agent", `Something went wrong: ${r.error}`);
    setPending(r.pending ?? null);
    router.refresh();
  };

  const send = () => {
    const message = text.trim();
    if (!message || isPending) return;
    appendLocal("user", message);
    setText("");
    startTransition(async () => {
      const r = await sendComposerMessage({
        projectId: props.projectId,
        videoId: props.videoId,
        text: message,
        mode,
        focused,
        modelId: mode === "video" ? modelId : undefined,
        durationSec: mode === "video" ? durationSec : undefined,
      });
      handleResult(r);
    });
  };

  const confirm = () => {
    if (!pending) return;
    const p = pending;
    setPending(null);
    startTransition(async () => {
      const r = await confirmComposerAction({
        projectId: props.projectId,
        videoId: props.videoId,
        action: p.action,
        params: p.params,
      });
      handleResult(r);
    });
  };

  const runContinue = () => {
    startTransition(async () => {
      appendLocal("agent", props.atGate ? "Approving this stage and continuing…" : "Running the next stage…");
      const r = await continueStageAction({ projectId: props.projectId, videoId: props.videoId });
      if (!r.ok) appendLocal("agent", `Continue failed: ${r.error}`);
      router.refresh();
    });
  };

  const quickAction = (message: string, focus?: { kind: string; beatIdx?: number }) => {
    if (focus) setFocused(focus);
    appendLocal("user", message);
    startTransition(async () => {
      const r = await sendComposerMessage({
        projectId: props.projectId,
        videoId: props.videoId,
        text: message,
        mode,
        focused: focus ?? focused,
      });
      handleResult(r);
    });
  };

  const selectedModel = props.videoModels.find((m) => m.id === modelId);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 pb-40 pt-2">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">{props.videoTitle}</h1>
          <p className="text-xs text-muted">{props.projectName}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip tone={props.pausedReason ? "warning" : "neutral"}>
            {props.status.replace(/_/g, " ").toLowerCase()}
          </StatusChip>
          <PillTabs
            size="sm"
            ariaLabel="Workspace mode"
            options={[
              { value: "director", label: "Director" },
              { value: "autopilot", label: "Autopilot" },
            ]}
            value={props.workspaceMode}
            onChange={(v) =>
              startTransition(async () => {
                await setWorkspaceModeAction({ projectId: props.projectId, mode: v as "director" | "autopilot" });
                router.refresh();
              })
            }
          />
          <span className="text-xs font-semibold tabular-nums text-muted">
            ${props.spendUsd.toFixed(2)} spent
          </span>
          <a href={props.classicHref} className="text-xs text-muted underline decoration-dotted hover:text-ink">
            classic view
          </a>
        </div>
      </div>

      <ProgressRail steps={props.railSteps as never} current={props.railIndex} />

      {props.pausedReason && (
        <Card className="border-coral/40">
          <p className="text-sm text-coral">{props.pausedReason}</p>
        </Card>
      )}

      {/* ── Project instructions (§4.6) ────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Project instructions</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (editingInstructions) {
                startTransition(async () => {
                  await saveInstructionsAction({ projectId: props.projectId, instructions });
                  router.refresh();
                });
              }
              setEditingInstructions((e) => !e);
            }}
          >
            {editingInstructions ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            {editingInstructions ? "Save" : "Edit"}
          </Button>
        </div>
        {editingInstructions ? (
          <textarea
            className="mt-2 w-full rounded-xl border border-line bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            rows={3}
            placeholder="Tone, recurring colors, audience, pacing style, visual references…"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        ) : (
          <p className="mt-1 text-sm text-muted">
            {instructions || "Tone, recurring colors, audience, pacing — fed into every prompt."}
          </p>
        )}
      </Card>

      {/* ── Beat cards (§3.3) ──────────────────────────────────── */}
      {props.beats.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {props.beats.map((b) => (
            <Card
              key={b.idx}
              className={`cursor-pointer transition-shadow ${focused?.beatIdx === b.idx ? "ring-2 ring-accent" : ""}`}
              onClick={() =>
                setFocused(focused?.beatIdx === b.idx ? null : { kind: "clip", beatIdx: b.idx })
              }
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">
                  Beat {b.idx + 1}
                  {b.shotType ? ` · ${b.shotType}` : ""}
                </span>
                <span className="flex items-center gap-1">
                  {(b.voStale || b.visualStale) && <StatusChip tone="warning">stale</StatusChip>}
                  {b.qc &&
                    (b.qc.issues.length > 0 ? (
                      <span title={b.qc.issues.join("\n")}>
                        <StatusChip tone="warning">QC ⚠</StatusChip>
                      </span>
                    ) : (
                      <StatusChip tone="success">QC ✓</StatusChip>
                    ))}
                </span>
              </div>
              {b.visualUrl && (
                <div className="mt-2 overflow-hidden rounded-lg border border-line">
                  {b.visualKind === "clip" && b.visualUrl.includes(".mp4") ? (
                    <video src={b.visualUrl} className="aspect-video w-full object-cover" controls preload="none" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.visualUrl} alt={`Beat ${b.idx + 1} visual`} className="aspect-video w-full object-cover" />
                  )}
                </div>
              )}
              <p className="mt-2 line-clamp-3 text-sm">{b.text}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {b.voUrl && (
                  <audio src={b.voUrl} controls preload="none" className="h-8 max-w-[180px]" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => quickAction(`regenerate beat ${b.idx + 1} visual`, { kind: "clip", beatIdx: b.idx })}
                >
                  <RefreshCw className="h-3 w-3" /> Visual
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => quickAction(`new VO take for beat ${b.idx + 1}`, { kind: "vo", beatIdx: b.idx })}
                >
                  <AudioLines className="h-3 w-3" /> VO take
                </Button>
                {b.qc && b.qc.issues.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isPending}
                    onClick={() => quickAction("auto-fix the flagged issues")}
                  >
                    <Sparkles className="h-3 w-3" /> Auto-fix
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Renders & thumbnails ───────────────────────────────── */}
      {(props.renders.length > 0 || props.thumbs.length > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {props.renders.map((r) =>
            r.url ? (
              <Card key={r.id}>
                <span className="text-xs font-bold uppercase tracking-wide text-muted">Render</span>
                <video src={r.url} controls preload="none" className="mt-1 aspect-video w-full rounded-lg object-cover" />
              </Card>
            ) : null,
          )}
          {props.thumbs.map((t) =>
            t.url ? (
              <Card key={t.id}>
                <span className="text-xs font-bold uppercase tracking-wide text-muted">Thumbnail</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.url} alt="Thumbnail" className="mt-1 aspect-video w-full rounded-lg object-cover" />
              </Card>
            ) : null,
          )}
        </div>
      )}

      {/* ── Thread ─────────────────────────────────────────────── */}
      {thread.length > 0 && (
        <div className="flex flex-col gap-2">
          {thread.slice(-30).map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-card ${
                m.role === "user"
                  ? "self-end bg-accent text-on-accent"
                  : "self-start border border-line bg-card"
              }`}
            >
              {m.content}
            </div>
          ))}
          <div ref={threadEnd} />
        </div>
      )}

      {/* ── Continue (§3.4) + pending confirm ──────────────────── */}
      {pending ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-accent/60">
          <p className="text-sm">
            {pending.label} — <span className="font-semibold">~${pending.estimateUsd.toFixed(2)}</span>
          </p>
          <div className="flex gap-2">
            <Button size="sm" disabled={isPending} onClick={confirm}>
              <Sparkles className="h-3.5 w-3.5" /> Go ahead
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        props.nextStageLabel && (
          <div className="flex justify-center">
            <Button disabled={isPending} onClick={runContinue}>
              Continue → {props.nextStageLabel}
              {props.continueEstimateUsd > 0 && (
                <span className="opacity-80">· ~${props.continueEstimateUsd.toFixed(2)}</span>
              )}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )
      )}

      {/* ── Composer (§3.1/§3.2) ───────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center gap-2">
            <PillTabs
              size="sm"
              ariaLabel="Composer mode"
              options={MODES}
              value={mode}
              onChange={(v) => setMode(v as ComposerMode)}
            />
            {mode === "video" && (
              <>
                <select
                  className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  aria-label="Video model"
                >
                  {props.videoModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                      {m.badge ? ` · ${m.badge}` : ""} (${m.unitUsd.toFixed(3)}/s)
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold"
                  value={durationSec}
                  onChange={(e) => setDurationSec(Number(e.target.value))}
                  aria-label="Clip duration"
                >
                  {(selectedModel?.durations ?? [4, 5, 8, 10]).map((d) => (
                    <option key={d} value={d}>
                      {d}s
                    </option>
                  ))}
                </select>
              </>
            )}
            {focused?.beatIdx != null && (
              <button
                className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold"
                onClick={() => setFocused(null)}
                title="Click to clear focus"
              >
                Editing: beat {focused.beatIdx + 1} ✕
              </button>
            )}
          </div>
          <div className="mt-2 flex items-end gap-2">
            <textarea
              className="max-h-32 min-h-[44px] w-full resize-y rounded-2xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
              rows={1}
              placeholder={PLACEHOLDERS[mode]}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button disabled={isPending || !text.trim()} onClick={send} aria-label="Send">
              {mode === "video" && selectedModel ? (
                <span className="text-xs tabular-nums">
                  ~${(selectedModel.unitUsd * durationSec).toFixed(2)}
                </span>
              ) : null}
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {props.workspaceMode === "autopilot" && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">
              <ArrowUpRight className="h-3 w-3" /> Autopilot is on — stages auto-approve on QC; you&apos;ll be notified at
              milestones.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

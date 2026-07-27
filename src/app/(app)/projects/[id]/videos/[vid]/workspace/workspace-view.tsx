"use client";

/**
 * The Workspace (ClickMax transition §3, Phase 2): one surface — stage rail,
 * card stream + chat thread, Continue, and the glass composer. Chat is the
 * main driver (§3.1): every message routes through the intent router to the
 * action registry; the buttons on cards invoke the SAME registered actions.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronDown,
  Image as ImageIcon,
  Lightbulb,
  Mic,
  Pencil,
  RefreshCw,
  ScrollText,
  Send,
  Sparkles,
  UserRound,
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
  setBeatCastAction,
  setWorkspaceModeAction,
  type ComposerResult,
} from "@/lib/actions/workspace";
import { setVideoStyleAction } from "@/lib/actions/characters";
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
  /** Character Studio Phase 3: who the matcher put in this frame, and the
      baseline it decided on its own (so corrections can be expressed as a diff
      that survives later edits to the beat text). Null = project has no cast. */
  cast?: {
    matchedIds: string[];
    ids: string[];
    names: string[];
    droppedNames: string[];
  } | null;
};

export type WsCastOption = { id: string; name: string; status: string };

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
  /** The project's cast, for the per-beat chips. Empty = no cast. */
  castOptions?: WsCastOption[];
  /** The project's art styles (Phase 4). Shown only when there's a choice. */
  styles?: { id: string; name: string; isDefault: boolean }[];
  /** Which style THIS video renders in; null = the project default. */
  styleId?: string | null;
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

  // Handoff from the library's "Start anything" composer: it created this video
  // and stashed the prompt, then redirected here. Replay it once through the
  // normal composer so the writing happens live in this chat (not on a spinner
  // back on the library page).
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let startText: string | null = null;
    try {
      const key = `mm:start:${props.videoId}`;
      startText = sessionStorage.getItem(key);
      if (startText) sessionStorage.removeItem(key);
    } catch {
      /* storage unavailable — nothing to replay */
    }
    if (startText && startText.trim()) quickAction(startText.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.videoId]);

  const selectedModel = props.videoModels.find((m) => m.id === modelId);

  // De-clutter pass: beats collapse to one-line rows (tap to expand the full
  // script text + visual direction); instructions collapse to a disclosure.
  const [expandedBeat, setExpandedBeat] = useState<number | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  // Dictation (§4.6 polish): browser speech-to-text into the composer.
  const [dictating, setDictating] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const toggleDictation = () => {
    if (dictating) {
      recognitionRef.current?.stop();
      setDictating(false);
      return;
    }
    type SpeechCtor = new () => {
      lang: string;
      interimResults: boolean;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
      onend: () => void;
      onerror: () => void;
      start: () => void;
      stop: () => void;
    };
    const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      appendLocal("agent", "Voice input isn't supported in this browser.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      if (last?.isFinal && last[0]) setText((t) => (t ? `${t} ` : "") + last[0].transcript);
    };
    rec.onend = () => setDictating(false);
    rec.onerror = () => setDictating(false);
    recognitionRef.current = rec;
    setDictating(true);
    rec.start();
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 pb-64 pt-2 sm:pb-44">
      {/* ── Header (compact: title + status; controls on one thin row) ── */}
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 truncate text-lg font-bold tracking-tight sm:text-xl">
            {props.videoTitle}
          </h1>
          <StatusChip tone={props.pausedReason ? "warning" : "neutral"}>
            {props.status.replace(/_/g, " ").toLowerCase()}
          </StatusChip>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
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

      {/* Multi-style switcher (Phase 4): only shown when there's a real choice.
          One cast, two looks — this is the control that makes an art-direction
          A/B a per-video decision instead of a second project. */}
      {(props.styles?.length ?? 0) > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted">Art style</span>
          <select
            className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold"
            value={props.styleId ?? ""}
            disabled={isPending}
            aria-label="Art style for this video"
            onChange={(e) => {
              const next = e.target.value || null;
              startTransition(async () => {
                const r = await setVideoStyleAction({
                  projectId: props.projectId,
                  videoId: props.videoId,
                  styleId: next,
                });
                appendLocal(
                  "agent",
                  r.ok
                    ? `Switched to ${props.styles?.find((s) => s.id === next)?.name ?? "the project default"}. Existing visuals were made in the old style — re-roll the ones you want restyled.`
                    : `Couldn't switch style: ${r.error}`,
                );
                router.refresh();
              });
            }}
          >
            <option value="">Project default</option>
            {props.styles?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Trust-the-chat: holds/pauses arrive as thread messages (engine posts
          them; the page injects a virtual one for pre-existing pauses) — no
          persistent banner. The header status chip still tints amber. */}

      {/* ── Project instructions: a one-line disclosure, not a card ───── */}
      <div>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 text-left text-xs font-semibold text-muted hover:text-ink"
          onClick={() => setShowInstructions((s) => !s)}
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showInstructions ? "" : "-rotate-90"}`} />
          Project instructions
          {!showInstructions && instructions && (
            <span className="min-w-0 flex-1 truncate font-normal">— {instructions}</span>
          )}
        </button>
        {showInstructions && (
          <Card className="mt-2">
            <div className="flex items-center justify-end">
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
                className="mt-1 w-full rounded-xl border border-line bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                rows={3}
                placeholder="Tone, recurring colors, audience, pacing style, visual references…"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            ) : (
              <p className="text-sm text-muted">
                {instructions || "Tone, recurring colors, audience, pacing — fed into every prompt."}
              </p>
            )}
          </Card>
        )}
      </div>

      {/* ── Empty state ────────────────────────────────────────── */}
      {props.beats.length === 0 && thread.length === 0 && (
        <Card className="py-10 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-muted" />
          <p className="mt-2 text-sm font-semibold">
            {props.atGate ? "This idea is waiting on you." : "Nothing here yet."}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            {props.atGate
              ? "Say “continue” (or press Continue) to write the script — or tell me what to change first."
              : "Type below to drive everything: an idea, “continue”, “redo beat 3 with warmer light”, “what has this cost?”…"}
          </p>
        </Card>
      )}

      {/* ── Script: compact beat rows; tap a row to read the FULL beat,
             its visual direction, its visual, and its actions ─────────── */}
      {props.beats.length > 0 && (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              Script · {props.beats.length} beats
            </span>
            <button
              type="button"
              className="text-xs text-muted underline decoration-dotted hover:text-ink"
              onClick={() => setExpandedBeat(expandedBeat === -1 ? null : -1)}
            >
              {expandedBeat === -1 ? "Collapse all" : "Read full script"}
            </button>
          </div>
          <div className="divide-y divide-line">
            {props.beats.map((b) => {
              const open = expandedBeat === -1 || expandedBeat === b.idx;
              return (
                <div key={b.idx} className={focused?.beatIdx === b.idx ? "bg-accent-soft/40" : ""}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
                    onClick={() => setExpandedBeat(open && expandedBeat !== -1 ? null : b.idx)}
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${open ? "" : "-rotate-90"}`}
                    />
                    <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-muted">
                      {b.idx + 1}
                      {b.shotType ? ` · ${b.shotType}` : ""}
                    </span>
                    {!open && <span className="min-w-0 flex-1 truncate text-sm">{b.text}</span>}
                    <span className="ml-auto flex shrink-0 items-center gap-1">
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
                  </button>
                  {open && (
                    <div className="space-y-3 px-4 pb-4 pl-10">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{b.text}</p>
                      {b.visualPrompt && (
                        <p className="rounded-lg bg-raised/40 px-3 py-2 text-xs text-muted">
                          <span className="font-semibold text-ink">Visual direction:</span> {b.visualPrompt}
                        </p>
                      )}
                      {b.cast && (
                        <CastChips
                          beat={b}
                          options={props.castOptions ?? []}
                          disabled={isPending}
                          onChange={(add, remove) => {
                            startTransition(async () => {
                              const r = await setBeatCastAction({
                                projectId: props.projectId,
                                videoId: props.videoId,
                                beatIdx: b.idx,
                                add,
                                remove,
                              });
                              if (!r.ok) appendLocal("agent", `Couldn't change the cast: ${r.error}`);
                              router.refresh();
                            });
                          }}
                        />
                      )}
                      {b.visualUrl ? (
                        <div className="overflow-hidden rounded-lg border border-line">
                          {b.visualKind === "clip" && b.visualUrl.includes(".mp4") ? (
                            <video src={b.visualUrl} className="aspect-video w-full object-cover" controls preload="none" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.visualUrl} alt={`Beat ${b.idx + 1} visual`} className="aspect-video w-full object-cover" />
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted">
                          No visual generated yet — it&apos;s created at the Assets stage, or ask for one now
                          (&ldquo;generate beat {b.idx + 1}&rdquo;).
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        {b.voUrl && (
                          <audio src={b.voUrl} controls preload="none" className="h-8 max-w-[200px]" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          title="Re-generate this beat's image/clip (a fresh roll of the visual — costs a few cents)"
                          onClick={() => quickAction(`regenerate beat ${b.idx + 1} visual`, { kind: "clip", beatIdx: b.idx })}
                        >
                          <RefreshCw className="h-3 w-3" /> Redo visual
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          title="Re-record this beat's narration as a fresh voiceover take"
                          onClick={() => quickAction(`new VO take for beat ${b.idx + 1}`, { kind: "vo", beatIdx: b.idx })}
                        >
                          <AudioLines className="h-3 w-3" /> New VO
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          title="Render this beat as a talking-presenter avatar shot (uses the project's presenter image + this beat's VO)"
                          onClick={() => quickAction(`make beat ${b.idx + 1} an avatar shot`, { kind: "clip", beatIdx: b.idx })}
                        >
                          <UserRound className="h-3 w-3" /> Avatar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          title="Point the chat at this beat — your next message edits it"
                          onClick={() =>
                            setFocused(focused?.beatIdx === b.idx ? null : { kind: "clip", beatIdx: b.idx })
                          }
                        >
                          {focused?.beatIdx === b.idx ? "Unfocus" : "Chat about this"}
                        </Button>
                        {b.qc && b.qc.issues.length > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={isPending}
                            title="QC flagged issues — run one repair pass"
                            onClick={() => quickAction("auto-fix the flagged issues")}
                          >
                            <Sparkles className="h-3 w-3" /> Auto-fix
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
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
      {/* Sits ABOVE the mobile bottom-nav (which is fixed bottom-0 sm:hidden);
          on desktop it drops back to the true bottom edge. */}
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 border-t border-line bg-card/95 px-4 py-3 backdrop-blur sm:bottom-0">
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
            <Button
              variant="ghost"
              disabled={isPending}
              onClick={toggleDictation}
              aria-label={dictating ? "Stop dictation" : "Dictate prompt"}
              title={dictating ? "Stop dictation" : "Dictate prompt (uses your microphone)"}
              className={dictating ? "ring-2 ring-coral" : ""}
            >
              <Mic className="h-4 w-4" />
            </Button>
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

/**
 * Per-beat cast chips (Character Studio §4.4).
 *
 * The auto-matcher is a strong default, not an oracle: a short name that is
 * also an ordinary word will match it, and a scene can be about someone the
 * text never names. Both are one tap here, and — critically — the chips show
 * BEFORE anything is rendered, so a wrong guess costs a tap rather than an
 * image.
 *
 * Corrections are stored as a diff against what the matcher found on its own,
 * so they still mean the right thing after the beat's text is edited.
 */
function CastChips({
  beat,
  options,
  disabled,
  onChange,
}: {
  beat: WsBeat;
  options: WsCastOption[];
  disabled?: boolean;
  onChange: (add: string[], remove: string[]) => void;
}) {
  const cast = beat.cast;
  const [picking, setPicking] = useState(false);
  if (!cast) return null;

  const matched = new Set(cast.matchedIds);
  /** Turn "the set I want" into add/remove relative to the matcher. */
  const commit = (desired: string[]) => {
    const want = new Set(desired);
    onChange(
      desired.filter((id) => !matched.has(id)),
      cast.matchedIds.filter((id) => !want.has(id)),
    );
  };
  const absent = options.filter((o) => !cast.ids.includes(o.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">In frame</span>
      {cast.names.length === 0 && <span className="text-xs text-muted">nobody</span>}
      {cast.ids.map((id, i) => (
        <span
          key={id}
          className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold"
        >
          {cast.names[i]}
          <button
            type="button"
            aria-label={`Remove ${cast.names[i]} from beat ${beat.idx + 1}`}
            disabled={disabled}
            className="text-muted hover:text-coral"
            onClick={() => commit(cast.ids.filter((x) => x !== id))}
          >
            ✕
          </button>
        </span>
      ))}
      {absent.length > 0 &&
        (picking ? (
          <select
            autoFocus
            className="rounded-full border border-line bg-card px-2 py-0.5 text-xs font-semibold"
            defaultValue=""
            aria-label={`Add a character to beat ${beat.idx + 1}`}
            onChange={(e) => {
              if (e.target.value) commit([...cast.ids, e.target.value]);
              setPicking(false);
            }}
            onBlur={() => setPicking(false)}
          >
            <option value="">Pick someone…</option>
            {absent.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.status === "draft" ? " (draft)" : ""}
              </option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            disabled={disabled}
            className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-muted hover:text-ink"
            onClick={() => setPicking(true)}
          >
            + add
          </button>
        ))}
      {cast.droppedNames.length > 0 && (
        <span
          className="text-[11px] text-muted"
          title="Matched but cut to keep the frame coherent — add them back if this beat is really about them."
        >
          left out: {cast.droppedNames.join(", ")}
        </span>
      )}
    </div>
  );
}

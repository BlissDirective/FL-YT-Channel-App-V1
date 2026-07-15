"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { REMIX_BRIEF_KEY } from "@/lib/remix-brief";
import { Check, Loader2, Sparkles, Wand2, X } from "lucide-react";
import type { ScriptBeat } from "@/lib/db/types";
import type { RemixSettings, ScriptRemix } from "@/lib/adapters/script";
import {
  applyScriptRemixAction,
  editScriptBeatAction,
  remixBeatAction,
  remixScriptAction,
} from "@/lib/actions/pipeline";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const TONES = ["", "authoritative", "curious", "alarming", "calm", "aspirational", "energetic / hype"];
const VERBIAGE = [
  { v: "keep", label: "Keep" },
  { v: "simple", label: "Plain-spoken" },
  { v: "conversational", label: "Conversational" },
  { v: "sophisticated", label: "Sophisticated" },
  { v: "technical", label: "Technical" },
];
const LENGTH = [
  { v: "keep", label: "Keep" },
  { v: "tighten", label: "Tighten" },
  { v: "expand", label: "Expand" },
  { v: "punchier", label: "Punchier" },
  { v: "detailed", label: "More detail" },
];

type Msg = { role: "user" | "assistant"; text: string };
type Proposal =
  | { kind: "script"; remix: ScriptRemix }
  | { kind: "beat"; idx: number; beat: ScriptBeat; oldText: string }
  | null;

export function ScriptRemix({
  projectId,
  videoId,
  beats,
}: {
  projectId: string;
  videoId: string;
  beats: ScriptBeat[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Settings
  const [creativity, setCreativity] = useState(0.5);
  const [tone, setTone] = useState("");
  const [verbiage, setVerbiage] = useState("keep");
  const [length, setLength] = useState("keep");
  const [target, setTarget] = useState<"all" | number>("all");

  // Ephemeral chat + the current proposal awaiting accept/discard
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [proposal, setProposal] = useState<Proposal>(null);
  const [pending, startTransition] = useTransition();
  const [applying, startApply] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const settings = (): RemixSettings => ({
    creativity,
    toneOverride: tone || undefined,
    verbiage,
    length,
  });

  const say = (m: Msg) => setMessages((prev) => [...prev, m]);

  // Pre-load a brief handed over from Market Intelligence → open + prefill once.
  useEffect(() => {
    const brief = sessionStorage.getItem(REMIX_BRIEF_KEY);
    if (brief) {
      setOpen(true);
      setInput(
        `Remix this script using my market research below. Keep it original.\n\n${brief}`,
      );
      sessionStorage.removeItem(REMIX_BRIEF_KEY);
    }
  }, []);

  const send = () => {
    const note = input.trim();
    if (!note || pending) return;
    // Accumulate prior operator notes so a follow-up refines, not resets.
    const history = messages.filter((m) => m.role === "user").map((m) => m.text);
    const notes = [...history, note].join("\n");
    say({ role: "user", text: note });
    setInput("");
    setProposal(null);

    startTransition(async () => {
      if (target === "all") {
        const r = await remixScriptAction(projectId, videoId, notes, settings());
        if (r.ok) {
          say({ role: "assistant", text: r.remix.changeSummary });
          setProposal({ kind: "script", remix: r.remix });
        } else {
          say({ role: "assistant", text: `⚠️ ${r.error}` });
        }
      } else {
        const old = beats.find((b) => b.idx === target)?.text ?? "";
        const r = await remixBeatAction(projectId, videoId, target, notes, settings());
        if (r.ok) {
          say({ role: "assistant", text: r.changeSummary });
          setProposal({ kind: "beat", idx: target, beat: r.beat, oldText: old });
        } else {
          say({ role: "assistant", text: `⚠️ ${r.error}` });
        }
      }
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
      );
    });
  };

  const accept = () => {
    if (!proposal) return;
    startApply(async () => {
      const r =
        proposal.kind === "script"
          ? await applyScriptRemixAction(projectId, videoId, {
              beats: proposal.remix.beats,
              runtimeSec: proposal.remix.runtimeSec,
              metadata: proposal.remix.metadata,
            })
          : await editScriptBeatAction(projectId, videoId, proposal.idx, proposal.beat.text);
      if (r.ok) {
        say({
          role: "assistant",
          text:
            proposal.kind === "script"
              ? "✓ Applied — the script above is now the new version."
              : `✓ Applied to section ${proposal.idx + 1}.`,
        });
        setProposal(null);
        router.refresh();
      } else {
        say({ role: "assistant", text: `⚠️ Couldn't apply: ${r.error}` });
      }
    });
  };

  const discard = () => {
    setProposal(null);
    say({ role: "assistant", text: "Discarded that proposal — tweak your notes and try again." });
  };

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
      >
        <CardTitle>
          <span className="flex items-center gap-2">
            <Wand2 className="size-4 text-lavender" /> Script Remix
          </span>
        </CardTitle>
        <span className="text-xs font-semibold text-muted">{open ? "Hide" : "Open"}</span>
      </button>

      {open && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Chat with Claude to remix this script. Tell it what to change, tune the
            controls, and it proposes a revision you can accept or keep refining —
            nothing changes until you accept.
          </p>

          {/* Controls */}
          <div className="grid gap-3 rounded-card bg-canvas p-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">Target</span>
              <select
                value={String(target)}
                onChange={(e) =>
                  setTarget(e.target.value === "all" ? "all" : Number(e.target.value))
                }
                className="input"
              >
                <option value="all">Whole script</option>
                {beats.map((b) => (
                  <option key={b.idx} value={b.idx}>
                    Section {b.idx + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">
                Creativity · {creativity.toFixed(2)}
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={creativity}
                onChange={(e) => setCreativity(Number(e.target.value))}
                className="mt-2 accent-accent"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">Tone modifier</span>
              <select value={tone} onChange={(e) => setTone(e.target.value)} className="input">
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t === "" ? "Keep channel tone" : t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">Verbiage</span>
              <select
                value={verbiage}
                onChange={(e) => setVerbiage(e.target.value)}
                className="input"
              >
                {VERBIAGE.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">Length & pacing</span>
              <select value={length} onChange={(e) => setLength(e.target.value)} className="input">
                {LENGTH.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Transcript */}
          {messages.length > 0 && (
            <div
              ref={scrollRef}
              className="max-h-72 space-y-2 overflow-y-auto rounded-card bg-canvas p-3"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "ml-auto bg-ink text-white"
                      : "bg-card text-ink shadow-card",
                  )}
                >
                  {m.role === "assistant" && (
                    <span className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-lavender">
                      <Sparkles className="size-3" /> Claude
                    </span>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                </div>
              ))}
              {pending && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="size-3.5 animate-spin" /> Remixing…
                </div>
              )}
            </div>
          )}

          {/* Pending proposal preview */}
          {proposal && (
            <div className="rounded-card border border-lavender/40 bg-lavender/5 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-lavender">
                Proposed {proposal.kind === "script" ? "script" : `section ${proposal.idx + 1}`}
              </p>
              <div className="max-h-60 space-y-2 overflow-y-auto text-sm leading-relaxed">
                {proposal.kind === "script" ? (
                  proposal.remix.beats.map((b) => (
                    <p key={b.idx}>
                      <span className="text-xs font-semibold text-muted">
                        Section {b.idx + 1}:{" "}
                      </span>
                      {b.text}
                    </p>
                  ))
                ) : (
                  <>
                    <p className="text-muted line-through">{proposal.oldText}</p>
                    <p>{proposal.beat.text}</p>
                  </>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={applying}
                  onClick={accept}
                  className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-ink shadow-card disabled:opacity-50"
                >
                  {applying ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Accept
                </button>
                <button
                  type="button"
                  disabled={applying}
                  onClick={discard}
                  className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium text-muted hover:text-ink"
                >
                  <X className="size-3.5" /> Discard
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
              }}
              rows={2}
              placeholder={
                target === "all"
                  ? "e.g. Open on a bolder hook and cut the middle section in half"
                  : `e.g. Make section ${(target as number) + 1} punchier and add a concrete number`
              }
              className="input flex-1 resize-none"
            />
            <button
              type="button"
              disabled={pending || !input.trim()}
              onClick={send}
              className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              Remix
            </button>
          </div>
          <p className="text-[11px] text-muted">⌘/Ctrl + Enter to send</p>
        </div>
      )}
    </Card>
  );
}

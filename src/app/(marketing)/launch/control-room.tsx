"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles, Lightbulb, FileText, Clapperboard, Film, Wand2,
  ShieldCheck, CheckCircle2, Upload, LineChart, Play, Pause,
} from "lucide-react";

/**
 * The control-room loop (marketing centerpiece). A scripted, deterministic
 * replay of one video travelling the real 10-stage idea→publish path: a
 * playhead lights each stage emerald, the owning agent(s) hand off, the four
 * approval gates flip green, and reconciled spend ticks up under the cap —
 * ending "published · tracking", then looping. Autoplays on scroll; collapses
 * to the finished state under prefers-reduced-motion. No external media.
 */

type Stage = {
  key: string;
  label: string;
  icon: typeof Sparkles;
  agent: string;
  gate?: "IDEA" | "SCRIPT" | "ASSETS" | "FINAL";
  addUsd: number; // reconciled spend added when this stage completes
  note: string;
};

const STAGES: Stage[] = [
  { key: "seed", label: "Seed", icon: Sparkles, agent: "Operator", addUsd: 0, note: "seeded today's idea under budget" },
  { key: "idea", label: "Idea", icon: Lightbulb, agent: "QC Judge", gate: "IDEA", addUsd: 0, note: "IDEA gate · 5 criteria · 8.1 ≥ 6.0" },
  { key: "script", label: "Script", icon: FileText, agent: "Writer · Fact-Check", gate: "SCRIPT", addUsd: 0.02, note: "SCRIPT gate · claims verified · risk 2/10" },
  { key: "assets", label: "Assets", icon: Clapperboard, agent: "Art Director · Shot Planner", gate: "ASSETS", addUsd: 0.31, note: "8 beats routed · 2 hero clips, 6 free" },
  { key: "render", label: "Render", icon: Film, agent: "Render Farm", addUsd: 0.05, note: "Remotion · 16:9 + Short · media-QC pass" },
  { key: "autofix", label: "Auto-fix", icon: Wand2, agent: "Vision Optimizer", addUsd: 0.03, note: "critique → 1 fix → re-render · converged" },
  { key: "qc", label: "QC gate", icon: ShieldCheck, gate: "FINAL", agent: "Self-Watch · Frame Critic", addUsd: 0, note: "FINAL gate · 7.4 ≥ floor 7.0 · passes" },
  { key: "approve", label: "Approve", icon: CheckCircle2, agent: "You / auto", addUsd: 0, note: "above floor → auto-approve" },
  { key: "publish", label: "Publish", icon: Upload, agent: "Render Farm", addUsd: 0, note: "uploaded to your channel" },
  { key: "track", label: "Tracking", icon: LineChart, agent: "Outcome-Audit · Librarian", addUsd: 0, note: "retention feeds the learning loops" },
];

const CAP = 0.8;
const DWELL = 1250;

function prefersReduced(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

/** DecryptedText (react-bits style): the status line scrambles into place on
    every stage change — the machinery made visible. Plain text under
    prefers-reduced-motion. */
function Scramble({ text }: { text: string }) {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (prefersReduced()) {
      setShown(text);
      return;
    }
    const CHARS = "!<>-_\\/[]{}—=+*^?#";
    let i = 0;
    const t = setInterval(() => {
      i += 2;
      if (i >= text.length) {
        setShown(text);
        clearInterval(t);
        return;
      }
      setShown(
        text.slice(0, i) +
          Array.from({ length: Math.min(10, text.length - i) }, () => CHARS[(Math.random() * CHARS.length) | 0]).join(""),
      );
    }, 28);
    return () => clearInterval(t);
  }, [text]);
  return <>{shown}</>;
}

export function ControlRoom() {
  const [i, setI] = useState(0); // 0..STAGES.length ; === length means "done, holding"
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    const done = i >= STAGES.length;
    timer.current = setTimeout(() => setI((p) => (p >= STAGES.length ? 0 : p + 1)), done ? 2600 : DWELL);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [playing, i]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || prefersReduced() || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStarted(true); setPlaying(true); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const shown = !started && prefersReduced() ? STAGES.length : i;
  const done = shown >= STAGES.length;
  const activeIdx = done ? -1 : shown;
  const spent = STAGES.slice(0, shown).reduce((s, st) => s + st.addUsd, 0);
  const gatesPassed = STAGES.filter((s, idx) => s.gate && idx < shown).length;
  const current = done ? null : STAGES[activeIdx];

  const toggle = () => {
    if (!started) { setStarted(true); setI(0); setPlaying(true); return; }
    setPlaying((p) => !p);
  };

  return (
    <div ref={rootRef} className="m-star-border overflow-hidden">
      <div className="space-y-4 p-4 sm:p-6">
        {/* Header: loops badge + transport */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--m-muted)]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-2 animate-ping rounded-full bg-[var(--m-amber)] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--m-amber)]" />
            </span>
            <span className="font-mono">12 autonomous loops · live</span>
          </div>
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 rounded-full border border-[var(--m-line)] px-3 py-1 text-xs font-medium text-[var(--m-ink)] transition-colors hover:bg-white/5"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
            {!started ? "Play" : playing ? "Pause" : "Play"}
          </button>
        </div>

        {/* Pipeline rail */}
        <div className="grid grid-cols-5 gap-x-2 gap-y-4 sm:grid-cols-10">
          {STAGES.map((s, idx) => {
            const state = done || idx < shown ? "done" : idx === activeIdx ? "active" : "queued";
            const Icon = s.icon;
            return (
              <div key={s.key} className="relative flex flex-col items-center gap-1.5 text-center">
                {/* connector */}
                {idx % 5 !== 0 && (
                  <span
                    className="pointer-events-none absolute right-1/2 top-5 hidden h-px w-full sm:block"
                    style={{ background: idx <= shown ? "var(--m-amber)" : "var(--m-line)", opacity: idx <= shown ? 0.5 : 1 }}
                  />
                )}
                <span
                  className={`relative z-10 grid size-10 place-items-center rounded-xl border transition-all duration-500 ${state === "active" ? "stage-live" : ""}`}
                  style={{
                    borderColor: state === "queued" ? "var(--m-line)" : "var(--m-amber)",
                    background: state === "done" ? "rgba(16,212,142,0.16)" : state === "active" ? "rgba(16,212,142,0.10)" : "rgba(255,255,255,0.02)",
                    color: state === "queued" ? "var(--m-muted)" : "var(--m-amber)",
                  }}
                >
                  <Icon className="size-4" />
                  {s.gate && (
                    <span
                      className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full text-[8px] font-bold"
                      style={{
                        background: idx < shown ? "var(--m-amber)" : "var(--m-bg-2)",
                        color: idx < shown ? "var(--m-on-accent)" : "var(--m-muted)",
                        border: "1px solid var(--m-line)",
                      }}
                      title={`${s.gate} gate`}
                    >
                      {idx < shown ? "✓" : ""}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium leading-tight" style={{ color: state === "queued" ? "var(--m-muted)" : "var(--m-ink)" }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Live readout: current agent + note + spend */}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          {/* min-height reserves the two-line running state so the readout
              doesn't shrink to one line when the loop finishes, which
              otherwise nudged the surrounding layout each cycle. */}
          <div className="m-terminal min-h-[4.5rem] rounded-lg p-3 font-mono text-xs">
            {done ? (
              <p className="text-[var(--m-amber)]">✓ published · tracking — 4/4 gates passed · session ${spent.toFixed(2)} / ${CAP.toFixed(2)} cap</p>
            ) : (
              <p className="text-[var(--m-ink)]">
                <span className="text-[var(--m-violet)]">{current?.agent}</span>
                <span className="text-[var(--m-muted)]"> · {current?.label.toLowerCase()}</span>
                <br />
                <span className="text-[var(--m-muted)]">↳ {current ? <Scramble text={current.note} /> : null}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-[var(--m-muted)]">reconciled spend</p>
              <p className="font-mono text-sm text-[var(--m-ink)]">${spent.toFixed(2)} <span className="text-[var(--m-muted)]">/ ${CAP.toFixed(2)}</span></p>
            </div>
            <div className="h-9 w-24">
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.min(100, (spent / CAP) * 100)}%`, background: "linear-gradient(90deg, var(--m-violet), var(--m-amber))" }} />
              </div>
              <p className="mt-1 text-right text-[10px] font-mono text-[var(--m-muted)]">{gatesPassed}/4 gates</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

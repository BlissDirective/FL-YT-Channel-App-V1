"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Terminal } from "lucide-react";

/**
 * The MVDA demo — a scripted replay of a real agent cut session, rendered in the
 * marketing design system but faithful to the real editing model: a versioned
 * timeline (v3 compiler → v4 agent) plus a terminal tool log using the agent's
 * actual tools (get_context, retime_clip, set_transition, auto_emphasis,
 * judge_preview, mark_ready). Autoplays on a loop; reduced-motion shows the
 * finished storyboard behind a "Play demo" button.
 */

type Clip = { id: string; label: string; base: number };
const CLIPS: Clip[] = [
  { id: "b1", label: "Hook", base: 18 },
  { id: "b2", label: "Setup", base: 26 },
  { id: "b3", label: "Point", base: 20 },
  { id: "b4", label: "Turn", base: 18 },
  { id: "b5", label: "Payoff", base: 18 },
];

const CAPTIONS = ["that", "hook", "has", "to", "land"];
const EMPHASIS = new Set(["hook", "land"]);

type Step = { tool: string; args: string; note: string; dwell: number };
const STEPS: Step[] = [
  { tool: "get_context", args: "", note: "5 beats · 62s · floor 7.0", dwell: 1200 },
  { tool: "retime_clip", args: "b2 −1.5s", note: "tightened the hook", dwell: 1700 },
  { tool: "set_transition", args: "b4 → whip 0.4s", note: "punch into the turn", dwell: 1500 },
  { tool: "auto_emphasis", args: "2 tokens", note: "pop the key words", dwell: 1600 },
  { tool: "judge_preview", args: "", note: "7.4 / floor 7.0 — passes", dwell: 1900 },
  { tool: "mark_ready", args: "✓", note: "tightened hook, varied b-roll rhythm", dwell: 2600 },
];
const FINAL = STEPS.length; // step index at which everything is applied

function prefersReduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function MvdaDemo() {
  // step 0 = baseline (v3); 1..6 = after each tool call.
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  // Advance the scripted steps while playing; loop after a beat on the last.
  useEffect(() => {
    if (!playing) return;
    if (step >= FINAL) {
      timer.current = setTimeout(() => setStep(0), 2600);
      return clear;
    }
    timer.current = setTimeout(() => setStep((s) => s + 1), step === 0 ? 900 : STEPS[step - 1].dwell);
    return clear;
  }, [playing, step]);

  // Autoplay once when scrolled into view (unless reduced motion).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || prefersReduced() || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStarted(true);
          setPlaying(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const start = useCallback(() => {
    setStarted(true);
    setStep(0);
    setPlaying(true);
  }, []);
  const toggle = () => {
    if (!started) return start();
    setPlaying((p) => !p);
  };

  // If the visitor prefers reduced motion and hasn't opted in, show the final
  // storyboard state (everything applied) statically.
  const shown = !started && prefersReducedSafe() ? FINAL : step;

  const retimed = shown >= 2;
  const transitioned = shown >= 3;
  const emphasized = shown >= 4;
  const judged = shown >= 5;
  const ready = shown >= FINAL;

  return (
    <div ref={rootRef} className="m-star-border overflow-hidden">
      <div className="flex flex-col gap-0 p-4 sm:p-5 lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-5">
        {/* ── Left: the timeline ─────────────────────────────────────── */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[var(--m-muted)]">
              <span className={`rounded px-1.5 py-0.5 font-mono ${ready ? "bg-[var(--m-amber)]/20 text-[var(--m-amber)]" : "bg-white/5"}`}>
                {ready ? "v4 · agent" : "v3 · compiler"}
              </span>
              <span>edit timeline</span>
            </div>
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 rounded-full border border-[var(--m-line)] px-3 py-1 text-xs font-medium text-[var(--m-ink)] transition-colors hover:bg-white/5"
              aria-label={playing ? "Pause demo" : "Play demo"}
            >
              {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
              {!started ? "Play demo" : playing ? "Pause" : "Play"}
            </button>
          </div>

          {/* V lane */}
          <Lane label="V">
            <div className={`flex h-10 gap-1 rounded-md transition-shadow ${ready ? "shadow-[0_0_0_1px_var(--m-amber)]" : ""}`}>
              {CLIPS.map((c) => {
                const w = c.id === "b2" && retimed ? 16 : c.base;
                const touched = (c.id === "b2" && retimed) || (c.id === "b4" && transitioned);
                return (
                  <div
                    key={c.id}
                    className="m-clip relative grid place-items-center overflow-hidden rounded text-[10px] font-medium"
                    style={{
                      width: `${w}%`,
                      backgroundColor: touched ? "rgba(16,212,142,0.25)" : "rgba(125,211,252,0.14)",
                      color: touched ? "var(--m-amber)" : "var(--m-muted)",
                      boxShadow: touched ? "inset 0 0 0 1px rgba(16,212,142,0.5)" : "inset 0 0 0 1px rgba(255,255,255,0.06)",
                    }}
                  >
                    {c.label}
                    {/* whip transition tick between b4 and b5 */}
                    {c.id === "b4" && (
                      <span
                        className="absolute right-0 top-0 h-full w-[2px] transition-colors"
                        style={{ background: transitioned ? "var(--m-amber)" : "transparent" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Lane>

          {/* CC lane — caption tokens, key words pop amber */}
          <Lane label="CC">
            <div className="flex h-10 flex-wrap items-center gap-1">
              {CAPTIONS.map((t) => {
                const hot = emphasized && EMPHASIS.has(t);
                return (
                  <span
                    key={t}
                    className="m-token rounded px-1.5 py-0.5 text-[11px] font-medium"
                    style={{
                      color: hot ? "var(--m-on-accent)" : "var(--m-muted)",
                      backgroundColor: hot ? "var(--m-amber)" : "rgba(255,255,255,0.05)",
                      transform: hot ? "scale(1.08)" : "none",
                    }}
                  >
                    {t}
                  </span>
                );
              })}
            </div>
          </Lane>

          {/* Judge score dial */}
          <div className="mt-4 rounded-lg border border-[var(--m-line)] bg-black/20 p-3">
            <div className="flex items-center justify-between text-xs text-[var(--m-muted)]">
              <span>frame-critic judge</span>
              <span className={judged ? "font-mono text-[var(--m-ink)]" : "font-mono opacity-40"}>
                {judged ? "7.4" : "—"} / floor 7.0
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-[width] duration-1000 ease-out"
                style={{
                  width: judged ? "74%" : "0%",
                  background: "linear-gradient(90deg, var(--m-sky), var(--m-amber))",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Right: the tool log ────────────────────────────────────── */}
        <div className="m-terminal mt-5 rounded-lg p-3 font-mono text-xs lg:mt-0">
          <div className="mb-2 flex items-center gap-1.5 text-[var(--m-muted)]">
            <Terminal className="size-3.5" />
            mvda cut session
          </div>
          <div className="space-y-1.5">
            <p className="text-[var(--m-muted)]">
              <span className="text-[var(--m-sky)]">you</span> · brief → v3 compiled · $0.00
            </p>
            {STEPS.slice(0, shown).map((s, i) => (
              <p key={i} className="m-logline leading-relaxed text-[var(--m-ink)]">
                <span className="text-[var(--m-amber)]">agent</span>{" "}
                <span className="text-[var(--m-ink)]">{s.tool}</span>
                {s.args && <span className="text-[var(--m-muted)]"> {s.args}</span>}
                <br />
                <span className="text-[var(--m-muted)]">↳ {s.note}</span>
              </p>
            ))}
            {playing && shown < FINAL && <span className="m-cursor" aria-hidden="true" />}
            {ready && (
              <p className="m-logline pt-1 text-[var(--m-amber)]">✓ marked ready · session $0.41 / $0.80 cap</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Lane({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="w-6 shrink-0 text-right text-[10px] font-semibold text-[var(--m-muted)]">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// Guard usable in render (matchMedia only client-side).
function prefersReducedSafe(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

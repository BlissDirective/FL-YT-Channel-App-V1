"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "lucide-react";

/**
 * The Crew board (marketing). The studio's multi-agent orchestration shown
 * agent-first: ~20 named autonomous roles grouped into six lanes, with a
 * scripted "baton" that lights each agent as it hands off through one build —
 * mirrored by a live tool-call log. Autoplays on scroll; static under
 * prefers-reduced-motion. No external media; all names are real code roles.
 */

type Agent = { id: string; name: string };
type Lane = { label: string; tint: string; agents: Agent[] };

const LANES: Lane[] = [
  { label: "Orchestrate", tint: "var(--m-amber)", agents: [
    { id: "operator", name: "Operator" }, { id: "mvda", name: "MVDA Cut Agent" }, { id: "cleanhouse", name: "Clean House" },
  ]},
  { label: "Research", tint: "var(--m-sky)", agents: [
    { id: "scout", name: "Scout" }, { id: "intel", name: "Intelligence" }, { id: "vintel", name: "Video-Intel" }, { id: "research", name: "Research Librarian" },
  ]},
  { label: "Author", tint: "var(--m-violet)", agents: [
    { id: "writer", name: "Script Writer" }, { id: "artdir", name: "Art Director" }, { id: "shot", name: "Shot Planner" }, { id: "stick", name: "Stick Choreographer" },
  ]},
  { label: "Judge", tint: "var(--m-amber)", agents: [
    { id: "qc", name: "QC Judge" }, { id: "variant", name: "Variant Judge" }, { id: "comp", name: "Competitive Judge" }, { id: "trans", name: "Transition Critic" }, { id: "fact", name: "Fact-Checker" },
  ]},
  { label: "Produce", tint: "var(--m-sky)", agents: [
    { id: "render", name: "Render Farm" }, { id: "clip", name: "Clip Worker" },
  ]},
  { label: "Learn", tint: "var(--m-violet)", agents: [
    { id: "autofix", name: "Auto-Fix" }, { id: "optimizer", name: "Optimizer" }, { id: "librarian", name: "Librarian" }, { id: "audit", name: "Outcome-Audit" },
  ]},
];

// The handoff order + the tool-call line each step prints.
type Step = { id: string; log: string };
const SEQUENCE: Step[] = [
  { id: "operator", log: "operator · seed_day() → 1 idea, under budget" },
  { id: "scout", log: "scout · youtube_search() → 12 proven angles" },
  { id: "intel", log: "intelligence · score_repurposable() → 8.1" },
  { id: "writer", log: "writer · draft_script() → 8 beats · 62s" },
  { id: "fact", log: "fact-check · verify_claims() → risk 2/10" },
  { id: "artdir", log: "art-director · plan_shots() → coherent look" },
  { id: "shot", log: "shot-planner · route_media() → 2 hero, 6 free" },
  { id: "clip", log: "clip-worker · veo_extend() → 3 clips · $0.31" },
  { id: "render", log: "render-farm · remotion() → 16:9 + Short" },
  { id: "autofix", log: "auto-fix · critique → fix → re-render ✓" },
  { id: "qc", log: "qc-judge · score() → 7.4 / floor 7.0" },
  { id: "comp", log: "competitive-judge · packaging_vs_winners() ✓" },
  { id: "variant", log: "variant-judge · best_of_n(titles) → picked" },
  { id: "render", log: "render-farm · publish() → your channel" },
  { id: "audit", log: "outcome-audit · retention → lesson (shadow)" },
  { id: "librarian", log: "librarian · graduate_lesson() once proven" },
];

const DWELL = 1150;

function prefersReduced(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

export function CrewBoard() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    timer.current = setTimeout(() => setStep((p) => (p + 1) % SEQUENCE.length), DWELL);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [playing, step]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || prefersReduced() || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStarted(true); setPlaying(true); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [step]);

  const reduced = !started && prefersReduced();
  const activeId = reduced ? "" : SEQUENCE[step]?.id;
  const visibleLog = reduced ? SEQUENCE : SEQUENCE.slice(0, step + 1);

  return (
    <div ref={rootRef} className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      {/* Lanes */}
      <div className="space-y-3 rounded-2xl border border-[var(--m-line)] bg-white/[0.015] p-4">
        {LANES.map((lane) => (
          <div key={lane.label} className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide" style={{ color: lane.tint }}>
              {lane.label}
            </span>
            {lane.agents.map((a) => {
              const active = a.id === activeId;
              return (
                <span
                  key={a.id}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-300 ${active ? "stage-live" : ""}`}
                  style={{
                    borderColor: active ? lane.tint : "var(--m-line)",
                    background: active ? "rgba(16,212,142,0.12)" : "rgba(255,255,255,0.02)",
                    color: active ? "var(--m-ink)" : "var(--m-muted)",
                    transform: active ? "scale(1.05)" : "none",
                  }}
                >
                  {a.name}
                </span>
              );
            })}
          </div>
        ))}
        <p className="pt-1 text-[10px] text-[var(--m-muted)]">
          20 named roles shown · 30+ autonomous roles in orchestration · every move versioned, budgeted &amp; answerable to your gates
        </p>
      </div>

      {/* Tool-call log */}
      <div className="rounded-2xl border border-[var(--m-line)] bg-black/40 p-3">
        <div className="mb-2 flex items-center gap-1.5 font-mono text-xs text-[var(--m-muted)]">
          <Terminal className="size-3.5" /> orchestration log
        </div>
        <div ref={logRef} className="max-h-56 space-y-1.5 overflow-hidden font-mono text-[11px] leading-relaxed">
          {visibleLog.map((s, i) => (
            <p key={`${s.id}-${i}`} className="m-logline text-[var(--m-ink)]">
              <span className="text-[var(--m-muted)]">›</span> {s.log}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

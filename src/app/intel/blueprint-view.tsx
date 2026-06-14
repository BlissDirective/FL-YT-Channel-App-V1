"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Image as ImageIcon,
  Lightbulb,
  ListOrdered,
  Target,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Type,
} from "lucide-react";
import type { Blueprint, IntelCompetitor, Perception } from "@/lib/db/types";

function fmtViews(n: number): string {
  return Intl.NumberFormat("en", { notation: "compact" }).format(n);
}

function asBrief(b: Blueprint, topic: string): string {
  const L = (h: string, xs: string[]) => `${h}:\n${xs.map((x) => `- ${x}`).join("\n")}`;
  return [
    `MARKET BLUEPRINT — ${topic}`,
    L("What works", b.works),
    L("What doesn't", b.doesnt),
    `Our angle: ${b.angle}`,
    L("Hooks", b.hooks.map((h) => `${h.pattern} — e.g. "${h.example}"`)),
    L(
      "Structure",
      b.structure.map((s) => `${s.label} (~${s.targetSec}s): ${s.note}`),
    ),
    L("Pacing", b.pacing),
    L("Gaps to own", b.gaps),
    L("Title patterns", b.titlePatterns),
    L("Thumbnail patterns", b.thumbnailPatterns),
  ].join("\n\n");
}

export function BlueprintView({
  blueprint,
  competitors = [],
  topic = "",
  perception,
}: {
  blueprint: Blueprint;
  competitors?: IntelCompetitor[];
  topic?: string;
  perception?: Perception | null;
}) {
  const [copied, setCopied] = useState(false);
  const b = blueprint;

  const copy = async () => {
    await navigator.clipboard.writeText(asBrief(b, topic));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-4">
      {/* What works / doesn't */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-card bg-success-soft/50 p-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-success">
            <ThumbsUp className="size-4" /> What works
          </h4>
          <ul className="space-y-1.5 text-sm">
            {b.works.map((x, i) => (
              <li key={i} className="flex gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-success" /> {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card bg-coral/10 p-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-coral">
            <ThumbsDown className="size-4" /> What doesn&apos;t
          </h4>
          <ul className="space-y-1.5 text-sm">
            {b.doesnt.map((x, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-coral" /> {x}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Our angle */}
      <div className="flex items-start gap-2 rounded-card bg-accent-soft p-4">
        <Target className="mt-0.5 size-4 shrink-0 text-ink" />
        <p className="text-sm">
          <span className="font-bold">Our angle: </span>
          {b.angle}
        </p>
      </div>

      {/* Hook lab */}
      <Section icon={Lightbulb} title="Hook Lab">
        <div className="space-y-3">
          {b.hooks.map((h, i) => (
            <div key={i} className="rounded-xl bg-canvas p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-lavender">
                {h.pattern}
              </p>
              <p className="mt-1 text-sm italic">“{h.example}”</p>
              <p className="mt-1 text-xs text-muted">{h.why}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Structure timeline */}
      <Section icon={ListOrdered} title="Recommended structure">
        <ol className="space-y-2">
          {b.structure.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-full bg-ink px-2 py-0.5 text-xs font-bold tabular-nums text-accent">
                {s.targetSec}s
              </span>
              <div>
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-muted">{s.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section icon={TrendingUp} title="Pacing & retention">
          <ul className="space-y-1.5 text-sm text-muted">
            {b.pacing.map((x, i) => (
              <li key={i}>• {x}</li>
            ))}
          </ul>
        </Section>
        <Section icon={Target} title="Gaps to own">
          <ul className="space-y-1.5 text-sm text-muted">
            {b.gaps.map((x, i) => (
              <li key={i}>• {x}</li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section icon={Type} title="Title patterns">
          <div className="flex flex-wrap gap-2">
            {b.titlePatterns.map((x, i) => (
              <span key={i} className="rounded-full bg-card-warm px-3 py-1.5 text-xs text-muted">
                {x}
              </span>
            ))}
          </div>
        </Section>
        <Section icon={ImageIcon} title="Thumbnail patterns">
          <div className="flex flex-wrap gap-2">
            {b.thumbnailPatterns.map((x, i) => (
              <span key={i} className="rounded-full bg-card-warm px-3 py-1.5 text-xs text-muted">
                {x}
              </span>
            ))}
          </div>
        </Section>
      </div>

      {/* Competitors analyzed */}
      {competitors.length > 0 && (
        <Section icon={TrendingUp} title={`Analyzed ${competitors.length} videos`}>
          <div className="grid gap-2 sm:grid-cols-2">
            {competitors.map((c) => (
              <a
                key={c.videoId}
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2 text-sm hover:bg-accent-soft"
              >
                <span className="min-w-0 truncate">{c.title}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
                  {fmtViews(c.views)}
                </span>
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* Deep perception timeline */}
      {perception && perception.notes.length > 0 && (
        <Section icon={ListOrdered} title={`Frame-by-frame notes (${perception.notes.length})`}>
          <ol className="max-h-64 space-y-1.5 overflow-y-auto">
            {perception.notes.map((n, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="shrink-0 font-semibold tabular-nums text-lavender">
                  {n.t}s
                </span>
                <span className="text-muted">
                  {n.sceneDesc}
                  {n.onScreenText ? ` · “${n.onScreenText}”` : ""}
                  {n.pacingNote ? ` · ${n.pacingNote}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Handoff */}
      <button
        type="button"
        onClick={copy}
        className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white"
      >
        {copied ? <Check className="size-4 text-accent" /> : <Copy className="size-4" />}
        {copied ? "Copied — paste into Script Remix" : "Copy brief for Script Remix"}
      </button>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card bg-card p-4 shadow-card">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Icon className="size-4 text-muted" /> {title}
      </h4>
      {children}
    </div>
  );
}

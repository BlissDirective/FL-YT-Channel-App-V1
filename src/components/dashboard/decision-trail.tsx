import {
  Cpu, GitBranch, Music, Palette, RefreshCw, Server, Sparkles, Volume2, Layers, type LucideIcon,
} from "lucide-react";
import type { DecisionRow } from "@/lib/db/decisions-data";
import { cn } from "@/lib/cn";

/**
 * Decision audit trail (#9): the per-video log of every creative/technical
 * choice — model, provider, voice, music, style, fallback, regenerate — with
 * the alternatives weighed, a confidence, the reasoning, and the cost. Read-only
 * and observational; it explains WHY the studio produced what it did. Purely
 * presentational (data from getDecisions), dark/on-brand with the redesign.
 */

const KIND_META: Record<string, { icon: LucideIcon; label: string }> = {
  model: { icon: Cpu, label: "Model" },
  provider: { icon: Server, label: "Provider" },
  medium: { icon: Layers, label: "Medium" },
  tier: { icon: Sparkles, label: "Tier" },
  voice: { icon: Volume2, label: "Voice" },
  music: { icon: Music, label: "Music" },
  style: { icon: Palette, label: "Style" },
  fallback: { icon: GitBranch, label: "Fallback" },
  regenerate: { icon: RefreshCw, label: "Regenerate" },
};

function relTime(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.round(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function DecisionTrail({ decisions }: { decisions: DecisionRow[] }) {
  if (decisions.length === 0) {
    return (
      <div className="rounded-card border border-line bg-card/60 p-4 text-xs text-muted">
        No decisions logged yet — the studio records every model, voice, and style
        choice here as it builds the video.
      </div>
    );
  }
  const totalCost = decisions.reduce((s, d) => s + Number(d.cost_usd ?? 0), 0);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{decisions.length} decisions logged</span>
        {totalCost > 0 && (
          <span className="tabular-nums">${totalCost.toFixed(2)} attributed</span>
        )}
      </div>
      <ol className="space-y-2">
        {decisions.map((d) => {
          const meta = KIND_META[d.kind] ?? { icon: Sparkles, label: d.kind };
          const Icon = meta.icon;
          const conf = d.confidence != null ? Math.round(Number(d.confidence) * 100) : null;
          return (
            <li
              key={d.id}
              className="rounded-card border border-line bg-card p-3 shadow-card"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent ring-1 ring-accent/20">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                      {meta.label}
                    </span>
                    {d.beat_idx != null && (
                      <span className="rounded-full bg-raised px-1.5 py-0.5 text-[9px] font-semibold text-muted">
                        beat {d.beat_idx + 1}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-ink">{d.choice}</span>
                    {conf != null && (
                      <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                        {conf}% conf
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-[10px] text-muted">
                      {relTime(d.created_at)}
                    </span>
                  </div>
                  {d.reasoning && (
                    <p className="mt-1 text-xs leading-relaxed text-muted">{d.reasoning}</p>
                  )}
                  {d.alternatives.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted/70">
                        over
                      </span>
                      {d.alternatives.slice(0, 4).map((a) => (
                        <span
                          key={a.id}
                          className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[10px] text-muted"
                        >
                          {a.label}
                          {a.score != null && (
                            <span className="tabular-nums text-muted/60">
                              {Math.round(a.score * 100)}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {d.cost_usd != null && Number(d.cost_usd) > 0 && (
                    <p className="mt-1 text-[10px] tabular-nums text-muted">
                      ~${Number(d.cost_usd).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

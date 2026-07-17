import { Check, Lock, type LucideIcon } from "lucide-react";
import {
  SETUP_EFFORT_LABEL,
  type CapabilityStatus,
  type SetupEffort,
  type StabilityTier,
} from "@studio/core";
import { cn } from "@/lib/cn";

/**
 * Capability menu (list2 #10/#11): "X of Y configured — here's what you can do
 * now / could unlock", grouped by setup effort, each locked capability showing
 * exactly how to unlock it (#11) and a stability tier badge (#29). Presentation
 * only — statuses come from the pure computeCapabilities().
 */

const STABILITY_TONE: Record<StabilityTier, string> = {
  production: "bg-success-soft text-success",
  beta: "bg-accent/15 text-accent",
  test: "bg-lavender/15 text-lavender",
};

const EFFORT_ORDER: SetupEffort[] = ["env", "install", "hardware"];

export function CapabilityMenu({
  statuses,
}: {
  statuses: CapabilityStatus[];
}) {
  const available = statuses.filter((s) => s.available).length;
  const byEffort = EFFORT_ORDER.map((effort) => ({
    effort,
    items: statuses.filter((s) => s.effort === effort),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4 rounded-card border border-line bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">What you can do</h2>
          <p className="text-xs text-muted">Capabilities unlocked by your configured services</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums text-accent">{available}</span>
          <span className="text-sm text-muted">of {statuses.length} ready</span>
        </div>
      </div>

      {/* Progress rail */}
      <div className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${Math.round((available / Math.max(1, statuses.length)) * 100)}%` }}
        />
      </div>

      {byEffort.map((group) => (
        <div key={group.effort} className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            {SETUP_EFFORT_LABEL[group.effort]}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((c) => (
              <CapabilityRow key={c.id} c={c} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CapabilityRow({ c }: { c: CapabilityStatus }) {
  const Icon: LucideIcon = c.available ? Check : Lock;
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        c.available ? "border-success/25 bg-success/[0.05]" : "border-line bg-card-warm",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg",
              c.available ? "bg-success/15 text-success" : "bg-raised text-muted",
            )}
          >
            <Icon className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{c.label}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">{c.description}</p>
          </div>
        </div>
        <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase", STABILITY_TONE[c.stability])}>
          {c.stability}
        </span>
      </div>
      {!c.available && (
        <ul className="mt-2 space-y-0.5 border-t border-line pt-2">
          {c.unlock.map((step, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted">
              <span className="mt-1 size-1 shrink-0 rounded-full bg-accent" />
              <code className="font-mono text-[10px] leading-snug text-ink/90">{step}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

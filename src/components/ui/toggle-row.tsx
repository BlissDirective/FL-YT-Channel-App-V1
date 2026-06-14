"use client";

import { cn } from "@/lib/cn";

/** Labeled setting row with an amber switch, like the reference's
    "Smart Optimization — Enabled". */
export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  className,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-card bg-card-warm p-4", className)}>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-canvas",
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-card shadow-card transition-[left]",
            checked ? "left-6" : "left-1",
          )}
        />
      </button>
    </div>
  );
}

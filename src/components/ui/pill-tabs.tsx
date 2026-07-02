"use client";

import { cn } from "@/lib/cn";

/** Segmented control on a cream track with a white active pill, like the
    reference's "Real-Time / History" toggle. */
export function PillTabs({
  options,
  value,
  onChange,
  className,
  size = "md",
  disabled,
  ariaLabel,
}: {
  options: { label: React.ReactNode; value: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("inline-flex items-center gap-1 rounded-full bg-canvas p-1", className)}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full transition-colors disabled:opacity-50",
            size === "sm"
              ? "px-3 py-1.5 text-xs font-semibold"
              : "px-3.5 py-1.5 text-sm font-medium",
            value === opt.value
              ? "bg-card text-ink shadow-card"
              : "text-muted hover:text-ink",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

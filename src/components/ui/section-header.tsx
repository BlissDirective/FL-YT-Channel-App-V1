"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Collapsible library section (UI v2, D-3/D-17: Ideas and Published collapse
 * to cut noise). Collapse state persists per `storageKey` in localStorage.
 */
export function CollapsibleSection({
  title,
  count,
  storageKey,
  defaultCollapsed = false,
  collapsible = true,
  actions,
  children,
}: {
  title: string;
  count?: number;
  /** Persistence key, e.g. `library:p123:ideas`. */
  storageKey?: string;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
  /** Right-aligned header slot (e.g. a "New asset" button). */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    if (!storageKey) return;
    const saved = window.localStorage.getItem(`collapse:${storageKey}`);
    if (saved != null) setCollapsed(saved === "1");
  }, [storageKey]);

  const toggle = () => {
    setCollapsed((c) => {
      if (storageKey) window.localStorage.setItem(`collapse:${storageKey}`, c ? "0" : "1");
      return !c;
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={collapsible ? toggle : undefined}
          aria-expanded={!collapsed}
          className={cn(
            "flex items-center gap-2 text-left",
            collapsible && "cursor-pointer",
          )}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {title}
          </h2>
          {count != null && (
            <span className="rounded-full bg-card-warm px-2 py-0.5 text-xs font-semibold text-muted">
              {count}
            </span>
          )}
          {collapsible && (
            <ChevronDown
              className={cn("size-4 text-muted transition-transform", collapsed && "-rotate-90")}
            />
          )}
        </button>
        {actions}
      </div>
      {!collapsed && children}
    </section>
  );
}

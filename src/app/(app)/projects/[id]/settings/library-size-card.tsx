"use client";

import { useState, useTransition } from "react";
import { Layers } from "lucide-react";
import { setLibrarySizeLimit } from "@/lib/actions/librarymgmt";

/**
 * Library-size guardrail control (Clean House §5). Sets how many assets may sit
 * in the working library (Ideas → Ready) before autonomous seeding pauses.
 * 0 disables the guardrail.
 */
export function LibrarySizeCard({ projectId, initial }: { projectId: string; initial: number }) {
  const [limit, setLimit] = useState(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const save = (n: number) => {
    setLimit(n);
    start(async () => {
      await setLibrarySizeLimit(projectId, n);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  };

  return (
    <div className="space-y-4 rounded-card border border-line bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-accent/12 text-accent ring-1 ring-accent/20">
          <Layers className="size-4" />
        </span>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">Working-library limit</h2>
          <p className="text-xs text-muted">Autonomous seeding pauses when the library is this full</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={20}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          onPointerUp={(e) => save(Number((e.target as HTMLInputElement).value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-raised accent-accent"
          aria-label="Library size limit"
        />
        <span className="w-24 text-right text-sm tabular-nums text-muted">
          {limit === 0 ? (
            <span className="text-muted">Off</span>
          ) : (
            <>
              <span className="text-lg font-bold text-ink">{limit}</span> assets
            </>
          )}
        </span>
      </div>
      <p className="text-[11px] text-muted">
        Counts assets from Ideas through Ready — Published, Archived, and Killed
        don&apos;t count, so publishing &amp; archiving frees slots.
        {saved && <span className="ml-2 font-semibold text-success">Saved</span>}
      </p>
    </div>
  );
}

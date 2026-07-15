"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { purgeDemoDataAction } from "@/lib/actions/projects";

/** Handoff control (Phase 10): wipe seed/demo data before going live. */
export function PurgeDemoData() {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState<string>();

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        Remove all demo projects and their videos, ideas, assets, and stats.
        Real projects are untouched. Do this once before creating your first
        real channel.
      </p>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Delete all demo data?</span>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setNote(undefined);
                const r = await purgeDemoDataAction();
                setConfirming(false);
                setNote(r.ok ? `Removed ${r.deleted} demo project${r.deleted === 1 ? "" : "s"}.` : r.error);
              })
            }
            className="flex items-center gap-2 rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white shadow-card disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Yes, purge
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex items-center gap-2 rounded-full bg-card-warm px-4 py-2 text-sm font-semibold text-coral shadow-card transition-colors hover:bg-coral/10"
        >
          <Trash2 className="size-4" /> Purge demo data
        </button>
      )}
      {note && <p className="text-sm text-muted">{note}</p>}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore, AlertTriangle } from "lucide-react";
import { archiveAllPublished, setVideoArchived } from "@/lib/actions/librarymgmt";

/** Archive a single asset out of the active library (Clean House §4). */
export function ArchiveButton({ projectId, videoId }: { projectId: string; videoId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(async () => { await setVideoArchived(projectId, videoId, true); })}
      disabled={pending}
      className="flex items-center gap-1 rounded-full bg-card-warm px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-accent-soft hover:text-ink disabled:opacity-50"
      title="Archive — remove from the active library"
    >
      <Archive className="size-3.5" /> Archive
    </button>
  );
}

/** Restore an archived asset back into the active library. */
export function UnarchiveButton({ projectId, videoId }: { projectId: string; videoId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(async () => { await setVideoArchived(projectId, videoId, false); })}
      disabled={pending}
      className="flex items-center gap-1 rounded-full bg-card-warm px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-accent-soft hover:text-ink disabled:opacity-50"
    >
      <ArchiveRestore className="size-3.5" /> Restore
    </button>
  );
}

/** Bulk-archive every published asset — the fast clear after a publish sweep. */
export function ArchiveAllPublishedButton({ projectId }: { projectId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(async () => { await archiveAllPublished(projectId); })}
      disabled={pending}
      className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft disabled:opacity-50"
    >
      <Archive className="size-3.5" /> {pending ? "Archiving…" : "Archive all published"}
    </button>
  );
}

/** Banner shown when the working library is at/over its size guardrail (§5). */
export function LibraryGuardrailBanner({ active, limit }: { active: number; limit: number }) {
  if (limit <= 0 || active < limit) return null;
  return (
    <div className="flex items-start gap-2 rounded-card border border-accent/30 bg-accent/[0.07] p-4 text-sm shadow-card">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" />
      <p className="text-ink">
        <strong>Library at {active}/{limit}.</strong> Autonomous seeding is paused
        until you clear space — publish &amp; archive finished assets, or raise the
        limit in <span className="font-semibold">Settings</span>. Manual creation
        still works.
      </p>
    </div>
  );
}

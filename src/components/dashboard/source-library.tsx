"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Check, Loader2, Search, ShieldCheck, X } from "lucide-react";
import type { SourceCandidate } from "@/lib/adapters/sources";
import {
  addPressKitAssetAction,
  applySourceClipAction,
  findFootageAction,
} from "@/lib/actions/pipeline";
import { cn } from "@/lib/cn";

/** Phase 6.5 — per-beat licensed footage picker at the Assets gate. */
export function SourceLibrary({
  projectId,
  videoId,
  beatIdx,
  onClose,
  onError,
}: {
  projectId: string;
  videoId: string;
  beatIdx: number;
  onClose: () => void;
  onError: (e?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<SourceCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingKey, setApplyingKey] = useState<string>();
  const [, startTransition] = useTransition();

  const run = (q?: string) => {
    setLoading(true);
    startTransition(async () => {
      onError(undefined);
      const r = await findFootageAction(projectId, videoId, beatIdx, q);
      setLoading(false);
      if (!r.ok) {
        setCandidates([]);
        onError(r.error);
      } else {
        setCandidates(r.candidates ?? []);
      }
    });
  };

  // Auto-search the beat's own visual prompt on open.
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatIdx]);

  const apply = (c: SourceCandidate) => {
    setApplyingKey(c.key);
    startTransition(async () => {
      onError(undefined);
      const r = await applySourceClipAction(projectId, videoId, beatIdx, c);
      setApplyingKey(undefined);
      if (!r.ok) onError(r.error);
      else onClose();
    });
  };

  return (
    <div className="mt-2 rounded-xl border border-line bg-canvas p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Licensed footage · shot {beatIdx + 1}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close library"
          className="text-muted hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run(query)}
            placeholder="Refine the search — e.g. “stock market trading floor”"
            className="w-full rounded-full border border-line bg-card py-1.5 pl-8 pr-3 text-xs outline-none focus:border-accent"
          />
        </div>
        <button
          type="button"
          onClick={() => run(query)}
          className="shrink-0 rounded-full bg-raised px-3 py-1.5 text-xs font-semibold text-white"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" /> Searching compliant sources…
        </div>
      ) : candidates.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">
          No compliant matches. Try a broader search term.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {candidates.map((c) => (
            <div key={c.key} className="overflow-hidden rounded-lg bg-card shadow-card">
              <div className="relative aspect-video bg-raised">
                {/* eslint-disable-next-line @next/next/no-img-element -- external licensed thumbs */}
                <img src={c.thumbUrl} alt={c.title} className="size-full object-cover" />
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  {c.provider}
                </span>
                {c.kind === "video" && (
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white">
                    video
                  </span>
                )}
                {typeof c.relevance === "number" && (
                  <span
                    className={cn(
                      "absolute right-1 top-1 rounded px-1 py-0.5 text-[9px] font-bold",
                      c.relevance >= 7 ? "bg-success text-white" : "bg-black/60 text-white",
                    )}
                  >
                    {c.relevance.toFixed(0)}
                  </span>
                )}
              </div>
              <div className="space-y-1 p-2">
                <p className="truncate text-[11px] font-medium" title={c.title}>
                  {c.title}
                </p>
                <p className="truncate text-[10px] text-muted" title={c.author}>
                  {c.author} · {c.license.label}
                </p>
                {c.note && /launder|copyright|likely|trademark|brand/i.test(c.note) && (
                  <p className="flex items-start gap-1 text-[10px] text-coral">
                    <AlertTriangle className="mt-px size-3 shrink-0" /> {c.note}
                  </p>
                )}
                <button
                  type="button"
                  disabled={Boolean(applyingKey)}
                  onClick={() => apply(c)}
                  className="flex w-full items-center justify-center gap-1 rounded-full bg-accent py-1 text-[11px] font-semibold text-on-accent disabled:opacity-50"
                >
                  {applyingKey === c.key ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Check className="size-3" />
                  )}
                  Use
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <PressKitLane
        projectId={projectId}
        videoId={videoId}
        beatIdx={beatIdx}
        onApplied={onClose}
        onError={onError}
      />

      <p className="mt-2 text-[10px] text-muted">
        CC-BY picks add a credit line to the video description automatically.
      </p>
    </div>
  );
}

/**
 * Gaming-compliant lane: attach an official press-kit or own-capture asset by
 * URL. Manually gated (the operator vouches the source is permitted) — this is
 * the only way IP-heavy niches like gaming add branded footage, and the agent
 * never touches it. Attribution is required and added to the description.
 */
function PressKitLane({
  projectId,
  videoId,
  beatIdx,
  onApplied,
  onError,
}: {
  projectId: string;
  videoId: string;
  beatIdx: number;
  onApplied: () => void;
  onError: (e?: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [kind, setKind] = useState<"image" | "video">("image");
  const [busy, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      onError(undefined);
      const r = await addPressKitAssetAction(projectId, videoId, beatIdx, {
        url,
        title,
        author,
        sourceUrl,
        kind,
      });
      if (!r.ok) onError(r.error);
      else onApplied();
    });

  return (
    <details className="mt-3 rounded-xl bg-card p-3">
      <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-ink">
        <ShieldCheck className="size-3.5 text-success" />
        Add official press-kit / own-capture asset
      </summary>
      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        For IP-heavy niches (e.g. gaming), paste a <strong>publisher-permitted
        press asset</strong> or <strong>your own recording</strong>. You vouch
        for the rights — never paste ripped gameplay or third-party streams. A
        credit line is added to the video description.
      </p>
      <div className="mt-2 space-y-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Asset URL (https://… image or video)"
          className="w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (for the credit)"
            className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Source / author"
            className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          />
        </div>
        <input
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="Source page URL (optional, for the credit link)"
          className="w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs outline-none focus:border-accent"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex rounded-full bg-canvas p-0.5 text-[11px] font-semibold">
            {(["image", "video"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-full px-3 py-1 capitalize",
                  kind === k ? "bg-card text-ink shadow-card" : "text-muted",
                )}
              >
                {k}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={busy || !url.trim() || !title.trim()}
            onClick={submit}
            className="flex items-center gap-1.5 rounded-full bg-raised px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Attach to shot {beatIdx + 1}
          </button>
        </div>
      </div>
    </details>
  );
}

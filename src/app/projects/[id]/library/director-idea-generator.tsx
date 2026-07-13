"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { directorGenerateIdeasAction } from "@/lib/actions/director";
import { DIRECTOR_LENGTH_BRACKETS } from "@studio/core";
import { cn } from "@/lib/cn";

/**
 * Director Mode idea generator (spec §6.2). Pick count + format + length
 * bracket (+ optional topic seed) and generate ideas that land in the Ideas
 * section awaiting direction. Nothing auto-advances. The full per-asset console
 * is D3; this is the create door.
 */
export function DirectorIdeaGenerator({ projectId }: { projectId: string }) {
  const [count, setCount] = useState(1);
  const [format, setFormat] = useState<"short" | "long">("long");
  const [bracket, setBracket] = useState<string>("3-4min");
  const [topic, setTopic] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();

  const brackets = DIRECTOR_LENGTH_BRACKETS.filter((b) => b.format === format);

  function submit() {
    start(async () => {
      setError(undefined);
      const r = await directorGenerateIdeasAction(projectId, { count, format, bracket, topic });
      if (!r.ok) setError(r.error);
      else {
        setTopic("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3 rounded-card bg-card p-4 shadow-card" data-mode="director">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-accent" />
        <h3 className="text-sm font-bold tracking-tight">Generate ideas</h3>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Count */}
        <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
          How many
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-ink"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        {/* Format */}
        <div className="flex gap-1 rounded-full bg-canvas p-1">
          {(["long", "short"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFormat(f);
                setBracket(DIRECTOR_LENGTH_BRACKETS.find((b) => b.format === f)!.id);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                format === f ? "bg-card text-ink shadow-card" : "text-muted hover:text-ink",
              )}
            >
              {f === "long" ? "Long-form" : "Short"}
            </button>
          ))}
        </div>

        {/* Bracket */}
        <select
          value={bracket}
          onChange={(e) => setBracket(e.target.value)}
          className="rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-ink"
          aria-label="Length bracket"
        >
          {brackets.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
      </div>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Optional topic seed (blank = let the idea agent choose)"
        className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted"
      />

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-accent hover:bg-ink/90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        Generate {count > 1 ? `${count} ideas` : "idea"}
      </button>
    </div>
  );
}

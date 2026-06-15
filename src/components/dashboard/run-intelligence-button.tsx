"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { runIntelligenceNowAction } from "@/lib/actions/intelligence";
import { cn } from "@/lib/cn";

type Length = "short" | "long" | "either";
const LENGTHS: { key: Length; label: string }[] = [
  { key: "short", label: "Short" },
  { key: "long", label: "Long" },
  { key: "either", label: "Either" },
];

/** "Generate ideas" — on demand, scouts the niche and lands a batch of scored
    idea-stage videos in the review queue (approve/reject at the Idea gate).
    The length sets each idea's target runtime. */
export function RunIntelligenceButton({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [length, setLength] = useState<Length>("either");
  const router = useRouter();

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5 rounded-full bg-card-warm p-0.5 shadow-card">
          {LENGTHS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLength(l.key)}
              className={cn(
                "rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors",
                length === l.key ? "bg-card text-ink shadow-card" : "text-muted hover:text-ink",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(undefined);
              const r = await runIntelligenceNowAction(projectId, length);
              if (!r.ok && r.error) setError(r.error);
              else router.push(`/projects/${projectId}/review?stage=ideas`);
            })
          }
          className="flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-ink shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Generate ideas
        </button>
      </div>
      {error && <p className="max-w-56 text-right text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

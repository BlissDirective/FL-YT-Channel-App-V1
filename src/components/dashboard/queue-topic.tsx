"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import { queueTopicAction } from "@/lib/actions/pipeline";

/** Type a topic → a real video starts at the IDEA gate (Phase 4 entry). */
export function QueueTopic({ projectId }: { projectId: string }) {
  const [topic, setTopic] = useState("");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () =>
    startTransition(async () => {
      setError(undefined);
      const r = await queueTopicAction(projectId, topic);
      if (!r.ok && r.error) setError(r.error);
      else {
        setTopic("");
        router.push(`/projects/${projectId}/review`);
      }
    });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex w-full gap-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isPending && submit()}
          placeholder="Type a video topic… e.g. 7 money habits that quietly make you rich"
          className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2.5 text-sm shadow-card outline-none placeholder:text-muted/70 focus:border-accent"
        />
        <button
          type="button"
          disabled={isPending || !topic.trim()}
          onClick={submit}
          className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Wand2 className="size-4" />
          )}
          Queue topic
        </button>
      </div>
      {error && <p className="text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

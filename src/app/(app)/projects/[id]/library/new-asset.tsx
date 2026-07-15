"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Loader2, Smartphone, Wand2 } from "lucide-react";
import { queueTopicAction } from "@/lib/actions/pipeline";
import { SHORT_LENGTHS } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { PillTabs } from "@/components/ui/pill-tabs";

type Format = "long" | "short";

const LENGTH_LABEL: Record<number, string> = { 30: "30s", 60: "60s", 120: "2m", 180: "3m" };

/**
 * The Library's one "New asset" door (UI v2 §4): same queueTopicAction as
 * the project page's QueueTopic, but the born asset appears in THIS grid's
 * Ideas section instead of routing away to the review queue. QueueTopic on
 * the project page retires in Phase 7.
 */
export function NewAsset({ projectId }: { projectId: string }) {
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<Format>("long");
  const [lengthSec, setLengthSec] = useState<number>(60);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () =>
    startTransition(async () => {
      setError(undefined);
      const r = await queueTopicAction(
        projectId,
        topic,
        format === "short" ? { kind: "short", targetLengthSec: lengthSec } : undefined,
      );
      if (!r.ok && r.error) setError(r.error);
      else {
        setTopic("");
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <PillTabs
          size="sm"
          ariaLabel="Video format"
          options={[
            {
              label: (
                <>
                  <Clapperboard className="mr-1 inline size-3.5" /> Long-form
                </>
              ),
              value: "long",
            },
            {
              label: (
                <>
                  <Smartphone className="mr-1 inline size-3.5" /> Short
                </>
              ),
              value: "short",
            },
          ]}
          value={format}
          onChange={(v) => setFormat(v as Format)}
        />
        {format === "short" && (
          <PillTabs
            size="sm"
            ariaLabel="Short length"
            options={SHORT_LENGTHS.map((sec) => ({
              label: LENGTH_LABEL[sec],
              value: String(sec),
            }))}
            value={String(lengthSec)}
            onChange={(v) => setLengthSec(Number(v))}
          />
        )}
      </div>

      <div className="flex w-full gap-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isPending && topic.trim() && submit()}
          placeholder={
            format === "short"
              ? "Type a Short topic — it lands in Ideas below"
              : "Type a video topic — it lands in Ideas below"
          }
          className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2.5 text-sm shadow-card outline-none placeholder:text-muted focus:border-accent"
        />
        <Button
          variant="secondary"
          disabled={isPending || !topic.trim()}
          onClick={submit}
          className="shrink-0"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
          New asset
        </Button>
      </div>
      {error && <p className="text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

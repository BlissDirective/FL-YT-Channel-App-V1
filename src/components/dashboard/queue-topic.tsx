"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Loader2, Smartphone, Wand2 } from "lucide-react";
import { queueTopicAction } from "@/lib/actions/pipeline";
import { SHORT_LENGTHS } from "@/lib/db/types";

type Format = "long" | "short";

const LENGTH_LABEL: Record<number, string> = { 30: "30s", 60: "60s", 120: "2m", 180: "3m" };

/** Type a topic → a real video starts at the IDEA gate. Pick Long-form or a
    native Short (vertical, one of the offered lengths). */
export function QueueTopic({ projectId }: { projectId: string }) {
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
        router.push(`/projects/${projectId}/review`);
      }
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-line bg-card p-0.5 shadow-card">
          <FormatTab
            active={format === "long"}
            onClick={() => setFormat("long")}
            icon={<Clapperboard className="size-3.5" />}
            label="Long-form"
          />
          <FormatTab
            active={format === "short"}
            onClick={() => setFormat("short")}
            icon={<Smartphone className="size-3.5" />}
            label="Short"
          />
        </div>
        {format === "short" && (
          <div className="inline-flex rounded-full border border-line bg-card p-0.5 shadow-card">
            {SHORT_LENGTHS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setLengthSec(sec)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  lengthSec === sec ? "bg-accent text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {LENGTH_LABEL[sec]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex w-full gap-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isPending && submit()}
          placeholder={
            format === "short"
              ? "Type a Short topic… e.g. the 1 money mistake that keeps you broke"
              : "Type a video topic… e.g. 7 money habits that quietly make you rich"
          }
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
          {format === "short" ? "Queue Short" : "Queue topic"}
        </button>
      </div>
      {error && <p className="text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

function FormatTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-accent text-ink" : "text-muted hover:text-ink"
      }`}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { History, Pause, Play, Radio } from "lucide-react";
import { cn } from "@/lib/cn";

export type TickerEntry = {
  id: string;
  at: string;
  category: "system" | "needs-action";
  title: string;
  detail?: string;
  href?: string;
};

function relTime(iso: string, now: number): string {
  const d = now - new Date(iso).getTime();
  const m = Math.round(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function Dot({ category }: { category: TickerEntry["category"] }) {
  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        category === "needs-action" ? "bg-accent live-dot" : "bg-sky",
      )}
    />
  );
}

/**
 * Backlot live-activity board (#8): the production timeline. LIVE mode auto-
 * scrolls recent events as a seamless marquee (pauses on hover); REPLAY mode
 * lets you scrub the timeline with a slider or hit play to sweep through the
 * last N events like a director reviewing the day's footage. Fed by real
 * `getFeedEntries()` data — the same stream the Feed page renders.
 */
export function BacklotTicker({ entries }: { entries: TickerEntry[] }) {
  const [mode, setMode] = useState<"live" | "replay">("live");
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const raf = useRef<number>(0);

  // Keep relative times fresh without a server round-trip.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Replay playback: step newest→oldest across ~6s, then stop.
  useEffect(() => {
    if (!playing || mode !== "replay" || entries.length === 0) return;
    let last = performance.now();
    const stepMs = Math.max(350, Math.min(900, 6000 / entries.length));
    const tick = (t: number) => {
      if (t - last >= stepMs) {
        last = t;
        setIdx((i) => {
          if (i >= entries.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, mode, entries.length]);

  if (entries.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-card border border-line bg-card/60 px-4 py-3 text-xs text-muted">
        <Radio className="size-3.5" /> No production activity yet — it lights up
        here the moment an agent starts working.
      </div>
    );
  }

  const current = entries[Math.min(idx, entries.length - 1)];

  return (
    <div className="rounded-card border border-line bg-card/70 shadow-card backdrop-blur-sm">
      {/* header row: LIVE/REPLAY toggle + transport */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent">
            <span className="size-2 rounded-full bg-accent live-dot" />
            Backlot
          </span>
          <span className="text-[11px] text-muted">live production feed</span>
        </div>
        <div className="flex items-center gap-1">
          {mode === "replay" && (
            <button
              type="button"
              onClick={() => {
                if (idx >= entries.length - 1) setIdx(0);
                setPlaying((p) => !p);
              }}
              className="grid size-7 place-items-center rounded-full bg-accent text-on-accent transition-transform hover:scale-105"
              aria-label={playing ? "Pause replay" : "Play replay"}
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
          )}
          <div className="flex items-center rounded-full bg-raised p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("live");
                setPlaying(false);
              }}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors",
                mode === "live" ? "bg-accent text-on-accent" : "text-muted hover:text-ink",
              )}
            >
              <Radio className="size-3" /> Live
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("replay");
                setIdx(0);
              }}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors",
                mode === "replay" ? "bg-accent text-on-accent" : "text-muted hover:text-ink",
              )}
            >
              <History className="size-3" /> Replay
            </button>
          </div>
        </div>
      </div>

      {mode === "live" ? (
        <div className="marquee py-2.5">
          <div className="marquee-track gap-2 px-2">
            {[...entries, ...entries].map((e, i) => (
              <TickerChip key={`${e.id}-${i}`} entry={e} now={now} />
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 py-3">
          <ReplayCard entry={current} now={now} />
          <input
            type="range"
            min={0}
            max={entries.length - 1}
            value={idx}
            onChange={(e) => {
              setPlaying(false);
              setIdx(Number(e.target.value));
            }}
            aria-label="Scrub production timeline"
            className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-raised accent-accent"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted">
            <span>{relTime(entries[entries.length - 1].at, now)}</span>
            <span className="tabular-nums">
              {idx + 1} / {entries.length}
            </span>
            <span>{relTime(entries[0].at, now)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TickerChip({ entry, now }: { entry: TickerEntry; now: number }) {
  const inner = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
        entry.category === "needs-action"
          ? "border-accent/30 bg-accent/[0.06]"
          : "border-line bg-raised",
      )}
    >
      <Dot category={entry.category} />
      <span className="font-medium text-ink">{entry.title}</span>
      <span className="whitespace-nowrap text-[10px] text-muted">{relTime(entry.at, now)}</span>
    </span>
  );
  return entry.href ? (
    <Link href={entry.href} className="transition-transform hover:scale-[1.02]">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function ReplayCard({ entry, now }: { entry: TickerEntry; now: number }) {
  const body = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3",
        entry.category === "needs-action"
          ? "border-accent/30 bg-accent/[0.06]"
          : "border-line bg-raised",
      )}
    >
      <span className="mt-0.5">
        <Dot category={entry.category} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{entry.title}</p>
        {entry.detail && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{entry.detail}</p>}
      </div>
      <span className="shrink-0 text-[10px] text-muted">{relTime(entry.at, now)}</span>
    </div>
  );
  return entry.href ? <Link href={entry.href}>{body}</Link> : body;
}

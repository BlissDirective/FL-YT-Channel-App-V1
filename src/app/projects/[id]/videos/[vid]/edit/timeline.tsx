"use client";

import React, { useRef, useState } from "react";
import {
  introOutroRuntime,
  resolveWordAnchorSec,
  transitionSecOf,
  type EditDocument,
} from "@studio/core";
import { retimeClip } from "@/lib/edd-editor";
import { Card } from "@/components/ui/card";

/**
 * The track lanes (plan §5 layout): V / VO / FX / ♪(gated off, D8) / CC / OV.
 * Blocks are laid out proportionally to the document runtime; clicking
 * selects into the inspector (and seeks the player); dragging a clip's right
 * edge retimes it (gapless reflow via edd-editor.retimeClip).
 */

export type Selection =
  | { type: "clip"; id: string }
  | { type: "page"; index: number }
  | { type: "overlay"; index: number }
  | { type: "audio"; index: number }
  | null;

const SOURCE_COLORS: Record<string, string> = {
  still: "bg-accent/60",
  stock: "bg-emerald-300/70",
  "ai-clip": "bg-sky-300/70",
  dataviz: "bg-violet-300/70",
  stick: "bg-orange-300/70",
};

export function EddTimeline({
  doc,
  selection,
  onSelect,
  onRetime,
  brand,
}: {
  doc: EditDocument;
  selection: Selection;
  onSelect: (sel: Selection, atSec?: number) => void;
  onRetime: (doc: EditDocument) => void;
  brand: { primary: string; secondary: string };
}) {
  const laneRef = useRef<HTMLDivElement>(null);
  const runtime = introOutroRuntime(doc);
  const [drag, setDrag] = useState<{ clipId: string; durationSec: number } | null>(null);

  const pct = (sec: number) => `${Math.max(0, Math.min(100, (sec / runtime) * 100))}%`;
  const widthPct = (sec: number) => `${Math.max(0.4, (sec / runtime) * 100)}%`;

  const startDrag = (e: React.PointerEvent, clipId: string, origDuration: number) => {
    e.preventDefault();
    e.stopPropagation();
    const lane = laneRef.current;
    if (!lane) return;
    const pxPerSec = lane.clientWidth / runtime;
    const startX = e.clientX;
    let next = origDuration;
    const move = (ev: PointerEvent) => {
      next = Math.max(1, origDuration + (ev.clientX - startX) / pxPerSec);
      setDrag({ clipId, durationSec: next });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      if (Math.abs(next - origDuration) > 1 / 30) onRetime(retimeClip(doc, clipId, next));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const ticks: number[] = [];
  const step = runtime > 120 ? 30 : runtime > 40 ? 10 : 5;
  for (let t = 0; t <= runtime; t += step) ticks.push(t);

  const lane = "relative h-9 rounded-lg bg-canvas";
  const label = "w-8 shrink-0 pt-2 text-[10px] font-bold uppercase text-muted";

  return (
    <Card className="space-y-1.5 overflow-x-auto" data-testid="edd-timeline">
      {/* ruler */}
      <div className="flex gap-2">
        <div className={label} />
        <div className="relative h-4 min-w-0 flex-1">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-0 -translate-x-1/2 text-[9px] text-muted"
              style={{ left: pct(t) }}
            >
              {t}s
            </span>
          ))}
        </div>
      </div>

      {/* V — video clips */}
      <div className="flex gap-2">
        <div className={label}>V</div>
        <div ref={laneRef} className={`${lane} min-w-0 flex-1`}>
          {doc.intro.sting && doc.intro.sec > 0 && (
            <div
              className="absolute inset-y-0 rounded-md bg-ink/15 text-center text-[9px] leading-9 text-muted"
              style={{ left: 0, width: widthPct(doc.intro.sec) }}
            >
              sting
            </div>
          )}
          {doc.tracks.video.map((clip) => {
            const dur = drag?.clipId === clip.id ? drag.durationSec : clip.duration;
            const selected = selection?.type === "clip" && selection.id === clip.id;
            const tSec = transitionSecOf(clip.transitionOut);
            return (
              <div
                key={clip.id}
                onClick={() => onSelect({ type: "clip", id: clip.id }, clip.start)}
                className={`absolute inset-y-0 cursor-pointer rounded-md border text-center text-[10px] font-semibold leading-9 ${
                  SOURCE_COLORS[clip.source] ?? "bg-accent/60"
                } ${selected ? "border-ink ring-2 ring-ink/40" : "border-transparent"}`}
                style={{ left: pct(clip.start), width: widthPct(dur) }}
                title={`beat ${clip.beatIdx} · ${dur.toFixed(1)}s · ${clip.motion.kind} · ${clip.transitionOut.kind}`}
              >
                <span className="truncate px-1">
                  b{clip.beatIdx}
                  {clip.silent ? " 🔇" : ""}
                </span>
                {tSec > 0 && (
                  <span
                    className="absolute -right-1 top-0 z-10 rounded bg-ink px-0.5 text-[8px] leading-3 text-white"
                    title={`${clip.transitionOut.kind} ${tSec}s`}
                  >
                    ⤞
                  </span>
                )}
                {/* right-edge retime handle */}
                <span
                  onPointerDown={(e) => startDrag(e, clip.id, clip.duration)}
                  className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize rounded-r-md bg-ink/30 hover:bg-ink/60"
                />
              </div>
            );
          })}
          {doc.outro.endCard && doc.outro.sec > 0 && (
            <div
              className="absolute inset-y-0 rounded-md bg-ink/15 text-center text-[9px] leading-9 text-muted"
              style={{ left: pct(runtime - doc.outro.sec), width: widthPct(doc.outro.sec) }}
            >
              end card
            </div>
          )}
        </div>
      </div>

      {/* VO */}
      <div className="flex gap-2">
        <div className={label}>VO</div>
        <div className={`${lane} min-w-0 flex-1`}>
          {doc.tracks.audio.map((cue, i) =>
            cue.kind === "vo" ? (
              <div
                key={i}
                onClick={() => onSelect({ type: "audio", index: i }, cue.start)}
                className={`absolute inset-y-1 cursor-pointer rounded-md bg-ink/60 ${
                  selection?.type === "audio" && selection.index === i ? "ring-2 ring-ink/40" : ""
                }`}
                style={{
                  left: pct(cue.start),
                  width: widthPct(cue.trim ? cue.trim.out - cue.trim.in : 3),
                }}
                title={`VO ${cue.gainDb}dB`}
              />
            ) : null,
          )}
        </div>
      </div>

      {/* FX */}
      <div className="flex gap-2">
        <div className={label}>FX</div>
        <div className={`${lane} min-w-0 flex-1`}>
          {doc.tracks.audio.map((cue, i) => {
            if (cue.kind !== "sfx") return null;
            const at = resolveWordAnchorSec(doc, cue.at);
            if (at == null) return null;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelect({ type: "audio", index: i }, at)}
                className={`absolute top-1 -translate-x-1/2 text-sm ${
                  selection?.type === "audio" && selection.index === i ? "scale-125" : ""
                }`}
                style={{ left: pct(at) }}
                title={cue.at.kind === "word" ? "word-anchored SFX" : "SFX"}
              >
                {cue.at.kind === "word" ? "▲" : "△"}
              </button>
            );
          })}
        </div>
      </div>

      {/* ♪ — gated off (D8) */}
      <div className="flex gap-2 opacity-50">
        <div className={label}>♪</div>
        <div className={`${lane} min-w-0 flex-1`}>
          <span className="px-2 text-[10px] leading-9 text-muted">
            Music bed — gated off until a licensed library lands (D8)
          </span>
        </div>
      </div>

      {/* CC — caption pages */}
      <div className="flex gap-2">
        <div className={label}>CC</div>
        <div className={`${lane} min-w-0 flex-1`}>
          {doc.tracks.captions.map((p, i) => {
            const emph = p.tokens.some((t) => t.emphasis !== "none");
            return (
              <div
                key={i}
                onClick={() => onSelect({ type: "page", index: i }, p.startMs / 1000)}
                className={`absolute inset-y-1 cursor-pointer truncate rounded-md px-1 text-[9px] leading-7 ${
                  emph ? "bg-accent" : "bg-accent/40"
                } ${selection?.type === "page" && selection.index === i ? "ring-2 ring-ink/40" : ""}`}
                style={{ left: pct(p.startMs / 1000), width: widthPct((p.endMs - p.startMs) / 1000) }}
                title={p.tokens.map((t) => t.text).join(" ")}
              >
                {p.tokens.map((t) => t.text).join(" ")}
              </div>
            );
          })}
        </div>
      </div>

      {/* OV — overlays */}
      <div className="flex gap-2">
        <div className={label}>OV</div>
        <div className={`${lane} min-w-0 flex-1`}>
          {doc.tracks.overlays.map((o, i) => {
            const win =
              o.kind === "highlight"
                ? { start: o.startMs / 1000, len: (o.endMs - o.startMs) / 1000 }
                : o.kind === "lowerThird"
                  ? { start: o.startSec, len: o.durationSec }
                  : { start: 0, len: runtime };
            return (
              <div
                key={i}
                onClick={() => onSelect({ type: "overlay", index: i }, win.start)}
                className={`absolute cursor-pointer truncate rounded-md px-1 text-[9px] font-semibold ${
                  o.kind === "progressBar" ? "bottom-0 h-1.5" : "inset-y-1 leading-7"
                } ${selection?.type === "overlay" && selection.index === i ? "ring-2 ring-ink/40" : ""}`}
                style={{
                  left: pct(win.start),
                  width: widthPct(win.len),
                  backgroundColor: brand.primary,
                }}
                title={o.kind}
              >
                {o.kind !== "progressBar" && (o.kind === "highlight" ? o.text : o.text)}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

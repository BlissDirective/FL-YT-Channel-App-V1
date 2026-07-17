"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Save, Sparkles, Trash2, Zap } from "lucide-react";
import type {
  CuratedHighlight,
  HighlightIntensity,
  HighlightPosition,
  HighlightPreset,
} from "@/lib/db/types";
import {
  curateHighlightsAction,
  saveHighlightsAction,
  setCaptionsEnabledAction,
  setHighlightOptionsAction,
} from "@/lib/actions/pipeline";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const PRESETS: { v: HighlightPreset; label: string }[] = [
  { v: "word-pop", label: "Word pop" },
  { v: "highlight-box-swipe", label: "Highlight box" },
  { v: "stat-card", label: "Stat card" },
  { v: "quote-card", label: "Quote card" },
  { v: "typewriter", label: "Typewriter" },
  { v: "color-flash-pop", label: "Color flash" },
  { v: "sticker-tag", label: "Sticker tag" },
  { v: "underline-swipe", label: "Underline swipe" },
];
const POSITIONS: HighlightPosition[] = ["center", "upper-third", "lower-third-safe"];
const INTENSITIES: HighlightIntensity[] = ["subtle", "med", "high"];

export function HighlightsEditor({
  projectId,
  videoId,
  enabled: enabledProp,
  count: countProp,
  highlights: highlightsProp,
  captions: captionsProp,
  beats,
  defaultFont,
}: {
  projectId: string;
  videoId: string;
  enabled: boolean;
  count: number;
  highlights: CuratedHighlight[];
  captions: boolean;
  beats: { idx: number; text: string }[];
  defaultFont: string;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(enabledProp);
  const [count, setCount] = useState(countProp);
  const [list, setList] = useState<CuratedHighlight[]>(highlightsProp);
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();
  const [curating, startCurate] = useTransition();
  const [opts, startOpts] = useTransition();

  // Re-sync when the server sends fresh highlights (after a generate/refresh),
  // unless the operator has unsaved edits in flight.
  useEffect(() => {
    if (!dirty) setList(highlightsProp);
  }, [highlightsProp, dirty]);

  const pushOptions = (nextEnabled: boolean, nextCount: number) =>
    startOpts(async () => {
      await setHighlightOptionsAction(projectId, videoId, nextEnabled, nextCount);
      router.refresh();
    });

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    pushOptions(next, count);
  };

  const [captionsOn, setCaptionsOn] = useState(captionsProp);
  const toggleCaptions = () => {
    const next = !captionsOn;
    setCaptionsOn(next);
    startOpts(async () => {
      await setCaptionsEnabledAction(projectId, videoId, next);
      router.refresh();
    });
  };

  const generate = () =>
    startCurate(async () => {
      setDirty(false);
      const r = await curateHighlightsAction(projectId, videoId);
      if (!r.ok) alert(r.error ?? "Curation failed");
      router.refresh();
    });

  const update = (id: string, patch: Partial<CuratedHighlight>) => {
    setDirty(true);
    setList((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  };
  const remove = (id: string) => {
    setDirty(true);
    setList((prev) => prev.filter((h) => h.id !== id));
  };
  const add = () => {
    setDirty(true);
    setList((prev) => [
      ...prev,
      {
        id: `hl_${crypto.randomUUID().slice(0, 8)}`,
        beatIdx: beats[0]?.idx ?? 0,
        text: "NEW HIGHLIGHT",
        emphasisWord: "",
        stylePreset: "word-pop",
        fontFamily: defaultFont,
        position: "center",
        intensity: "med",
        maxLines: 2,
      },
    ]);
  };

  const save = () =>
    startSave(async () => {
      const clean = list
        .map((h) => ({ ...h, text: h.text.trim(), emphasisWord: h.emphasisWord?.trim() || undefined }))
        .filter((h) => h.text);
      const r = await saveHighlightsAction(projectId, videoId, clean);
      if (!r.ok) {
        alert(r.error ?? "Save failed");
        return;
      }
      setDirty(false);
      router.refresh();
    });

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-2xl bg-accent-soft text-ink">
            <Zap className="size-4" />
          </span>
          <div>
            <CardTitle>Kinetic highlights</CardTitle>
            <p className="text-xs text-muted">
              Claude-picked bold on-screen moments — a stat, a quote, a hook. Less is more.
            </p>
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={opts}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-card transition-colors disabled:opacity-50",
            enabled ? "bg-raised text-white" : "bg-card-warm text-ink hover:bg-accent-soft",
          )}
        >
          {opts ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          {enabled ? "On" : "Off"}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <div>
          <p className="text-sm font-semibold text-ink">Word captions</p>
          <p className="text-xs text-muted">
            {enabled && captionsOn
              ? "Heads up: captions + highlights both show on screen — turn captions off for a cleaner frame."
              : "Sliding word-window subtitles burned into the video."}
          </p>
        </div>
        <button
          onClick={toggleCaptions}
          disabled={opts}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-card transition-colors disabled:opacity-50",
            captionsOn ? "bg-raised text-white" : "bg-card-warm text-ink hover:bg-accent-soft",
          )}
        >
          {opts ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          {captionsOn ? "On" : "Off"}
        </button>
      </div>

      {enabled && (
        <>
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <label className="flex items-center gap-2 text-xs font-medium text-muted">
              Target count
              <input
                type="number"
                min={0}
                max={12}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                onBlur={() => pushOptions(enabled, count)}
                className="w-16 rounded-full border border-line bg-card px-2 py-0.5 text-[11px] font-semibold text-ink outline-none focus:border-accent"
              />
              <span className="text-[11px] text-muted">(0 = auto)</span>
            </label>
            <button
              onClick={generate}
              disabled={curating}
              className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-on-accent shadow-card disabled:opacity-50"
            >
              {curating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {list.length ? "Regenerate" : "Generate"}
            </button>
          </div>

          {list.length === 0 ? (
            <p className="rounded-card border border-line bg-surface/60 p-3 text-sm text-muted">
              No highlights yet. Hit Generate to have Claude pick the punchiest moments from the
              script — then tweak the wording and style below.
            </p>
          ) : (
            <ul className="space-y-3">
              {list.map((h) => (
                <li
                  key={h.id}
                  className="space-y-2 rounded-card border border-line bg-surface/60 p-3"
                >
                  <div className="flex items-start gap-2">
                    <input
                      value={h.text}
                      onChange={(e) => update(h.id, { text: e.target.value.toUpperCase() })}
                      className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold outline-none focus:border-accent"
                      placeholder="ON-SCREEN PHRASE"
                    />
                    <button
                      onClick={() => remove(h.id)}
                      className="mt-1 text-muted hover:text-red-500"
                      aria-label="Remove highlight"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Field label="Beat">
                      <select
                        value={h.beatIdx}
                        onChange={(e) => update(h.id, { beatIdx: Number(e.target.value) })}
                        className="input"
                      >
                        {beats.map((b) => (
                          <option key={b.idx} value={b.idx}>
                            {b.idx + 1}: {b.text.slice(0, 28)}…
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Emphasis">
                      <input
                        value={h.emphasisWord ?? ""}
                        onChange={(e) => update(h.id, { emphasisWord: e.target.value })}
                        className="input"
                        placeholder="word"
                      />
                    </Field>
                    <Field label="Style">
                      <select
                        value={h.stylePreset}
                        onChange={(e) =>
                          update(h.id, { stylePreset: e.target.value as HighlightPreset })
                        }
                        className="input"
                      >
                        {PRESETS.map((p) => (
                          <option key={p.v} value={p.v}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Position">
                      <select
                        value={h.position}
                        onChange={(e) =>
                          update(h.id, { position: e.target.value as HighlightPosition })
                        }
                        className="input"
                      >
                        {POSITIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
            <button
              onClick={add}
              className="flex items-center gap-1.5 rounded-full bg-card-warm px-3 py-2 text-xs font-semibold text-ink shadow-card hover:bg-accent-soft"
            >
              <Plus className="size-3.5" /> Add
            </button>
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="flex items-center gap-1.5 rounded-full bg-raised px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

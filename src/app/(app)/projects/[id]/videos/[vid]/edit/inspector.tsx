"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  DEFAULT_TRANSITIONS,
  transitionSecOf,
  type EditDocument,
  type Emphasis,
  type MotionSpec,
  type Overlay,
  type Transition,
} from "@studio/core";
import {
  addAudioCue,
  addMotionKeyframe,
  addOverlay,
  heroHoldPreset,
  kenBurnsPreset,
  removeAudioCue,
  removeMotionKeyframe,
  removeOverlay,
  retimeClip,
  setAudioGain,
  setClipSilent,
  setClipSpeed,
  setMotion,
  updateMotionKeyframe,
  setPageStyle,
  setTokenEmphasis,
  setTransition,
  setTrim,
  swapClipAsset,
  updateOverlay,
} from "@/lib/edd-editor";
import { useRouter } from "next/navigation";
import { rerollBeatVisualAction } from "@/lib/actions/pipeline";
import { generateSfxAction } from "@/lib/actions/edit";
import { Card } from "@/components/ui/card";
import type { Selection } from "./timeline";
import type { EditorAssetOption } from "./editor";

/**
 * INSPECTOR (plan §5): edits the selected clip / caption page / overlay /
 * audio cue through the pure edd-editor operations. Every control maps 1:1
 * onto a document field — the inspector never invents state.
 */

const EMPHASES: Emphasis[] = ["none", "pop", "color", "shake", "scale"];
const nextEmphasis = (e: Emphasis): Emphasis => EMPHASES[(EMPHASES.indexOf(e) + 1) % EMPHASES.length];

/** Retiming commits on blur/Enter, NEVER per keystroke — a shrink truncates
    caption pages destructively, so typing "12" must not pass through "1". */
function DurationField({ seed, onCommit }: { seed: number; onCommit: (v: number) => void }) {
  const [buf, setBuf] = useState(String(seed));
  const commit = () => {
    const n = Number(buf);
    if (Number.isFinite(n) && n > 0 && Math.abs(n - seed) > 1 / 60) onCommit(n);
  };
  return (
    <input
      type="number"
      step={0.1}
      min={1}
      value={buf}
      onChange={(e) => setBuf(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      className={inputCls}
      aria-label="duration seconds"
    />
  );
}

const inputCls = "w-20 rounded-lg border border-line bg-canvas px-2 py-1 text-xs";
const selectCls = "rounded-lg border border-line bg-canvas px-2 py-1 text-xs";
const btnCls = "flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold shadow-card disabled:opacity-50";
const rowCls = "flex flex-wrap items-center gap-2";
const labelCls = "w-20 shrink-0 text-[11px] font-semibold text-muted";

export type SfxOption = { id: string; label: string; durationSec?: number };

export function EddInspector({
  doc,
  selection,
  onChange,
  onSelect,
  clipOptions,
  beats,
  projectId,
  videoId,
  brand,
  seekTo,
  sfxOptions,
  sfxLive,
  keyframesEnabled,
}: {
  doc: EditDocument;
  selection: Selection;
  onChange: (doc: EditDocument) => void;
  onSelect: (sel: Selection) => void;
  clipOptions: EditorAssetOption[];
  beats: { idx: number; text: string }[];
  projectId: string;
  videoId: string;
  brand: { primary: string; secondary: string };
  seekTo: (sec: number) => void;
  sfxOptions: SfxOption[];
  sfxLive: boolean;
  keyframesEnabled?: boolean;
}) {
  return (
    <Card className="max-h-[560px] space-y-3 overflow-y-auto" data-testid="edd-inspector">
      <h2 className="text-sm font-semibold">Inspector</h2>
      {selection?.type === "clip" && (
        <ClipPanel
          doc={doc}
          clipId={selection.id}
          onChange={onChange}
          clipOptions={clipOptions}
          beats={beats}
          projectId={projectId}
          videoId={videoId}
          keyframesEnabled={keyframesEnabled}
        />
      )}
      {selection?.type === "page" && (
        <PagePanel doc={doc} index={selection.index} onChange={onChange} seekTo={seekTo} />
      )}
      {selection?.type === "overlay" && (
        <OverlayPanel doc={doc} index={selection.index} onChange={onChange} />
      )}
      {selection?.type === "audio" && (
        <AudioPanel doc={doc} index={selection.index} onChange={onChange} />
      )}
      {!selection && (
        <p className="text-xs text-muted">
          Select a clip, caption page, SFX cue, or overlay in the timeline. Drag a clip&apos;s
          right edge to retime it — everything after reflows gapless.
        </p>
      )}
      <AddOverlayPanel doc={doc} onChange={onChange} onSelect={onSelect} brand={brand} />
      <AddSfxPanel
        doc={doc}
        onChange={onChange}
        onSelect={onSelect}
        projectId={projectId}
        videoId={videoId}
        sfxOptions={sfxOptions}
        sfxLive={sfxLive}
      />
    </Card>
  );
}

// ── Clip ──────────────────────────────────────────────────────────────

function ClipPanel({
  doc,
  clipId,
  onChange,
  clipOptions,
  beats,
  projectId,
  videoId,
  keyframesEnabled,
}: {
  doc: EditDocument;
  clipId: string;
  onChange: (d: EditDocument) => void;
  clipOptions: EditorAssetOption[];
  beats: { idx: number; text: string }[];
  projectId: string;
  videoId: string;
  keyframesEnabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [rerollMsg, setRerollMsg] = useState<string>();
  const clip = doc.tracks.video.find((c) => c.id === clipId);
  if (!clip) return null;
  const beat = beats.find((b) => b.idx === clip.beatIdx);
  const sameBeat = clipOptions.filter((o) => o.beatIdx === clip.beatIdx);
  const others = clipOptions.filter((o) => o.beatIdx !== clip.beatIdx);
  const t = clip.transitionOut;

  return (
    <div className="space-y-2 border-b border-line pb-3">
      <p className="text-xs font-semibold">
        Clip {clip.id} · beat {clip.beatIdx}
      </p>
      {beat && <p className="line-clamp-2 text-[11px] text-muted">{beat.text}</p>}

      <div className={rowCls}>
        <span className={labelCls}>Timing</span>
        <span className="text-[11px] text-muted">start {clip.start.toFixed(2)}s</span>
        <DurationField
          key={`${clip.id}:${clip.duration}`}
          seed={Number(clip.duration.toFixed(2))}
          onCommit={(v) => onChange(retimeClip(doc, clipId, v))}
        />
        <span className="text-[11px] text-muted">s</span>
      </div>

      <div className={rowCls}>
        <span className={labelCls}>Trim</span>
        <input
          type="number"
          step={0.1}
          min={0}
          value={Number(clip.trim.in.toFixed(2))}
          onChange={(e) => onChange(setTrim(doc, clipId, Number(e.target.value), clip.trim.out))}
          className={inputCls}
          aria-label="trim in"
        />
        <span className="text-[11px] text-muted">→</span>
        <input
          type="number"
          step={0.1}
          min={0}
          value={Number(clip.trim.out.toFixed(2))}
          onChange={(e) => onChange(setTrim(doc, clipId, clip.trim.in, Number(e.target.value)))}
          className={inputCls}
          aria-label="trim out"
        />
        <span className="text-[11px] text-muted">source window (loops when shorter)</span>
      </div>

      <div className={rowCls}>
        <span className={labelCls}>Motion</span>
        <select
          value={clip.motion.kind}
          onChange={(e) => {
            const kind = e.target.value;
            const m: MotionSpec =
              kind === "none"
                ? { kind: "none" }
                : kind === "kenburns"
                  ? kenBurnsPreset()
                  : kind === "heroHold"
                    ? heroHoldPreset()
                    : {
                        kind: "keyframes",
                        points: [
                          { t: 0, scale: 1.02, x: 0, y: 0, ease: "easeInOut" },
                          { t: clip.duration, scale: 1.12, x: 0, y: 0, ease: "easeInOut" },
                        ],
                      };
            onChange(setMotion(doc, clipId, m));
          }}
          className={selectCls}
        >
          <option value="none">none</option>
          <option value="kenburns">ken burns</option>
          <option value="heroHold">hero hold</option>
          <option value="keyframes">keyframes</option>
        </select>
        <button type="button" className={btnCls} onClick={() => onChange(setMotion(doc, clipId, kenBurnsPreset()))}>
          Ken Burns
        </button>
        <button type="button" className={btnCls} onClick={() => onChange(setMotion(doc, clipId, heroHoldPreset()))}>
          Hero hold
        </button>
      </div>
      {clip.motion.kind === "kenburns" && (
        <div className={rowCls}>
          <span className={labelCls}>Zoom</span>
          <input
            type="number"
            step={0.01}
            value={clip.motion.fromScale}
            onChange={(e) =>
              clip.motion.kind === "kenburns" &&
              onChange(setMotion(doc, clipId, { ...clip.motion, fromScale: Number(e.target.value) }))
            }
            className={inputCls}
          />
          <span className="text-[11px] text-muted">→</span>
          <input
            type="number"
            step={0.01}
            value={clip.motion.toScale}
            onChange={(e) =>
              clip.motion.kind === "kenburns" &&
              onChange(setMotion(doc, clipId, { ...clip.motion, toScale: Number(e.target.value) }))
            }
            className={inputCls}
          />
          <select
            value={clip.motion.anchor}
            onChange={(e) =>
              clip.motion.kind === "kenburns" &&
              onChange(
                setMotion(doc, clipId, {
                  ...clip.motion,
                  anchor: e.target.value as typeof clip.motion.anchor,
                }),
              )
            }
            className={selectCls}
          >
            {["center", "top", "bottom", "left", "right"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
      )}
      {clip.motion.kind === "keyframes" && (
        <div className="space-y-1">
          {clip.motion.points.map((p, i) => (
            <div key={i} className={rowCls}>
              <span className={labelCls}>t={p.t.toFixed(1)}s</span>
              {(["scale", "x", "y"] as const).map((f) => (
                <label key={f} className="flex items-center gap-1 text-[10px] text-muted">
                  {f}
                  <input
                    type="number"
                    step={f === "scale" ? 0.01 : 0.5}
                    value={p[f]}
                    onChange={(e) => {
                      if (clip.motion.kind !== "keyframes") return;
                      const points = clip.motion.points.map((q, j) =>
                        j === i ? { ...q, [f]: Number(e.target.value) } : q,
                      );
                      onChange(setMotion(doc, clipId, { kind: "keyframes", points }));
                    }}
                    className="w-14 rounded-lg border border-line bg-canvas px-1.5 py-0.5 text-xs"
                  />
                </label>
              ))}
              {/* R5 keyframe editor: per-point ease + delete (flag-gated) */}
              {keyframesEnabled && (
                <>
                  <select
                    value={p.ease}
                    onChange={(e) => onChange(updateMotionKeyframe(doc, clipId, i, { ease: e.target.value as typeof p.ease }))}
                    className="rounded-lg border border-line bg-canvas px-1 py-0.5 text-[10px]"
                    aria-label="ease"
                  >
                    {["linear", "easeIn", "easeOut", "easeInOut"].map((ez) => (
                      <option key={ez} value={ez}>{ez}</option>
                    ))}
                  </select>
                  {clip.motion.kind === "keyframes" && clip.motion.points.length > 2 && (
                    <button
                      type="button"
                      onClick={() => onChange(removeMotionKeyframe(doc, clipId, i))}
                      className="text-muted hover:text-coral"
                      aria-label="remove keyframe"
                    >
                      ×
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
          {keyframesEnabled && (
            <button
              type="button"
              className={btnCls}
              onClick={() => {
                if (clip.motion.kind !== "keyframes") return;
                const pts = clip.motion.points;
                const scale = (pts[0].scale + pts[pts.length - 1].scale) / 2;
                onChange(addMotionKeyframe(doc, clipId, { t: clip.duration / 2, scale, x: 0, y: 0, ease: "easeInOut" }));
              }}
            >
              ＋ keyframe
            </button>
          )}
        </div>
      )}

      {/* R5 speed ramp — footage only (flag-gated) */}
      {keyframesEnabled && (clip.source === "ai-clip" || clip.source === "stock") && (
        <div className={rowCls}>
          <span className={labelCls}>Speed</span>
          <select
            value={clip.speed ?? 1}
            onChange={(e) => onChange(setClipSpeed(doc, clipId, Number(e.target.value)))}
            className={selectCls}
          >
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
              <option key={s} value={s}>{s}×</option>
            ))}
          </select>
          <span className="text-[11px] text-muted">footage playback</span>
        </div>
      )}

      <div className={rowCls}>
        <span className={labelCls}>Transition</span>
        <select
          value={t.kind}
          onChange={(e) => {
            const kind = e.target.value;
            const tr: Transition =
              kind === "cut"
                ? { kind: "cut" }
                : kind === "slide"
                  ? { kind: "slide", sec: 0.5, dir: "left" }
                  : ({ kind, sec: Math.min(0.5, DEFAULT_TRANSITIONS[kind]?.maxSec ?? 0.5) } as Transition);
            onChange(setTransition(doc, clipId, tr));
          }}
          className={selectCls}
        >
          {Object.keys(DEFAULT_TRANSITIONS).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        {t.kind !== "cut" && (
          <input
            type="number"
            step={0.1}
            min={0}
            max={DEFAULT_TRANSITIONS[t.kind]?.maxSec ?? 1.5}
            value={transitionSecOf(t)}
            onChange={(e) =>
              onChange(setTransition(doc, clipId, { ...t, sec: Number(e.target.value) } as Transition))
            }
            className={inputCls}
            aria-label="transition seconds"
          />
        )}
        {t.kind === "slide" && "dir" in t && (
          <select
            value={t.dir}
            onChange={(e) =>
              onChange(setTransition(doc, clipId, { ...t, dir: e.target.value as typeof t.dir }))
            }
            className={selectCls}
          >
            {["left", "right", "up", "down"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      <div className={rowCls}>
        <span className={labelCls}>Narration</span>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={Boolean(clip.silent)}
            onChange={(e) => onChange(setClipSilent(doc, clipId, e.target.checked))}
          />
          intentional pause (mutes this beat&apos;s VO)
        </label>
      </div>

      <div className="space-y-1.5">
        <span className={labelCls}>Visual</span>
        <div className="grid grid-cols-3 gap-1.5">
          {[...sameBeat, ...others.slice(0, 6)].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() =>
                onChange(swapClipAsset(doc, clipId, { id: o.id, source: o.source, durationSec: o.durationSec }))
              }
              className={`relative aspect-video overflow-hidden rounded-lg border text-left ${
                clip.assetId === o.id ? "border-ink ring-2 ring-ink/40" : "border-line"
              }`}
              title={`beat ${o.beatIdx} · ${o.source}`}
            >
              {o.previewUrl ? (
                o.isVideo ? (
                  <video src={o.previewUrl} muted className="size-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.previewUrl} alt="" className="size-full object-cover" />
                )
              ) : (
                <span className="grid size-full place-items-center bg-canvas text-[9px] text-muted">
                  {o.source}
                </span>
              )}
              <span className="absolute bottom-0 left-0 rounded-tr bg-ink/70 px-1 text-[8px] text-white">
                b{o.beatIdx}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={isPending}
          className={btnCls}
          onClick={() =>
            startTransition(async () => {
              setRerollMsg(undefined);
              const r = await rerollBeatVisualAction(projectId, videoId, clip.beatIdx);
              setRerollMsg(
                r.ok
                  ? "Re-roll queued — a new visual lands in the picker shortly (reload to see it)."
                  : (r.error ?? "re-roll failed"),
              );
            })
          }
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
          Regenerate visual (request_visual)
        </button>
        {rerollMsg && <p className="text-[10px] text-muted">{rerollMsg}</p>}
      </div>
    </div>
  );
}

// ── Caption page ──────────────────────────────────────────────────────

function PagePanel({
  doc,
  index,
  onChange,
  seekTo,
}: {
  doc: EditDocument;
  index: number;
  onChange: (d: EditDocument) => void;
  seekTo: (sec: number) => void;
}) {
  const page = doc.tracks.captions[index];
  if (!page) return null;
  return (
    <div className="space-y-2 border-b border-line pb-3">
      <p className="text-xs font-semibold">
        Caption page · {(page.startMs / 1000).toFixed(1)}–{(page.endMs / 1000).toFixed(1)}s
      </p>
      <div className={rowCls}>
        <span className={labelCls}>Style</span>
        <select
          value={page.style}
          onChange={(e) => onChange(setPageStyle(doc, index, { style: e.target.value }))}
          className={selectCls}
        >
          <option value="clean">clean</option>
        </select>
        <select
          value={page.position}
          onChange={(e) =>
            onChange(setPageStyle(doc, index, { position: e.target.value as typeof page.position }))
          }
          className={selectCls}
        >
          {["bottom", "center", "top"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <p className="text-[10px] text-muted">Click a word to cycle its kinetic emphasis:</p>
      <div className="flex flex-wrap gap-1">
        {page.tokens.map((tok, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              onChange(setTokenEmphasis(doc, index, i, nextEmphasis(tok.emphasis)));
              seekTo(tok.fromMs / 1000);
            }}
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              tok.emphasis === "none" ? "bg-canvas" : "bg-accent"
            }`}
            title={tok.emphasis}
          >
            {tok.text}
            {tok.emphasis !== "none" && <span className="ml-1 text-[9px] text-muted">{tok.emphasis}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Overlay ───────────────────────────────────────────────────────────

function OverlayPanel({
  doc,
  index,
  onChange,
}: {
  doc: EditDocument;
  index: number;
  onChange: (d: EditDocument) => void;
}) {
  const o = doc.tracks.overlays[index];
  if (!o) return null;
  const patch = (next: Overlay) => onChange(updateOverlay(doc, index, next));
  return (
    <div className="space-y-2 border-b border-line pb-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">Overlay · {o.kind}</p>
        <button type="button" className={btnCls} onClick={() => onChange(removeOverlay(doc, index))}>
          <Trash2 className="size-3" /> Remove
        </button>
      </div>
      {o.kind === "highlight" && (
        <>
          <input
            value={o.text}
            onChange={(e) => patch({ ...o, text: e.target.value })}
            className="w-full rounded-lg border border-line bg-canvas px-2 py-1 text-xs"
          />
          <div className={rowCls}>
            <span className={labelCls}>Window</span>
            <input
              type="number"
              step={0.1}
              value={Number((o.startMs / 1000).toFixed(1))}
              onChange={(e) => {
                const startMs = Math.round(Number(e.target.value) * 1000);
                patch({ ...o, startMs, endMs: startMs + (o.endMs - o.startMs), anchor: { kind: "abs", sec: startMs / 1000 } });
              }}
              className={inputCls}
            />
            <span className="text-[11px] text-muted">for</span>
            <input
              type="number"
              step={0.1}
              value={Number(((o.endMs - o.startMs) / 1000).toFixed(1))}
              onChange={(e) => patch({ ...o, endMs: o.startMs + Math.round(Number(e.target.value) * 1000) })}
              className={inputCls}
            />
            <span className="text-[11px] text-muted">s · style {o.style}</span>
          </div>
        </>
      )}
      {o.kind === "lowerThird" && (
        <>
          <input
            value={o.text}
            onChange={(e) => patch({ ...o, text: e.target.value })}
            className="w-full rounded-lg border border-line bg-canvas px-2 py-1 text-xs"
          />
          <input
            value={o.sub ?? ""}
            placeholder="sub line (optional)"
            onChange={(e) => patch({ ...o, sub: e.target.value || undefined })}
            className="w-full rounded-lg border border-line bg-canvas px-2 py-1 text-xs"
          />
          <div className={rowCls}>
            <span className={labelCls}>Window</span>
            <input
              type="number"
              step={0.1}
              value={o.startSec}
              onChange={(e) => patch({ ...o, startSec: Number(e.target.value) })}
              className={inputCls}
            />
            <span className="text-[11px] text-muted">for</span>
            <input
              type="number"
              step={0.1}
              value={o.durationSec}
              onChange={(e) => patch({ ...o, durationSec: Number(e.target.value) })}
              className={inputCls}
            />
            <span className="text-[11px] text-muted">s</span>
          </div>
        </>
      )}
      {o.kind === "progressBar" && (
        <p className="text-[11px] text-muted">Thin retention bar along the bottom edge, full runtime.</p>
      )}
    </div>
  );
}

// ── Audio cue ─────────────────────────────────────────────────────────

function AudioPanel({
  doc,
  index,
  onChange,
}: {
  doc: EditDocument;
  index: number;
  onChange: (d: EditDocument) => void;
}) {
  const cue = doc.tracks.audio[index];
  if (!cue || cue.kind === "music") return null;
  return (
    <div className="space-y-2 border-b border-line pb-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">{cue.kind === "vo" ? "Voice-over cue" : "SFX cue"}</p>
        {cue.kind === "sfx" && (
          <button type="button" className={btnCls} onClick={() => onChange(removeAudioCue(doc, index))}>
            <Trash2 className="size-3" /> Remove
          </button>
        )}
      </div>
      <div className={rowCls}>
        <span className={labelCls}>Gain</span>
        <input
          type="number"
          step={1}
          min={-60}
          max={12}
          value={cue.gainDb}
          onChange={(e) => onChange(setAudioGain(doc, index, Number(e.target.value)))}
          className={inputCls}
        />
        <span className="text-[11px] text-muted">dB</span>
      </div>
      {cue.kind === "sfx" && (
        <p className="text-[10px] text-muted">
          {cue.at.kind === "word"
            ? `anchored to caption token #${cue.at.captionToken} of clip ${cue.at.clipId} (survives retiming)`
            : `at ${cue.at.sec.toFixed(2)}s`}
        </p>
      )}
    </div>
  );
}

// ── Add: overlays + SFX ───────────────────────────────────────────────

function AddOverlayPanel({
  doc,
  onChange,
  onSelect,
  brand,
}: {
  doc: EditDocument;
  onChange: (d: EditDocument) => void;
  onSelect: (sel: Selection) => void;
  brand: { primary: string; secondary: string };
}) {
  const hasProgress = doc.tracks.overlays.some((o) => o.kind === "progressBar");
  const add = (o: Overlay) => {
    onChange(addOverlay(doc, o));
    onSelect({ type: "overlay", index: doc.tracks.overlays.length });
  };
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-muted">Add overlay</p>
      <div className={rowCls}>
        <button
          type="button"
          className={btnCls}
          onClick={() =>
            add({
              kind: "highlight",
              text: "BIG MOMENT",
              startMs: Math.round(doc.intro.sec * 1000) + 500,
              endMs: Math.round(doc.intro.sec * 1000) + 2500,
              style: "word-pop",
              anchor: { kind: "abs", sec: doc.intro.sec + 0.5 },
              emphasisColor: brand.primary,
            })
          }
        >
          <Plus className="size-3" /> Highlight
        </button>
        <button
          type="button"
          className={btnCls}
          onClick={() =>
            add({ kind: "lowerThird", text: "Lower third", startSec: doc.intro.sec + 1, durationSec: 4 })
          }
        >
          <Plus className="size-3" /> Lower third
        </button>
        <button
          type="button"
          disabled={hasProgress}
          className={btnCls}
          onClick={() => add({ kind: "progressBar", style: "bar" })}
        >
          <Plus className="size-3" /> Progress bar
        </button>
      </div>
    </div>
  );
}

/** Generated SFX (Phase D, D7): mint a sound with ElevenLabs, then place it
    as an absolute-time cue. Word anchoring stays available on the cue itself
    (schema + renderer support it; the agent's add_sfx uses it). */
function AddSfxPanel({
  doc,
  onChange,
  onSelect,
  projectId,
  videoId,
  sfxOptions,
  sfxLive,
}: {
  doc: EditDocument;
  onChange: (d: EditDocument) => void;
  onSelect: (sel: Selection) => void;
  projectId: string;
  videoId: string;
  sfxOptions: SfxOption[];
  sfxLive: boolean;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generating, startGenerate] = useTransition();
  const [assetId, setAssetId] = useState(sfxOptions[0]?.id ?? "");
  const [atSec, setAtSec] = useState(Math.round((doc.intro.sec + 1) * 10) / 10);

  if (!sfxLive && sfxOptions.length === 0) {
    return (
      <p className="text-[10px] text-muted">
        Generated SFX needs ElevenLabs configured (D7); the curated library arrives with a licensed pack.
      </p>
    );
  }

  const generate = () =>
    startGenerate(async () => {
      setError(null);
      const r = await generateSfxAction(projectId, videoId, prompt);
      if (!r.ok) setError(r.error ?? "generation failed");
      else {
        setPrompt("");
        if (r.assetId) setAssetId(r.assetId);
        router.refresh(); // pulls the new asset into the options + player map
      }
    });

  const place = () => {
    const chosen = sfxOptions.find((o) => o.id === assetId) ?? sfxOptions[0];
    if (!chosen) return;
    onChange(
      addAudioCue(doc, {
        kind: "sfx",
        ref: { source: "generated", assetId: chosen.id },
        at: { kind: "abs", sec: Math.max(0, atSec) },
        gainDb: -6,
      }),
    );
    onSelect({ type: "audio", index: doc.tracks.audio.length });
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-muted">Sound effects</p>
      {sfxLive && (
        <div className={rowCls}>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='e.g. "deep cinematic whoosh"'
            className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-2 py-1 text-xs"
          />
          <button type="button" disabled={generating || prompt.trim().length < 3} className={btnCls} onClick={generate}>
            {generating ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />} Generate
          </button>
        </div>
      )}
      {sfxOptions.length > 0 && (
        <div className={rowCls}>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className={`${selectCls} max-w-[160px]`}>
            {sfxOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-muted">at</span>
          <input
            type="number"
            step={0.1}
            min={0}
            value={atSec}
            onChange={(e) => setAtSec(Number(e.target.value))}
            className={inputCls}
          />
          <span className="text-[11px] text-muted">s</span>
          <button type="button" className={btnCls} onClick={place}>
            <Plus className="size-3" /> Place cue
          </button>
        </div>
      )}
      {error && <p className="text-[10px] font-medium text-coral">{error}</p>}
      {sfxLive && sfxOptions.length === 0 && !error && (
        <p className="text-[10px] text-muted">Describe a sound and Generate — it appears here for placement.</p>
      )}
    </div>
  );
}

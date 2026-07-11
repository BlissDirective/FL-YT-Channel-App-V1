"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Player, type PlayerRef } from "@remotion/player";
import {
  Check,
  Clapperboard,
  History,
  Loader2,
  RotateCcw,
  Save,
} from "lucide-react";
import {
  DEFAULT_CAPTION_STYLES,
  DEFAULT_OVERLAY_STYLES,
  DEFAULT_TRANSITIONS,
  introOutroRuntime,
  validateEdd,
  type EddContext,
  type EddSource,
  type EditDocument,
} from "@studio/core";
import { EddVideo, FPS, type EddPayload, type VideoProps } from "@studio/render/src/player";
import {
  approveCutAction,
  deactivateEddAction,
  requestPreviewAction,
  revertEddAction,
  saveEddAction,
} from "@/lib/actions/edit";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { EddTimeline, type Selection } from "./timeline";
import { EddInspector } from "./inspector";

/**
 * The /edit editor (MVDA Phase B, plan §5): PREVIEW <Player> + INSPECTOR on
 * top, track lanes beneath, version strip at the bottom. All edits are local
 * document operations (src/lib/edd-editor.ts) validated LIVE with the same
 * validateEdd the compiler/agent go through; Save appends a version (A9
 * optimistic concurrency) and activates it; Approve cut resolves the CUT
 * gate through the existing decideGate machinery.
 */

export type EditorVersion = {
  version: number;
  author: string;
  status: string;
  note: string;
  createdAt: string;
  inputsStale: boolean;
  active: boolean;
  summary: string[];
};

export type EditorAssetOption = {
  id: string;
  beatIdx: number;
  provider: string;
  isVideo: boolean;
  durationSec?: number;
  previewUrl: string | null;
  source: EddSource;
};

export function EddEditor(props: {
  projectId: string;
  videoId: string;
  title: string;
  projectName: string;
  brand: { primary: string; secondary: string };
  initialDoc: EditDocument;
  headVersion: number;
  activeVersion: number | null;
  versions: EditorVersion[];
  maps: Pick<EddPayload, "media" | "audio" | "beatText" | "sfxLibrary">;
  clipOptions: EditorAssetOption[];
  beats: { idx: number; text: string }[];
  ctxAssets: { id: string; kind: string; durationSec?: number }[];
  atCutGate: boolean;
  pendingPreview: boolean;
  previews: { url: string; meta: { eddVersion?: number; fromSec?: number; toSec?: number }; createdAt: string }[];
  captionsEnabled: boolean;
}) {
  const router = useRouter();
  const playerRef = useRef<PlayerRef>(null);
  const [doc, setDoc] = useState<EditDocument>(props.initialDoc);
  const [dirty, setDirty] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [note, setNote] = useState("");
  const [banner, setBanner] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const applyDoc = useCallback((next: EditDocument) => {
    setDoc(next);
    setDirty(true);
    setBanner(null);
  }, []);

  // Live validation with the exact production validator.
  const ctx: EddContext = useMemo(
    () => ({
      assets: props.ctxAssets,
      beats: props.beats.map((b) => ({ idx: b.idx, hasText: b.text.trim().length > 0 })),
      transitions: DEFAULT_TRANSITIONS,
      // The SAME registries the server-side validator uses — a hardcoded copy
      // here would let client and server validation drift.
      captionStyles: new Set<string>(DEFAULT_CAPTION_STYLES),
      sfxLibrary: new Set(Object.keys(props.maps.sfxLibrary ?? {})),
      overlayStyles: new Set<string>(DEFAULT_OVERLAY_STYLES),
      musicEnabled: false,
      toleranceSec: Number.POSITIVE_INFINITY, // human edits re-pin the target on save
    }),
    [props.ctxAssets, props.beats, props.maps.sfxLibrary],
  );
  const validation = useMemo(() => validateEdd(doc, ctx), [doc, ctx]);

  const runtime = introOutroRuntime(doc);
  const vertical = doc.meta.aspect === "9:16";
  const playerProps: VideoProps = useMemo(
    () => ({
      title: props.title,
      projectName: props.projectName,
      brand: props.brand,
      beats: [],
      captions: props.captionsEnabled,
      introPhrase: props.title,
      edd: { version: props.headVersion, doc, ...props.maps },
    }),
    [doc, props],
  );

  const act = (fn: () => Promise<{ ok: boolean; error?: string; version?: number }>, okText: string) =>
    startTransition(async () => {
      setBanner(null);
      const r = await fn();
      if (!r.ok) setBanner({ tone: "error", text: r.error ?? "failed" });
      else {
        setBanner({ tone: "ok", text: okText + (r.version ? ` (v${r.version})` : "") });
        setDirty(false);
        router.refresh();
      }
    });

  const save = () =>
    act(
      () => saveEddAction(props.projectId, props.videoId, doc, props.headVersion, note),
      "Saved & activated",
    );

  return (
    <div className="space-y-3" data-testid="edd-editor">
      {/* ── Header bar ── */}
      <Card className="flex flex-wrap items-center gap-3 py-3">
        <Clapperboard className="size-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cut editor</p>
          <p className="truncate text-sm font-semibold">
            {props.title}
            <span className="ml-2 text-xs font-medium text-muted">
              {runtime.toFixed(1)}s · v{props.headVersion}
              {props.activeVersion == null && " · legacy render active"}
              {dirty && " · unsaved changes"}
            </span>
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What changed? (version note)"
            className="w-48 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs"
          />
          <button
            type="button"
            disabled={isPending || !dirty || !validation.ok}
            onClick={save}
            className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-ink shadow-card disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save version
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => act(() => requestPreviewAction(props.projectId, props.videoId), "Preview queued — the farm renders it within minutes")}
            className="rounded-full bg-canvas px-3.5 py-2 text-xs font-semibold shadow-card disabled:opacity-50"
          >
            Render preview
          </button>
          {props.activeVersion != null && (
            <button
              type="button"
              disabled={isPending}
              title="Escape hatch: render this video from the legacy beat derivation again (the versions stay)"
              onClick={() =>
                act(() => deactivateEddAction(props.projectId, props.videoId), "Back on the legacy render path")
              }
              className="rounded-full bg-canvas px-3.5 py-2 text-xs font-semibold text-muted shadow-card disabled:opacity-50"
            >
              Use legacy render
            </button>
          )}
          <button
            type="button"
            disabled={isPending || !props.atCutGate || dirty}
            title={
              !props.atCutGate
                ? "The video is not waiting at the Cut gate"
                : dirty
                  ? "Save your changes first"
                  : "Approve this cut"
            }
            onClick={() => act(() => approveCutAction(props.projectId, props.videoId), "Cut approved — rendering")}
            className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white shadow-card disabled:opacity-40"
          >
            <Check className="size-3.5" /> Approve cut
          </button>
        </div>
      </Card>

      {banner && (
        <div
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            banner.tone === "error" ? "bg-coral/10 text-coral" : "bg-accent-soft text-ink"
          }`}
        >
          {banner.text}
        </div>
      )}
      {!validation.ok && (
        <div className="rounded-xl bg-coral/10 px-3 py-2 text-xs font-medium text-coral">
          {validation.errors.slice(0, 3).map((e) => `${e.rule}: ${e.msg}`).join(" · ")}
          {validation.errors.length > 3 && ` · +${validation.errors.length - 3} more`}
        </div>
      )}
      {props.versions[0]?.inputsStale && (
        <div className="rounded-xl bg-coral/10 px-3 py-2 text-xs font-medium text-coral">
          Inputs changed under this cut (script or assets were regenerated) — re-check clips
          before approving.
        </div>
      )}

      {/* ── Preview + inspector ── */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden p-0">
          <div className={vertical ? "mx-auto max-w-[320px]" : ""}>
            <Player
              ref={playerRef}
              component={EddVideo}
              inputProps={playerProps}
              durationInFrames={Math.max(1, Math.round(runtime * FPS))}
              compositionWidth={vertical ? 1080 : 1920}
              compositionHeight={vertical ? 1920 : 1080}
              fps={FPS}
              controls
              loop
              style={{ width: "100%" }}
              acknowledgeRemotionLicense
            />
          </div>
          {(props.previews.length > 0 || props.pendingPreview) && (
            <div className="flex items-center gap-3 border-t border-line px-3 py-2 text-xs text-muted">
              <span className="font-semibold">True-fidelity previews:</span>
              {props.previews.map((p, i) => (
                <a key={i} href={p.url} target="_blank" rel="noreferrer" className="underline">
                  v{p.meta.eddVersion ?? "?"}
                  {p.meta.toSec != null ? ` (${p.meta.fromSec ?? 0}–${p.meta.toSec}s)` : ""}
                </a>
              ))}
              {props.pendingPreview && <span>one rendering on the farm…</span>}
            </div>
          )}
        </Card>
        <EddInspector
          doc={doc}
          selection={selection}
          onChange={applyDoc}
          onSelect={setSelection}
          clipOptions={props.clipOptions}
          beats={props.beats}
          projectId={props.projectId}
          videoId={props.videoId}
          brand={props.brand}
          seekTo={(sec) => playerRef.current?.seekTo(Math.round(sec * FPS))}
        />
      </div>

      {/* ── Track lanes ── */}
      <EddTimeline
        doc={doc}
        selection={selection}
        onSelect={(sel, atSec) => {
          setSelection(sel);
          if (atSec != null) playerRef.current?.seekTo(Math.round(atSec * FPS));
        }}
        onRetime={applyDoc}
        brand={props.brand}
      />

      {/* ── Version history ── */}
      <Card className="space-y-2">
        <div className="flex items-center gap-2">
          <History className="size-4" />
          <h2 className="text-sm font-semibold">Versions</h2>
        </div>
        <ul className="divide-y divide-line">
          {props.versions.map((ver) => (
            <li key={ver.version} className="flex flex-wrap items-center gap-2 py-2 text-xs">
              <span className="font-semibold">v{ver.version}</span>
              <StatusChip tone={ver.author === "human" ? "success" : "neutral"}>{ver.author}</StatusChip>
              {ver.active && <StatusChip tone="success">active</StatusChip>}
              {ver.inputsStale && <StatusChip tone="warning">inputs stale</StatusChip>}
              <span className="text-muted">{ver.note}</span>
              <span className="ml-auto text-muted">{ver.summary.join(" · ")}</span>
              {ver.version !== props.headVersion && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    act(
                      () => revertEddAction(props.projectId, props.videoId, ver.version),
                      `Reverted to v${ver.version}`,
                    )
                  }
                  className="flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 font-semibold shadow-card disabled:opacity-50"
                >
                  <RotateCcw className="size-3" /> Revert
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

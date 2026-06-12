"use client";

import { useRef, useState, useTransition } from "react";
import {
  Check,
  Loader2,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  X,
} from "lucide-react";
import type { ApprovalGate } from "@studio/core";
import type { ScriptBeat } from "@/lib/db/types";
import {
  approveGateAction,
  editScriptBeatAction,
  editVideoMetadataAction,
} from "@/lib/actions/pipeline";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { BeatAudio } from "./page";

type ScriptData = {
  version: number;
  beats: ScriptBeat[];
  runtimeSec: number | null;
  metadata: {
    titles?: string[];
    description?: string;
    tags?: string[];
    chapters?: { at: number; label: string }[];
  };
};

export function ScriptReview({
  projectId,
  videoId,
  videoTitle,
  script,
  beatAudio,
  atGate,
}: {
  projectId: string;
  videoId: string;
  videoTitle: string;
  script: ScriptData;
  beatAudio: BeatAudio[];
  atGate: ApprovalGate | null;
}) {
  const [error, setError] = useState<string>();
  const hasAudio = beatAudio.some((b) => b.url);

  return (
    <div className="space-y-6">
      {!hasAudio && (
        <Card className="bg-card-warm">
          <p className="text-sm text-muted">
            Voiceover appears here after the script gate is approved (the
            asset stage synthesizes audio for each section). You can still
            read and edit the script now.
          </p>
        </Card>
      )}

      <Card>
        <CardTitle>Script</CardTitle>
        <div className="space-y-4">
          {script.beats.map((beat) => (
            <BeatBlock
              key={`${script.version}-${beat.idx}`}
              projectId={projectId}
              videoId={videoId}
              beat={beat}
              audio={beatAudio.find((b) => b.idx === beat.idx)}
              onError={setError}
            />
          ))}
        </div>
      </Card>

      <MetadataEditor
        projectId={projectId}
        videoId={videoId}
        videoTitle={videoTitle}
        metadata={script.metadata}
        onError={setError}
      />

      {error && (
        <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm font-medium text-coral">
          {error}
        </p>
      )}

      {atGate === "SCRIPT" && (
        <ApproveBar projectId={projectId} videoId={videoId} onError={setError} />
      )}
    </div>
  );
}

// ── One script beat: synced playback + inline editing ─────────────────

function BeatBlock({
  projectId,
  videoId,
  beat,
  audio,
  onError,
}: {
  projectId: string;
  videoId: string;
  beat: ScriptBeat;
  audio?: BeatAudio;
  onError: (e?: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [activeWord, setActiveWord] = useState(-1);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(beat.text);
  const [isPending, startTransition] = useTransition();

  const words = audio?.words ?? [];

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play();
  };

  const onTime = () => {
    const t = audioRef.current?.currentTime ?? 0;
    // linear scan is fine at ~200 words/beat
    let idx = -1;
    for (let i = 0; i < words.length; i++) {
      if (t >= words[i].start) idx = i;
      else break;
    }
    setActiveWord(idx);
  };

  const save = () =>
    startTransition(async () => {
      onError(undefined);
      const r = await editScriptBeatAction(projectId, videoId, beat.idx, text);
      if (!r.ok) onError(r.error);
      else setEditing(false);
    });

  return (
    <div className="rounded-card bg-canvas p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {audio?.url && (
            <>
              <audio
                ref={audioRef}
                src={audio.url}
                preload="none"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => {
                  setPlaying(false);
                  setActiveWord(-1);
                }}
                onTimeUpdate={onTime}
              />
              <button
                type="button"
                onClick={toggle}
                aria-label={playing ? "Pause" : "Play"}
                className="grid size-9 place-items-center rounded-full bg-accent text-ink shadow-card"
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
            </>
          )}
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Section {beat.idx + 1}
            {audio?.durationSec ? ` · ${fmt(audio.durationSec)}` : ""}
            {beat.shotType ? ` · ${beat.shotType}` : ""}
          </span>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setText(beat.text);
              setEditing(true);
            }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:bg-accent-soft hover:text-ink"
          >
            <Pencil className="size-3.5" /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={Math.max(4, Math.ceil(text.length / 70))}
            className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={save}
              className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {audio?.url ? "Save & re-voice this section" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium text-muted hover:text-ink"
            >
              <X className="size-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : words.length > 0 ? (
        <p className="text-[15px] leading-relaxed">
          {words.map((w, i) => (
            <span
              key={i}
              className={cn(
                "rounded px-0.5 transition-colors",
                i === activeWord && playing && "bg-accent text-ink",
              )}
            >
              {w.w}{" "}
            </span>
          ))}
        </p>
      ) : (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{beat.text}</p>
      )}
    </div>
  );
}

// ── Title / description editor ────────────────────────────────────────

function MetadataEditor({
  projectId,
  videoId,
  videoTitle,
  metadata,
  onError,
}: {
  projectId: string;
  videoId: string;
  videoTitle: string;
  metadata: ScriptData["metadata"];
  onError: (e?: string) => void;
}) {
  const [title, setTitle] = useState(videoTitle);
  const [description, setDescription] = useState(metadata.description ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const dirty = title !== videoTitle || description !== (metadata.description ?? "");

  return (
    <Card>
      <CardTitle>Title & description</CardTitle>
      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSaved(false);
          }}
          className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm font-semibold outline-none focus:border-accent"
        />
        {(metadata.titles ?? []).filter((t) => t !== title).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(metadata.titles ?? [])
              .filter((t) => t !== title)
              .map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTitle(t);
                    setSaved(false);
                  }}
                  className="rounded-full bg-card-warm px-3 py-1.5 text-xs font-medium text-muted hover:bg-accent-soft hover:text-ink"
                >
                  {t}
                </button>
              ))}
          </div>
        )}
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setSaved(false);
          }}
          rows={5}
          className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent"
        />
        {(metadata.tags ?? []).length > 0 && (
          <p className="text-xs text-muted">
            Tags: {(metadata.tags ?? []).join(", ")}
          </p>
        )}
        <button
          type="button"
          disabled={isPending || !dirty}
          onClick={() =>
            startTransition(async () => {
              onError(undefined);
              const r = await editVideoMetadataAction(
                projectId,
                videoId,
                title,
                description,
              );
              if (!r.ok) onError(r.error);
              else setSaved(true);
            })
          }
          className="flex items-center gap-2 rounded-full bg-card-warm px-4 py-2 text-sm font-semibold text-ink shadow-card hover:bg-accent-soft disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4 text-success" />
          ) : null}
          {saved ? "Saved" : "Save changes"}
        </button>
      </div>
    </Card>
  );
}

function ApproveBar({
  projectId,
  videoId,
  onError,
}: {
  projectId: string;
  videoId: string;
  onError: (e?: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="sticky bottom-4 flex justify-center">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            onError(undefined);
            const r = await approveGateAction(projectId, videoId);
            if (!r.ok) onError(r.error);
          })
        }
        className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-ink shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        {isPending ? "Generating voiceover…" : "Approve script → generate assets"}
      </button>
    </div>
  );
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

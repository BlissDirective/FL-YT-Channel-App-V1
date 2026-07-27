"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { startFromPromptAction } from "@/lib/actions/workspace";

/**
 * Open project composer (the "start anything" door). Replaces idea-only entry:
 * paste a full brief or a command and it births the video AND runs whatever the
 * intent router resolves — "write a song about…", a topic, an episode spec —
 * then drops you into that video's workspace to keep the conversation going.
 */
/** Client-safe mirror of the sung song models (SONG_MODELS is server-only). */
const SONG_MODEL_OPTIONS = [
  { id: "default", label: "Channel default voice" },
  { id: "minimax-music-v2", label: "MiniMax Music v2 (varied, cheap)" },
  { id: "elevenlabs-song", label: "ElevenLabs Music (premium, consistent)" },
];

export function ProjectComposer({
  projectId,
  preferredSongLabel,
}: {
  projectId: string;
  /** Human label of the channel's locked default, shown on the default option. */
  preferredSongLabel?: string;
}) {
  const [text, setText] = useState("");
  const [songModel, setSongModel] = useState("default");
  const [error, setError] = useState<string>();
  const [note, setNote] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    const t = text.trim();
    if (!t || pending) return;
    start(async () => {
      setError(undefined);
      setNote("Opening…");
      const r = await startFromPromptAction({ projectId, text: t, songModelId: songModel });
      if (!r.videoId) {
        setError(r.error ?? "Something went wrong — try again.");
        setNote(undefined);
        return;
      }
      // Hand the prompt to the workspace so it runs there — the operator watches
      // the "writing…" happen live in the chat instead of waiting on a spinner.
      try {
        sessionStorage.setItem(`mm:start:${r.videoId}`, t);
      } catch {
        /* private mode / storage disabled — the workspace just opens empty */
      }
      router.push(`/projects/${projectId}/videos/${r.videoId}`);
    });
  }

  return (
    <div className="space-y-2 rounded-card bg-card p-4 shadow-card" data-testid="project-composer">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-accent" />
        <h3 className="text-sm font-bold tracking-tight">Start anything</h3>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Paste a brief or describe a video — a song command, a full episode spec, or
        just a topic. I&apos;ll create the asset and run the first step, then open its
        workspace.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={4}
        disabled={pending}
        placeholder={
          'e.g. write a song about tidying up toys together like a train collecting cars, led by the whole cast'
        }
        className="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
      />

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
          Voice
          <select
            value={songModel}
            onChange={(e) => setSongModel(e.target.value)}
            disabled={pending}
            className="rounded-lg border border-line bg-bg px-2 py-1.5 text-xs text-ink"
            aria-label="Song / voice model for this video"
          >
            {SONG_MODEL_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id === "default" && preferredSongLabel
                  ? `Channel default (${preferredSongLabel})`
                  : o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">{note ?? "⌘/Ctrl + Enter to send"}</span>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !text.trim()}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-on-accent shadow-card transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUp className="size-3.5" />}
            {pending ? "Starting…" : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}

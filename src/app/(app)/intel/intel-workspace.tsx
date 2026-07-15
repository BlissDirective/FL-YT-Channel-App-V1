"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown,
  Loader2,
  Plus,
  Radar,
  Sparkles,
  X,
} from "lucide-react";
import { runVideoIntelAction } from "@/lib/actions/intel";
import type { VideoIntel } from "@/lib/db/types";
import { Card, CardTitle } from "@/components/ui/card";
import { PillTabs } from "@/components/ui/pill-tabs";
import { cn } from "@/lib/cn";
import { BlueprintView } from "./blueprint-view";

export function IntelWorkspace({
  projects,
  initial,
  history,
}: {
  projects: { id: string; name: string }[];
  initial: { projectId?: string; videoId?: string; topic?: string };
  history: VideoIntel[];
}) {
  const [projectId, setProjectId] = useState(initial.projectId ?? projects[0]?.id ?? "");
  const [topic, setTopic] = useState(initial.topic ?? "");
  const [urls, setUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [depth, setDepth] = useState<"quick" | "deep">("quick");
  const [sourceUrl, setSourceUrl] = useState("");
  const [vouched, setVouched] = useState(false);
  const [frames, setFrames] = useState(false);
  const [result, setResult] = useState<VideoIntel | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const addUrl = () => {
    const u = urlInput.trim();
    if (u && !urls.includes(u)) setUrls((p) => [...p, u]);
    setUrlInput("");
  };

  const run = () => {
    setError(undefined);
    setResult(null);
    start(async () => {
      const r = await runVideoIntelAction({
        projectId,
        videoId: initial.videoId ?? null,
        topic,
        competitorUrls: urls,
        transcript,
        depth,
        sourceUrl,
        vouched,
        frames,
      });
      if (r.ok) setResult(r.intel);
      else setError(r.error);
    });
  };

  return (
    <div className="space-y-6">
      {/* Launcher */}
      <Card>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Radar className="size-4 text-lavender" /> New market scan
          </span>
        </CardTitle>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">Project</span>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="input"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col items-start gap-1">
              <span className="text-xs font-medium text-muted">Depth</span>
              <PillTabs
                ariaLabel="Scan depth"
                options={[
                  { label: "Quick", value: "quick" },
                  { label: "Deep", value: "deep" },
                ]}
                value={depth}
                onChange={(v) => setDepth(v as "quick" | "deep")}
              />
            </div>
          </div>

          {depth === "deep" && (
            <div className="space-y-2 rounded-card bg-lavender/5 p-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted">
                  Reference video URL (Gemini analyzes it — no download)
                </span>
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=…"
                  className="input"
                />
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={vouched}
                  onChange={(e) => setVouched(e.target.checked)}
                  className="mt-0.5 accent-accent"
                />
                <span>
                  I&apos;m analyzing this for research — notes only, and everything we
                  generate is 100% original. (No footage is reused.)
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={frames}
                  onChange={(e) => setFrames(e.target.checked)}
                  className="mt-0.5 accent-accent"
                />
                <span>
                  Precise high-res frame sampling (runs in the worker — appears in
                  Recent scans when done). Off = fast Gemini URL analysis.
                </span>
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Topic / keywords</span>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. how to value an AI company"
              className="input"
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">
              Competitor URLs <span className="text-muted">(optional)</span>
            </span>
            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addUrl();
                  }
                }}
                placeholder="Paste a YouTube URL, press Enter"
                className="input flex-1"
              />
              <button
                type="button"
                onClick={addUrl}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-card-warm text-ink shadow-card hover:bg-accent-soft"
                aria-label="Add URL"
              >
                <Plus className="size-4" />
              </button>
            </div>
            {urls.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2">
                {urls.map((u) => (
                  <span
                    key={u}
                    className="flex items-center gap-1 rounded-full bg-card-warm px-3 py-1 text-xs text-muted"
                  >
                    <span className="max-w-[220px] truncate">{u}</span>
                    <button type="button" onClick={() => setUrls((p) => p.filter((x) => x !== u))}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowTranscript((s) => !s)}
            className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
          >
            <ChevronDown className={cn("size-3.5 transition-transform", showTranscript && "rotate-180")} />
            Paste a transcript for deeper structure analysis (optional)
          </button>
          {showTranscript && (
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={5}
              placeholder="Paste a transcript you have rights to…"
              className="input resize-none"
            />
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs text-muted">
              {depth === "deep"
                ? "Metadata + Gemini perception + Claude · ~$0.10–0.50 · up to a few min"
                : "Metadata + Claude · ~$0.02–0.10 · ~5s"}
            </span>
            <button
              type="button"
              disabled={
                pending ||
                !projectId ||
                !topic.trim() ||
                (depth === "deep" && (!sourceUrl.trim() || !vouched))
              }
              onClick={run}
              className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink shadow-card transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
              {pending ? "Scanning…" : "Run scan"}
            </button>
          </div>
          {error && (
            <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm font-medium text-coral">{error}</p>
          )}
        </div>
      </Card>

      {/* Live result */}
      {result && result.status !== "done" && (
        <Card className="flex items-center gap-3 bg-lavender/5">
          <Loader2 className="size-5 shrink-0 animate-spin text-lavender" />
          <div>
            <p className="text-sm font-semibold">Queued for frame analysis</p>
            <p className="text-xs text-muted">
              The worker is sampling frames for “{result.topic}”. It&apos;ll appear
              in Recent scans below when done (usually a few minutes).
            </p>
          </div>
        </Card>
      )}
      {result && result.status === "done" && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="size-4 text-lavender" /> Blueprint — {result.topic}
          </h2>
          <BlueprintView
            blueprint={result.blueprint}
            competitors={result.competitors}
            topic={result.topic}
            perception={result.perception}
            projectId={result.project_id}
            videoId={result.video_id}
          />
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-muted">Recent scans</h2>
          {history.map((h) => (
            <HistoryItem key={h.id} intel={h} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryItem({ intel }: { intel: VideoIntel }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {intel.topic || "Untitled scan"}
            {intel.depth === "deep" && (
              <span className="ml-2 rounded-full bg-lavender/15 px-2 py-0.5 text-[10px] font-semibold text-lavender">
                deep
              </span>
            )}
            {intel.status !== "done" && (
              <span className="ml-2 rounded-full bg-card-warm px-2 py-0.5 text-[10px] font-semibold text-muted">
                {intel.status}
              </span>
            )}
          </p>
          <p className="text-xs text-muted">
            {new Date(intel.created_at).toLocaleString()} · {intel.competitors.length} videos · $
            {Number(intel.cost_usd).toFixed(2)}
          </p>
        </div>
        {intel.status === "done" && (
          <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
        )}
      </button>
      {intel.status === "error" && intel.error && (
        <p className="mt-2 text-xs font-medium text-coral">{intel.error}</p>
      )}
      {open && intel.status === "done" && (
        <div className="mt-4">
          <BlueprintView
            blueprint={intel.blueprint}
            competitors={intel.competitors}
            topic={intel.topic}
            perception={intel.perception}
            projectId={intel.project_id}
            videoId={intel.video_id}
          />
        </div>
      )}
    </Card>
  );
}

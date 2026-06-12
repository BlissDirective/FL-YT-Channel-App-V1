import Link from "next/link";
import { notFound } from "next/navigation";
import { GATE_FOR_STATUS } from "@studio/core";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/db/queries";
import { getSignedMediaUrl } from "@/lib/storage";
import type { Asset, Script, Video, ScriptBeat } from "@/lib/db/types";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";
import { ScriptReview } from "./script-review";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export type BeatAudio = {
  idx: number;
  url: string | null;
  durationSec: number;
  words: { w: string; start: number; end: number }[];
};

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string; vid: string }>;
}) {
  const { id, vid } = await params;
  const supabase = await createClient();
  const [project, { data: video }, { data: script }, { data: voAssets }] =
    await Promise.all([
      getProject(id),
      supabase.from("videos").select("*").eq("id", vid).maybeSingle(),
      supabase
        .from("scripts")
        .select("*")
        .eq("video_id", vid)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("assets")
        .select("*")
        .eq("video_id", vid)
        .eq("kind", "vo")
        .order("beat_index", { ascending: true }),
    ]);
  if (!project || !video) notFound();

  const v = video as Video;
  const s = (script as Script) ?? null;
  const beats = (s?.beats ?? []) as ScriptBeat[];

  const beatAudio: BeatAudio[] = await Promise.all(
    ((voAssets as Asset[]) ?? [])
      .filter((a) => a.beat_index !== null)
      .map(async (a) => ({
        idx: a.beat_index as number,
        url: await getSignedMediaUrl(a.storage_path),
        durationSec: Number((a.meta as { durationSec?: number }).durationSec ?? 0),
        words:
          ((a.meta as { words?: { w: string; start: number; end: number }[] })
            .words ?? []),
      })),
  );

  const gate = GATE_FOR_STATUS[v.status];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-2">
      <RealtimeRefresher tables={["videos", "scripts", "assets"]} />
      <div>
        <Link
          href={`/projects/${id}/review`}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          {project.name} · Review queue
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{v.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusChip tone={gate ? "warning" : "neutral"}>
            {v.status.replace(/_/g, " ").toLowerCase()}
          </StatusChip>
          {s && <StatusChip tone="lavender">script v{s.version}</StatusChip>}
          <StatusChip tone="neutral">
            ${Number(v.total_cost_usd).toFixed(2)} spent
          </StatusChip>
        </div>
      </div>

      {!s ? (
        <Card>
          <p className="text-sm text-muted">
            No script yet — this video hasn&apos;t reached the scripting stage.
          </p>
        </Card>
      ) : (
        <ScriptReview
          projectId={id}
          videoId={vid}
          videoTitle={v.title}
          script={{
            version: s.version,
            beats,
            runtimeSec: s.runtime_sec,
            metadata: s.metadata,
          }}
          beatAudio={beatAudio}
          atGate={gate ?? null}
        />
      )}
    </div>
  );
}

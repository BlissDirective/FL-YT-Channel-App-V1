import Link from "next/link";
import { notFound } from "next/navigation";
import { GATE_FOR_STATUS } from "@studio/core";
import { createClient } from "@/lib/supabase/server";
import { getProject, getVideoSnapshots } from "@/lib/db/queries";
import { getSignedMediaUrl } from "@/lib/storage";
import { estimateRevenueUsd } from "@/lib/adapters/youtube";
import { buildAttributionBlock } from "@/lib/attribution";
import type { Asset, Script, Video, ScriptBeat } from "@/lib/db/types";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";
import { ScriptReview } from "./script-review";
import { PublishKit, type PublishRender } from "./publish-kit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export type BeatAudio = {
  idx: number;
  url: string | null;
  durationSec: number;
  words: { w: string; start: number; end: number }[];
};

/** Display URL for an asset: external poster from meta, else signed storage. */
async function assetUrl(a: Asset): Promise<string | null> {
  const meta = a.meta as { posterUrl?: string; url?: string };
  return meta.posterUrl ?? meta.url ?? (await getSignedMediaUrl(a.storage_path));
}

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string; vid: string }>;
}) {
  const { id, vid } = await params;
  const supabase = await createClient();
  const [project, { data: video }, { data: script }, { data: assets }] =
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
        .order("beat_index", { ascending: true }),
    ]);
  if (!project || !video) notFound();

  const v = video as Video;
  const s = (script as Script) ?? null;
  const beats = (s?.beats ?? []) as ScriptBeat[];
  const allAssets = (assets as Asset[]) ?? [];

  const beatAudio: BeatAudio[] = await Promise.all(
    allAssets
      .filter((a) => a.kind === "vo" && a.beat_index !== null)
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
  const isPublishStage = v.status === "APPROVED" || v.status === "TRACKING";

  const publishKit = isPublishStage
    ? await buildPublishKit({ id, vid, v, s, assets: allAssets, project })
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-2">
      <RealtimeRefresher tables={["videos", "scripts", "assets", "analytics_snapshots"]} />
      <div>
        <Link
          href={`/projects/${id}/review`}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          {project.name} · Review queue
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{v.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusChip tone={gate ? "warning" : isPublishStage ? "success" : "neutral"}>
            {v.status.replace(/_/g, " ").toLowerCase()}
          </StatusChip>
          {s && <StatusChip tone="lavender">script v{s.version}</StatusChip>}
          <StatusChip tone="neutral">
            ${Number(v.total_cost_usd).toFixed(2)} spent
          </StatusChip>
        </div>
      </div>

      {publishKit && <PublishKit {...publishKit} />}

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

async function buildPublishKit({
  id,
  vid,
  v,
  s,
  assets,
  project,
}: {
  id: string;
  vid: string;
  v: Video;
  s: Script | null;
  assets: Asset[];
  project: NonNullable<Awaited<ReturnType<typeof getProject>>>;
}) {
  const meta = s?.metadata ?? {};
  const renderAssets = assets.filter((a) => a.kind === "render");
  const selectedThumb =
    assets.find((a) => a.kind === "thumb" && (a.meta as { selected?: boolean }).selected) ??
    assets.find((a) => a.kind === "thumb");

  const renders: PublishRender[] = await Promise.all(
    renderAssets.map(async (a) => {
      const m = a.meta as { variant?: string; resolution?: string; durationSec?: number };
      const variant = m.variant === "short" ? "short" : "long";
      return {
        variant: variant as "long" | "short",
        url: await assetUrl(a),
        resolution: m.resolution ?? "1080p",
        durationSec: Number(m.durationSec ?? 0),
        fileName: `${slug(v.title)}${variant === "short" ? "-short" : ""}.mp4`,
      };
    }),
  );

  const snapshots = (await getVideoSnapshots(vid)).map((snap) => ({
    capturedAt: snap.captured_at,
    views: snap.views,
    likes: snap.likes,
    comments: snap.comments,
  }));
  const latestViews = snapshots[snapshots.length - 1]?.views ?? 0;

  return {
    projectId: id,
    videoId: vid,
    status: v.status as "APPROVED" | "TRACKING",
    title: v.title,
    altTitles: (meta.titles ?? []).filter((t) => t !== v.title).slice(0, 3),
    description: composeDescription(meta, assets),
    tags: meta.tags ?? [],
    renders,
    thumbUrl: selectedThumb ? await assetUrl(selectedThumb) : null,
    thumbFileName: `${slug(v.title)}-thumb.jpg`,
    youtubeVideoId: v.youtube_video_id,
    publishedAt: v.published_at,
    estRevenueUsd: estimateRevenueUsd(latestViews, Number(project.rpm_usd ?? 2)),
    rpmUsd: Number(project.rpm_usd ?? 2),
    snapshots,
  };
}

/** Full YouTube description: copy + chapter timestamps + required credits. */
function composeDescription(
  meta: Script["metadata"],
  assets: Asset[],
): string {
  const parts: string[] = [];
  if (meta.description) parts.push(meta.description.trim());

  const chapters = meta.chapters ?? [];
  if (chapters.length > 0) {
    parts.push(
      ["Chapters:", ...chapters.map((c) => `${fmtTimestamp(c.at)} ${c.label}`)].join("\n"),
    );
  }

  const credits = buildAttributionBlock(assets);
  if (credits) parts.push(credits);

  return parts.join("\n\n");
}

function fmtTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "video"
  );
}

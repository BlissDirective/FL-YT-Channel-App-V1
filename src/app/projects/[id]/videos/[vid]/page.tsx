import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Radar } from "lucide-react";
import { GATE_FOR_STATUS } from "@studio/core";
import { createClient } from "@/lib/supabase/server";
import {
  getClipJobs,
  getDerivedShorts,
  getMonthlyVideoSpendUsd,
  getProject,
  getVideoSnapshots,
} from "@/lib/db/queries";
import { VIDEO_MONTHLY_CAP_USD } from "@/lib/adapters/video-models";
import { getSignedMediaUrl } from "@/lib/storage";
import { estimateRevenueUsd } from "@/lib/adapters/youtube";
import { buildAttributionBlock } from "@/lib/attribution";
import type { Asset, CuratedHighlight, Script, Video, ScriptBeat } from "@/lib/db/types";
import { fontForNiche } from "@/lib/adapters/highlights";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";
import { ScriptReview } from "./script-review";
import { HighlightsEditor } from "./highlights-editor";
import { StepBackStage } from "./step-back";
import { AdvanceStage } from "./advance-stage";
import { VideoGen } from "./video-gen";
import { PublishKit, type PublishRender } from "./publish-kit";
import { DeriveShorts, type DerivedShortRow } from "./derive-shorts";

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
  searchParams,
}: {
  params: Promise<{ id: string; vid: string }>;
  searchParams: Promise<{ setup?: string }>;
}) {
  const { id, vid } = await params;
  const { setup } = await searchParams;
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

  const clipAssets = allAssets.filter((a) => a.kind === "clip" && a.beat_index !== null);
  const clips = await Promise.all(
    beats.map(async (b) => {
      const a = clipAssets.find((x) => x.beat_index === b.idx);
      return {
        idx: b.idx,
        url: a ? await assetUrl(a) : null,
        isVideo: Boolean(a && (a.meta as { isVideo?: boolean }).isVideo),
      };
    }),
  );
  const monthVideoSpent = s ? await getMonthlyVideoSpendUsd() : 0;
  const clipJobs = s && beats.length > 0 ? await getClipJobs(vid) : [];

  const gate = GATE_FOR_STATUS[v.status];
  const isPublishStage = v.status === "APPROVED" || v.status === "TRACKING";
  // Asset stage (mid-generation or assets done) → offer a step back to script.
  const canStepBackToScript =
    v.status === "GENERATING_ASSETS" || v.status === "ASSETS_READY";
  // Assets done → offer a forward "approve → render" control on the page.
  const atAssetsGate = v.status === "ASSETS_READY";
  const pendingClips = clipJobs.filter(
    (j) => j.status === "queued" || j.status === "running",
  ).length;

  // Show the download/publish kit once a render exists — at FINAL_REVIEW the
  // operator can download the MP4 directly (publish actions unlock at APPROVED).
  const showPublishKit = isPublishStage || v.status === "FINAL_REVIEW";
  const publishKit = showPublishKit
    ? await buildPublishKit({ id, vid, v, s, assets: allAssets, project })
    : null;

  // Derive Shorts: available once a long-form has rendered from live assets
  // (the Shorts reuse its VO + clips). Hidden for Shorts themselves.
  const hasLiveVo = allAssets.some(
    (a) => a.kind === "vo" && a.storage_path && !a.storage_path.startsWith("mock/"),
  );
  const canDeriveShorts = v.kind === "long" && hasLiveVo;
  const derivedShorts: DerivedShortRow[] = canDeriveShorts
    ? await buildDerivedShorts(vid)
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-2">
      <RealtimeRefresher tables={["videos", "scripts", "assets", "analytics_snapshots", "clip_jobs"]} />
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

      <Link
        href={`/intel?project=${id}&video=${vid}&topic=${encodeURIComponent(v.topic || v.title)}`}
        className="group flex items-center justify-between gap-3 rounded-card bg-card p-4 shadow-card transition-shadow hover:shadow-float"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-lavender/15 text-lavender">
            <Radar className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Scan the market for this video</p>
            <p className="text-xs text-muted">
              See what works for this topic and turn it into an original blueprint
            </p>
          </div>
        </div>
        <ArrowUpRight className="size-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>

      {publishKit && <PublishKit {...publishKit} />}

      {canDeriveShorts && (
        <DeriveShorts
          projectId={id}
          parentVideoId={vid}
          defaultCount={project.derive_shorts_count ?? 3}
          defaultSmart={project.derive_shorts_smart ?? true}
          shorts={derivedShorts}
        />
      )}

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

      {s && beats.length > 0 && (
        <HighlightsEditor
          projectId={id}
          videoId={vid}
          enabled={v.enable_highlights ?? false}
          count={v.highlight_count ?? 0}
          highlights={(v.highlights ?? []) as CuratedHighlight[]}
          captions={v.enable_captions ?? true}
          beats={beats.map((b) => ({ idx: b.idx, text: b.text }))}
          defaultFont={fontForNiche(project.niche)}
        />
      )}

      {atAssetsGate && (
        <AdvanceStage projectId={id} videoId={vid} pendingClips={pendingClips} />
      )}

      {canStepBackToScript && (
        <StepBackStage projectId={id} videoId={vid} backToLabel="script" />
      )}

      {s && beats.length > 0 && (
        <div id="videogen">
        <VideoGen
          projectId={id}
          videoId={vid}
          autoSetup={setup === "1"}
          videoStatus={v.status}
          shortMode={v.kind === "short"}
          beats={beats.map((b) => {
            const vo = beatAudio.find((a) => a.idx === b.idx)?.durationSec ?? 0;
            // Fall back to ~150 wpm (2.5 words/sec) when there's no voiceover yet.
            const scriptSec = vo > 0 ? vo : Math.max(2, b.text.trim().split(/\s+/).length / 2.5);
            return {
              idx: b.idx,
              visualPrompt: b.visualPrompt,
              shotType: b.shotType,
              scriptSec,
            };
          })}
          clips={clips}
          jobs={clipJobs.map((j) => ({
            beatIdx: j.beat_idx,
            status: j.status,
            method: j.method,
            model: j.model,
            targetSec: j.target_sec,
          }))}
          monthSpent={monthVideoSpent}
          cap={VIDEO_MONTHLY_CAP_USD}
          confirmOverUsd={Number(project.clip_confirm_usd ?? 3)}
          customDefault={project.custom_spec ?? null}
        />
        </div>
      )}
    </div>
  );
}

/** Rows for the Derive Shorts panel: each child Short + its staged MP4. */
async function buildDerivedShorts(parentVideoId: string): Promise<DerivedShortRow[]> {
  const shorts = await getDerivedShorts(parentVideoId);
  if (shorts.length === 0) return [];
  const supabase = await createClient();
  const { data: renders } = await supabase
    .from("assets")
    .select("video_id, storage_path, meta")
    .in("video_id", shorts.map((sh) => sh.id))
    .eq("kind", "render");
  const renderBy = new Map(
    (renders ?? []).map((r) => [r.video_id as string, r]),
  );
  return Promise.all(
    shorts.map(async (sh) => {
      const r = renderBy.get(sh.id);
      const durationSec = Number((r?.meta as { durationSec?: number })?.durationSec ?? 0) || null;
      return {
        id: sh.id,
        title: sh.title,
        status: sh.status,
        publishRequested: Boolean(sh.publish_requested),
        youtubeVideoId: sh.youtube_video_id,
        downloadUrl: r?.storage_path ? await getSignedMediaUrl(r.storage_path) : null,
        durationSec,
      };
    }),
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
      const fileName = `${slug(v.title)}${variant === "short" ? "-short" : ""}.mp4`;
      return {
        variant: variant as "long" | "short",
        url: await assetUrl(a),
        downloadUrl: a.storage_path ? await getSignedMediaUrl(a.storage_path, 3600, fileName) : null,
        isMock: (a.storage_path ?? "").startsWith("mock/"),
        resolution: m.resolution ?? "1080p",
        durationSec: Number(m.durationSec ?? 0),
        fileName,
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
    status: v.status as "APPROVED" | "TRACKING" | "FINAL_REVIEW",
    isShort: v.kind === "short",
    publishRequested: Boolean(v.publish_requested),
    title: v.title,
    altTitles: (meta.titles ?? []).filter((t) => t !== v.title).slice(0, 3),
    description: composeDescription(meta, assets),
    tags: meta.tags ?? [],
    renders,
    thumbUrl: selectedThumb ? await assetUrl(selectedThumb) : null,
    thumbDownloadUrl: selectedThumb?.storage_path
      ? await getSignedMediaUrl(selectedThumb.storage_path, 3600, `${slug(v.title)}-thumb.jpg`)
      : null,
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Clapperboard, LayoutGrid, Radar } from "lucide-react";
import { GATE_FOR_STATUS, bracketById, buildLengthAdvisory } from "@studio/core";
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
import { attributionsFromAssets, buildAttributionBlock } from "@/lib/attribution";
import type { Asset, CuratedHighlight, Script, Video, ScriptBeat } from "@/lib/db/types";
import { fontForNiche } from "@/lib/adapters/highlights";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { ProgressRail } from "@/components/ui/progress-rail";
import { RAIL_STEPS, railIndexFor } from "@/lib/db/library";
import type { QcReview } from "@/lib/db/queries";
import { getEditorFlags } from "@/lib/pipeline/editor-flags";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";
import { CollapsibleSection } from "@/components/ui/section-header";
import { DecisionTrail } from "@/components/dashboard/decision-trail";
import { getDecisions } from "@/lib/db/decisions-data";
import { CheckpointPanel } from "./checkpoint-panel";
import { CanvasControls } from "./canvas-controls";
import { DirectorConsole, type ConsoleReview, type ConsoleDecision } from "./director-console";
import { directorStageForStatus } from "@/lib/pipeline/decisions";
import { tasteThreshold, type DirectorStageKey } from "@/lib/pipeline/operator-signal";
import { ScriptReview } from "./script-review";
import { HighlightsEditor } from "./highlights-editor";
import { StepBackStage } from "./step-back";
import { VideoGen } from "./video-gen";
import { PublishKit, type PublishRender } from "./publish-kit";
import { DeriveShorts, type DerivedShortRow } from "./derive-shorts";
import { StickScenesEditor, type StickSceneRow } from "./stick-scenes-editor";
import { VisionReview } from "./vision-review";
import { AutofixPanel } from "./autofix-panel";
import { RegenerateScript } from "./regenerate-script";
import type { StickScene } from "@/lib/stick-types";

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
  const [project, { data: video }, { data: script }, { data: assets }, decisionTrail] =
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
      getDecisions(vid),
    ]);
  if (!project || !video) notFound();

  const v = video as Video;
  const s = (script as Script) ?? null;
  const directorMode = (project.pipeline_mode ?? "autonomous") === "director";
  // The AI Video Generation card belongs to the visuals/edit development stages
  // only. In Director Mode it's hidden at idea/script/publish so each stage
  // shows just its own tools; autonomous keeps the script-gate setup entry.
  const showVideoGen =
    !directorMode ||
    ["GENERATING_ASSETS", "ASSETS_READY", "ASSEMBLING", "FINAL_REVIEW"].includes(v.status);
  const lengthTargetLabel = v.length_target
    ? bracketById(v.length_target.bracket)?.label ??
      `${Math.round(v.length_target.minSec / 60)}–${Math.round(v.length_target.maxSec / 60)} min`
    : null;
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

  // Director length advisory (spec §4.5): compare the actual VO duration (or a
  // word-count estimate before VO exists) to the chosen bracket. Advisory only.
  const lengthAdvisory =
    directorMode && v.length_target && s
      ? (() => {
          const voSec = beatAudio.reduce((n, a) => n + a.durationSec, 0);
          const estimated = voSec <= 0;
          const words = beats.reduce(
            (n, b) => n + b.text.trim().split(/\s+/).filter(Boolean).length,
            0,
          );
          // 2.5 words/sec ≈ 150 wpm — the same rate mock VO reads at.
          const actualSec = estimated ? Math.round(words / 2.5) : voSec;
          return buildLengthAdvisory({ actualSec, bracketId: v.length_target!.bracket, estimated });
        })()
      : null;

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
  const assemblyEnabled = (await getEditorFlags()).assembly;

  // Checkpoint context (UI v2 Phase 3): the latest QC verdict for the open
  // gate, the linked idea card at IDEA, and thumbnail candidates at ASSETS.
  const [{ data: gateQc }, { data: ideaRow }] = await Promise.all([
    gate
      ? supabase
          .from("qc_reviews")
          .select("*")
          .eq("video_id", vid)
          .eq("gate", gate)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    gate === "IDEA" && v.idea_id
      ? supabase.from("ideas").select("angle, score").eq("id", v.idea_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  // Director console data: every review + decision for the asset (only when
  // this project is in Director Mode).
  const [{ data: allReviews }, { data: decisions }] = directorMode
    ? await Promise.all([
        supabase
          .from("qc_reviews")
          .select("id, gate, score, verdict, issues, strengths, criteria, created_at")
          .eq("video_id", vid)
          .order("created_at", { ascending: false }),
        supabase
          .from("operator_decisions")
          .select("id, stage, action, agent_score, agent_verdict, operator_notes, cost_usd, created_at")
          .eq("video_id", vid)
          .order("created_at", { ascending: false })
          .limit(50),
      ])
    : [{ data: null }, { data: null }];

  // Taste calibration (spec §7.3): the operator's empirical acceptance threshold
  // for the current stage, once there are ≥5 scored advances. Pure display.
  const tasteLine = (() => {
    if (!directorMode) return null;
    const stage = directorStageForStatus(v.status);
    const t = tasteThreshold(
      ((decisions as { stage: DirectorStageKey; action: string; agent_score: number | null; agent_verdict: "pass" | "fail" | null }[]) ?? []),
      stage,
    );
    return t ? `You typically advance ${stage} at ≥${t.threshold}/10 (${t.count} decisions).` : null;
  })();

  const thumbCandidates =
    gate === "ASSETS"
      ? await Promise.all(
          allAssets
            .filter((a) => a.kind === "thumb")
            .map(async (a) => ({
              id: a.id,
              url: await assetUrl(a),
              selected: Boolean((a.meta as { selected?: boolean }).selected),
            })),
        )
      : [];
  // Clips grid + attribution for the ASSETS checkpoint (absorbed from the
  // retired review card, Phase 7).
  const clipTiles =
    gate === "ASSETS"
      ? await Promise.all(
          allAssets
            .filter((a) => a.kind === "clip")
            .map(async (a) => {
              const m = a.meta as {
                shotType?: string;
                relevance?: { score?: number; depicts?: string; reason?: string };
                fromLibrary?: boolean;
                request?: { kind?: string };
              };
              return {
                id: a.id,
                beatIdx: a.beat_index,
                url: await assetUrl(a),
                shotType: m.shotType,
                relevance: m.relevance,
                fromLibrary: m.fromLibrary,
                provider: a.provider,
                regenerable: m.request?.kind === "still",
              };
            }),
        )
      : [];
  const credits =
    gate === "ASSETS"
      ? attributionsFromAssets(allAssets)
          .filter((c) => c.requiresAttribution)
          .map((c) => ({
            title: c.title,
            author: c.author,
            licenseLabel: c.licenseLabel,
            licenseUrl: c.licenseUrl,
          }))
      : [];

  const isPublishStage = v.status === "APPROVED" || v.status === "TRACKING";
  // Asset stage (mid-generation or assets done) → offer a step back to script.
  const canStepBackToScript =
    v.status === "GENERATING_ASSETS" || v.status === "ASSETS_READY";
  // Assets done → offer a forward "approve → render" control on the page.

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

  // Stick Studio: per-beat choreographed scenes (editable once generated).
  const stickScenes: StickSceneRow[] =
    project.visual_style === "stick"
      ? beats.flatMap((b) => {
          const clip = allAssets.find((a) => a.kind === "clip" && a.beat_index === b.idx);
          const scene = (clip?.meta as { stickScene?: StickScene } | undefined)?.stickScene;
          if (!scene) return [];
          return [
            {
              beatIdx: b.idx,
              text: b.text,
              action: scene.actors?.[0]?.action ?? "idle",
              setting: scene.setting,
              mood: scene.mood ?? "none",
            },
          ];
        })
      : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-2">
      <RealtimeRefresher tables={["videos", "scripts", "assets", "analytics_snapshots", "clip_jobs", "decisions"]} />
      <div>
        <Link
          href={`/projects/${id}/library`}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          {project.name} · Library
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{v.title}</h1>
          {!directorMode && (
            <CanvasControls
              projectId={id}
              videoId={vid}
              paused={Boolean(v.paused_reason)}
              killed={v.status === "KILLED"}
            />
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusChip tone={gate ? "warning" : isPublishStage ? "success" : "neutral"}>
            {v.status.replace(/_/g, " ").toLowerCase()}
          </StatusChip>
          {s && <StatusChip tone="lavender">script v{s.version}</StatusChip>}
          <StatusChip tone="neutral">
            ${Number(v.total_cost_usd).toFixed(2)} spent
          </StatusChip>
          {((s && allAssets.some((a) => a.kind === "vo")) ||
            (v.kind === "short" && v.parent_video_id != null)) && (
            <Link
              href={`/projects/${id}/videos/${vid}/edit`}
              className="flex items-center gap-1 rounded-full bg-canvas px-3 py-1 text-xs font-semibold shadow-card hover:bg-accent-soft"
            >
              <Clapperboard className="size-3.5" />
              Open editor
              {(v as { edit_document_version?: number | null }).edit_document_version != null &&
                ` · cut v${(v as { edit_document_version?: number | null }).edit_document_version}`}
            </Link>
          )}
          {assemblyEnabled && s && (
            <Link
              href={`/projects/${id}/videos/${vid}/assembly`}
              className="flex items-center gap-1 rounded-full bg-canvas px-3 py-1 text-xs font-semibold shadow-card hover:bg-accent-soft"
            >
              <LayoutGrid className="size-3.5" />
              Assembly
            </Link>
          )}
        </div>
        <ProgressRail steps={RAIL_STEPS} current={railIndexFor(v)} className="mt-4" />
      </div>

      {directorMode && (
        <DirectorConsole
          projectId={id}
          videoId={vid}
          status={v.status}
          pausedReason={v.paused_reason}
          lengthTargetLabel={lengthTargetLabel}
          lengthAdvisory={lengthAdvisory}
          tasteLine={tasteLine}
          visualBible={v.visual_bible}
          shotPlan={v.shot_plan}
          reviews={(allReviews as ConsoleReview[]) ?? []}
          decisions={(decisions as ConsoleDecision[]) ?? []}
        />
      )}

      {directorMode &&
        v.status !== "IDEA" &&
        v.status !== "IDEA_APPROVED" &&
        v.status !== "KILLED" && (
          <div className="flex items-center gap-2 pt-1" data-mode="director">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Stage workspace
            </span>
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11px] text-muted">
              The artifact + fine-grained tools for the current stage
            </span>
          </div>
        )}

      {gate && !directorMode && (
        <CheckpointPanel
          projectId={id}
          videoId={vid}
          gate={gate}
          isCutGate={
            gate === "ASSETS" &&
            (v as { edit_document_version?: number | null }).edit_document_version != null
          }
          pausedReason={v.paused_reason}
          qc={(gateQc as QcReview) ?? null}
          watch={v.watch_review ?? null}
          thumbs={thumbCandidates}
          clips={clipTiles}
          credits={credits}
          idea={
            gate === "IDEA"
              ? {
                  topic: v.topic ?? v.title,
                  angle: (ideaRow as { angle?: string } | null)?.angle,
                  score: (ideaRow as { score?: number } | null)?.score,
                }
              : null
          }
          pendingClips={pendingClips}
        />
      )}

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

      {publishKit && (
        <div id="publish" className="scroll-mt-20">
          <PublishKit {...publishKit} />
        </div>
      )}

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
      ) : beats.length === 0 ? (
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-ink">This script has no sections.</p>
          <p className="text-sm text-muted">
            The script came back empty (no beats), so there&apos;s nothing to
            voice, generate, or render. Regenerate it to get a fresh script with
            sections.
          </p>
          <RegenerateScript projectId={id} videoId={vid} />
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

      {v.vision_review && (
        <VisionReview
          review={v.vision_review}
          projectId={id}
          videoId={vid}
          canFix={v.status === "FINAL_REVIEW"}
        />
      )}

      {project.autofix_loop && project.autofix_loop !== "off" && (
        <AutofixPanel
          projectId={id}
          videoId={vid}
          loop={project.autofix_loop}
          projectEnabled={project.autofix_enabled ?? false}
          override={v.autofix_enabled ?? null}
          config={project.autofix_config ?? { threshold: 7, maxRenders: 2, spendCapUsd: 1 }}
          state={v.autofix_state ?? {}}
        />
      )}

      {stickScenes.length > 0 && (
        <StickScenesEditor
          projectId={id}
          videoId={vid}
          scenes={stickScenes}
          flagged={(v.vision_review?.issues ?? [])
            .map((iss) => iss.beatIdx)
            .filter((b): b is number => b != null)}
        />
      )}

      {v.status === "ASSEMBLING" && (
        <Card className="border border-accent/40 bg-accent-soft/40">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 animate-pulse place-items-center rounded-2xl bg-accent text-on-accent">
              <Clapperboard className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Rendering your video…</p>
              <p className="mt-1 text-sm text-muted">
                The render farm is assembling the final cut (usually a few minutes). This
                page updates on its own — when it&apos;s done it moves to{" "}
                <span className="font-semibold text-ink">Final review</span>, where the
                download and one-tap YouTube publish appear right here. No need to wait on
                this screen.
              </p>
            </div>
          </div>
        </Card>
      )}

      {canStepBackToScript && (
        <StepBackStage projectId={id} videoId={vid} backToLabel="script" />
      )}

      {s && beats.length > 0 && showVideoGen && (
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

      {decisionTrail.length > 0 && (
        <CollapsibleSection
          title="Decision trail"
          count={decisionTrail.length}
          storageKey={`decisions:${vid}`}
          defaultCollapsed
        >
          <DecisionTrail decisions={decisionTrail} />
        </CollapsibleSection>
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

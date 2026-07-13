import Link from "next/link";
import { notFound } from "next/navigation";
import { Clapperboard, Radar, Settings } from "lucide-react";
import { getProject } from "@/lib/db/queries";
import { getLibrary, type LibraryItem } from "@/lib/db/library-data";
import { LIBRARY_SECTIONS, RAIL_STEPS } from "@/lib/db/library";
import type { Idea } from "@/lib/db/types";
import { AssetTile } from "@/components/ui/asset-tile";
import { CollapsibleSection } from "@/components/ui/section-header";
import { ProjectSignalStrip } from "@/components/ui/signal-strip";
import { StatusChip } from "@/components/ui/status-chip";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";
import { ScoutChat } from "@/components/dashboard/scout-chat";
import { RunIntelligenceButton } from "@/components/dashboard/run-intelligence-button";
import { RunDemoButton } from "@/components/dashboard/run-demo-button";
import { NewAsset } from "./new-asset";
import { DirectorIdeaGenerator } from "./director-idea-generator";
import {
  GateQuickActions,
  IdeaCardActions,
  NudgeQuickAction,
  ResumeQuickAction,
} from "./quick-actions";

export const dynamic = "force-dynamic";

/**
 * The per-project Library (UI v2 Phase 2 — D-2..D-5, D-17/D-18): every asset
 * from first spark to published, in one stage-sectioned grid with quick
 * actions. Clicking any tile opens the Asset Canvas (the video page).
 */
export default async function LibraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const library = await getLibrary(id);
  const directorMode = (project.pipeline_mode ?? "autonomous") === "director";

  const monthlyBudget = Number(
    (project.budget as { monthlyUsd?: number })?.monthlyUsd ?? 0,
  );

  const sectionCounts: Record<string, number> = Object.fromEntries(
    LIBRARY_SECTIONS.map((s) => [s.key, library.sections[s.key].length]),
  );
  sectionCounts.ideas += library.ideaCards.length;
  const empty = Object.values(sectionCounts).every((n) => n === 0);

  return (
    <div className="space-y-8 pt-2">
      <RealtimeRefresher tables={["videos", "ideas", "qc_reviews", "assets", "cost_ledger"]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            <Link href="/" className="hover:text-ink">Projects</Link> / Library
          </p>
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight">{project.name}</h1>
            {directorMode && (
              <span
                data-mode="director"
                className="flex shrink-0 items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent"
                title="You direct every stage. Nothing advances on its own."
              >
                <Clapperboard className="size-3" /> Director Mode
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/intel?project=${project.id}`}
            className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft"
            title="Scan the market (Intel)"
          >
            <Radar className="size-3.5" /> Intel
          </Link>
          <Link
            href={`/projects/${project.id}/settings`}
            className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft"
          >
            <Settings className="size-3.5" /> Settings
          </Link>
        </div>
      </div>

      {directorMode && (
        <div
          data-mode="director"
          className="flex items-start gap-2 rounded-card bg-accent-soft p-4 text-sm shadow-card"
        >
          <Clapperboard className="mt-0.5 size-4 shrink-0 text-ink" />
          <p className="text-ink">
            <strong>You&apos;re directing this channel.</strong> Assets wait for you at
            every stage — nothing generates, revises, or publishes on its own. Open any
            asset to run its stage agents and advance it. QC notes are advisory.
          </p>
        </div>
      )}

      <ProjectSignalStrip
        spendUsd={library.monthSpendUsd}
        budgetUsd={monthlyBudget}
        attentionCount={library.attentionCount}
        autopilot={directorMode ? undefined : library.operatorState}
      />

      {directorMode ? (
        <DirectorIdeaGenerator projectId={project.id} />
      ) : (
        <div className="space-y-3">
          <NewAsset projectId={project.id} />
          <RunIntelligenceButton projectId={project.id} />
        </div>
      )}

      {empty && (
        <div className="space-y-3 rounded-card bg-card p-8 text-center shadow-card">
          <p className="font-semibold">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted">
            Type a topic above, generate ideas, or let Autopilot seed the
            day&apos;s video — every asset appears here from first spark to
            published.
          </p>
          <div className="flex justify-center">
            <RunDemoButton projectId={project.id} />
          </div>
        </div>
      )}

      {sectionCounts.ideas > 0 && (
        <CollapsibleSection
          title="Ideas"
          count={sectionCounts.ideas}
          storageKey={`library:${project.id}:ideas`}
        >
          <Grid>
            {library.sections.ideas.map((item) => (
              <VideoTile key={item.video.id} projectId={project.id} item={item} />
            ))}
            {library.ideaCards.map((idea) => (
              <IdeaCardTile key={idea.id} projectId={project.id} idea={idea} />
            ))}
          </Grid>
        </CollapsibleSection>
      )}

      {(["script", "production", "ready"] as const).map((key) => {
        const section = LIBRARY_SECTIONS.find((s) => s.key === key)!;
        const items = library.sections[key];
        if (items.length === 0) return null;
        return (
          <CollapsibleSection
            key={key}
            title={section.label}
            count={items.length}
            storageKey={`library:${project.id}:${key}`}
          >
            <Grid>
              {items.map((item) => (
                <VideoTile key={item.video.id} projectId={project.id} item={item} />
              ))}
            </Grid>
          </CollapsibleSection>
        );
      })}

      {sectionCounts.published > 0 && (
        <CollapsibleSection
          title="Published"
          count={sectionCounts.published}
          storageKey={`library:${project.id}:published`}
        >
          <Grid>
            {library.sections.published.map((item) => (
              <VideoTile key={item.video.id} projectId={project.id} item={item} />
            ))}
          </Grid>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Scout research"
        storageKey={`library:${project.id}:scout`}
        defaultCollapsed
      >
        <ScoutChat projectId={project.id} />
      </CollapsibleSection>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
      {children}
    </div>
  );
}

function VideoTile({ projectId, item }: { projectId: string; item: LibraryItem }) {
  const { video, tile } = item;
  const stageLabel =
    item.gateLabel ??
    (tile.section === "published"
      ? "Published"
      : tile.section === "ready"
        ? "Ready to publish"
        : statusBlurb(video.status));
  // Resume only applies to a genuinely stalled in-progress asset. Published
  // (done) and Ready-to-publish (forward action is publishing, reached by
  // tapping the tile) never show it — even with a stale paused_reason.
  const paused =
    tile.section !== "published" &&
    tile.section !== "ready" &&
    Boolean(video.paused_reason);
  const atGate = item.gateLabel != null;
  return (
    <AssetTile
      href={`/projects/${projectId}/videos/${video.id}`}
      title={video.title}
      subtitle={video.kind === "short" ? "Short" : "Long-form"}
      thumbUrl={item.thumbUrl}
      railIndex={tile.railIndex}
      railTotal={RAIL_STEPS.length}
      stageLabel={stageLabel}
      qcScore={item.qcScore}
      awaitingYou={tile.awaitingYou || Boolean(item.stalled)}
      awaitingLabel={item.awaitingLabel ?? undefined}
      failed={tile.failed || Boolean(item.stalled)}
      autopilot={tile.autopilot}
      spendUsd={Number(video.total_cost_usd)}
      views={item.views}
      actions={
        atGate ? (
          <GateQuickActions projectId={projectId} videoId={video.id} />
        ) : item.stalled ? (
          <NudgeQuickAction projectId={projectId} videoId={video.id} />
        ) : paused ? (
          <ResumeQuickAction
            projectId={projectId}
            videoId={video.id}
            renderFailed={/render failed/i.test(video.paused_reason ?? "")}
          />
        ) : undefined
      }
    />
  );
}

function IdeaCardTile({ projectId, idea }: { projectId: string; idea: Idea }) {
  const origin = (idea.source as { origin?: string })?.origin ?? "intelligence";
  return (
    <div className="flex flex-col gap-2 rounded-card bg-card p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">{idea.title}</p>
        {idea.score != null && (
          <StatusChip tone={Number(idea.score) >= 8 ? "success" : "neutral"}>
            {Number(idea.score).toFixed(1)}
          </StatusChip>
        )}
      </div>
      {idea.angle && <p className="line-clamp-2 text-xs text-muted">{idea.angle}</p>}
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        via {origin}
      </p>
      <div className="mt-auto">
        <IdeaCardActions projectId={projectId} ideaId={idea.id} />
      </div>
    </div>
  );
}

function statusBlurb(status: string): string {
  const map: Record<string, string> = {
    IDEA: "Idea",
    IDEA_APPROVED: "Queued",
    SCRIPTING: "Writing script…",
    SCRIPT_READY: "Script ready",
    NEEDS_REVISION: "Revising…",
    GENERATING_ASSETS: "Generating assets…",
    ASSETS_READY: "Assets ready",
    ASSEMBLING: "Rendering…",
    FINAL_REVIEW: "Final review",
    APPROVED: "Ready to publish",
    TRACKING: "Published",
  };
  return map[status] ?? status;
}

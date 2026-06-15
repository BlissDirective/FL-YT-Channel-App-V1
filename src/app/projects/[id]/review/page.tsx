import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { PIPELINE_STAGES, type VideoStatus } from "@studio/core";
import {
  getKillSwitch,
  getProject,
  getReviewItems,
  getVideos,
} from "@/lib/db/queries";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";
import { ReviewQueue } from "./review-queue";

export const dynamic = "force-dynamic";
// Approvals trigger live script/voiceover stages via actions on this route.
export const maxDuration = 300;

function statusLabel(s: string): string {
  return s.replace(/_/g, " ").toLowerCase();
}

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stage?: string }>;
}) {
  const { id } = await params;
  const { stage } = await searchParams;
  const [project, items, killSwitch, videos] = await Promise.all([
    getProject(id),
    getReviewItems(id),
    getKillSwitch(),
    getVideos(id),
  ]);
  if (!project) notFound();

  const stageDef = stage ? PIPELINE_STAGES.find((s) => s.key === stage) : undefined;
  const statuses = stageDef ? (stageDef.statuses as readonly VideoStatus[]) : null;

  // When filtered to a stage: show that stage's review-gate cards, plus the
  // videos sitting at that stage that aren't at a gate yet (in progress).
  const shownItems = statuses
    ? items.filter((i) => statuses.includes(i.video.status))
    : items;
  const reviewIds = new Set(items.map((i) => i.video.id));
  const atStage = statuses
    ? videos.filter((v) => statuses.includes(v.status) && !reviewIds.has(v.id))
    : [];

  return (
    <div className="space-y-6 pt-2">
      <RealtimeRefresher tables={["videos", "approvals", "scripts", "assets"]} />
      <div>
        <Link
          href={`/projects/${id}`}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          {project.name}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Review queue</h1>
          {stageDef ? (
            <Link
              href={`/projects/${id}/review`}
              className="flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-ink"
            >
              {stageDef.label} <X className="size-3" />
            </Link>
          ) : (
            items.length > 0 && (
              <StatusChip tone="warning">{items.length} waiting</StatusChip>
            )
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          Each card is a pipeline waitpoint — approve to continue, request
          changes to loop the stage with your notes, or kill the video.
        </p>
      </div>

      {killSwitch && (
        <Card className="border border-coral/30 bg-coral/10">
          <p className="text-sm font-semibold text-coral">
            Global kill switch is on — pipelines are paused. Turn it off in
            Settings to resume.
          </p>
        </Card>
      )}

      {shownItems.length > 0 && <ReviewQueue projectId={id} items={shownItems} />}

      {/* Videos at this stage that aren't at a review gate yet (in progress). */}
      {atStage.length > 0 && (
        <Card>
          <p className="mb-3 text-sm font-semibold">
            In progress at the {stageDef?.label} stage
          </p>
          <ul className="divide-y divide-line">
            {atStage.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/projects/${id}/videos/${v.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-canvas"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{v.title}</span>
                  <StatusChip tone="neutral">{statusLabel(v.status)}</StatusChip>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {shownItems.length === 0 && atStage.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-3xl bg-success-soft text-success">
            <CheckCircle2 className="size-7" />
          </span>
          <div>
            <h3 className="font-semibold">
              {stageDef ? `Nothing at the ${stageDef.label} stage` : "All clear"}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              {stageDef
                ? "No videos are at this stage right now."
                : "Nothing is waiting on you. Run the demo pipeline from the project page to send a video through the gates."}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

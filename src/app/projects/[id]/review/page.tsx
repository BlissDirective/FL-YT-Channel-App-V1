import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getKillSwitch, getProject, getReviewItems } from "@/lib/db/queries";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";
import { ReviewQueue } from "./review-queue";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, items, killSwitch] = await Promise.all([
    getProject(id),
    getReviewItems(id),
    getKillSwitch(),
  ]);
  if (!project) notFound();

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
          {items.length > 0 && (
            <StatusChip tone="warning">{items.length} waiting</StatusChip>
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

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-3xl bg-success-soft text-success">
            <CheckCircle2 className="size-7" />
          </span>
          <div>
            <h3 className="font-semibold">All clear</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Nothing is waiting on you. Run the demo pipeline from the project
              page to send a video through the gates.
            </p>
          </div>
        </Card>
      ) : (
        <ReviewQueue projectId={id} items={items} />
      )}
    </div>
  );
}

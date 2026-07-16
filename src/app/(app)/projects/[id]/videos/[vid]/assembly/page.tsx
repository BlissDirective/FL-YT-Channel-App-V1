import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { initialPlanFromBeats, type SegmentPlan } from "@studio/core";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/db/queries";
import { getEditorFlags } from "@/lib/pipeline/editor-flags";
import type { ScriptBeat, Video } from "@/lib/db/types";
import { Card } from "@/components/ui/card";
import { AssemblyScreen } from "./assembly-screen";

export const dynamic = "force-dynamic";

/**
 * Assembly / Storyboard screen (Editor & Assembly R2). A granular, pre-render
 * planner: split beats into segments, assign each a medium + prompt + motion,
 * compose still-sequences, see live cost — human and (R3) agent as peers over
 * the same SegmentPlan, which compiles into the /edit EditDocument. Dark-
 * launched behind the editor.assembly flag.
 */
export default async function AssemblyPage({
  params,
}: {
  params: Promise<{ id: string; vid: string }>;
}) {
  const { id, vid } = await params;
  const flags = await getEditorFlags();
  if (!flags.assembly) notFound();

  const supabase = await createClient();
  const [project, { data: video }] = await Promise.all([
    getProject(id),
    supabase.from("videos").select("*").eq("id", vid).maybeSingle(),
  ]);
  if (!project || !video) notFound();
  const v = video as Video;

  const { data: script } = await supabase
    .from("scripts")
    .select("beats")
    .eq("video_id", vid)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const beats = ((script?.beats ?? []) as ScriptBeat[]) || [];

  if (beats.length === 0) {
    return (
      <Card className="space-y-3">
        <h1 className="font-semibold">Assembly unavailable</h1>
        <p className="text-sm text-muted">This video has no script beats yet — write the script first.</p>
        <Link href={`/projects/${id}/videos/${vid}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline">
          <ArrowLeft className="size-4" /> Back to the video
        </Link>
      </Card>
    );
  }

  const stored = v.assembly_plan as SegmentPlan | null;
  const plan = stored ?? initialPlanFromBeats(beats.map((b) => ({ idx: b.idx, shotType: b.shotType })));
  const perVideoUsd = (project.budget as { perVideoUsd?: number } | null)?.perVideoUsd ?? 15;

  return (
    <div className="space-y-4">
      <Link
        href={`/projects/${id}/videos/${vid}`}
        className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> {v.title}
      </Link>
      <AssemblyScreen
        projectId={id}
        videoId={vid}
        initialPlan={plan}
        beats={beats.map((b) => ({ idx: b.idx, text: b.text }))}
        budgetUsd={perVideoUsd}
        hasStored={stored != null}
      />
    </div>
  );
}

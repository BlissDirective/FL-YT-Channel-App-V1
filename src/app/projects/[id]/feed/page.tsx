import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/** UI v2 Feed shell (Phase 1) — the per-project activity feed lands in
    Phase 5 (Fable-5-UI-Redesign.md §9, D-16). */
export default async function FeedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-2xl font-bold tracking-tight">{project.name} — Feed</h1>
      <p className="text-sm text-muted">Phase 5 builds the activity feed here.</p>
    </div>
  );
}

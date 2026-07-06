import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/** UI v2 Library shell (Phase 1) — the stage-sectioned asset grid lands in
    Phase 2 (Fable-5-UI-Redesign.md §6). Reachable by direct URL only until
    the Phase 6 nav switch. */
export default async function LibraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-2xl font-bold tracking-tight">{project.name} — Library</h1>
      <p className="text-sm text-muted">Phase 2 builds the asset grid here.</p>
    </div>
  );
}

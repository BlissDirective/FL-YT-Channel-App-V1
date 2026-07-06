import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/** UI v2 Autopilot shell (Phase 1) — the merged operator + boost surface
    lands in Phase 4 (Fable-5-UI-Redesign.md §8, D-9). */
export default async function AutopilotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-2xl font-bold tracking-tight">{project.name} — Autopilot</h1>
      <p className="text-sm text-muted">Phase 4 builds the merged autonomy surface here.</p>
    </div>
  );
}

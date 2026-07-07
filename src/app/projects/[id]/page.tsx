import { redirect } from "next/navigation";

/**
 * UI v2 cutover (Phase 7): the Library IS the project's home (D-2). The old
 * dense project hub retired — its capabilities live in the Library (assets,
 * creation, Scout, signals), Autopilot (operator + boost), and Feed
 * (activity/insights/intel). Existing links and bookmarks land here.
 */
export default async function ProjectHome({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}/library`);
}

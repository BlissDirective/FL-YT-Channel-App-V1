import { redirect } from "next/navigation";

/** UI v2 cutover (Phase 7): the review queue retired — gate decisions live
    on Library tiles (quick actions) and the Asset Canvas checkpoint. */
export default async function ReviewRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}/library`);
}

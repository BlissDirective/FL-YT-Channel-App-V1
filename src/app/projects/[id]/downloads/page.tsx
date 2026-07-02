import { redirect } from "next/navigation";

/** Downloads merged into the per-video Publish Kit (Phase 6.7) — the same
    signed render/thumb links live there, next to titles and chapters. The
    route stays as a redirect so old bookmarks keep working. */
export default async function DownloadsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}`);
}

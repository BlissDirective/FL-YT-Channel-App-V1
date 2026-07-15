import { redirect } from "next/navigation";

/** Old bookmarks only — downloads live in each video's Publish Kit. */
export default async function DownloadsRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}/library`);
}

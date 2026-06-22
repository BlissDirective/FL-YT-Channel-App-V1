import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Film } from "lucide-react";
import { getProjectDownloads, getProject } from "@/lib/db/queries";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";

export const dynamic = "force-dynamic";

function fileName(title: string, suffix: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `${slug || "video"}-${suffix}`;
}

export default async function DownloadsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, rows] = await Promise.all([getProject(id), getProjectDownloads(id)]);
  if (!project) notFound();

  return (
    <div className="space-y-6 pt-2">
      <div>
        <Link href={`/projects/${id}`} className="text-sm font-medium text-muted hover:text-ink">
          {project.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Downloads</h1>
        <p className="mt-1 text-sm text-muted">
          Finished renders, ready to upload to YouTube manually. Each is a signed
          link that expires after an hour — refresh the page for fresh links.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-3xl bg-accent-soft text-ink">
            <Film className="size-6" />
          </span>
          <p className="max-w-sm text-sm text-muted">
            No finished renders yet. Videos appear here once they&apos;ve been
            assembled by the render farm.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.videoId}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/projects/${id}/videos/${r.videoId}`}
                    className="block truncate text-sm font-semibold hover:text-accent"
                  >
                    {r.title}
                  </Link>
                  <div className="mt-1">
                    <StatusChip
                      tone={r.status === "TRACKING" || r.status === "APPROVED" ? "success" : "neutral"}
                    >
                      {r.status.replace(/_/g, " ").toLowerCase()}
                    </StatusChip>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.long && (
                    <DownloadLink href={r.long} name={fileName(r.title, "1080p.mp4")} label="MP4 (16:9)" />
                  )}
                  {r.short && (
                    <DownloadLink href={r.short} name={fileName(r.title, "short.mp4")} label="Short (9:16)" />
                  )}
                  {r.thumb && (
                    <DownloadLink href={r.thumb} name={fileName(r.title, "thumb.jpg")} label="Thumbnail" />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DownloadLink({ href, name, label }: { href: string; name: string; label: string }) {
  return (
    <a
      href={href}
      download={name}
      className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-ink/90"
    >
      <Download className="size-3.5" /> {label}
    </a>
  );
}

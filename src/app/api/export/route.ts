import { NextResponse, type NextRequest } from "next/server";
import { getTrackedStats } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * CSV export of tracked-video stats (Phase 7). Authenticated via the same
 * Supabase session middleware enforces on every non-public route, so the
 * link just works for the signed-in operator. Optional `?project=<id>`
 * scopes the export to one project.
 */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("project") ?? undefined;
  const rows = await getTrackedStats(projectId);

  const header = [
    "project",
    "title",
    "youtube_id",
    "published_at",
    "views",
    "likes",
    "comments",
    "est_revenue_usd",
    "captured_at",
  ];
  const body = rows.map((r) =>
    [
      r.projectName,
      r.title,
      r.youtubeVideoId,
      r.publishedAt ?? "",
      r.views,
      r.likes,
      r.comments,
      r.estRevenueUsd.toFixed(2),
      r.capturedAt ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.join(","), ...body].join("\n");

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="studio-stats-${stamp}.csv"`,
    },
  });
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

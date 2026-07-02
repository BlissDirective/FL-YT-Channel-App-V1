import "server-only";

/**
 * YouTube Analytics adapter (Phase D). Reads the channel's OWN performance —
 * retention, watch-time, CTR, subscribers, revenue — via the YouTube Analytics
 * API, so the operator optimizes on real signal rather than public view counts.
 *
 * Needs a refresh token carrying the analytics scope (yt-analytics.readonly,
 * + monetary for revenue) — see the OAuth steps in
 * docs/Auto-Pilot-Operator-build-plan.md / docs/YouTube-API-creation.md. Per
 * project token (its own channel) takes precedence over the global default.
 * Every call degrades to null on any error (no token, missing scope, no data,
 * un-monetized) so the operator never blocks on analytics.
 */

export function analyticsConfigured(refreshToken?: string | null): boolean {
  return Boolean(
    process.env.YOUTUBE_OAUTH_CLIENT_ID &&
      process.env.YOUTUBE_OAUTH_CLIENT_SECRET &&
      (refreshToken || process.env.YOUTUBE_OAUTH_REFRESH_TOKEN),
  );
}

async function accessToken(refreshToken?: string | null): Promise<string | null> {
  const token = refreshToken || process.env.YOUTUBE_OAUTH_REFRESH_TOKEN;
  if (!token || !process.env.YOUTUBE_OAUTH_CLIENT_ID || !process.env.YOUTUBE_OAUTH_CLIENT_SECRET) return null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_OAUTH_CLIENT_ID,
        client_secret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET,
        refresh_token: token,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const { access_token } = (await res.json()) as { access_token?: string };
    return access_token ?? null;
  } catch {
    return null;
  }
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

type Report = { columnHeaders: { name: string }[]; rows?: (string | number)[][] };

async function report(token: string, params: Record<string, string>): Promise<Report | null> {
  try {
    const qs = new URLSearchParams({ ids: "channel==MINE", ...params }).toString();
    const res = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${qs}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as Report;
  } catch {
    return null;
  }
}

/** Index a single-row report by column name. */
function rowMap(r: Report | null): Record<string, number> {
  const out: Record<string, number> = {};
  const row = r?.rows?.[0];
  if (!row) return out;
  r!.columnHeaders.forEach((h, i) => (out[h.name] = Number(row[i] ?? 0)));
  return out;
}

export type ChannelSummary = {
  views: number;
  watchMinutes: number;
  /** Average % of each video watched (retention proxy), 0–100. */
  retentionPct: number;
  subscribersGained: number;
  subscribersLost: number;
  /** Click-through rate on impressions, 0–100 (0 if unavailable). */
  ctr: number | null;
};

/** Channel-level performance over the last `days` (default 90). */
export async function getChannelSummary(refreshToken: string | null, days = 90): Promise<ChannelSummary | null> {
  const token = await accessToken(refreshToken);
  if (!token) return null;
  const base = { startDate: ymd(daysAgo(days)), endDate: ymd(new Date()) };
  const core = rowMap(
    await report(token, {
      ...base,
      metrics: "views,estimatedMinutesWatched,averageViewPercentage,subscribersGained,subscribersLost",
    }),
  );
  if (Object.keys(core).length === 0) return null;
  // CTR (impression click-through) isn't exposed by the public Analytics API,
  // and the legacy annotation metric is rejected — report null (unknown)
  // rather than a fake 0 that downstream heuristics would trust.
  const ctr = null;
  return {
    views: core.views ?? 0,
    watchMinutes: core.estimatedMinutesWatched ?? 0,
    retentionPct: core.averageViewPercentage ?? 0,
    subscribersGained: core.subscribersGained ?? 0,
    subscribersLost: core.subscribersLost ?? 0,
    ctr,
  };
}

export type VideoMetrics = {
  views: number;
  watchMinutes: number;
  retentionPct: number;
  subscribersGained: number;
};

/** Per-video performance for up to ~200 videos over the last `days`. */
export async function getVideoMetrics(
  refreshToken: string | null,
  videoIds: string[],
  days = 90,
): Promise<Map<string, VideoMetrics>> {
  const out = new Map<string, VideoMetrics>();
  const ids = videoIds.filter(Boolean).slice(0, 200);
  if (ids.length === 0) return out;
  const token = await accessToken(refreshToken);
  if (!token) return out;
  const r = await report(token, {
    startDate: ymd(daysAgo(days)),
    endDate: ymd(new Date()),
    dimensions: "video",
    filters: `video==${ids.join(",")}`,
    metrics: "views,estimatedMinutesWatched,averageViewPercentage,subscribersGained",
    maxResults: "200",
  });
  if (!r?.rows) return out;
  const col = (name: string) => r.columnHeaders.findIndex((h) => h.name === name);
  const iId = col("video");
  const iV = col("views");
  const iW = col("estimatedMinutesWatched");
  const iR = col("averageViewPercentage");
  const iS = col("subscribersGained");
  for (const row of r.rows) {
    out.set(String(row[iId]), {
      views: Number(row[iV] ?? 0),
      watchMinutes: Number(row[iW] ?? 0),
      retentionPct: Number(row[iR] ?? 0),
      subscribersGained: Number(row[iS] ?? 0),
    });
  }
  return out;
}

export type YppSnapshot = {
  subscriberCount: number;
  /** Public watch-hours over the trailing 365 days (toward the 4,000-hour bar). */
  watchHours365: number;
};

/** Toward the YPP bar: total subscribers + trailing-365-day watch-hours. */
export async function getYppSnapshot(refreshToken: string | null): Promise<YppSnapshot | null> {
  const token = await accessToken(refreshToken);
  if (!token) return null;
  // Trailing-year watch minutes.
  const wm = rowMap(
    await report(token, {
      startDate: ymd(daysAgo(365)),
      endDate: ymd(new Date()),
      metrics: "estimatedMinutesWatched",
    }),
  );
  // Total subscriber count via the Data API (channels.mine, OAuth).
  let subscriberCount = 0;
  try {
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true",
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (res.ok) {
      const data = (await res.json()) as { items?: { statistics?: { subscriberCount?: string } }[] };
      subscriberCount = Number(data.items?.[0]?.statistics?.subscriberCount ?? 0);
    }
  } catch {
    /* ignore */
  }
  if (Object.keys(wm).length === 0 && subscriberCount === 0) return null;
  return {
    subscriberCount,
    watchHours365: Math.round(((wm.estimatedMinutesWatched ?? 0) / 60) * 10) / 10,
  };
}

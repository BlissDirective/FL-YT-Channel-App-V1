/**
 * Format library (pure). A format is a winning short-form video reduced to a
 * reusable template: the capture record (link, stats) proves it won, the
 * persuasion record (hook, beat map, product moment, why it works) is what a
 * new script is written from. See supabase/migrations/0088_format_library.sql.
 */

export const FORMAT_PLATFORMS = ["tiktok", "instagram", "youtube", "facebook", "x", "other"] as const;
export const FORMAT_SOURCES = ["manual", "apify", "scrape_creators", "other"] as const;
export const FORMAT_STATUSES = ["candidate", "approved", "retired"] as const;
export type FormatPlatform = (typeof FORMAT_PLATFORMS)[number];
export type FormatSource = (typeof FORMAT_SOURCES)[number];
export type FormatStatus = (typeof FORMAT_STATUSES)[number];

export type FormatStats = { views?: number; likes?: number; shares?: number; comments?: number; saves?: number };
export type FormatBeat = { at: number; beat: string; onScreen?: string; audio?: string };

export type FormatRecord = {
  platform: FormatPlatform;
  sourceUrl: string;
  sourceKey: string;
  source: FormatSource;
  niche: string;
  creator?: string;
  postedAt?: string;
  stats: FormatStats;
  title?: string;
  hook?: string;
  beatMap: FormatBeat[];
  productMoment?: string;
  whyItWorks?: string;
  durationSec?: number;
  tags: string[];
  status: FormatStatus;
  notes?: string;
};

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/**
 * Dedupe key for a video link: host (no www./m.) + path, lower-cased host, no
 * query, fragment or trailing slash. Scrapers return the same video under
 * tracking-parameter variants; this collapses them. Null when not http(s).
 */
export function normalizeSourceUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m|vm)\./, "");
  const path = u.pathname.replace(/\/+$/, "");
  // YouTube watch links carry the id in the query.
  const v = host.endsWith("youtube.com") && path === "/watch" ? u.searchParams.get("v") : null;
  return v ? `${host}/watch?v=${v}` : `${host}${path}`;
}

/** Platform from a link's host; "other" when unknown. */
export function platformOfUrl(url: string): FormatPlatform {
  const key = normalizeSourceUrl(url) ?? "";
  const host = key.split("/")[0];
  if (host.endsWith("tiktok.com")) return "tiktok";
  if (host.endsWith("instagram.com")) return "instagram";
  if (host.endsWith("youtube.com") || host === "youtu.be") return "youtube";
  if (host.endsWith("facebook.com") || host === "fb.watch") return "facebook";
  if (host === "x.com" || host.endsWith("twitter.com")) return "x";
  return "other";
}

/**
 * Validate + normalize untrusted input (MCP args, scraper rows). A candidate
 * may be capture-only; approving one requires the persuasion record (hook,
 * beat map, why it works), because that is the part a script is built from.
 */
export function parseFormat(raw: unknown): { ok: true; format: FormatRecord } | { ok: false; errors: string[] } {
  if (!isObj(raw)) return { ok: false, errors: ["format must be an object"] };
  const errors: string[] = [];
  const sourceUrl = str(raw.sourceUrl);
  const sourceKey = sourceUrl ? normalizeSourceUrl(sourceUrl) : null;
  if (!sourceUrl) errors.push("sourceUrl is required");
  else if (!sourceKey) errors.push("sourceUrl must be an http(s) link");

  const platform = (FORMAT_PLATFORMS as readonly string[]).includes(raw.platform as string)
    ? (raw.platform as FormatPlatform)
    : sourceUrl
      ? platformOfUrl(sourceUrl)
      : "other";
  if (raw.platform !== undefined && raw.platform !== platform) errors.push(`platform must be one of ${FORMAT_PLATFORMS.join(", ")}`);
  const source = (FORMAT_SOURCES as readonly string[]).includes(raw.source as string) ? (raw.source as FormatSource) : "manual";
  if (raw.source !== undefined && raw.source !== source) errors.push(`source must be one of ${FORMAT_SOURCES.join(", ")}`);
  const status = (FORMAT_STATUSES as readonly string[]).includes(raw.status as string) ? (raw.status as FormatStatus) : "candidate";
  if (raw.status !== undefined && raw.status !== status) errors.push(`status must be one of ${FORMAT_STATUSES.join(", ")}`);

  const stats: FormatStats = {};
  if (raw.stats !== undefined) {
    if (!isObj(raw.stats)) errors.push("stats must be an object");
    else
      for (const k of ["views", "likes", "shares", "comments", "saves"] as const) {
        const v = raw.stats[k];
        if (v === undefined) continue;
        if (num(v) === undefined || (v as number) < 0) errors.push(`stats.${k} must be a non-negative number`);
        else stats[k] = Math.round(v as number);
      }
  }

  const durationSec = num(raw.durationSec);
  if (raw.durationSec !== undefined && (durationSec === undefined || durationSec <= 0)) errors.push("durationSec must be a positive number");

  const beatMap: FormatBeat[] = [];
  if (raw.beatMap !== undefined && !Array.isArray(raw.beatMap)) errors.push("beatMap must be an array");
  for (const [i, b] of (Array.isArray(raw.beatMap) ? raw.beatMap : []).entries()) {
    const at = isObj(b) ? num(b.at) : undefined;
    const beat = isObj(b) ? str(b.beat) : undefined;
    if (at === undefined || at < 0) errors.push(`beatMap[${i}].at must be a number of seconds ≥ 0`);
    if (!beat) errors.push(`beatMap[${i}].beat is required`);
    if (at !== undefined && durationSec !== undefined && at >= durationSec) errors.push(`beatMap[${i}].at is past the video's ${durationSec}s`);
    if (at !== undefined && beat) {
      beatMap.push({
        at,
        beat,
        ...(isObj(b) && str(b.onScreen) ? { onScreen: str(b.onScreen) } : {}),
        ...(isObj(b) && str(b.audio) ? { audio: str(b.audio) } : {}),
      });
    }
  }
  beatMap.sort((a, b) => a.at - b.at);

  const postedAt = str(raw.postedAt);
  if (postedAt && Number.isNaN(Date.parse(postedAt))) errors.push("postedAt must be a date");
  const tags = Array.isArray(raw.tags) ? [...new Set(raw.tags.map(str).filter((t): t is string => Boolean(t)).map((t) => t.toLowerCase()))] : [];

  const format: FormatRecord = {
    platform,
    sourceUrl: sourceUrl ?? "",
    sourceKey: sourceKey ?? "",
    source,
    niche: str(raw.niche) ?? "",
    creator: str(raw.creator),
    postedAt,
    stats,
    title: str(raw.title),
    hook: str(raw.hook),
    beatMap,
    productMoment: str(raw.productMoment),
    whyItWorks: str(raw.whyItWorks),
    durationSec,
    tags,
    status,
    notes: str(raw.notes),
  };
  if (status === "approved") errors.push(...persuasionGaps(format));
  return errors.length ? { ok: false, errors } : { ok: true, format };
}

/** What an approved format is missing from its persuasion record. */
export function persuasionGaps(f: Pick<FormatRecord, "hook" | "beatMap" | "whyItWorks">): string[] {
  const gaps: string[] = [];
  if (!f.hook) gaps.push("an approved format needs the hook, word for word");
  if (f.beatMap.length === 0) gaps.push("an approved format needs a beat map");
  if (!f.whyItWorks) gaps.push("an approved format needs whyItWorks");
  return gaps;
}

/** Ranking from the playbook: plays and shares first, then comments. */
export function compareTraction(a: FormatStats, b: FormatStats): number {
  return (b.views ?? 0) - (a.views ?? 0) || (b.shares ?? 0) - (a.shares ?? 0) || (b.comments ?? 0) - (a.comments ?? 0);
}

/**
 * Split a format's beat map into directed-script sections of at most
 * `maxSectionSec` (one beat per generation, stitched after), cutting only at
 * beat boundaries. Section lengths are clamped to the directed minimum (4s).
 */
export function sectionPlan(
  f: Pick<FormatRecord, "beatMap" | "durationSec">,
  maxSectionSec = 15,
): { startSec: number; sec: number; beats: FormatBeat[] }[] {
  if (f.beatMap.length === 0) return [];
  const end = Math.max(f.durationSec ?? 0, f.beatMap[f.beatMap.length - 1].at + 2);
  const plan: { startSec: number; sec: number; beats: FormatBeat[] }[] = [];
  let cur: FormatBeat[] = [];
  let start = 0;
  f.beatMap.forEach((b, i) => {
    const nextAt = f.beatMap[i + 1]?.at ?? end;
    if (cur.length && nextAt - start > maxSectionSec) {
      plan.push({ startSec: start, sec: b.at - start, beats: cur });
      start = b.at;
      cur = [];
    }
    cur.push(b);
  });
  plan.push({ startSec: start, sec: end - start, beats: cur });
  return plan.map((p) => ({ ...p, sec: Math.max(4, Math.round(p.sec * 10) / 10) }));
}

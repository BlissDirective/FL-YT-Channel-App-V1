import "server-only";
import { anthropicFetch } from "./anthropic";

/**
 * Source Library agent — Phase 6.5. Fans out across COMPLIANT, licensed
 * sources only and returns candidates carrying verified license metadata.
 *
 * Hard compliance rules (see docs/DECISIONS.md):
 *  - Licensed sources only. No YouTube ripping, no publisher IP.
 *  - We remix clips into a larger video → derivatives must be allowed.
 *    NonCommercial (NC), NoDerivatives (ND) and ShareAlike (SA) are
 *    rejected; SA is excluded because it could force the whole render
 *    under a copyleft licence. Allowed: CC0, Public Domain, CC-BY,
 *    Pexels, Pixabay.
 *  - Attribution-required licences are tracked so the Publish Kit can
 *    inject credits (CC-BY compliance).
 */

export type LicenseInfo = {
  id: string;
  label: string;
  url?: string;
  requiresAttribution: boolean;
};

export type SourceCandidate = {
  /** Stable key for selection round-trips. */
  key: string;
  kind: "image" | "video";
  provider: string; // pexels | pixabay | openverse | wikimedia
  title: string;
  /** Small image used for the candidate grid + as a video poster. */
  thumbUrl: string;
  /** The asset we'd actually use: image file URL or video file URL. */
  fullUrl: string;
  sourceUrl: string; // landing page for provenance / attribution
  author: string;
  license: LicenseInfo;
  durationSec?: number;
  width?: number;
  height?: number;
  /** Claude's 0–10 visual-relevance score, set by rankCandidates(). */
  relevance?: number;
  /** Claude note, incl. any licence-laundering suspicion. */
  note?: string;
};

// ── Deterministic licence screening ───────────────────────────────────

/** Normalize a raw licence string to our allow/deny decision. Returns null
    when the licence is not usable for commercial remix. */
export function classifyLicense(raw: string, url?: string): LicenseInfo | null {
  const s = raw.toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
  // Reject anything NonCommercial or NoDerivatives outright.
  if (/(^|[^a-z])nc([^a-z]|$)|noncommercial/.test(s)) return null;
  if (/(^|[^a-z])nd([^a-z]|$)|noderiv/.test(s)) return null;
  // ShareAlike excluded — copyleft could infect the whole render.
  if (/(^|[^a-z])sa([^a-z]|$)|sharealike/.test(s)) return null;

  if (/cc0|publicdomain|public-domain|^pdm$|^pd$/.test(s)) {
    return { id: "cc0", label: "CC0 / Public Domain", url, requiresAttribution: false };
  }
  if (/^cc-?by(-\d|$)|^by(-\d|$)|attribution/.test(s)) {
    return { id: "cc-by", label: "CC BY", url, requiresAttribution: true };
  }
  if (s === "pexels") {
    return { id: "pexels", label: "Pexels License", url, requiresAttribution: false };
  }
  if (s === "pixabay") {
    return { id: "pixabay", label: "Pixabay License", url, requiresAttribution: false };
  }
  return null; // unknown / unrecognized → reject (safe default)
}

// ── Per-source fetchers (each best-effort; failures yield []) ──────────

async function fromPexels(query: string): Promise<SourceCandidate[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const out: SourceCandidate[] = [];
  try {
    const vr = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=4&orientation=landscape`,
      { headers: { Authorization: key } },
    );
    if (vr.ok) {
      const d = (await vr.json()) as {
        videos: {
          id: number;
          duration: number;
          image: string;
          url: string;
          user: { name: string };
          video_files: { link: string; width: number; height: number; file_type: string }[];
        }[];
      };
      for (const v of d.videos ?? []) {
        const file = v.video_files
          .filter((f) => f.file_type === "video/mp4" && f.height <= 1080)
          .sort((a, b) => b.height - a.height)[0];
        if (!file) continue;
        out.push({
          key: `pexels-v-${v.id}`,
          kind: "video",
          provider: "pexels",
          title: query,
          thumbUrl: v.image,
          fullUrl: file.link,
          sourceUrl: v.url,
          author: v.user?.name ?? "Pexels",
          license: { id: "pexels", label: "Pexels License", requiresAttribution: false },
          durationSec: v.duration,
          width: file.width,
          height: file.height,
        });
      }
    }
  } catch (err) {
    console.error("pexels source failed:", err);
  }
  return out;
}

async function fromPixabay(query: string): Promise<SourceCandidate[]> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return [];
  try {
    const r = await fetch(
      `https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(query)}&per_page=4&safesearch=true`,
    );
    if (!r.ok) return [];
    const d = (await r.json()) as {
      hits: {
        id: number;
        duration: number;
        pageURL: string;
        user: string;
        videos: { large?: { url: string; width: number; height: number }; medium?: { url: string; width: number; height: number } };
      }[];
    };
    return (d.hits ?? []).map((h) => {
      const file = h.videos.medium ?? h.videos.large!;
      return {
        key: `pixabay-${h.id}`,
        kind: "video" as const,
        provider: "pixabay",
        title: query,
        thumbUrl: `https://i.vimeocdn.com/video/${h.id}_640x360.jpg`,
        fullUrl: file.url,
        sourceUrl: h.pageURL,
        author: h.user,
        license: { id: "pixabay", label: "Pixabay License", requiresAttribution: false },
        durationSec: h.duration,
        width: file.width,
        height: file.height,
      };
    });
  } catch (err) {
    console.error("pixabay source failed:", err);
    return [];
  }
}

async function fromOpenverse(query: string): Promise<SourceCandidate[]> {
  // No key required. license_type filter pre-excludes NC/ND server-side.
  try {
    const r = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license_type=commercial,modification&page_size=6&mature=false`,
      { headers: { "User-Agent": "faceless-studio/1.0 (licensed media search)" } },
    );
    if (!r.ok) return [];
    const d = (await r.json()) as {
      results: {
        id: string;
        title?: string;
        url: string;
        thumbnail?: string;
        creator?: string;
        license: string;
        license_version?: string;
        license_url?: string;
        foreign_landing_url?: string;
        source?: string;
        width?: number;
        height?: number;
      }[];
    };
    const out: SourceCandidate[] = [];
    for (const i of d.results ?? []) {
      const lic = classifyLicense(i.license, i.license_url);
      if (!lic) continue;
      out.push({
        key: `openverse-${i.id}`,
        kind: "image",
        provider: "openverse",
        title: i.title || query,
        thumbUrl: i.thumbnail || i.url,
        fullUrl: i.url,
        sourceUrl: i.foreign_landing_url || i.url,
        author: i.creator || i.source || "Unknown",
        license: lic,
        width: i.width,
        height: i.height,
      });
    }
    return out;
  } catch (err) {
    console.error("openverse source failed:", err);
    return [];
  }
}

async function fromWikimedia(query: string): Promise<SourceCandidate[]> {
  try {
    const url =
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*` +
      `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=6` +
      `&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640`;
    const r = await fetch(url, {
      headers: { "User-Agent": "faceless-studio/1.0 (licensed media search)" },
    });
    if (!r.ok) return [];
    const d = (await r.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            title: string;
            imageinfo?: {
              url: string;
              thumburl?: string;
              descriptionurl?: string;
              extmetadata?: Record<string, { value: string }>;
            }[];
          }
        >;
      };
    };
    const pages = Object.values(d.query?.pages ?? {});
    const out: SourceCandidate[] = [];
    for (const p of pages) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const ext = ii.extmetadata ?? {};
      const licName = ext.LicenseShortName?.value ?? ext.License?.value ?? "";
      const lic = classifyLicense(stripHtml(licName), ext.LicenseUrl?.value);
      if (!lic) continue;
      // Only still images (skip video/audio/pdf Commons files for now).
      if (!/\.(jpe?g|png|gif|webp)$/i.test(ii.url)) continue;
      out.push({
        key: `wikimedia-${encodeURIComponent(p.title)}`,
        kind: "image",
        provider: "wikimedia",
        title: stripHtml(ext.ObjectName?.value ?? p.title.replace(/^File:/, "")),
        thumbUrl: ii.thumburl || ii.url,
        fullUrl: ii.url,
        sourceUrl: ii.descriptionurl || ii.url,
        author: stripHtml(ext.Artist?.value ?? "Wikimedia Commons"),
        license: lic,
      });
    }
    return out;
  } catch (err) {
    console.error("wikimedia source failed:", err);
    return [];
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
}

/** Fan out across every compliant source for a query. */
export async function searchSources(query: string): Promise<SourceCandidate[]> {
  const results = await Promise.all([
    fromPexels(query),
    fromPixabay(query),
    fromOpenverse(query),
    fromWikimedia(query),
  ]);
  return results.flat();
}

export function activeSourceNames(): string[] {
  const names = ["Openverse", "Wikimedia Commons"];
  if (process.env.PEXELS_API_KEY) names.unshift("Pexels");
  if (process.env.PIXABAY_API_KEY) names.push("Pixabay");
  return names;
}

// ── Claude relevance ranking + laundering screen ──────────────────────

const RANK_MODEL = "claude-haiku-4-5";

const RANK_TOOL = {
  name: "rank_candidates",
  description: "Rank licensed footage candidates for a video beat.",
  input_schema: {
    type: "object",
    properties: {
      ranked: {
        type: "array",
        description: "Every candidate, best visual match first.",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            relevance: { type: "number", description: "0–10 visual fit for the beat." },
            note: {
              type: "string",
              description:
                "Short reason. Flag here if the title/author suggests this is likely copyrighted third-party content mislabeled as free (licence laundering).",
            },
          },
          required: ["key", "relevance"],
        },
      },
    },
    required: ["ranked"],
  },
} as const;

/** Rank candidates by visual relevance to the beat and surface laundering
    suspicion. Best-effort: returns source order if Claude is unavailable. */
export async function rankCandidates(opts: {
  beatText: string;
  visualPrompt: string;
  candidates: SourceCandidate[];
}): Promise<SourceCandidate[]> {
  const { candidates } = opts;
  if (!process.env.ANTHROPIC_API_KEY || candidates.length === 0) return candidates;
  try {
    const res = await anthropicFetch({
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: RANK_MODEL,
        max_tokens: 1024,
        tools: [RANK_TOOL],
        tool_choice: { type: "tool", name: "rank_candidates" },
        messages: [
          {
            role: "user",
            content:
              `Beat narration: "${opts.beatText}"\nVisual direction: "${opts.visualPrompt}"\n\n` +
              `Rank these licensed candidates by how well they'd illustrate this beat. ` +
              `Be critical about licence laundering — flag any whose title/author hints it's really a copyrighted film/show/game clip.\n\n` +
              JSON.stringify(
                candidates.map((c) => ({
                  key: c.key,
                  provider: c.provider,
                  title: c.title,
                  author: c.author,
                  kind: c.kind,
                })),
                null,
                2,
              ),
          },
        ],
      }),
    });
    if (!res.ok) return candidates;
    const data = (await res.json()) as {
      content: { type: string; input?: { ranked?: { key: string; relevance: number; note?: string }[] } }[];
    };
    const ranked = data.content.find((c) => c.type === "tool_use")?.input?.ranked;
    if (!ranked) return candidates;
    const byKey = new Map(candidates.map((c) => [c.key, c]));
    const ordered: SourceCandidate[] = [];
    for (const r of ranked) {
      const c = byKey.get(r.key);
      if (c) {
        ordered.push({ ...c, relevance: r.relevance, note: r.note });
        byKey.delete(r.key);
      }
    }
    ordered.push(...byKey.values()); // any Claude missed, keep at the end
    return ordered;
  } catch (err) {
    console.error("candidate ranking failed:", err);
    return candidates;
  }
}

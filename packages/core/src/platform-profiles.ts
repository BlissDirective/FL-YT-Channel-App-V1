/**
 * Platform output profiles + multi-aspect render (OpenMontage Remixed list1
 * #20/#29).
 *
 * Formalises the aspect/dimension/duration presets for each destination
 * (YouTube 16:9, Shorts/Reels/TikTok 9:16, LinkedIn 1:1, cinema 21:9) so a
 * render targets a named profile instead of an ad-hoc size (#20), and lets ONE
 * assembly plan compile to MULTIPLE aspects in a single pass (#29) — a 16:9
 * long and a 9:16 short from the same timeline.
 *
 * Pure — no I/O — the render farm reads the profile to size the composition.
 */

export type Aspect = "16:9" | "9:16" | "1:1" | "21:9" | "4:5";

export type PlatformProfile = {
  id: string;
  label: string;
  platform: string;
  aspect: Aspect;
  width: number;
  height: number;
  /** Hard duration ceiling the platform enforces (seconds), or null. */
  maxDurationSec: number | null;
  /** Fraction of height kept clear of UI chrome (caption safe-area). */
  safeAreaTopFrac: number;
  safeAreaBottomFrac: number;
};

export const PLATFORM_PROFILES: PlatformProfile[] = [
  { id: "youtube-long", label: "YouTube (long)", platform: "YouTube", aspect: "16:9", width: 1920, height: 1080, maxDurationSec: null, safeAreaTopFrac: 0.06, safeAreaBottomFrac: 0.1 },
  { id: "youtube-short", label: "YouTube Short", platform: "YouTube", aspect: "9:16", width: 1080, height: 1920, maxDurationSec: 180, safeAreaTopFrac: 0.12, safeAreaBottomFrac: 0.22 },
  { id: "tiktok", label: "TikTok", platform: "TikTok", aspect: "9:16", width: 1080, height: 1920, maxDurationSec: 600, safeAreaTopFrac: 0.1, safeAreaBottomFrac: 0.24 },
  { id: "reels", label: "Instagram Reels", platform: "Instagram", aspect: "9:16", width: 1080, height: 1920, maxDurationSec: 90, safeAreaTopFrac: 0.12, safeAreaBottomFrac: 0.24 },
  { id: "instagram-feed", label: "Instagram Feed", platform: "Instagram", aspect: "4:5", width: 1080, height: 1350, maxDurationSec: 90, safeAreaTopFrac: 0.06, safeAreaBottomFrac: 0.08 },
  { id: "linkedin", label: "LinkedIn", platform: "LinkedIn", aspect: "1:1", width: 1080, height: 1080, maxDurationSec: 600, safeAreaTopFrac: 0.06, safeAreaBottomFrac: 0.08 },
  { id: "cinema", label: "Cinematic 21:9", platform: "YouTube", aspect: "21:9", width: 2560, height: 1097, maxDurationSec: null, safeAreaTopFrac: 0.05, safeAreaBottomFrac: 0.08 },
];

export function getPlatformProfile(id: string): PlatformProfile | undefined {
  return PLATFORM_PROFILES.find((p) => p.id === id);
}

export function profilesByAspect(aspect: Aspect): PlatformProfile[] {
  return PLATFORM_PROFILES.filter((p) => p.aspect === aspect);
}

/** The default profiles a video kind targets. */
export function defaultProfilesFor(kind: "long" | "short"): PlatformProfile[] {
  return kind === "short"
    ? [getPlatformProfile("youtube-short")!]
    : [getPlatformProfile("youtube-long")!];
}

export type RenderTarget = { profile: PlatformProfile; aspect: Aspect };

/**
 * Expand a chosen profile set into the distinct RENDER TARGETS a single
 * assembly plan should compile to (#29) — deduped by aspect, since one aspect
 * renders once and re-frames per platform. E.g. picking YouTube-long +
 * TikTok + Reels yields two renders (16:9 and 9:16), not three.
 */
export function multiAspectTargets(profileIds: string[]): RenderTarget[] {
  const seen = new Set<Aspect>();
  const targets: RenderTarget[] = [];
  for (const id of profileIds) {
    const profile = getPlatformProfile(id);
    if (!profile) continue;
    if (seen.has(profile.aspect)) continue;
    seen.add(profile.aspect);
    targets.push({ profile, aspect: profile.aspect });
  }
  return targets;
}

/** Does a video of `durationSec` fit the profile's platform ceiling? */
export function fitsProfileDuration(profile: PlatformProfile, durationSec: number): boolean {
  return profile.maxDurationSec == null || durationSec <= profile.maxDurationSec;
}

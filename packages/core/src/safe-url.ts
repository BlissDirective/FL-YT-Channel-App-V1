/**
 * Public-URL guard (security hardening: SSRF + argument injection).
 *
 * User- and provider-supplied URLs are fetched server-side (Vercel) and by the
 * worker runners (which hold service-role + provider keys), and one is passed
 * as a positional arg to yt-dlp. A crafted value can (a) point at cloud metadata
 * / internal services (SSRF) or (b) — if it starts with `-` — be parsed as a
 * CLI flag. This validator is pure and synchronous so it can run at every write
 * and fetch site: it requires http(s), rejects flag-like values, and blocks
 * hostnames that are loopback / link-local / private / metadata.
 *
 * Scope note: a literal-host blocklist stops the realistic threats (metadata
 * IP, localhost, a pasted internal address, a provider returning one). It does
 * NOT stop DNS-rebinding to a private IP — defense against that needs a
 * resolve-then-pin fetch, tracked as a follow-up.
 */

const BLOCKED_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^0\.0\.0\.0$/,
  /^127\./, // loopback
  /^10\./, // RFC1918
  /^192\.168\./, // RFC1918
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC1918 172.16–172.31
  /^169\.254\./, // link-local + cloud metadata (169.254.169.254)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT 100.64/10
  /^::1$/, // IPv6 loopback
  /^\[?::1\]?$/,
  /^f[cd][0-9a-f]{2}:/i, // IPv6 unique-local fc00::/7
  /^fe80:/i, // IPv6 link-local
  /\.internal$/i,
  /\.local$/i,
  /^metadata\./i, // metadata.google.internal etc.
];

export type SafeUrlResult = { ok: true; url: string } | { ok: false; reason: string };

/** Validate a URL is safe to fetch from a server/worker. Returns the
    normalized href on success. */
export function checkPublicHttpUrl(raw: string | null | undefined): SafeUrlResult {
  const value = (raw ?? "").trim();
  if (!value) return { ok: false, reason: "empty URL" };
  // A value starting with '-' becomes a CLI flag when passed as an arg (yt-dlp).
  if (value.startsWith("-")) return { ok: false, reason: "URL may not start with '-'" };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, reason: "not a valid URL" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: `protocol ${parsed.protocol} not allowed (http/https only)` };
  }
  // Strip IPv6 brackets for pattern matching.
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (!host) return { ok: false, reason: "missing host" };
  for (const pat of BLOCKED_HOST_PATTERNS) {
    if (pat.test(host)) return { ok: false, reason: `host ${host} is not publicly routable` };
  }
  return { ok: true, url: parsed.href };
}

/** Throwing variant for call sites that want to abort. */
export function assertPublicHttpUrl(raw: string | null | undefined): string {
  const r = checkPublicHttpUrl(raw);
  if (!r.ok) throw new Error(`unsafe URL: ${r.reason}`);
  return r.url;
}

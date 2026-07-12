import type { NextConfig } from "next";

// Baseline hardening for a single-operator control panel plus a public
// marketing page: forbid framing (clickjacking), MIME sniffing, cross-origin
// URL leakage; force HTTPS (HSTS); declare powerful browser APIs unused.
//
// CSP ships in Report-Only first: it surfaces violations to the browser
// console without breaking the app (Next's inline hydration bootstrap needs
// 'unsafe-inline' for script until nonce plumbing lands — the report-only pass
// lets us tighten it safely before enforcing). frame-ancestors 'none' is the
// modern equivalent of X-Frame-Options: DENY and IS enforceable immediately.
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@studio/core", "@studio/storage", "@studio/render"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

// Baseline hardening for a single-operator control panel: forbid framing
// (clickjacking), MIME sniffing, and cross-origin leakage of URLs; declare
// the powerful browser APIs unused. A full CSP is deferred — Next inline
// runtime scripts need nonce plumbing (tracked in the enhancement plan).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@studio/core", "@studio/storage", "@studio/render"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;

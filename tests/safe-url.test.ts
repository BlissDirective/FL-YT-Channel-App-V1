/**
 * Public-URL guard (security hardening): the SSRF + argument-injection fence
 * applied to every user/provider URL that reaches a server-side fetch or the
 * yt-dlp worker.
 */
import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl, checkPublicHttpUrl } from "@studio/core";

describe("checkPublicHttpUrl", () => {
  it("accepts ordinary public https/http URLs", () => {
    for (const u of [
      "https://www.youtube.com/watch?v=abc",
      "https://images.pexels.com/photo/1.jpg",
      "http://example.com/a.png",
      "https://cdn.provider.io:443/x.mp4",
    ]) {
      expect(checkPublicHttpUrl(u).ok, u).toBe(true);
    }
  });

  it("rejects flag-like values that would be parsed as a CLI option", () => {
    for (const u of ["--exec=curl evil", "-o/etc/passwd", "  --batch-file=x"]) {
      const r = checkPublicHttpUrl(u);
      expect(r.ok, u).toBe(false);
    }
  });

  it("rejects non-http protocols (file/ftp/data/javascript)", () => {
    for (const u of [
      "file:///etc/passwd",
      "ftp://host/x",
      "data:text/html,<script>",
      "javascript:alert(1)",
    ]) {
      expect(checkPublicHttpUrl(u).ok, u).toBe(false);
    }
  });

  it("blocks loopback, link-local/metadata, and RFC1918 hosts (SSRF)", () => {
    for (const u of [
      "http://localhost/x",
      "http://127.0.0.1/x",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.5/x",
      "http://192.168.1.1/x",
      "http://172.16.0.9/x",
      "http://[::1]/x",
      "http://metadata.google.internal/x",
      "http://db.internal/x",
      "https://foo.local/x",
    ]) {
      const r = checkPublicHttpUrl(u);
      expect(r.ok, u).toBe(false);
      if (!r.ok) expect(r.reason).toBeTruthy();
    }
  });

  it("rejects empty/garbage", () => {
    expect(checkPublicHttpUrl("").ok).toBe(false);
    expect(checkPublicHttpUrl(null).ok).toBe(false);
    expect(checkPublicHttpUrl("not a url").ok).toBe(false);
  });

  it("assertPublicHttpUrl returns href or throws", () => {
    expect(assertPublicHttpUrl("https://ok.com/x")).toBe("https://ok.com/x");
    expect(() => assertPublicHttpUrl("http://169.254.169.254/")).toThrow(/unsafe URL/);
  });
});

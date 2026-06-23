/**
 * Direct YouTube upload for finished long-form renders. A 7–13 min 1080p MP4
 * is larger than Supabase Storage's default upload limit, so when OAuth is
 * configured we push the long-form cut straight to YouTube (unlisted by
 * default — a reviewable draft) instead of round-tripping through Storage.
 *
 * Auth is OAuth2 with the youtube.upload scope. The render worker reads three
 * secrets; if any is missing the caller falls back to the Storage path so the
 * pipeline still works without YouTube wired up:
 *   YOUTUBE_OAUTH_CLIENT_ID
 *   YOUTUBE_OAUTH_CLIENT_SECRET
 *   YOUTUBE_OAUTH_REFRESH_TOKEN
 * Optional: YOUTUBE_UPLOAD_PRIVACY (private | unlisted | public; default unlisted)
 *           YOUTUBE_CATEGORY_ID    (default 28 — Science & Technology)
 */
import { readFileSync } from "node:fs";

export function youtubeUploadConfigured(): boolean {
  return Boolean(
    process.env.YOUTUBE_OAUTH_CLIENT_ID &&
      process.env.YOUTUBE_OAUTH_CLIENT_SECRET &&
      process.env.YOUTUBE_OAUTH_REFRESH_TOKEN,
  );
}

/** Mint an access token. A per-project refresh token (its own channel) takes
    precedence over the global default-channel token. */
async function accessToken(refreshToken?: string): Promise<string> {
  const token = refreshToken || process.env.YOUTUBE_OAUTH_REFRESH_TOKEN;
  if (!token) throw new Error("YouTube OAuth: no refresh token (global or per-project)");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_OAUTH_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET!,
      refresh_token: token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`YouTube OAuth token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { access_token } = (await res.json()) as { access_token?: string };
  if (!access_token) throw new Error("YouTube OAuth: no access_token");
  return access_token;
}

export type YouTubeUpload = {
  filePath: string;
  title: string;
  description: string;
  tags: string[];
  /** Per-project channel refresh token; falls back to the global default. */
  refreshToken?: string;
};

/** Resumable upload of one MP4. Returns the new YouTube video id. */
export async function uploadVideo(opts: YouTubeUpload): Promise<string> {
  const token = await accessToken(opts.refreshToken);
  const bytes = readFileSync(opts.filePath);
  const privacy = (process.env.YOUTUBE_UPLOAD_PRIVACY || "unlisted").trim();
  const meta = {
    snippet: {
      title: opts.title.slice(0, 100),
      description: (opts.description || "").slice(0, 4900),
      tags: opts.tags.slice(0, 30),
      categoryId: (process.env.YOUTUBE_CATEGORY_ID || "28").trim(),
    },
    status: { privacyStatus: privacy, selfDeclaredMadeForKids: false },
  };

  // 1) Open a resumable session (metadata + declared length).
  const init = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": String(bytes.length),
      },
      body: JSON.stringify(meta),
    },
  );
  if (!init.ok) throw new Error(`YouTube upload init ${init.status}: ${(await init.text()).slice(0, 200)}`);
  const uploadUrl = init.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube resumable: no upload URL in response");

  // 2) Send the bytes in one PUT (cuts are well under the resumable chunk cap).
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": "video/mp4", "content-length": String(bytes.length) },
    body: bytes,
  });
  if (!put.ok) throw new Error(`YouTube upload ${put.status}: ${(await put.text()).slice(0, 200)}`);
  const out = (await put.json()) as { id?: string };
  if (!out.id) throw new Error("YouTube upload: no video id returned");
  return out.id;
}

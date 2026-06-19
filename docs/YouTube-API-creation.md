# YouTube API & Render Storage Setup

How to obtain every credential the studio uses for YouTube and for downloadable
render storage, where each one lives, and how to verify it. There are **three
independent** integrations:

| Integration | What it powers | Credential(s) | Lives on |
|---|---|---|---|
| **Data API v3 key** | Public stats tracking + niche research (read-only) | `YOUTUBE_DATA_API_V3` | GitHub secret → synced to Vercel as `YOUTUBE_API_KEY` |
| **OAuth (upload)** | One-tap YouTube publish (long-form draft + Shorts) | `YOUTUBE_OAUTH_CLIENT_ID`, `YOUTUBE_OAUTH_CLIENT_SECRET`, `YOUTUBE_OAUTH_REFRESH_TOKEN` | GitHub secrets only (render farm) — **not** Vercel |
| **Cloudflare R2** *(optional)* | Downloadable storage for finished renders (long + short), any size | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | GitHub secrets (render farm writes) **+** Vercel (app presigns download links) |

> **Why uploads live only on GitHub:** the Next app never uploads to YouTube (it
> stays out of Google's OAuth upload audit by design). The render farm (GitHub
> Actions) holds the OAuth credentials and does both the long-form upload and the
> Shorts publish. So the OAuth secrets are **not** pushed to Vercel by
> `sync-vercel-env.yml`, and they should not be.

> **Download vs upload is your choice, per video.** Every render is stored (R2
> when configured, else Supabase) so it's always downloadable from the Publish
> Kit / Downloads page. YouTube upload is a separate one-tap action — nothing
> auto-uploads. Configure R2, YouTube OAuth, or both.

Both YouTube integrations can share **one** Google Cloud project.

---

## 0. Create / pick a Google Cloud project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or reuse an existing one) — e.g. `faceless-studio`.
3. **APIs & Services → Library** → search **"YouTube Data API v3"** → **Enable**.

---

## 1. Data API v3 key — stats + niche research (read-only)

Powers the tracking dashboards and Scout/niche research. No OAuth, no audit.

1. **APIs & Services → Credentials → Create Credentials → API key.**
2. Copy the key.
3. *(Recommended)* Click the key → **Restrict key** → **API restrictions** →
   restrict to **YouTube Data API v3**.
4. Add it as a **GitHub repository secret** named **`YOUTUBE_DATA_API_V3`**
   (repo **Settings → Secrets and variables → Actions → New repository secret**).

The `Sync Vercel Env` workflow pushes this to Vercel as **`YOUTUBE_API_KEY`**
(the app also accepts the `YOUTUBE_DATA_API_V3` alias). Without it, stats and
niche research fall back to deterministic mock data.

**Quota note:** the Data API has a default 10,000 units/day quota. Stats refresh
(`videos.list`) is cheap (~1 unit/call); niche `search.list` costs 100 units/call.

---

## 2. OAuth upload credentials — long-form upload + Shorts publish

This is the piece most setups are missing. Without it the render farm can't push
the finished MP4 to YouTube and falls back to Supabase Storage, where a long-form
cut (~100–200 MB) is rejected for exceeding the object-size limit — surfacing as
**"Render failed: upload failed: The object exceeded the maximum allowed size."**

You produce three secrets: a **Client ID**, a **Client Secret**, and a long-lived
**Refresh Token** scoped to `youtube.upload`.

### 2a. Configure the OAuth consent screen

**APIs & Services → OAuth consent screen:**

1. User type: **External** → Create.
2. Fill the required app name + support email.
3. **Scopes** → Add → add `https://www.googleapis.com/auth/youtube.upload`
   (and optionally `https://www.googleapis.com/auth/youtube.readonly`).
4. **Test users** → add the Google account that owns your YouTube channel.
5. **Publish the app:** back on the OAuth consent screen, set **Publishing
   status → "In production"** (click **Publish app**).

> **Why publish to production:** while the app is in *Testing*, refresh tokens
> **expire after 7 days** — your uploads would silently break every week. In
> *Production* the refresh token does not expire (unless revoked or unused for
> 6 months). `youtube.upload` is a *sensitive* scope, so Google shows an
> **"unverified app"** warning during authorization — that's expected and safe
> to accept, since you are the only user. Full verification is only needed to
> let *other* people authorize your app.

### 2b. Create the OAuth client ID

**APIs & Services → Credentials → Create Credentials → OAuth client ID:**

1. Application type: **Web application**.
2. **Authorized redirect URIs → Add URI:**
   `https://developers.google.com/oauthplayground`
3. Create. Copy the **Client ID** → `YOUTUBE_OAUTH_CLIENT_ID`, and the
   **Client Secret** → `YOUTUBE_OAUTH_CLIENT_SECRET`.

### 2c. Mint the refresh token (OAuth Playground)

1. Open the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Click the **⚙️ gear** (top-right) → check **"Use your own OAuth
   credentials"** → paste your **Client ID** and **Client Secret**.
3. **Step 1 — Select & authorize APIs:** in the **"Input your own scopes"** box,
   enter `https://www.googleapis.com/auth/youtube.upload` → **Authorize APIs**.
4. Sign in with the **Google account that owns the YouTube channel** → accept the
   "unverified app" warning → **Allow**.
5. **Step 2 — Exchange authorization code for tokens.** Copy the
   **`refresh_token`** value → `YOUTUBE_OAUTH_REFRESH_TOKEN`.

> If Step 2 returns no `refresh_token`, revoke the app's access at
> [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
> and redo Step 1 — Google only returns a refresh token on first consent.

### 2d. Add the secrets to GitHub

Repo **Settings → Secrets and variables → Actions → New repository secret**:

- `YOUTUBE_OAUTH_CLIENT_ID`
- `YOUTUBE_OAUTH_CLIENT_SECRET`
- `YOUTUBE_OAUTH_REFRESH_TOKEN`

Optional tuning (also GitHub secrets or env on the render workflow):

- `YOUTUBE_UPLOAD_PRIVACY` — `private` | `unlisted` | `public` (default `unlisted`).
- `YOUTUBE_CATEGORY_ID` — numeric category (default `28`, Science & Technology).

These do **not** go to Vercel. The render farm reads them directly; on its next
run `youtubeUploadConfigured()` becomes true and uploads route to YouTube.

---

## 3. Cloudflare R2 — downloadable render storage (optional)

The blocker for long-form download is size: a 7–13 min 1080p MP4 is ~100–200 MB,
past Supabase Storage's object limit. Cloudflare R2 (S3-compatible, **no
per-file size cap, zero egress fees**, 10 GB free ≈ 50–100 long videos) stores
every finished render — long **and** short — so any video is downloadable
regardless of size. Without R2 the studio falls back to Supabase Storage (fine
for Shorts; a large long-form then needs R2 or the YouTube publish path).

You produce four values: an **Account ID**, an **Access Key ID**, a **Secret
Access Key**, and a **Bucket** name.

### 3a. Create the bucket

1. Cloudflare dashboard → **R2** → **Create bucket** (e.g. `faceless-studio-media`).
   The bucket stays **private** — the app serves files via short-lived presigned
   URLs, so do not enable public access.
2. Note your **Account ID** (R2 overview page, or the R2 endpoint
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`) → `R2_ACCOUNT_ID`.
3. The bucket name → `R2_BUCKET`.

### 3b. Create an API token

1. **R2 → Manage R2 API Tokens → Create API token.**
2. Permissions: **Object Read & Write** (scope it to the one bucket if you like).
3. Create, then copy the **Access Key ID** → `R2_ACCESS_KEY_ID` and the
   **Secret Access Key** → `R2_SECRET_ACCESS_KEY` (shown once).

### 3c. Add the secrets

Repo **Settings → Secrets and variables → Actions → New repository secret**:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET` *(may be a repo **Variable** instead — it's not sensitive)*

Unlike the YouTube upload creds, R2 **does** go to Vercel: the app presigns
download links, so `sync-vercel-env.yml` pushes the four R2 values. After adding
them, run **Actions → Sync Vercel Env** so the app can generate R2 links.

> R2-backed renders are stored with an `r2:`-prefixed `storage_path`, so reads
> pick the right backend automatically and pre-R2 Supabase renders keep
> resolving. No data migration, no backfill.

---

## 4. After adding the secrets

1. Re-run a stuck or oversized video: open it in the **Review queue** and tap
   **Resume** (re-rendering from existing assets is free — no asset re-spend).
   With R2 configured the long-form stores successfully and advances to
   `FINAL_REVIEW`, downloadable from the Publish Kit.
2. **Choose per video** in the Publish Kit (status `APPROVED`): **Download** the
   MP4 (long or short), and/or tap **Publish to YouTube** — the farm uploads on
   its next pass (long-form as an unlisted draft, a Short as `#Shorts`). Nothing
   auto-uploads; the choice is always yours.

**Safety net:** without R2, oversized long-forms still retry via a resumable
(TUS) upload to Supabase Storage; if that also fails the worker throws a message
pointing at the fix (configure R2, or publish to YouTube).

---

## 5. Verify

Run the **Verify Secrets** workflow (**Actions → Verify Secrets → Run
workflow**). It lists every configured secret name, live-checks the Data API key,
mints an access token from the YouTube refresh token, and probes the R2 bucket
with an authenticated head-bucket. The OAuth upload path is also validated
end-to-end the first time the farm uploads a finished cut.

Quick manual check of a refresh token (returns an access token when valid):

```bash
curl -s https://oauth2.googleapis.com/token \
  -d client_id=$YOUTUBE_OAUTH_CLIENT_ID \
  -d client_secret=$YOUTUBE_OAUTH_CLIENT_SECRET \
  -d refresh_token=$YOUTUBE_OAUTH_REFRESH_TOKEN \
  -d grant_type=refresh_token
```

Quick manual check of R2 credentials (lists the bucket when valid):

```bash
AWS_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY \
  aws s3api head-bucket --bucket "$R2_BUCKET" \
  --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"
```

---

## Reference — code that consumes these

- Data API key → `src/lib/adapters/youtube.ts` (`youtubeKey()`), stats +
  `searchNiche`.
- OAuth upload → `packages/render/src/youtube.ts`
  (`youtubeUploadConfigured()` / `uploadVideo()`), called from
  `publishStagedVideos` in `packages/render/src/render-queue.ts` for both
  long-form and Shorts (gated on the `publish_requested` flag).
- R2 storage → `packages/storage` (`@studio/storage`): `r2Put` / `r2Get` /
  `r2SignedGetUrl`, the `r2:` path prefix; `storeRender()` in the render worker
  and `getSignedMediaUrl()` in `src/lib/storage.ts`.
- Publish choice (Download / Publish) → `requestPublishAction` in
  `src/lib/actions/publish.ts`, surfaced in `publish-kit.tsx`.
- Vercel sync set → `.github/workflows/sync-vercel-env.yml`.
- Secret verification → `.github/workflows/verify-secrets.yml`.

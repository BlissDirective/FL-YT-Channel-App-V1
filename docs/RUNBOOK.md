# Operations Runbook

Operating guide for Faceless Studio — architecture, environment, scheduled
jobs, the MCP server, and troubleshooting. Pairs with `setup.md` (account
checklist) and `DECISIONS.md` (why things are the way they are).

## 1. Architecture at a glance

- **Next.js 15 on Vercel** — UI (React Server Components), server actions,
  and API routes (`/api/cron/*`, `/api/export`, `/api/mcp`).
- **Supabase** — Postgres (all state, RLS = authenticated full access),
  Auth (single operator, email+password, no public signup), Storage (`media`
  bucket), Realtime (dashboard live updates).
- **GitHub Actions** — the work that can't run in a serverless function:
  - `render.yml` — Remotion render farm (needs Chrome), every 10 min.
  - `stats.yml` — nightly YouTube stats refresh.
  - `intelligence.yml` — daily idea scouting.
  - `optimizer.yml` — weekly performance insights.
  - `db-migrate.yml` — applies `supabase/migrations/*.sql` on push.
  - `sync-vercel-env.yml` — pushes GitHub secrets → Vercel env + redeploys.
- **Mock-first adapters** — every provider runs as a deterministic mock until
  its key is present (`src/lib/adapters/*`). Nothing blocks on credentials.

## 2. Environment variables

Set as **GitHub repository secrets** (the sync workflow pushes them to Vercel)
and/or directly in Vercel → Settings → Environment Variables. See
`.env.example` for the full list.

| Var | Phase | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | 0 | Public Supabase client (committed defaults exist) |
| `SUPABASE_SERVICE_ROLE_KEY` | 0 | Server/admin client, cron + render worker |
| `SUPABASE_PASSWORD` | 0 | DB Migrate (psql via pooler) |
| `VERCEL_TOKEN` | 0 | Lets `sync-vercel-env` push env + redeploy |
| `ANTHROPIC_API_KEY` | 4 | Scripts, QC, intelligence, scout, optimizer |
| `ELEVENLABS_API_KEY` | 4 | Voiceover |
| `FAL_KEY` | 5 | Clips + thumbnails |
| `PEXELS_API_KEY` | 5 | Stock footage |
| `YOUTUBE_API_KEY` (or `YOUTUBE_DATA_API_V3`) | 7 | Stats + niche research |
| `CRON_SECRET` | 7 | Bearer auth for `/api/cron/*` |
| `STUDIO_MCP_TOKEN` | 9 | Bearer auth for `/api/mcp` (full control) |
| `STUDIO_MCP_READ_TOKEN` | 9 | Optional read-only `/api/mcp` token (inspection tools only) |
| `TELEGRAM_WEBHOOK_SECRET` | 8 | Dedicated Telegram webhook secret (falls back to `CRON_SECRET`; re-run `/api/telegram/register` after setting) |
| `SENTRY_DSN` | 9 | Enables production error reporting (SDK-less; no-op when unset) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | 3 | Web-push gate notifications |

Generate shared secrets with `openssl rand -hex 32`. After adding a secret,
run **Sync Vercel Env** (Actions tab) so Vercel picks it up and redeploys.

## 3. Scheduled jobs

| Workflow | Schedule | Endpoint | Auth |
|---|---|---|---|
| Render Farm | every 10 min | (worker, direct DB) | service role |
| Stats Refresh | 07:10 UTC daily | `/api/cron/refresh-stats` | `CRON_SECRET` |
| Daily Intelligence | 06:30 UTC daily | `/api/cron/intelligence` | `CRON_SECRET` |
| Weekly Optimizer | 08:00 UTC Mon | `/api/cron/optimizer` | `CRON_SECRET` |

All cron routes are public in middleware but reject without the matching
`CRON_SECRET` bearer (unset = open, for local/mock). On-demand buttons exist
in the UI for stats refresh, intelligence, and the optimizer.

`APP_BASE_URL` repo **variable** overrides the production URL the cron
Actions ping (defaults to `https://fl-yt-channel-app-v1.vercel.app`).

## 4. Deploy & migrate flow

1. Push to `main` → Vercel auto-deploys, CI runs (typecheck + build).
2. If `supabase/migrations/**` changed → **DB Migrate** applies new files
   (tracked in `public._migrations`, idempotent).
3. New env secret → run **Sync Vercel Env** to push it + redeploy.

## 5. studio-mcp — operate the app from Claude

The app exposes an MCP server (streamable HTTP) at `POST /api/mcp`, gated by
`STUDIO_MCP_TOKEN`. Tools: `list_projects`, `get_project_stats`,
`list_pending_approvals`, `approve_gate`, `request_revision`, `queue_idea`,
`get_video`, `run_intelligence_now`, `get_cost_summary`,
`propose_template_update`.

**Claude Code** (`.mcp.json` or `claude mcp add`):

```json
{
  "mcpServers": {
    "studio": {
      "type": "http",
      "url": "https://fl-yt-channel-app-v1.vercel.app/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_STUDIO_MCP_TOKEN" }
    }
  }
}
```

Then ask: *"what's pending review across my projects?"* or *"approve the
final cut for video X."* Quick check:

```bash
curl -s -X POST https://fl-yt-channel-app-v1.vercel.app/api/mcp \
  -H "Authorization: Bearer $STUDIO_MCP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq
```

## 6. Troubleshooting

| Symptom | Check |
|---|---|
| Cron Action 401 | `CRON_SECRET` mismatch between GitHub secret and Vercel env — re-run Sync Vercel Env. |
| MCP 503 | `STUDIO_MCP_TOKEN` not set in Vercel. |
| MCP 401 | Bearer token doesn't match `STUDIO_MCP_TOKEN`. |
| Dashboard stats blank | No tracked videos, or stats cron hasn't run — tap Refresh stats. |
| A provider shows "Mock mode" | Key absent — add the secret, Sync Vercel Env. Use the **Test** button in Settings to live-ping a connected key. |
| Render stuck at "Rendering" | Check the Render Farm workflow run; it advances ASSEMBLING → FINAL_REVIEW. |
| Migration didn't apply | Check the DB Migrate run log; files are tracked in `public._migrations`. |

## 7. Cost controls

Per-video and per-month budget caps are enforced in code before any paid
provider call (`budgetPause` in the engine); the global **kill switch**
(Settings) halts all pipelines. Every provider call writes to `cost_ledger`,
surfaced on the dashboard spend meter and in Settings.

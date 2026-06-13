# Decision Log

Deviations and notable choices during the autonomous build, per the plan's
standing rules (Full-App-Development-plan.md §5).

## 2026-06-11 — Phase 0

- **Custom warm component library instead of stock shadcn/ui components.**
  The design system (§1.1) is distinctive enough that themed-from-scratch
  components (StatCard, SemicircleGauge, FlowDiagram, etc.) are simpler than
  overriding shadcn primitives. shadcn-style conventions kept (`cn` util,
  composable props); individual shadcn primitives (dialog, dropdown,
  popover) will be added in later phases where accessibility plumbing
  matters.
- **Secret names as configured by the user** (differ from setup.md
  suggestions): `SUPABASE_ANON_PUBLIC_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_SECRET_KEY`, `SUPABASE_PASSWORD`, `TRIGGER_SECRET_KEY`,
  `TRIGGER_DEV_PROJECT_REF`, `YOUTUBE_DATA_API_V3`. No `VERCEL_TOKEN` and no
  Supabase URL secret — Vercel access goes through the MCP/Git integration,
  and the Supabase project URL is public configuration, not a secret.
- **Next.js app at repo root instead of `apps/web`.** The pre-created Vercel
  project has no framework preset and no Root Directory configured, and
  neither is settable through the available MCP tools — the first Git deploy
  errored. Hosting the app at the root with `vercel.json` declaring
  `"framework": "nextjs"` makes Git deploys work with zero dashboard
  configuration, which the autonomous build requires. `packages/*` remain
  pnpm workspaces (`@studio/core` today; video/Remotion and mcp-server
  later). Turborepo dropped as unnecessary at this scale.
- **No Anthropic / ElevenLabs / fal.ai / Pexels keys yet** — expected; not
  needed until Phases 4–5. Mock adapters cover everything until then.
- **YouTube Data API key already provided** (`YOUTUBE_DATA_API_V3`) — ahead
  of schedule (Phase 7); verified valid against googleapis.com.
- **Credential verification results (Actions run 3):** the Supabase keys
  belong to project ref `reffwibuitzrkertuuvy` (a project outside this
  session's Supabase MCP scope). `SUPABASE_SECRET_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` verified ✅ (both service_role JWTs);
  `SUPABASE_ANON_PUBLIC_KEY` is **rejected (401)** despite decoding as the
  anon key for the same project — likely mis-copied or rotated; needs
  re-copying before Phase 1 auth work. Trigger.dev secret key
  authenticated ✅. DB password present (tested at first migration).
  Phase 1 migrations will run through GitHub Actions using
  `SUPABASE_PASSWORD`, since the project is outside MCP scope.

## 2026-06-11 — Phase 1

- **Migrations run via a GitHub Actions `db-migrate.yml` workflow**, not the
  Supabase MCP (the target project `reffwibuitzrkertuuvy` is in a different
  Supabase org than the MCP token can see). The workflow connects through the
  Supavisor session pooler (GitHub runners are IPv4-only; the direct
  `db.<ref>.supabase.co` host is IPv6-only). Pooler host discovered and pinned:
  `aws-1-us-east-2.pooler.supabase.com` (project is in us-east-2). A
  `public._migrations` table tracks applied files for idempotency.
  **0001_init.sql applied successfully** — all 11 tables, indexes, RLS
  policies, updated_at triggers, and the `media` storage bucket are live.
- **Supabase project URL is therefore** `https://reffwibuitzrkertuuvy.supabase.co`.
- **Anon key re-verified (Actions run 4, dispatched with the user's PAT):**
  still **rejected (401)**. The value decodes as a valid anon JWT for the right
  project but the server rejects it, which points to a truncated/mis-pasted
  secret rather than a disabled legacy key (the service_role JWT for the same
  project works, so legacy JWTs are still enabled). **Action required from
  user: re-copy the anon (publishable) key into `SUPABASE_ANON_PUBLIC_KEY`.**
- **Two blockers for *deployed* validation (code is complete and builds):**
  (1) the anon key above; (2) the Vercel deployment has no Supabase env vars.
  Vercel deploys come from the Git integration and do **not** read GitHub
  Actions secrets, and the Vercel MCP exposes no env-var-write tool — so the
  three public/server Supabase vars must be added in the Vercel project
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`), or a `VERCEL_TOKEN` provided so the build can
  do it. Until then the deployed app shows the "Finish connecting Supabase"
  notice by design (it never crashes unconfigured).
- **Single-operator auth**: email+password with a first-run `bootstrap`
  action (service-role-gated, refuses once any user exists). No public signup.
  `/styleguide` and `/login` are the only unauthenticated routes.

## 2026-06-11 — Phase 1→2 unblocking + Phase 2

- **Anon key resolved.** The project's JWT secret had been rotated (the new
  key's `iat` is issue-day), which is why the old stored value 401'd. The
  user supplied the fresh anon key in-session; it was verified live (an RLS
  table query returns `[]` for anon, as designed) and the GitHub secret
  `SUPABASE_ANON_PUBLIC_KEY` was updated via the API (sealed-box encryption;
  verify-secrets run now fully green). Note: `/rest/v1/` root is
  service_role-only on this project — verification now uses `/auth/v1/health`.
- **Supabase URL + anon key committed as client defaults** in
  `src/lib/supabase/config.ts` (env vars override). These are public-by-design
  values that ship in the browser bundle of any Supabase app; RLS enforces
  access and public signup is disabled. This unblocks deployed login UX
  without waiting on Vercel env vars. The service-role key remains env-only.
- **`sync-vercel-env.yml` added** (workflow_dispatch): once a `VERCEL_TOKEN`
  GitHub secret exists, it upserts all provider keys from GitHub secrets into
  the Vercel project env (production/preview/dev) and triggers a redeploy.
  Until then it exits gracefully with instructions. This is the chosen
  mechanism for all future credential rollouts (Phases 4–7 keys included).
- **Remaining blocker for full deployed validation:** only
  `SUPABASE_SERVICE_ROLE_KEY` on Vercel (needed by the first-run account
  bootstrap) — covered the moment `VERCEL_TOKEN` is added and the sync runs.
- **Phase 2 shipped:** activity feed (derived from video status changes +
  idea arrivals), monthly spend meter vs. aggregate project budgets, and
  Supabase Realtime publication + `RealtimeRefresher` (server-rendered pages
  re-render on any videos/ideas/projects change).

## Phase 3 (2026-06-12)

- **Orchestration backbone is DB-driven, not Trigger.dev — for now.**
  Deploying Trigger.dev tasks requires a personal access token (`tr_pat_…`)
  for CI deploys; we only hold the runtime `TRIGGER_SECRET_KEY`. Since every
  Phase 3 stage is a mock that completes in seconds, the engine
  (`src/lib/pipeline/engine.ts`) runs stages inside server actions with the
  exact waitpoint semantics the plan assigns to Trigger.dev: stage → gate →
  stop until a decision (human, or the engine itself in Autopilot) resolves
  it. Phase 4 moves stage bodies onto Trigger.dev tasks behind this same
  interface when long-running live provider calls make durability matter.
- **Approvals are decision records, not pending rows.** The review queue
  derives from `videos.status` (via `GATE_FOR_STATUS`); `approvals` records
  every resolution (approve / revision+notes / kill) with `decided_by`
  (human | autopilot). Avoids pending-row bookkeeping drift.
- **Budget guard runs before every paid stage** (per-video and monthly
  caps): the video keeps its status, gets `videos.paused_reason`, and shows
  a Resume button once caps are raised. Same mechanism backs the global
  kill switch (`app_settings.kill_switch`).
- **Web push** uses VAPID keys generated at deploy time and stored only in
  Vercel env (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`);
  subscriptions live in `push_subscriptions` with expired endpoints pruned
  on send. Push is a soft dependency — everything works without keys.
- **Co-pilot mode currently behaves like Assist** — auto-approval needs the
  Phase 8 QC agent's confidence score; only Autopilot auto-resolves gates.

## Phase 4 (2026-06-12)

- **Key audit before starting:** verify-secrets extended to test Anthropic,
  ElevenLabs, fal.ai, and Pexels keys live. Result: Anthropic ✅,
  ElevenLabs ✅ (starter tier), Pexels ✅; the fal key exists as
  `FAL_AI_FULL_ACCESS_DEVELOPMENT_KEY` (now recognized by the workflows and
  mapped to `FAL_KEY` for Phase 5).
- **Script generation** uses `claude-sonnet-4-6` with a forced tool call
  (`deliver_script`) for structured beats/titles/description/tags/chapters;
  real cost computed from token usage into the ledger. The per-project
  prompt template (versioned in `prompt_templates`, editable in project
  settings) is the brief; `{{placeholders}}` are filled by the engine.
- **Voiceover** synthesizes per beat (parallel) via ElevenLabs
  `with-timestamps`, storing MP3s in the private `media` bucket and word
  timings in asset meta — this powers the read-along highlight and lets the
  editor re-voice only edited sections. Beat-level files also map cleanly to
  Remotion's beat sequencer in Phase 6.
- **Serverless stage budget:** routes that run live stages declare
  `maxDuration = 300` (Vercel fluid compute). Trigger.dev migration remains
  planned for when render workloads (Phase 6) exceed this window.
- **ElevenLabs quota caution:** starter tier ≈ 30k credits/month; one
  8-minute video ≈ 7k characters. Default demo runs keep using mock voices
  unless the project has a real voice selected, so quota is only spent
  deliberately.
- **Mock fallbacks retained everywhere** (standing rule 4): no keys → the
  Phase 3 mock pipeline keeps working unchanged.

## Phase 5 (2026-06-12)

- **Per-project voice tiers:** voice ids are namespaced (`kokoro:af_heart`
  vs raw ElevenLabs ids) so the provider is derivable without a schema
  change. Kokoro runs on fal.ai at ~$0.02/1k chars (~$0.15 per 8-min video,
  ~5× cheaper than ElevenLabs turbo) — the "volume tier" for scaling video
  count. ElevenLabs (user upgrading to Creator) stays the premium tier.
  Voice is switchable in project settings; the wizard labels tiers.
- **Kokoro word timings are estimated** (length-weighted distribution with
  sentence-pause bias) since fal's endpoint returns no timestamps. Good
  enough for read-along; upgradeable to forced alignment without schema
  changes.
- **VO cache (free squeeze):** `vo_cache` stores one file per unique
  (project, voice, text-hash) under `vo-cache/{project}/`. The default
  script template now pins an exact standard outro sentence, so every
  video after the first reuses it at $0; identical re-runs of any beat are
  also free. Ledger entries say "reused from cache — free" so savings are
  visible.
- **Visuals:** stock beats use Pexels (free, hot-linked file URLs in asset
  meta with poster + credit); hero beats use FLUX dev ($0.025); b-roll and
  the 3 thumbnail candidates use FLUX schnell ($0.003). Stills pan/zoom in
  the Phase 6 Remotion render. Every generator degrades per-item to the
  mock tile on failure — one provider hiccup never fails the stage.
- **Script tightening** added to the default template ("every sentence must
  earn its runtime") — shorter scripts cut TTS spend across all providers.

## Source Library agent assessment (2026-06-13)

- Assessed a "compliant video scraping agent" (e.g. scrape free GTA 6
  footage to remix). Verdict: general scraping is not compliantly
  automatable — "free to find" ≠ "free to use". Specific blockers:
  publisher IP (Rockstar's policy is non-commercial fan use, bans leaked
  footage), YouTube CC license laundering, yt-dlp ToS exposure, and —
  heaviest — YouTube's 2025 "inauthentic content" policy (Jan 2026
  enforcement terminated 16 faceless channels outright).
- Approved instead: **Phase 6.5 Source Library agent** — licensed sources
  only (Pexels, Pixabay, Internet Archive, Wikimedia, gov archives) with
  Claude relevance + license screening, an attribution ledger feeding the
  Publish Kit, and human approval at the Assets gate. Gaming niches get a
  manual press-kit/own-capture lane, never autonomous.

## Phase 6 (2026-06-13)

- **Render farm = GitHub Actions, not Trigger.dev/Lambda.** Vercel can't run
  Chrome and Trigger deploys remain blocked without a PAT, so a cron worker
  (`render.yml`, every 10 min + dispatch) renders the queue with Remotion on
  ubuntu runners — free at this scale. The engine leaves live-asset videos
  at ASSEMBLING ("external" waitpoint); the worker uploads MP4s and advances
  to FINAL_REVIEW. Mock videos still mock-render in-app instantly.
- **Compositions** (`packages/render`, isolated workspace so the web bundle
  stays clean): branded intro sting, beat sequencer (Ken Burns stills /
  looped stock footage, per-beat VO), word-highlight captions, subscribe
  lower-third at 70%, branded end card; 9:16 **Short** derived from the hook
  beat (idea #1 — output multiplier at $0 marginal cost).
- **Beat timeline** (idea #2 foundation): the long-form render asset stores
  each beat's absolute start/end so Phase 7+ retention curves map to beats.
- **Deferred from plan scope:** background music bed + auto-ducking (needs a
  licensed track bundle picked first) — slotted alongside Phase 6.5.
- Local smoke render validated (315 frames, h264) before first CI run.

## Phase 6.5 — Source Library agent (2026-06-13)

- **Licensed sources only**, fanned out per beat: Pexels (video), Openverse
  (CC images, no key, server-side commercial+modification filter), Wikimedia
  Commons (CC/PD images, no key), Pixabay (optional key). No YouTube/yt-dlp,
  no publisher IP — per the scraping-agent assessment.
- **Deterministic licence screening** (`classifyLicense`) is the gatekeeper,
  not the LLM: rejects NC, ND, and SA (SA excluded so copyleft can't infect
  the whole render); allows CC0/PD, CC-BY, Pexels, Pixabay. Re-screened
  server-side on apply — a client can't smuggle a bad licence through.
- **Claude (Haiku) ranks** candidates for visual relevance and flags likely
  licence laundering (title/author hints of copyrighted film/game clips).
  Best-effort; degrades to source order without a key.
- **Attribution ledger** is derived from clip-asset meta (no new table) via
  `src/lib/attribution.ts`; CC-BY picks show in an Assets-gate ledger panel
  now and `buildAttributionBlock()` feeds the Phase 7 Publish Kit description.
- **Storage policy:** chosen images are copied into the bucket (so the render
  farm uses them and links can't rot); licensed videos keep their direct file
  URL, matching the existing Pexels render path.
- Gaming niches remain a manual press-kit/own-capture lane — the agent
  surfaces nothing infringing because the sources contain no such footage.

## Phase 7 — Publish Kit & Live Stats Tracking (2026-06-13)

- **API-key-only YouTube Data API** (`src/lib/adapters/youtube.ts`): public
  `statistics`/`snippet` for a video id need no OAuth, so the app stays out of
  Google's upload audit entirely — uploads remain manual by design. Accepts
  the `YOUTUBE_API_KEY` env or the `YOUTUBE_DATA_API_V3` secret alias the
  Vercel sync already pushes.
- **Mock stats are deterministic-but-living:** a stable hash seeds each id's
  baseline and views grow with whole days elapsed, so the tracking dashboards
  and sparkline work end-to-end before any real channel exists (mock-first
  rule #4). The demo TRACKING video is seeded with a 6-point rising snapshot
  history, a render, and a crowned thumbnail.
- **Snapshot history, not a single counter:** every refresh inserts one
  `analytics_snapshots` row per tracked video. Latest-per-video drives the
  portfolio/project totals + estimated revenue; the full series drives the
  per-video views sparkline (new inline-SVG `Sparkline`, server-renderable,
  no chart lib). `analytics_snapshots` joined the Realtime publication.
- **Estimated revenue = views × niche RPM**, RPM configurable per project
  (`projects.rpm_usd`, default $2.0) in settings — no analytics OAuth, so
  watch-hours/true RPM aren't available; this is the honest public-data proxy.
- **Two refresh paths:** on-demand button (`refreshStatsAction`) and a nightly
  `Stats Refresh` GitHub Action that POSTs `/api/cron/refresh-stats`. The cron
  route is public in middleware but gated by `CRON_SECRET` (unset = open, for
  mock/dev). Plain HTTP, so it runs inside the Next app — no render-farm-style
  worker needed (that one exists only because Remotion needs Chrome).
- **Publish Kit lives on the video detail page** for APPROVED + TRACKING
  videos: MP4 (+ Short) and thumbnail downloads, one-tap copy for title/
  description/tags, an upload checklist (incl. the AI-synthetic-content
  disclosure reminder + end-screen prompts), and "Mark as uploaded" → paste
  URL → TRACKING + first snapshot. The copied description is composed
  server-side: script description + chapter timestamps + the Phase 6.5
  attribution block, so CC-BY credits ship automatically.
- **CSV export** is a GET route (`/api/export`, optional `?project=`) reusing
  the session middleware for auth — surfaces on the overview once anything is
  published.

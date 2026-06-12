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

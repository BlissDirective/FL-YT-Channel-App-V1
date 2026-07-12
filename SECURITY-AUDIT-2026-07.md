# Security Audit & Hardening — Pre-Launch (2026-07-12)

Full-surface review ahead of making the marketing/demo page public while the
app itself stays private. Six parallel audits (auth/authz, database RLS +
storage, client-side/XSS, injection/SSRF/RCE, CI/supply-chain, LLM-agent
surface) plus a core-spine review.

**Headline:** the app is well-built defensively — complete RLS coverage, a
private media bucket, argument-array shell-outs (no shell injection), a
private storage path scheme (no traversal), constant-time secret checks on
every perimeter route, an XSS-clean React tree, and no secrets in the client
bundle or committed to the repo. The real risk was that authorization was
**single-layered** (middleware + "signups are closed"). This pass adds the
missing layers and closes the concrete injection/SSRF and workflow gaps.

---

## Fixed in this pass (code)

### Authorization — defense in depth
- **`src/lib/auth-guard.ts` (new) + applied to every service-role action.**
  Next dispatches server actions by hashed action-ID, not strictly by path, so
  a POST to the public `/login` could carry another action's ID. Anon-keyed
  actions are still fenced by RLS; the RLS-bypassing service-role actions were
  not. `assertOperator()` now runs first in `operator.ts` (start/stop
  autonomous spend), `edit.ts` (all cut mutations + paid SFX), and
  `autofix.ts` (paid loop) — an unauthenticated dispatch never reaches the body.
- **`src/middleware.ts` fails closed in production** when Supabase env is
  missing (503) instead of serving the whole control panel unauthenticated.

### Database — shrink the anon blast radius (`migration 0049`)
- Migration `0042` had re-granted `ALL privileges` on every table/sequence/
  function to `anon` (plus default privileges on future tables). RLS made it
  inert today, but it was the trap that turns "a new table forgot RLS" — e.g.
  the planned public `launch_leads` — into instant full anon read/write.
  `0049` **revokes every `anon` table/sequence/function grant** and unsets the
  default privileges; `anon` keeps only schema `USAGE`. `authenticated` and
  `service_role` are unchanged (verified: anon 0 grants, authenticated 189).
- `0049` **re-asserts the `single_operator_guard`** trigger idempotently (0032
  swallowed a privilege error on hosted stacks) so a second `auth.users` insert
  is rejected at the DB even if the dashboard signup toggle is wrong.
- `supabase/config.toml`: `enable_signup = false` in both `[auth]` and
  `[auth.email]`; `minimum_password_length` 6 → 12.

### Injection / SSRF / RCE
- **`packages/core/src/safe-url.ts` (new) `checkPublicHttpUrl`** — pure,
  synchronous guard: http(s) only, rejects flag-like values (`-…`), blocks
  loopback / link-local (169.254 metadata) / RFC1918 / IPv6 ULA / `.internal` /
  `.local` / `metadata.*` hosts. Unit-tested.
- **yt-dlp RCE + SSRF (`packages/intel`)** — the deep-scan `source_url` (an
  operator string, later a bare positional arg to yt-dlp on a secret-bearing
  runner) is now validated at the action (`src/lib/actions/intel.ts`) AND in
  the worker, and the invocation adds `--no-exec` and a `--` end-of-options
  terminator so the URL can never be parsed as a flag (e.g. `--exec=<cmd>`).
- **Server-side fetch SSRF** — `applyPressKitClip` and `applySourceClip`
  (`src/lib/pipeline/engine.ts`) validate the media URL with
  `checkPublicHttpUrl` before it is fetched/stored and later streamed by the
  render worker.

### Client-side / headers
- **`next.config.ts`**: added `Strict-Transport-Security` (HSTS,
  2-year + preload) and a **Content-Security-Policy in Report-Only** mode
  (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`, …) — it
  surfaces violations without breaking Next's inline hydration, so it can be
  tightened to enforcing before/after launch. Verified served on live responses.
- **`getProjects()`** strips `youtube_refresh_token` from dashboard rows so the
  channel token can never ride into a client component (latent-leak defense).

### LLM / agent surface
- **`packages/agent` Telegram HTML injection** — the worker sent
  `parse_mode: HTML` with the model-controlled `mark_ready` note and the video
  title unescaped; both are now HTML-escaped (the app-side adapter already did).
- **Stored prompt-injection hardening** — editing lessons (written by other LLM
  passes) injected into the agent's system prompt are now newline-stripped,
  length-capped, and fenced as explicit "reference data, never instructions."

### CI / supply chain
- **`sync-vercel-env.yml`**: removed the `vercel_token` `workflow_dispatch`
  input (dispatch inputs persist UNMASKED in run metadata) — the token must
  come from a masked secret.
- **Least privilege**: added `permissions: contents: read` to all 18 workflows
  (was defaulting to the broad repo `GITHUB_TOKEN` scope; none need write).
- **`video-intel.yml`**: pinned yt-dlp to a specific release and verify its
  published SHA2-256SUMS before making it executable (was `latest`, unverified).
- **`.github/dependabot.yml` (new)**: weekly updates for `github-actions` and
  `npm` so pinned action tags don't silently drift.

### Test-suite fix
- `e2e/authed/golden-path-authed.spec.ts` had an undeclared `projectUrl`
  (strict-mode `ReferenceError`, failing 3 tests at HEAD) — declared it.

---

## Operational actions the operator must take (cannot be done from code)

1. **Verify Supabase signup is DISABLED in the hosted dashboard**
   (Auth → Providers/Settings). `config.toml` governs the local stack only;
   the hosted project's dashboard setting is authoritative. The DB trigger and
   `bootstrapAccount` are backstops, but close the front door too.
2. **Confirm `single_operator_guard` exists in prod**:
   `select tgname from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal;`
   — if absent, run `0049` (or attach the trigger) as the DB owner in the SQL editor.
3. **Set the hosted `site_url` + redirect allow-list** to the real production
   origin (config has dev `127.0.0.1` values) so auth emails / redirects are safe.
4. **Rotate & scope tokens**: `STUDIO_MCP_TOKEN` (a leak = publish + spend — use
   a long random value; hand out `STUDIO_MCP_READ_TOKEN` where only reads are
   needed), `SUPABASE_PASSWORD` (the pooler host + project ref are public, so
   this password is the last barrier to the DB), `CRON_SECRET`.
5. **When the public `launch_leads` table ships**, use the minimal insert-only
   RLS pattern (grant `anon` INSERT only, NO select/update/delete policy, add a
   `unique(email)` and a length check) plus a captcha/rate-limit on the form —
   `0049` ensures a new table gets NO anon grant by default.
6. Consider turning the CSP from Report-Only to enforcing after observing the
   violation reports on the live marketing page.

---

## Reviewed and clean (no action)
Complete RLS coverage on all 27 tables; private `media` bucket with no
public policy and UUID-derived, service-role-signed storage keys (no path
traversal); ffmpeg/yt-dlp shell-outs use argument arrays (no shell injection);
`.or()` PostgREST filters interpolate only UUIDs/server strings; CSV export
neutralizes formula injection; AI-output `JSON.parse` only drives typed
objects, never queries/commands; cron/MCP/Telegram routes use constant-time
compares and fail closed when unset; no secrets in the client bundle or the
git tree; Next 15.3 is patched against the middleware-bypass CVE; the agent
tool gate (budget/caps/kill-switch/judge-floor) mechanically contains a hostile
model; the research producer's global lessons are shadow-status + spend-capped.

## Residual / lower-priority follow-ups
- `verify-secrets.yml` uses `toJSON(secrets)` (whole secret context into one
  env); push/dispatch-only and now `contents: read`-scoped — refactor to
  explicit per-secret mapping when convenient.
- `checkPublicHttpUrl` blocks literal internal hosts but not DNS-rebinding to a
  private IP; a resolve-then-pin fetch would close that (low likelihood here).
- Agent model-token spend is bounded by `maxTurns` (12), not the dollar budget
  mid-session; lower turns or add a projected-cost gate if runs grow.
- Migrate the render farm's direct `cost_ledger` inserts onto `recordCost`
  (pre-existing cleanup item).

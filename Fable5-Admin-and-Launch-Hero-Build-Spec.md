# Fable5 — Admin Login + Launch Hero Page — Build Spec (LOCKED)

**Status:** Approved skeleton. Build order and scope below are locked by
operator sign-off. Supersedes the conflicting guidance between
`Fable5-faceless-studio-live-app.md` (which said build marketing in a separate
repo) and `Fable-5-faceless-studio-app-hero-page.md` (which said build it
in-repo). **Decision: build in this repo** — the hero page's whole thesis is
"the demos are the actual product," which only holds if it can import the real
app components.

**Goal:** stand up (1) an owner/admin account with an admin-only capability
boundary, and (2) a public `/launch` hero + waitlist page with the legal
scaffolding needed to collect emails compliantly — the pre-market marketing
asset. Paywall/billing and multi-tenancy are explicitly **out of scope** here.

---

## 0. Locked decisions (operator sign-off)

| # | Decision | Locked answer |
|---|----------|---------------|
| D1 | Hero page location | **In this app repo**, `src/app/(marketing)/launch`, deployed on the existing Vercel project. |
| D2 | Admin/role system size | **Lightweight admin marker** (env allowlist + guards), stay single-tenant. No roles table yet. |
| D3 | Waitlist email backend | **Supabase `launch_leads` table now** (single opt-in). Resend double-opt-in deferred to a setup guide. |
| D4 | Legal/compliance pages | **Draft in-repo templates**, clearly marked DRAFT / needs lawyer review, wired with a consent line. |
| D5 | Admin gate's first job | Gate **global kill switch, VCE feature flags, Danger-Zone purge, MVDA scoreboard** to admin-only. |
| D6 | Sequencing | **Admin marker first, then the hero page.** |

### Context facts established during planning

- **Auth already exists.** `src/app/login/` (Sign-in + first-run "First-time
  setup"/bootstrap tabs), `signIn`/`bootstrapAccount`/`signOut` in
  `src/lib/actions/auth.ts`, route gating in `src/middleware.ts`, and
  `assertOperator()` in `src/lib/auth-guard.ts`. `bootstrapAccount` self-locks
  once any user exists.
- **Single-tenant data model.** `projects` (and every table) has **no
  `owner_id`**; RLS is `for all to authenticated using (true)`. Any
  authenticated user sees all rows — so the admin account sees the existing
  projects (Silicon Layer, etc.) with nothing to migrate. Per-user ownership is
  a future multi-tenancy lift, out of scope here.
- **Supabase is wired by default.** `src/lib/supabase/config.ts` defaults to the
  live project ref; `isSupabaseConfigured()` is always true. Public sign-ups are
  disabled in favor of the service-role bootstrap — they must stay disabled.
- **Migrations apply via the DB Migrate GitHub Action on merge to main.** The
  live DB is not in direct MCP scope; new migrations land when merged.
- **Next migration number: `0055`.**

---

## Part A — Admin account & admin capability *(Phase 1, build first)*

### A1. Your account — a one-time operator action (no code, no committed password)

- **If no account exists yet:** at `your-domain/login` → **First-time setup**
  tab → `cdsteinmeyer1@gmail.com` + your password → creates the owner account;
  bootstrap then self-locks.
- **If an account already exists:** set/reset the password in the Supabase
  dashboard (Auth → Users → your user → set/recover password).
- The password is **never** placed in code, migrations, env defaults, or commit
  history. Recommend rotating it after setup since it was shared in chat.

### A2. Lightweight admin marker *(this is the code deliverable of Phase 1)*

- New `src/lib/admin-guard.ts`:
  - `ADMIN_EMAILS` read from env (comma-separated; empty → no admins).
  - `isAdmin(user): boolean` — case-insensitive email match.
  - `assertAdmin(): Promise<string>` — like `assertOperator()`, but also throws
    `ForbiddenError` when the authenticated user is not in the allowlist. First
    line of every admin-only server action.
  - A cached `getIsAdmin()` server helper for conditional UI rendering.
- No migration required (env-based). `ADMIN_EMAILS` is set in Vercel (Part F).
- **D5 — first concrete job of the marker.** Gate to admin-only:
  1. **Global kill switch** (`src/app/settings/kill-switch.tsx` + its action).
  2. **VCE feature flags** (`VceSystemsCard` + `setVceFlagsAction`).
  3. **Danger-Zone purge** (`PurgeDemoData` + its action).
  4. **MVDA scoreboard** (`MvdaScoreboard`).
  - UI: hide these cards for non-admins via `getIsAdmin()`.
  - Server: `assertAdmin()` inside each corresponding action so the boundary is
    enforced server-side, not just hidden in the UI.
  - Since you are the sole user and in the allowlist, your experience is
    unchanged; the boundary simply exists for when non-admin users arrive.

### A2 acceptance / tests

- `tests/admin-guard.test.ts`: `isAdmin` matches allowlisted emails
  (case-insensitively), rejects others and empty/missing env; `assertAdmin`
  throws for anon and for non-allowlisted authenticated users.
- Gate parity: with the sole user allowlisted, the four surfaces still render
  and their actions still succeed (no regression for the operator).
- Full gate: `pnpm typecheck && pnpm vitest run && pnpm lint && pnpm build`,
  then commit + merge to main + push.

---

## Part B — `/launch` hero page *(Phase 2)*

- **Route group** `src/app/(marketing)/launch/page.tsx` with a dedicated
  marketing layout (cinema-dark, own fonts, no app chrome), `force-static` +
  per-section client islands. Target Lighthouse mobile ≥ 95, LCP < 1.8s on 4G.
- **Sections** (conversion spine first, per hero doc §3): Hero + capture →
  Numbers → Final capture; then The Machine (pipeline) + Gates & control; then
  the MVDA demo (import the real `EddTimeline` with a fixture doc); then Editor
  + Learning loop + Founder note/FAQ.
- **react-bits** copied into `src/components/bits/`, each wrapped in a
  `MotionGate` static fallback for `prefers-reduced-motion` / mobile.
- **Bottom-of-page "Operator login"** — a discreet text link to the existing
  `/login`. **No public create-account.** (Operator's confirmed interim access
  path.)
- **Legend / color system** and copy voice per hero doc §2 and §5.

---

## Part C — Waitlist email capture *(Phase 2, with the spine)*

- **Migration `0055_launch_leads.sql`:**
  `launch_leads (id uuid pk, email citext unique, source text, referrer text,
  utm jsonb, consent_at timestamptz, created_at timestamptz default now())`.
  RLS: **insert-only for `anon`**; no select/update/delete for anon. Admin/
  service-role may read for the leads view.
- **Server action `joinLaunchList(email, source, utm)`** (public, anon client):
  email validation, **honeypot** hidden field, **rate-limit** (per IP/session),
  silent upsert on duplicate email, records `consent_at`. Single opt-in.
- **Consent line** on every capture form linking Privacy + Terms (Part D).
- **Admin-only leads view** (gated by Part A) to see/export signups without
  touching the DB.

---

## Part D — Legal & compliance *(Phase 2, gates email collection)*

In-repo pages under the marketing group, each clearly labelled
**DRAFT — lawyer review required before public launch**:

- Privacy Policy (email collection: what/why/retention/contact/opt-out —
  GDPR/CCPA basics).
- Terms of Service (pre-launch/waitlist scope).
- **"Not affiliated with YouTube / Google"** disclaimer (footer + explicit
  line).
- AI-content disclosure note (YouTube synthetic-media stance).
- Footer + a **consent checkbox/line** on the capture form linking Privacy +
  Terms so the first email collected is compliant.

---

## Part E — Middleware & security *(Phase 2)*

- Add **only** `/launch` and the legal pages to `PUBLIC_PATHS` in
  `src/middleware.ts`. Everything else stays gated.
- Test: a logged-out visitor reaches `/launch` + legal pages, but is still
  bounced from `/`, `/settings`, `/projects/*`.
- Polish: OG image (dark agent-demo frame + H1), `/launch` in sitemap,
  `IntersectionObserver` → `sendBeacon` section-view analytics.

---

## Part F — Operator to-dos in Supabase & Vercel (not code)

**Supabase (dashboard):**
1. `launch_leads` schema needs **no manual step** — the `0055` migration applies
   via the DB Migrate Action on merge.
2. Verify **public sign-ups stay DISABLED** (Auth → Providers → Email → "Allow
   new users to sign up" OFF).
3. Confirm the admin account per A1.

**Vercel (project settings):**
1. Add env var **`ADMIN_EMAILS`** = your email; redeploy.
2. Confirm `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present.
3. No new domain needed (using `/launch` on the existing deployment). A
   dedicated marketing domain is optional and deferred.

---

## Part G — Resend double-opt-in setup guide *(deferred deliverable)*

Write `Fable5-Resend-DoubleOptIn-Setup.md` (no code built now): create Resend
account → verify sending domain (SPF/DKIM/DMARC DNS) → API key env var →
confirmation + welcome email flow → the drop-in change to flip `joinLaunchList`
from single to double opt-in. The `launch_leads` schema is designed so this is
additive (add a `confirmed_at` column later).

---

## Part H — Build order, testing & acceptance

1. **Phase 1 — Admin marker + gates (Part A2).** Tests + full gate + merge/push.
2. **Phase 2 — Hero spine + capture + legal + middleware** (Parts B/C/D/E core).
   *Accept:* email lands in `launch_leads`, dupes upsert silently, honeypot
   drops bots, logged-out user reaches `/launch` + legal only, Lighthouse mobile
   ≥ 95.
3. **Phase 3 — Machine + Gates sections.**
4. **Phase 4 — MVDA demo** (real `EddTimeline` fixture).
5. **Phase 5 — Editor + Learning + FAQ + polish** (OG, sitemap, beacons).
6. **Verify:** Playwright `e2e/launch.spec.ts` (renders, form submits, lead row
   exists, sticky bar appears, login link → `/login`) + axe pass.
- Every phase: `pnpm typecheck && pnpm vitest run && pnpm lint && pnpm build`,
  then commit, merge to main, push — same cadence as prior builds.

---

## Out of scope (explicitly deferred)

- Paywall / Stripe billing / plan gating.
- Multi-tenancy (`owner_id`, per-user RLS, per-tenant credentials, worker
  isolation).
- Public sign-up / create-account flow.
- Live Resend integration (guide only).
- Dedicated marketing domain.

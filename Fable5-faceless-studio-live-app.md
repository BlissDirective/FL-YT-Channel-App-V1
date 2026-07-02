# Fable5 — Faceless Studio, Live App Plan

**Premise check (from the audit):** yes — the system is a good foundation for
your goal. The state-machine pipeline, mock-first adapters, quality gates, and
operator autonomy tiers are exactly the bones a public product needs. This
document is the plan for turning the private studio into a market-ready web
application. It assumes the Enhancement Plan's Phases 1–3 (security, spend
control, reliability) are done first — **do not onboard strangers onto a
single-tenant database with blanket RLS and accidental concurrency safety.**

---

## Stage 0 — Positioning & the honest gate

Before building anything public, decide what you're selling, because it
changes the architecture:

| Option | What it is | Implication |
|---|---|---|
| A. **SaaS studio** | Users bring their own API keys, run their own channels | Easiest legally/cost-wise; BYO-keys UX is the hard part |
| B. **Managed service** | Your keys, usage-metered pricing | You carry provider spend + YouTube policy risk; needs hard metering |
| C. **Hybrid (recommended)** | Free/demo on your keys (tiny caps), paid = BYO keys or metered credits | Demo magic + contained cost |

**The honest gate:** don't take it to market until *your own* pilot channel
has run through the system for 60–90 days with real numbers you'd show on the
landing page. "I built the machine that runs my channels" is the product
story; the dashboard is the demo.

## Stage 1 — Landing page + email capture (can start now)

Ship a separate tiny site (`faceless.studio` or similar) — do **not** bolt
marketing onto the app repo:

1. **Stack:** one Next.js static page + Supabase (or Resend audience) for the
   email list. Keep it in a new repo `faceless-studio-site`.
2. **Content:** hero ("An autonomous studio for faceless YouTube channels —
   research, script, voice, render, publish, learn"), a 60–90s screen
   recording of the real app driving a video through the gates, the operator
   panel, and the publish kit; pricing teaser; waitlist form.
3. **Email capture:** double-opt-in, a `waitlist` table with source/UTM, and
   a thank-you page that asks one qualifying question ("How many channels do
   you run?") — this segments your first cohort for free.
4. **Legal minimum even at this stage:** privacy policy (you're collecting
   emails; GDPR/CCPA applies) and an unambiguous "not affiliated with
   YouTube" line.

## Stage 2 — Repo split: studio core vs. your instance

Your instinct (a copy that "wouldn't include my APIs") is right; do it as a
**clean split, not a fork-and-delete**:

1. **`faceless-studio-app` (product repo):** the app as-is, minus anything
   personal. The mock-first design is a superpower here — the product repo
   runs fully on mocks out of the box, which becomes the free demo mode.
2. **Strip personal artifacts** during the split (audit found these
   committed): the hard-coded Supabase URL + anon key in
   `src/lib/supabase/config.ts` (make env-required, no committed default),
   the default Vercel URL in RUNBOOK/workflows, hardcoded Supabase project
   refs in 4 workflow files, `docs/channels/*` and niche-research docs (your
   competitive edge — keep private), Telegram chat id defaults.
3. **Secret-scan the history** (`gitleaks`/`trufflehog`) before the new repo
   is ever public or shared — the git history contains the anon key and
   project refs even after you delete them from HEAD. Start the product repo
   with a fresh history (`git init` from a clean tree), not a filtered clone.
4. **Your instance** stays as this repo (private), consuming the product repo
   as upstream (`git remote add upstream`) so your channels keep running
   while the product evolves.

## Stage 3 — Multi-tenancy (the real engineering lift)

Everything else in this doc is days; this is weeks. In order:

1. **Data model:** add `org_id` (or `owner_id`) to every table; rewrite RLS
   from `authenticated → using(true)` to per-org policies; move the media
   bucket to per-org prefixes with storage policies to match. Migration is
   mechanical but touches every query — do it before there are external users,
   never after.
2. **Auth:** enable public signup (currently must stay disabled!), email
   verification, password reset, and OAuth (Google) — the audience lives in
   Google-land anyway.
3. **Per-tenant credentials:** encrypted `tenant_secrets` table (Supabase
   Vault) for BYO keys; the adapter layer already reads keys from one place,
   so thread a per-tenant key resolver through `isXLive()`/clients. The
   credential-test panel you already built becomes the tenant onboarding
   checklist — genuinely a feature most competitors lack.
4. **Isolation of the workers:** GitHub-Actions-as-render-farm doesn't
   multi-tenant safely (one repo's secrets, shared queue, 60-min jobs). Move
   rendering to a proper worker: Fly.io/Railway container or Remotion Lambda,
   with per-tenant queue fairness and per-tenant cost attribution. This is
   the biggest architectural change on the path — budget it honestly.
5. **Per-tenant spend caps** become a *product surface* (plan limits), which
   is why Enhancement Phase 2 (one budget system) must land first.

## Stage 4 — Paywall & packaging

1. **Billing:** Stripe Billing + Checkout; webhook → `subscriptions` table →
   a `plan` claim the middleware reads. Gate by *capability*, not by page:
   projects count, videos/month, autonomy tier (autopilot is a paid feature —
   it's also your riskiest, so gating it is safety too), operator channels.
2. **Suggested shape** (validate against waitlist answers):
   - **Free / Demo** — mock mode + 1 real video/mo on your keys (watermarked
     end-card), 1 project.
   - **Creator ~$29/mo** — BYO keys, 3 projects, copilot autonomy, full
     quality gates.
   - **Studio ~$99/mo** — autopilot + operator, 10 projects, Telegram
     approvals, MCP access.
   - **Metered credits** on top for managed-keys usage (maps 1:1 onto the
     `cost_ledger` you already have — your ledger becomes the billing meter,
     one more reason its accuracy phase comes first).
3. **Kill switch per tenant + global** (exists; make the global one
   admin-only) and a **provider circuit-breaker** (Enhancement Phase 2.5) so
   one tenant's exhausted key can't create support storms.

## Stage 5 — End-user UX changes

What's fine for the builder is not fine for a customer:

1. **Onboarding wizard as the first-run experience:** niche quiz → seed
   ideas → first script in mock mode within 5 minutes, *before* asking for
   any API key. The "aha" is watching the gates work.
2. **Progressive disclosure of the machinery:** hide tier/QC/autofix jargon
   behind sensible defaults; expose them under an "Advanced" panel. Rename
   internal vocabulary for civilians (gates → "checkpoints", operator →
   "channel manager", QC score → "quality score" with a tooltip rubric).
3. **Kill the demo affordances** for tenants (Run demo pipeline, Styleguide
   nav) and ship the Enhancement Phase 6 items — mobile nav, one CTA system,
   system-pulse strip — they matter double for paying users.
4. **Empty-state-driven education:** every empty state should teach the next
   action (some already do; make it universal).
5. **Trust surfaces:** publish-history log, per-video cost receipt, "why did
   QC hold this" explanations (the data exists in `qc_reviews`), and a
   visible "human approval required" default for new tenants.

## Stage 6 — Legal & policy (not optional for this product)

1. **ToS + Privacy Policy + DPA** (template-lawyer pass, ~$1–2k well spent):
   users grant you processing of their channel analytics; you disclaim
   YouTube outcomes.
2. **YouTube API compliance audit:** using the Data API in a multi-tenant
   product triggers YouTube's API audit + quota review (your own docs note
   this is why v1 keeps uploads manual). Per-tenant OAuth for upload is the
   right architecture (each tenant's quota/policy risk is their own), but the
   *app* still needs Google verification — start that process early, it takes
   months.
3. **AI-content disclosure:** YouTube requires realistic-synthetic-content
   labeling; add a per-video "AI disclosure" toggle to the publish kit
   metadata, defaulted on.
4. **Provider ToS pass-through:** ElevenLabs/fal/Anthropic all restrict
   resale of raw capability; hybrid/BYO-keys mostly sidesteps it, managed
   keys need a real read of each ToS.
5. **Refund/cancellation policy** and EU consumer-rights pages if you sell to
   the EU.

## Stage 7 — Launch sequence

1. Waitlist warm-up: 3–4 build-in-public posts using your pilot channel's real
   dashboard numbers.
2. **Closed beta (10–20 users, free, BYO keys)** from the waitlist's "runs
   2+ channels" segment; weekly office hours; instrument everything (PostHog).
   Exit criteria: 5 users each publish 3+ videos without you touching their
   account.
3. **Paid beta** (50% founder pricing, lifetime), then public launch (Product
   Hunt + the faceless-channel YouTube niche itself — creators reviewing the
   tool is your best channel).
4. Support surface: Crisp/Plain widget + a docs site generated from the
   genuinely good docs you already have (RUNBOOK → "Self-hosting", guide →
   user docs).

## Sequencing & effort (relative, not calendar)

| Stage | Depends on | Rough size |
|---|---|---|
| 1. Landing + waitlist | nothing | XS — do immediately |
| 2. Repo split | Enhancement P1 | S |
| 3. Multi-tenancy | Stage 2 + Enhancement P1–3 | **XL — the lift** |
| 4. Paywall | Stage 3 + Enhancement P2 (ledger) | M |
| 5. End-user UX | overlaps 3–4 + Enhancement P6 | M |
| 6. Legal/YouTube audit | start early — long external clocks | S effort, L latency |
| 7. Launch | all above | M |

**The two long external clocks — start both before writing multi-tenant
code:** the waitlist (Stage 1) and Google's API verification (Stage 6.2).
Everything in between is under your control.

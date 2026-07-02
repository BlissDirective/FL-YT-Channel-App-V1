# Fable5 Enhancement Plan — Faceless Studio

**Audit date:** 2026-07-02 · **Scope:** full repo (`main` @ `f569adf`), live deployment
(faceless-studio-app.vercel.app), Vercel runtime logs, CI workflows.

This document is the complete findings + phase-by-phase build plan from the Fable 5
audit. Small, safe fixes were applied directly on this branch (§0); everything
else is planned below, ordered so each phase protects the phases after it.

---

## Verdict up front

This is a genuinely impressive v1. The architecture is right: a typed state
machine with human gates, mock-first adapters, a serverless control panel with
heavy work offloaded to GitHub Actions, spend guards in front of paid calls,
and a real (if partial) learning loop. The docs are unusually good. The system
**is** a credible foundation for your ultimate goal — a learning-loop, agentic
content system — which is why this plan is paired with
`Fable5-faceless-studio-live-app.md` (go-to-market).

The honest criticism: the codebase has grown tier-by-tier (Tier 1→9.5) and the
seams show. There are **three overlapping budget systems, three `recordCost`
implementations, two final-gate auto-approvers, two dedup mechanisms, and two
frame critics**. Several failure paths *fabricate data instead of failing*
(fixed where safe, see §0). The learning loop is real but human-gated at its
most important junction (optimizer → template). And production logs show the
system burning retries against an empty fal.ai balance for two weeks — the
exact "monitoring and improving over time" gap this plan closes.

---

## §0 — Fixed in this audit (already on this branch)

| # | Fix | Files |
|---|---|---|
| 1 | **Cron auth fail-open → fail-closed.** All 6 `/api/cron/*` routes ran unauthenticated when `CRON_SECRET` was unset — on a public Vercel URL, anyone could trigger `build-runner` (real spend). Now a shared `requireCronAuth()` returns 503 on hosted deploys without a secret; local/mock stays open. | `src/lib/cron-auth.ts` (new), all 6 cron routes |
| 2 | **YouTube adapter no longer fabricates data on live errors.** A transient API error used to silently write *invented* view counts into `analytics_snapshots` (feeding revenue math and the learning loop) and fake competitor results into intelligence. Live errors now skip/return-empty and log. Mock mode (no key) is unchanged. | `src/lib/adapters/youtube.ts` |
| 3 | **Mock script generation no longer charges $0.18 to the cost ledger.** | `src/lib/adapters/script.ts` |
| 4 | **Autofix enablement unified.** The sweep said "on by default" while the build-runner finalizer and operator said "off by default" — so the finalizer could publish a cut the sweep was still fixing. One shared `isAutofixEnabled()` (Tier 9.1 semantics) now used by all three. | `quality-gates.ts`, `engine.ts`, `operator.ts`, `autofix.ts` |
| 5 | **Render farm bounded retry.** A video whose render throws stayed `ASSEMBLING` forever and was re-rendered (and re-billed vision QC) every 10 minutes. Now capped at 3 attempts (encoded in `paused_reason`), then skipped and surfaced for the operator. This is the loop visible in your Vercel error logs. | `packages/render/src/render-queue.ts` |
| 6 | **Stranded-publish healer.** If the upload succeeded but the follow-up status write failed, the video never reached TRACKING. The publish pass now heals those rows first. | `packages/render/src/render-queue.ts` |
| 7 | **Root `typecheck` now covers every workspace package.** `render`, `clips`, and `intel` (the entire render farm) previously merged into `main` with zero CI type checking. | `package.json` |
| 8 | **CSV formula-injection guard** on `/api/export` (cells starting `= + - @` are neutralized per OWASP). | `src/app/api/export/route.ts` |
| 9 | **Optimizer insight dedup** now checks all prior insights, not just `status:"new"` — a dismissed insight no longer regenerates verbatim every week. | `src/lib/pipeline/optimizer.ts` |
| 10 | **Kill switch no longer fails silently.** The action returns a result; the toggle reverts and shows an error on failure. A safety control must not lie. | `actions/pipeline.ts`, `settings/kill-switch.tsx` |
| 11 | **Route loading skeletons.** Every page is `force-dynamic`; navigation froze the previous page with zero feedback. Added `loading.tsx` for the 8 main routes. | `src/components/ui/page-skeleton.tsx` + 8 `loading.tsx` |
| 12 | **Dead notifications bell removed** from the top nav (looked actionable, did nothing). | `top-nav.tsx` |
| 13 | **Build & Post modal a11y:** `role="dialog"`, `aria-modal`, Escape-to-close. | `build-and-post.tsx` |
| 14 | **Review-queue actions self-refresh** (thumbnail select / beat reroll) instead of depending solely on Supabase Realtime. | `review-queue.tsx` |
| 15 | **Clipboard copy failure surfaced** in the Publish Kit ("Copy failed — select manually"). | `publish-kit.tsx` |
| 16 | **Freebie-Short metadata duration** now uses the same `shortDurationSec()` as the actual composition (was off by ~0.5s). | `render-queue.ts` |
| 17 | Dead code: removed the `getMockVoices()` shim; merged the duplicated `@utility input` CSS block. | `voice.ts`, `globals.css` |

`pnpm typecheck` (now all 6 packages) and `pnpm build` pass.

---

## Phase 1 — Security hardening (do before scaling anything)

The app is single-operator with a committed anon key and blanket RLS
(`authenticated → full access`). That's fine *only* if nobody else can become
"authenticated".

1. **Verify Supabase signups are disabled (15 minutes, highest priority).**
   `bootstrapAccount` refuses a second app account, but that does not disable
   GoTrue's public `/signup` endpoint, which is reachable with the committed
   anon key. If "Allow new users to sign up" is ON in the Supabase dashboard,
   anyone can self-register and get full read/write to every table and the
   media bucket. Check Dashboard → Authentication → Sign In / Up. Belt-and-
   suspenders: add a `before user created` auth hook (or trigger on
   `auth.users`) that rejects inserts once one user exists, so the guarantee
   lives in the database rather than a dashboard setting.
2. **Drop `?key=` cron auth** (query strings land in access logs; all GitHub
   workflows already use the Bearer header) and use a constant-time compare
   (`crypto.timingSafeEqual`) for both `CRON_SECRET` and `STUDIO_MCP_TOKEN`.
3. **Split the Telegram webhook secret from `CRON_SECRET`.** They're aliased
   today, so rotating one silently rotates the other; give Telegram its own
   `TELEGRAM_WEBHOOK_SECRET` with fallback to the old behavior.
4. **Scope the MCP server.** Every studio-mcp tool runs on the service-role
   client. Consider a read-only token tier (list/stats tools) vs a control
   token (approve/build/spend tools), and log every MCP mutation to
   `events` with the token label — one leaked token currently equals full,
   silent control of publishing and spend.
5. **Prompt-injection containment for Scout.** Third-party YouTube titles are
   fed into the agent loop. Today Scout can only propose idea cards (good),
   but before ever giving it spend/publish tools, wrap external strings in a
   clearly-delimited data block and instruct the model to treat them as data.
6. **Add Sentry** (already in your backlog) — this audit found production
   errors you had no alerting for.

## Phase 2 — Spend control & cost integrity

The only hard spend guards live in the pipeline layer, and the ledger they
read is partly estimated. Before scaling to multiple channels:

1. **Unify the three budget systems.** `project.budget.perVideoUsd/monthlyUsd`
   (engine `budgetPause`), `project.max_video_usd` + `VIDEO_MONTHLY_CAP_USD`
   (fullAutoGenerate), and the operator's `cycle_budget_usd` are separate
   meters over the same ledger that don't reconcile. Define one
   `SpendPolicy` resolved per project (video cap, monthly cap, cycle cap) and
   one `checkBudget(db, projectId, videoId, aboutToSpendUsd)` used everywhere.
2. **Re-check budget mid-stage.** `budgetPause` runs once per hop, but
   `runAssetGeneration` then makes dozens of paid calls; re-rolls
   (`rerollBeatVisual`, `retryClips`, beat re-voice) bill with **no** check at
   all. `checkBudget` from (1) should gate every `recordCost`-adjacent call.
3. **Consolidate `recordCost`.** Three implementations (engine, operator,
   autofix) → one `src/lib/pipeline/ledger.ts` helper. Then add a nightly
   reconciliation that compares ledger totals vs `videos.total_cost_usd`.
4. **Record cost on fal video timeouts.** The queue path bills you even when
   polling times out; today that spend never reaches the ledger. On timeout,
   write the estimated cost with `description: "timeout — unverified"`.
5. **Provider balance / failure circuit-breaker.** Production logs show ~29
   runs failing on "fal balance exhausted" over two weeks, each burning
   Actions minutes and retries. Teach the fal adapter to recognize
   401/403-balance errors, set a `provider_down:fal` flag in `app_settings`,
   pause dependent pipelines (same mechanism as kill switch), notify (push +
   Telegram), and auto-clear on the next successful health check.
6. **Fix cost constants.** ElevenLabs: the code bills ~$0.167/1k chars while
   using the turbo model the comment calls "half-rate" — verify against your
   actual plan and make it an env-tunable constant. Dedup the Anthropic
   `PRICING` maps (`script.ts`, `guardrails.ts`, both frame critics) into one
   module. YouTube Analytics CTR uses the deprecated
   `annotationClickThroughRate` metric (always 0) — the correct signal today
   is impressions CTR; if the API scope can't provide it, drop the field
   instead of reporting a fake zero.

## Phase 3 — Reliability: make every queue claim atomic

A consistent class of bug across the system: **check-then-act without a
conditional write.** Each is currently "safe" only because concurrency is
accidentally low.

1. **Seed claiming:** `processPendingBuildVideos` should claim with
   `UPDATE … SET status='SCRIPTING' WHERE id=? AND status='IDEA_APPROVED'`
   and skip on 0 rows — the build-runner cron and "Run now" button can
   currently double-build the same idea (double spend). Same pattern for the
   operator's daily seed (`seededTodayCount` race).
2. **Autofix sweep:** runs from *two* crons (`auto-fix` + `build-runner`) with
   non-atomic `autofix_state` transitions. Either drop it from one cron or
   claim atomically (`WHERE autofix_state->>'status' = ...`).
3. **Clips/intel workers:** `status='running'` claim is read-then-write, and a
   crash strands rows at `running` forever — which also blocks
   `maybeFinish`, so the video never assembles. Claim conditionally and add a
   stale-`running` reaper (e.g. `running` for >30 min → back to `queued`,
   attempts+1, capped like the render farm now is).
4. **Render job timeout headroom:** the farm renders up to 5 long-forms in a
   60-minute job; a SIGKILL mid-batch leaves no `paused_reason`. Add a
   wall-clock budget (like `processPendingBuildVideos` already has) — stop
   picking new videos past ~45 min.
5. **Anthropic retry:** script/QC/scout calls have no retry on 429/529. One
   bounded retry with backoff (mirroring `falRun`) meaningfully reduces
   "revision consumed by a transient 529" waste.

## Phase 4 — Quality gates & the learning loop

This is the heart of your ultimate goal. What exists is real: QC-lessons feed
scripts, autofix memory feeds the art director, operator strategy tilts the
mix. What's missing is the *closed* loop and tunability.

1. **Make thresholds configurable in one place.** `REVISION_HARD_CAP`,
   autofix threshold 7, `SEED_VISION_FLOOR` 6.0, `VARIETY_MIN_DISTANCE` 6,
   qcLessons `<7`, `COLD_START_MIN` 5, runThresholds 7.0/8.0 are all
   hardcoded. Extend the existing `app_settings.quality_gates` object and the
   Settings UI. (You'll want to tune these per niche as real data arrives.)
2. **Add a prose fact-check gate.** Dataviz figures are verified and
   editorialGuard checks legal/spam — but nothing fact-checks the script's
   claims. Tier 5's search-grounded fact-check is specced in your docs;
   implement it as a SCRIPT-gate step that attaches citations to beats and
   fails closed above a configurable claim-risk score. For a faceless channel,
   one confidently-wrong viral video is a channel-level risk.
3. **Close the optimizer loop with a safety rail.** Today insights wait for a
   human click, so the publish→analytics→template loop only closes manually.
   Add an `auto_apply_insights` project toggle: auto-apply template proposals
   **as a new version with a 3-video canary** — the next 3 videos use it; if
   their QC/retention beats the trailing average, keep, else auto-revert and
   log. That's a true learning loop with a bounded blast radius.
4. **QC-on-error should not silently pass gates.** `reviewGate` failure
   degrades to neutral and the gate proceeds; in autopilot mode that means
   "grader down → publish anyway." When autonomy≥copilot and QC errors, hold
   the video (`paused_reason: "QC unavailable"`) instead.
5. **Remove the stick-project exemption from fail-closed** (or document why
   it's safe): `failClosedBlocksSpend` is skipped entirely for stick projects.
6. **Retention-curve mapping** (backlog item): the long-form render already
   stores per-beat timings; once Analytics OAuth lands, overlay retention on
   beats and feed "beat types that lose viewers" into `qcLessons` — this is
   the highest-value learning signal YouTube offers.
7. **Embedding dedup (Tier 5 spec)** to replace/augment the two lexical
   mechanisms; near-duplicate *angles* (not just titles) are what actually
   burn a niche.

## Phase 5 — CI & test depth

Current gate: partial typecheck + Next build + 4 public-surface smoke tests.
The state machine, monetization math, dedup, and the whole render farm merge
untested.

1. Root `typecheck` now covers all packages (§0.7) — **also add
   `pnpm -r typecheck` to `ci.yml`** if the root script is ever split.
2. **Unit tests (vitest) for the pure cores** — fast wins, no mocks needed:
   `packages/core/state-machine.ts` (transition maps are pure data),
   `monetization.ts`, `dedup.ts`, `auto-tiers.ts` cost planning,
   `attribution.ts`, `cron-auth.ts`, `thumbnail-pick.ts`. Target: the money
   and state paths, not coverage %.
3. **Lint:** no ESLint anywhere. `next lint` + typescript-eslint with the
   default Next config catches real bugs (floating promises especially —
   several audit findings were of that shape).
4. **Lighthouse:** move from `warn` to `error` on the two stable pages, and
   run it on PRs (it currently only runs post-merge).
5. **Authenticated e2e** (backlog): one seeded-project golden path in mock
   mode — create → approve idea → script gate → assets → final — via a CI
   Supabase project. This is the test that would have caught the autofix
   enablement drift.

## Phase 6 — UI/UX

The warm, calm visual language is genuinely nice — the polish gaps are in
*navigation and feedback*, not aesthetics. (§0 already shipped: loading
skeletons, kill-switch error state, modal a11y, review-queue refresh, dead
bell removal, clipboard feedback.)

1. **Mobile navigation.** The nav pills are `hidden sm:flex` with no
   hamburger — on a phone, Insights/Intel/Spend are unreachable. Given the
   PWA is your stated mobile story, add a bottom tab bar (Dashboard · Review ·
   Build · Insights · Settings). This is the single biggest UX gap.
2. **One primary-action system.** Amber (`bg-accent`) and dark ink (`bg-ink`)
   CTAs alternate without a rule — two "approve" buttons in the same flow use
   different colors. Rule proposal: amber = the one primary action per view;
   ink = secondary; coral = destructive. Encode as a `<Button variant>`
   component and sweep.
3. **Consolidate inputs & pills.** Three input styles (`.input` utility vs
   hand-rolled vs login variant) and ~7 re-implementations of the segmented
   pill toggle → one `<Field>` and reuse of `PillTabs`. Unifies focus states
   (a11y) and cuts real code.
4. **Declutter the project header** (6 stacked pill buttons): keep Build &
   Post + Review primary; move "Run demo pipeline" / "Run intelligence" into
   an overflow ⋯ menu; hide demo affordances entirely once a project has real
   videos. Remove "Styleguide" from the production nav (keep the route).
5. **Contrast pass:** 10–11px `text-muted/70` text falls below WCAG AA; bump
   to full `text-muted` or a darker token. Add radio semantics to the wizard
   voice picker and `role="tablist"` to `PillTabs`.
6. **Needs-attention surfacing:** with the new render attempt cap (§0.5),
   videos held after 3 failed renders should show a "Render failed ×3 — view
   log / retry" card in needs-attention with a one-tap "reset attempts"
   action (clears `paused_reason`).
7. **Merge Downloads into the Publish Kit** (two pages surface the same
   files today) — keep `/downloads` as a redirect.
8. **Dashboard "system pulse":** a small strip showing provider health dots
   (fal · ElevenLabs · Anthropic · YouTube), current month spend vs cap, and
   last cron heartbeat — the operator's 5-second "is everything alive" check.
   All the data already exists (`credential-test.ts`, `cost_ledger`, events).

## Phase 7 — Redundancy & dead code

Consolidations, in dependency order (each is mechanical):

1. Two frame critics (`stick/frame-critic.ts`, `footage/frame-critic.ts`,
   ~180 duplicated lines) → one `critique()` core with two prompt configs.
2. Three `recordCost` impls → one ledger module (done as part of Phase 2.3).
3. Two STOPWORDS/tokenizers (`engine.ts` `keywordsOf`, `dedup.ts`) → one.
4. Two final-gate auto-approvers (`finalizeAutoPilotVideos` vs
   `processOperatorApprovals`) share QC/editorial/privacy logic — extract the
   shared "settle a FINAL_REVIEW video" function; keep the two owners thin.
5. ~10 inlined latest-script queries in `engine.ts` → reuse `loadLatestScript`.
6. Drop dev-only Remotion compositions from the production bundle
   (`StickShowcase`, `StickSheet`, preview comps) via an env flag in
   `Root.tsx` — they're bundled on every render pass.
7. Remove unused `MOCK_COSTS` entries, the stale `health.ts` "Phase 4 will
   add" comment, and `SemicircleGauge`/`ComboChart` if they stay
   styleguide-only.

## Phase 8 — Profitability assessment

**Cost side (per published long-form, from the code's own model):**

| Tier | Content cost | Notes |
|---|---|---|
| Base | ~$0.15–0.40 | script + VO + FLUX stills; no AI video |
| Economy | ~$0.60–1.50 | ≤3 Seedance Fast accents |
| Premium | ~$2–5 | hero bookends + b-roll ≈1/min |
| Platinum | ~$5–12+ | Kling heroes + Seedance 2.0 b-roll |

Plus fixed: Vercel/Supabase free-to-$25/mo, and GitHub Actions minutes — note
the **idle-cron tax**: render/clips/video-intel/auto-fix every 10 min +
build-runner every 5 min ≈ ~40k+ Actions minutes/month of mostly-empty polls
on a private repo. Recommendation: keep the dispatch-on-demand path you
already built (`gh-dispatch.ts`), thin the schedules to every 30–60 min as a
fallback sweep, and add an early-exit that skips checkout/install when the
queue is empty (one cheap Supabase REST call in a first step).

**Revenue side:** a mid-RPM niche ($3–8 RPM long-form) needs roughly
15k–80k views/month to cover a $60 operator cycle + fixed costs. Pre-YPP
(1k subs + 4k watch-hours) revenue is $0, so the real question is **cost to
reach YPP**: at 1 video/day on Economy, ~$30–50/mo content spend for the 3–9
months a channel typically takes — the app's cost discipline genuinely
matters and is mostly in place once Phase 2 lands.

**The two profitability risks that dwarf tooling costs:**

1. **YPP "reused/repetitious content" policy.** Fully-automated faceless
   channels are exactly what YouTube's monetization review screens for. Your
   quality gates (QC floor, variety re-roll, editorial guard) are the right
   mitigation — Phase 4's fact-check + retention learning push the same
   direction. Keep a human in the publish loop until a channel clears YPP
   review; the operator's copilot mode is the right default until then.
2. **Niche selection beats everything.** The MasterPlan already says this;
   the app should enforce it — surface RPM band, competition density, and
   idea-gate pass-rate per project on the dashboard so a channel that's
   structurally unprofitable is visible in week 2, not month 4.

**Bottom line:** unit economics work on Base/Economy tiers if (a) spend
guards actually bind (Phase 2), (b) idle-cron waste is cut, and (c) channels
that don't move are killed fast. Premium/Platinum should be reserved for
proven formats — consider auto-tier promotion: a format graduates to Premium
only after N videos beat the channel median.

## Phase 9 — Weaknesses summary (the frank list)

1. **Single point of failure: you.** Manual upload (pre-OAuth), manual
   optimizer application, manual fal top-ups. The system is "near-fully
   autonomous" except for the three things that most need to be reliable.
2. **The learning loop is open at its most valuable junction** (optimizer →
   template needs a click; analytics ingestion silently degrades — was
   *fabricated* until §0.2).
3. **Concurrency safety is accidental** (Phase 3) — it holds only because
   queues are single-worker today.
4. **No error alerting** — the fal-balance outage ran for ~2 weeks in logs.
5. **Test depth ≈ 0** for the code that spends money.
6. **Tier-by-tier growth left duplication** (Phase 7) that will make every
   future change slower and riskier if not consolidated soon.
7. **Mobile experience** contradicts the PWA story (Phase 6.1).

None of these are fatal; all of them are fixable with the phases above, and
the order matters: **1 → 2 → 3 secure and stabilize spend; 4 closes the
loop; 5–7 make it maintainable; 8's economics then have a fair test.**

---

*Companion doc: [Fable5-faceless-studio-live-app.md](Fable5-faceless-studio-live-app.md) — taking this to market as a public product.*

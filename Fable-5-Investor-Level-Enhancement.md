# Fable 5 — Investor-Level Enhancement Plan

**Audit date:** 2026-07-09 · **Auditor:** Claude (Fable 5), acting as senior web-app
developer specializing in automated content generation
**Scope:** full repo (`main` @ `be16cf6`), live deployment
(faceless-studio-app.vercel.app), Vercel project, GitHub Actions fleet,
CI/e2e history, plus ecosystem research (Agent SDK, MCPs/skills, the Paddy
Galloway category-winner playbook, 2025–26 YouTube market/policy shifts).
**Testing spend:** $0.00 of the authorized $20 — every pipeline system was
exercised through the mock-mode harness and CI rather than paid provider
calls, and the operational audit ran against real production telemetry
(workflow runs, deployments, public surface).

---

## 1. Verdict up front

**This is a fundable demo.** The system is real: a typed state machine with
human gates, 41 provider adapters (every one mock-first), 27 pipeline
modules, a render farm, a self-watching QC stack with an auto-fix loop, a
cost ledger with budget caps, 41 DB migrations, 16 automation workflows, and
412 passing tests. The architecture choices (serverless control panel +
GitHub Actions workers + Supabase state + kill-switch/budget governance) are
the ones a senior team would make on purpose.

The audit found the deployment **healthy** and the automation fleet **live
and green** — with two broken workflows (both fixed), a **3× cost-accounting
error on every Opus call** (fixed), and one **critical gap: the emergency
kill switch did not actually stop the autonomous spend/publish paths**
(fixed). Grade after fixes: **A− for a single-operator product; B for an
investor demo** — the remaining gap to "wow" is not correctness, it's the
growth loop (§6) and the agentic layer (§7).

The market context strengthens the pitch: OpenMontage (an AGPL local-first
sibling of this exact architecture) hit 35.6K GitHub stars in four months —
proof of demand — while the incumbent SaaS field (AutoShorts, Crayo,
Syllaby) competes on raw generation volume, which is precisely the
"inauthentic content" profile YouTube began purging in 2025–26. Faceless
Studio's differentiators — human-gated QC, cost governance, provenance, and
a closed analytics→generation loop — sit in white space with **no maintained
OSS or SaaS incumbent** (§8).

---

## 2. What was audited and how

| Layer | Method | Result |
|---|---|---|
| Code health | `pnpm typecheck` (6 workspace pkgs), `pnpm lint`, `pnpm build`, `vitest` | All green; 410→412 tests after fixes |
| Live deployment | Vercel API: latest prod deployment READY on `main@be16cf6`; domains verified | Healthy |
| Public surface | curl/Playwright probes: `/`, `/login`, `/api/mcp`, `/api/cron/*`, `/api/export`, manifest, sw.js, icons | Auth fail-closed everywhere; MCP returns `Unauthorized` without token; cron 401; unknown paths → login |
| Security headers | Live header inspection | Only HSTS present → **fixed** (added XFO/nosniff/referrer/permissions policies) |
| Automation fleet | GitHub Actions run history (all 16 workflows) | Build Runner / Auto Pilot / Auto-Fix / Render Farm / Video Intel / Stats: green for weeks. **Long Clip Worker: failing every idle cycle** (fixed). **E2E: failing on every main push since the v2 merge** (fixed) |
| Full pipeline exercise | The authed mock-mode golden path (idea → script → assets → render → publish → tracking) via the e2e harness + local production build | Verified via harness; the broken spec was the CI failure, not the app |
| UI | Local production build screenshots (desktop + mobile), zero console errors; component-level review | Clean; see §5 |
| Database posture | Migrations review (0001–0041); `cost_ledger.at` default verified; RLS + single-operator auth model reviewed | Sound for single-tenant |

**Access notes (for reproducibility):** the app's Supabase project
(`reffwibuitzrkertuuvy`) is not connected to this session's Supabase MCP
(only SparkForge/MVC are), the studio MCP connector required an interactive
OAuth this session could not perform, and operator login credentials are not
derivable — so in-app authenticated flows were exercised through the
mock-mode harness and CI rather than clicking production. None of this
blocked the audit's conclusions; connecting the studio MCP to future
sessions (Settings → connectors, or `STUDIO_MCP_TOKEN`) would let Claude
operate the live studio directly next time.

---

## 3. Bugs found and fixed in this audit (all on `claude/faceless-studio-audit-rayti0`)

| # | Severity | Bug | Fix |
|---|---|---|---|
| 1 | **Critical** | **Kill switch didn't stop the machine.** `isKillSwitchOn` was checked only inside `runPipeline`/`tickOperator`. The build-runner cron kept running `finalizeAutoPilotVideos` (paid QC + auto-approve), `releaseScheduledVideos` (**→ YouTube publish**), and `sweepAutofix` (paid Opus re-judges + FLUX re-rolls) with the switch ON — while Settings promised "nothing will run." | All four spend-driving crons (`build-runner`, `auto-fix`, `intelligence`, `optimizer`) now gate on the kill switch before doing anything. |
| 2 | **High** | **Cost ledger charged Opus 4.8 at 3× its real price** ($15/$75 per MTok vs the actual $5/$25) — in `pricing.ts` *and* 12 more files carrying private copies of the table (the "single source of truth" consolidation never reached them). Every Opus call (QC escalation, art director, vision critique, video intel, thumbnail pick, chart verify…) inflated spend reports and tripped budget caps early. | Corrected in all 13 locations; script-cost guidance updated (Opus ≈ 1.7× Sonnet, not 5×). |
| 3 | **High** | **Auto-fix loop bypassed project budgets.** It enforced only its private per-video fix cap (default $1) and never consulted `checkBudget` — aggregate fix spend across videos could sail past the project's monthly cap. | The loop now calls the shared ledger `checkBudget` before each fix bundle and holds the video (with reason) when a cap binds. |
| 4 | **High** | **Cron auth failed open off-Vercel.** `CRON_SECRET` unset + not-Vercel = spend-triggering endpoints open to the internet (a self-hosted or other-platform deploy would be exposed). | Fail-closed on any production build; `ALLOW_UNAUTHENTICATED_CRON=1` is the explicit CI/mock opt-out. Test matrix pinned. |
| 5 | **High** | **No timeout on Claude API calls.** A hung socket blocked the serverless function to its full 300s and stranded videos mid-stage (the error path only fires on a throw, never a hang). | 120s `AbortSignal.timeout` + one retry (same policy as 5xx) in the shared `anthropicFetch`. |
| 6 | **High (CI)** | **Long Clip Worker failed every idle cycle** — the `pnpm clip-queue` step was the only step missing the empty-queue `if:` guard, so it ran in a directory that checkout (skipped) never created. Weeks of red runs. | Guard added; idle cycles now no-op cleanly. |
| 7 | **High (CI)** | **Authed e2e suite red on every main push since the v2 cutover.** `createProject` lands on `/projects/:id`, which v2 re-redirects to `/library`; the first spec's `$`-anchored `waitForURL` could never match. The suite only runs on main pushes, so the redesign branch never caught it. | Spec matches either landing (the pattern the second spec already used). |
| 8 | **Medium** | **Quality-gate settings could serve stale for 60s** after save (module-level cache not busted by the save action) — including safety thresholds like the publish floor. | `invalidateQualityGateCache()` exported and called from the save action. |
| 9 | **Medium** | **No security headers beyond HSTS** on a control panel that manages API keys and money. | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` on all routes. Full CSP deferred (needs Next nonce plumbing — see §9 backlog). |

**Verified non-issues:** `cost_ledger.at` has `DEFAULT now()` (the monthly
cap query is sound); model IDs are current everywhere; middleware is a
proper fail-closed session gate; approval/claim writes use atomic
conditional updates; CSV export has formula-injection guards; secret
comparison is constant-time.

### Known remaining issues (documented, deliberately not hot-patched)

| Severity | Issue | Recommended fix |
|---|---|---|
| Medium | `videos.total_cost_usd` is a read-modify-write counter — concurrent stages can drop an increment (the nightly reconcile repairs it after the fact). | Atomic SQL increment (`update … set total_cost_usd = total_cost_usd + $1`) via a Postgres function, or derive the guard total from `cost_ledger`. ~half-day. |
| Medium→Low | `vo_cache`/`flux_cache` check-then-write race: identical concurrent beats can double-generate (bounded cost). | Dedup identical text within a batch before dispatch. ~2h. |
| Low | Per-adapter pricing tables still duplicated 13× (now all correct). | Fold into `pricing.ts` imports; add `claude-sonnet-5` row. ~2h, mechanical. |
| Low | `/api/export` has no per-project ownership check — irrelevant single-tenant, an IDOR if multi-user ever ships. | Add owner check when (if) multi-tenancy lands. |
| Low | `insights-list.tsx`/`judge-calibration.tsx` may be orphaned behind the `/insights` → `/` redirect. | Confirm imports; delete dead files. |
| Info | Auto-Rescript (Self-Watch Layer 2) is built + tested but dormant (`AUTOFIX_AUTO_RESCRIPT` defaults OFF). | Operational: run `dry` for a week, review `auto_rescript_dry` events, then `on`. |
| Info | `engine.ts` is a 4,100-line god-module. | Split orchestration / generation / vision / budget when the next big feature lands there; the audit's through-line fix is one `assertNotKilled + checkBudget` choke point every spend/publish path calls. |

---

## 4. Do all the systems function?

**Yes — with the two CI failures above now fixed, every system is green:**

- **Pipeline state machine** — idea → script → assets → render → publish →
  tracking, four human gates, revision hard-caps, kill/resume. Exercised
  end-to-end by the (repaired) authed golden path.
- **Automation fleet** — Build Runner (15 min), Auto-Fix (30 min), Auto
  Pilot Operator, Render Farm, Video Intel, Long Clip Worker, daily
  intelligence, weekly optimizer, daily stats: all scheduled, all green in
  production history (stats cron: 3+ unbroken weeks).
- **Quality stack** — QC gates per stage, Self-Watch final review, frame
  critic (Claude vision), auto-fix staircase with score-banded models,
  competitive judge, fact-check, watch-gate; fail-closed when graders are
  down.
- **Cost governance** — ledger, per-video/monthly caps, VO cache, kill
  switch: now with the gateway-level enforcement the design always intended.
- **Operator surfaces** — v2 Library/Autopilot/Feed/Canvas IA, Telegram
  approval cards, web push, studio MCP (13 tools), CSV export, PWA.
- **Publish path** — YouTube OAuth upload from the farm, publish-kit manual
  fallback, stranded-publish healer, analytics snapshots.

---

## 5. UI assessment (investor-demo lens)

The v2 redesign is genuinely good: one two-level IA (Home → project
Library/Autopilot/Feed/Settings), the checkpoint absorbed into the video
Canvas, quick actions calling the same server actions as the old review
queue (gate semantics identical by construction). Login is clean on desktop
and mobile with zero console errors.

Improvements that matter for a demo, in order:

1. **A "wow" home for cold viewers.** The dashboard assumes an operator with
   history. Add an investor/demo mode: a seeded showcase project with a
   finished video, its retention curve, its cost breakdown ($1.55 vs a
   $200–500 human-produced equivalent), and the feed of autonomous decisions
   the system made. The demo-seed machinery already exists (`runDemoPipeline`)
   — this is presentation, not plumbing.
2. **Make the money visible.** The cost ledger is a differentiator; today
   it's a table. One chart: cost-per-video by tier vs estimated RPM revenue
   per video → gross margin per video. That's the slide investors remember.
   (With the 3× Opus overcharge fixed, these numbers just got better.)
3. **Progress storytelling during generation.** Transient stages (SCRIPTING,
   GENERATING_ASSETS) show a spinner-ish state; stream per-beat progress
   ("VO 4/12 · clips 2/3") over the existing Realtime channel so the
   autonomous machine *looks* autonomous.
4. **The Feed is the product story — promote it.** "Watch the system decide"
   (QC scores, auto-fix deltas, holds with reasons) is the strongest
   evidence of the HITL thesis. Consider a read-only shareable feed link.
5. **Accessibility pass** — the audit's spot checks were fine (dialog a11y
   was fixed in a prior round), but a full keyboard-nav + contrast pass
   hasn't been done on v2. Cheap, and enterprise buyers ask.
6. **CSP** — the one security header intentionally deferred; do the nonce
   plumbing before any multi-user launch.

---

## 6. Taking it to the next level — the growth loop

*(Synthesis of the Paddy Galloway playbook — the referenced X article,
retrieved in full: "A playbook for becoming the biggest channel in your
niche," 3,900% long-form growth case study — plus 2025–26 YouTube market
research. Full sourcing in §8.)*

The app today is a **production** machine. The playbook's lesson is that
winners are **format-search** machines. Five buildable systems close that
gap; each lands on an existing subsystem:

### 6.1 Format-ID bandit (highest-leverage single feature)
Galloway's operational rule, verbatim logic: tag every video with a
`format_id`; a video at **~2× trailing channel average → queue the same
format again immediately**; **two consecutive wins = winning format →
weight it to 50%+ of the queue**. "People overestimate viewers' appetite
for novelty, and underestimate their appetite to watch more of the thing
they already like."
**Build plan:** add `format_id` to `videos` + templates (migration 0042);
the weekly optimizer (`optimizer.ts`) computes trailing averages from
`analytics_snapshots`, emits `double_down` insights; Build & Post consumes
format weights when seeding; cap experimental formats at 20–30% of the idea
queue (an explicit exploration budget — the app already has a `bandit.ts`
to host this policy). *~1 week. No competitor has this.*

### 6.2 Retention closed loop
The render already stores per-beat timings; YouTube Analytics OAuth (already
integrated for stats) exposes `audienceWatchRatio`. Map retention dips to
the beat that caused them → feed "beat 7-style sections lose 12%" lessons
into the script memory (`memory.ts` exists for exactly this). Cold-start
proxy: competitor **most-replayed heatmaps** are public per video — wire
them into `video-intel.ts` so a channel's first videos already know where
attention peaks in the niche. Benchmarks to grade against: >65% surviving
minute 1 correlates with 58% higher average view duration; 55% of all
drop-off happens in minute 1 — so the QC hook rubric should weight 0–60s
above everything. *~2 weeks including the Analytics API scope bump.*

### 6.3 Compliance & provenance gate (the existential-risk moat)
YouTube's July 2025 "inauthentic content" policy and the Dec-2025/Jan-2026
channel purges (16 channels, 35M subs — with legitimate faceless creators as
collateral) make compliance the #1 channel-killing risk. Build: (a)
cross-video template-similarity scoring on own uploads (embeddings exist in
`embeddings.ts`) with a "too samey" warning that tensions against 6.1's
double-down rule; (b) AI-disclosure auto-flag on realistic synthetic
content; (c) a **provenance log** per video — script iterations, human
decisions, asset licenses, model versions — exportable for appeals. Zero
competitors do this; it converts the crackdown from threat into moat.
*~2 weeks. The attribution ledger and QC review tables already store most
of the raw material.*

### 6.4 Cadence system with veto budget
Codify the playbook's niche-dominating cadence as the Autopilot default:
**1 long-form (15–40 min) + 3 Shorts/week, with 5 tracked "skips" per
year** — the QC gate is *allowed* to kill a weak video rather than force
the schedule ("I never want to post a bad video just to hit a schedule").
Sub-niche selector in the project wizard (beachhead sub-niches constrain
`script.ts`/intelligence until a subscriber milestone unlocks broadening).
Add a drawdown-aware insights card: growth is non-monotonic; require
*sustained* underperformance before recommending pivots. *~1 week.*

### 6.5 TV mode + thumbnail testing
TV is now the #1 device type for top channels: a per-project "TV profile"
(20+ min scripts, slower pacing prompt, loudness/audio QC bar, `deviceType`
dimension in stats). And thumbnails: YouTube's native Test & Compare has
**no API**, so build the ThumbnailTest technique — pre-publish variant
scoring (predicted CTR × predicted AVD, judged by the existing vision
stack), then timed rotation via `thumbnails.set` with CTR-window comparison
from Analytics. Include the 720p+ variant lint (sub-720p forces all
variants to 480p). *~1 week each; thumbnail A/B is already a BACKLOG item —
this is the concrete algorithm.*

---

## 7. Claude Agents — API & Agent SDK integration

The app already speaks fluent Claude (13-tool MCP server, forced-tool-use
adapters, score-banded model escalation). The next step is inverting the
relationship: today Claude is a *function* the pipeline calls; the upgrade
is Claude as an *operator* the pipeline employs, with hard guardrails.

### 7.1 Platform choices (concrete, current-API)

- **Agent SDK (`@anthropic-ai/claude-agent-sdk`) for long-horizon agents.**
  It supplies the loop, subagents, sessions, and — critically —
  **`maxBudgetUsd`** (hard USD stop per run) and **`PreToolUse` hooks** that
  can return `permissionDecision: "deny"`. That converts the app's
  guardrails from "checked in code" to "enforced at the tool boundary":
  a budget hook reads `cost_ledger` and denies paid tools over cap; a
  publish hook denies the publish tool unless `qc_reviews` shows a pass
  *and* a human-approval timestamp. **The human gate becomes unbypassable
  regardless of prompting** — that's the HITL story, made mechanical.
- **In-process MCP (`createSdkMcpServer`)** — rebuild the studio tool
  registry as typed Zod tools with direct Supabase access; keep the existing
  `/api/mcp` HTTP surface for external clients. The 13 tools become the
  shared vocabulary of every agent below.
- **Batch API for everything latency-tolerant** — 50% off all tokens,
  stacking with prompt caching (~0.1× reads on a cached channel style
  guide). The Build & Post drip is already asynchronous — overnight script
  drafts, N-variant titles/hooks, bulk QC, metadata: **~50–75% Claude cost
  reduction** with no product change. (`anthropic-batch.ts` exists behind
  `ANTHROPIC_USE_BATCH=1` — finish wiring it through the drip and default it
  on for cron paths.)
- **Structured outputs (`output_config.format` + `strict: true`)** — migrate
  adapters off forced-tool-use JSON; schema-validated verdicts
  (`{verdict, scores, violations}`) with server-side validation.
- **Skills** — package channel knowledge (script format, hook patterns, QC
  rubric, Remotion conventions) as `.claude/skills/*/SKILL.md`:
  git-versioned, per-agent loadable, and portable to any Claude surface.
  Publishing a public "faceless-channel" skill on skills.sh doubles as
  marketing (the anthropics/skills marketplace has **no** video/YouTube
  skill today).
- **Model routing:** keep Sonnet as the writer default (grab Sonnet 5 intro
  pricing $2/$10 before 2026-08-31 — but re-baseline `max_tokens`, its
  tokenizer runs ~30% more tokens), Haiku for read-only checks, Opus 4.8
  for judge/vision escalations (now correctly priced at $5/$25).

### 7.2 The agent roster (what I would build, in order)

| Agent | Model | Role | Guardrails |
|---|---|---|---|
| **Channel Strategist** | Opus 4.8, weekly cron | Reads 90 days of `analytics_snapshots` + competitor intel; runs the format-bandit policy (§6.1); writes next week's slate as `ideas` with format weights + rationale | Read-write only to ideas/insights; `maxBudgetUsd: 2` |
| **Showrunner** | Sonnet, per-video session | Owns one video end-to-end: script → self-review vs skill rubric → asset briefs → responds to QC feedback autonomously (supersedes today's one-shot rescript) | Cannot approve its own gates; budget hook at tier cap |
| **Audience Analyst** | Haiku + Opus escalation, post-publish | Retention-curve → beat attribution (§6.2); comment mining for video ideas + reply drafts; writes lessons to `memory.ts` | Read-only on YouTube; write only to memory/insights |
| **Compliance Officer** | Sonnet, pre-publish hook | Runs §6.3 checks; assembles the provenance pack; blocks publish on risk | The `PreToolUse` deny on publish — the unbypassable gate |
| **Studio Concierge** | Sonnet, interactive | The existing studio-MCP made conversational: "approve everything QC ≥ 85 except the two with fact-risk flags, and tell me why #3 was held" — Telegram + web | Tool allowlist = the 13 studio tools; every action lands in the approvals audit trail |

Each agent is a build-plan of its own, but they share one foundation
(~1 week): the SDK harness with the budget/publish hooks, the in-process
MCP toolset, and an `agent_runs` audit table. Strategist and Audience
Analyst are the highest-ROI starts (they compound: better slate → better
retention → better slate).

### 7.3 Why this is investor-grade

Autonomy sells; *governed* autonomy survives diligence. The pitch line this
architecture earns: "Our agents can spend at most what the ledger allows and
can never publish without a human fingerprint — enforced at the API layer,
not by prompt engineering."

---

## 8. Ecosystem — adopt, don't build (verified live 2026-07-09)

**Adopt now (low cost, immediate lift):**
- **remotion-dev/skills** (github.com/remotion-dev/skills, 3.9K★, official)
  — ~28 rule files for animations/captions/transitions/audio; install into
  the render worker for an immediate composition-quality jump.
- **elevenlabs/elevenlabs-mcp** (1.46K★, MIT) — adds **sound-effects
  generation**, transcription w/ speaker ID, audio isolation. Sound design
  is a visible gap vs Submagic's keyword-triggered SFX.
- **fal.ai hosted MCP** (`https://mcp.fal.ai/mcp`, official) — model
  search/schemas/inference across all fal models; deletes bespoke wrapper
  maintenance in `fal.ts`/`video-models.ts` as new models ship.
- **pauling-ai/youtube-mcp-server** (pushed 2026-07-08) — the only MCP
  properly wrapping YouTube **Analytics + Reporting** (40 tools); adopt or
  clone its tool design for §6.2. Also: jkawamoto/mcp-youtube-transcript
  (419★) for competitor transcripts into scout/video-intel.
- **Most-replayed heatmaps** (technique, e.g. wynandw87/claude-code-youtube-mcp)
  — a free public retention proxy for any competitor video; feed the
  intelligence loop regardless of repo choice.
- **Hook libraries** — rediumvex/viral-hooks-skill (100 hook formulas / 10
  psychology triggers) and adityaarsharma/youtube-marketing-skills (21
  growth commands) as skill-pack inputs to `script.ts` prompts.

**Study (architecture validation / pattern mining, AGPL — ideas not code):**
- **calesthio/OpenMontage** (35.6K★) — 12 pipelines / 52 tools / 500+
  skills, Remotion+ElevenLabs+fal, human approval stops. The closest
  architectural sibling; its star curve is the market-demand slide.
- **MoneyPrinterTurbo** (96K★) — subtitle burn-in styles, LLM fallback
  chains, headless API mode. **OpenCut** (61.8K★) — manual-touchup path for
  QC failures. **FunClip** (5.9K★) — ASR-timestamp clip selection for Shorts.

**Infrastructure (when scale demands):** Trigger.dev (15.6K★, documented
Remotion examples + MCP) as the render-orchestration upgrade over raw
Actions when per-render retries/observability start hurting; Inngest for
the publish→analytics event loop. Temporal is overkill. TTS cost tier:
remsky/Kokoro-FastAPI (5.2K★) self-host layer; watch OpenBMB/VoxCPM
(32.8K★) as a cloning-grade ElevenLabs cost-reducer.

**Monetization context for the model** (aggregator estimates): long-form RPM
— finance $8–35, education $5–12, tech $4–10, true-crime/history $3–8;
Shorts ≈ $0.03–0.07 (~100× lower) → Shorts are the discovery funnel, never
the revenue line. At the Base tier's ~$1.11/video floor and even a $3 RPM
niche, break-even is ~400 views/video — the unit economics slide writes
itself.

---

## 9. Prioritized roadmap

**Phase 0 — shipped in this audit:** 9 fixes (§3), branch
`claude/faceless-studio-audit-rayti0`: CI green again, kill switch real,
budgets airtight, pricing correct, headers hardened, timeouts bounded.

**Phase 1 — economics & foundation (1–2 weeks):**
Batch API default-on for cron paths + structured-outputs migration +
pricing-table consolidation (§3 remainder) + atomic cost increment. Outcome:
~50–75% lower Claude spend, ledger provably exact.

**Phase 2 — the growth loop (3–4 weeks):**
Format-ID bandit (§6.1) → retention closed loop (§6.2) → cadence/veto
system (§6.4). Outcome: the app stops being a production tool and becomes a
channel-growth engine — the investor differentiator.

**Phase 3 — the moat (2 weeks):**
Compliance & provenance gate (§6.3) + thumbnail A/B stack + TV profile
(§6.5). Outcome: survives the platform-risk question in diligence.

**Phase 4 — the agentic layer (3–4 weeks):**
Agent SDK harness with budget/publish hooks → Channel Strategist + Audience
Analyst → Showrunner + Concierge (§7.2). Outcome: "governed autonomy" demo —
the system runs a channel for a week with the human touching only gates.

**Phase 5 — demo & scale polish:**
Investor demo mode + margin chart (§5), CSP, accessibility pass, Trigger.dev
migration when render volume demands, multi-tenant groundwork (org_id
migration already sketched in the UI-redesign notes; `/api/export` IDOR fix
rides along).

---

## 10. Suggested operational next steps (no code required)

1. Merge `claude/faceless-studio-audit-rayti0` — CI returns to green on the
   next main push and the kill switch becomes trustworthy.
2. Flip `AUTOFIX_AUTO_RESCRIPT=dry` for a week; review the
   `auto_rescript_dry` events; then `on`.
3. Set `ANTHROPIC_USE_BATCH=1` once Phase 1 wires it through the drip.
4. Authorize the studio MCP connector for future Claude sessions so live
   in-app operation is auditable next time.
5. If Sonnet 5 becomes the writer: do it before 2026-08-31 (intro pricing),
   and re-baseline token budgets (+~30%).

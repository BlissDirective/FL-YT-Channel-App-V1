# Auto Pilot Operator — build plan

> Status: **approved plan, pre-build.** A per-channel autonomous operator that runs
> a YouTube channel end-to-end under hard budget, cadence, and safety limits —
> producing content at a steady cadence, perfecting it with the auto-fix loops,
> holding for one-tap approval, publishing on an algorithm-tuned schedule, and
> optimizing on real YouTube Analytics toward monetization.
>
> First target channel: **The Silicon Layer** (existing AI niche, YouTube OAuth
> already connected). Built so other channels (e.g. the future stick-figure
> channel) can adopt it later.

---

## 0. Locked decisions (the brief)

| Area | Decision |
|---|---|
| **Channel** | Start on **The Silicon Layer** (real YouTube channel, per-project OAuth connected). |
| **Autonomy** | Auto-generate → auto-fix → QC → **hold** → notify on Telegram → **approve** → publish. Nothing posts without approval (manual or auto-approve fallback). |
| **Auto-approve** | If QC ≥ **8.5** (configurable) and no response in **~15h** (configurable, **default on**), self-approve so the daily streak holds. |
| **Cadence** | **1/day**, steady; ramp later as the channel ages and performs. Hard daily ceiling enforced. |
| **Format mix** | **75% Shorts / 25% long-form** per 30-day cycle (≈23 Shorts + ≈7 long), **dynamically tilted** toward the nearer YPP path within a **60–85% Shorts** guard band. |
| **Lengths** | Shorts **30–180 s**; long-form **3–7 min**. |
| **Budget** | **$60 per 30-day cycle**. Per-video caps: **Shorts ≤ $1.00**, **long-form ≤ $4.50**, governed under the $60 pool. |
| **Budget clock** | Anchored to the **first "Start Auto Pipeline"** press. Spend accumulates across the cycle regardless of pause/stop. Rolls (resets to a fresh $60) at `cycle_start + 30d`, even if unspent. **Pause/Stop never reset the cap before the 30-day mark.** |
| **Cost strategy** | Cheap stack: stock + stills with motion (pan/Ken-Burns) + kinetic highlights + captions + **Remotion-programmatic** visuals; AI video only when it fits the cap. |
| **North star** | Reach **YPP monetization first** (1k subs + 4k watch-hours, **or** 10M Shorts views/90d), then pivot to revenue. |
| **Timeline** | **2-month run**, **weekly digest** (Mondays ~9am CT default). |
| **Analytics** | Add **YouTube Analytics** OAuth scope — optimize on real retention / CTR / watch-time / subs / revenue, not just public views. |
| **Messaging** | **Telegram** (verdict below): one-tap Approve / Skip + Start / Pause + weekly digest. Notifier behind an interface so Slack can be added later. |
| **Controls** | **Start Auto Pipeline** + **Stop** on the project homepage; **Start / Pause** also from Telegram. |

### Pause vs Stop semantics
- **Pause** = temporary halt; resume later. The **budget clock keeps elapsing** (wall-clock 30 days from first Start; pauses do **not** extend it).
- **Stop** = end the run entirely.
- **Neither resets the $60** before the 30-day mark. The cycle still rolls at +30d.

### Why Telegram (not Slack)
For a solo, mobile-first operator doing one-tap approvals + start/pause + digests:
Telegram needs only a @BotFather token + chat ID (no workspace), has first-class
**inline keyboards** that map 1:1 to Approve/Skip/Start/Pause, excellent mobile
push, and a single webhook for callbacks. Slack is heavier (workspace, app,
signing secret, Block Kit). Build Telegram first; keep the notifier pluggable so
Slack can follow if ever wanted.

---

## 1. Operating model

A per-channel **controller** on a heartbeat cron:

```
 Plan ─ pick today's format + topic, ban-safely (dedup + taxonomy + mix tilt)
   │
 Produce ─ seed a 1-video Build & Post job at the chosen tier/format/length
   │
 Perfect ─ the auto-fix loop critiques + fixes + re-renders (bounded, capped)
   │
 Guardrails ─ research/fact-check ✓ · copyright/legal ✓ · dup ✓ · metadata ✓ · quality ✓
   │
 Hold + Notify ─ Telegram: thumb + title + QC + [Approve] [Skip] [Preview]
   │
 Approve ─ you tap, OR auto-approve if QC ≥ 8.5 after ~15h
   │
 Publish ─ at the day's slot (existing scheduler + render-farm upload)
   │
 Perceive ─ pull real YouTube Analytics (retention/CTR/watch-time/subs/revenue)
   │
 Pivot ─ optimizer reshapes topics, titles/thumbs, posting time, format mix
   └────────────────────────────── loop ──────────────────────────────┘
```

Most machinery already exists; the new work is the **supervisor** that drives it
autonomously under a budget, schedule, and guardrails.

## 2. The "constitution" — hard limits coded at build time

Immutable ceilings the operator can never exceed:
- **Cadence cap** — never more than the configured daily ceiling (start 1/day).
- **Budget** — $60 per 30-day cycle, anchored to first Start; never exceeded.
- **Per-video caps** — Shorts ≤ $1.00, long-form ≤ $4.50 (under the $60 pool).
- **Publish gate** — nothing posts unless QC ✓ + all guardrails ✓ + (approval or auto-approve).
- **Kill safety** — global kill switch + Stop halt within one heartbeat.

## 3. Budget governor (the $60 / 30-day engine)

- **Cycle anchored to first Start** (`cycle_start`); `spent_usd` accumulates across the
  cycle regardless of pause/stop. At `cycle_start + 30d` it rolls: reset spend, new
  cycle, fresh $60 — even if unspent.
- **Split caps + pool** — Shorts cheap (≈$0.20–0.60), long-form richer (≤$4.50). The
  governor projects month-end spend and **throttles quality tier, not cadence**, if
  trending over.
- **Auto-fix sub-cap per format** — Shorts ≈ $0.25, long ≈ $0.75 — so continuous
  improvement never starves production.
- **Sanity at max:** 23×$1 + 7×$4.50 = **$54.50 < $60** ✓ (realistic ≈ $35–45/mo).

## 4. Architecture — reuse vs. new

**Reuse:** Build & Post (`build_runs`, `processPendingBuildVideos`,
`finalizeAutoPilotVideos`, `releaseScheduledVideos`, scheduling) · pipeline + QC +
**both auto-fix loops** · cost ledger/caps · stats + weekly optimizer · intel/research ·
YouTube OAuth upload (per-project token) · cron infra · MCP server.

**New:**
1. **Operator supervisor** + `operator_runs` table (status active/paused/stopped,
   `cycle_start`, `cycle_budget_usd`, `spent_usd`, `config` jsonb).
2. **`/api/cron/operator`** heartbeat (~every 20 min): cycle roll, budget check,
   cadence seeding, auto-approve timeouts, digest scheduling.
3. **Topic planner + dedup detector** (anti-duplication).
4. **Fact-check + legal-caution agents** (accuracy / copyright guards).
5. **Telegram integration** — notifier + `/api/telegram/webhook` for inline
   Approve / Skip / Start / Pause + weekly digest.
6. **YouTube Analytics adapter** (new scope) — retention/CTR/watch-time/subs/revenue.
7. **Start / Stop UI** on the project homepage + an operator status panel.

## 5. Guardrails & detectors (explicit; gate publish)

- **Anti-duplication / topic diversity** — a topic taxonomy for The Silicon Layer
  (*emerging AI tech, AI system advances, AI use cases, AI financial concepts, AI
  tools, agentic systems, making money with AI, …*). Each new idea is checked for
  **semantic similarity vs. the last N videos** (lightweight Claude judge first;
  pgvector embeddings as an upgrade). Too-similar → reject & re-plan. Round-robin
  across subtopics for coverage.
- **Research & accuracy** — a **fact-check pass** extracts claims/stats and verifies
  them (reusing the intel/research subsystem); shaky claims get softened or the script
  revised. Publish is gated on it.
- **Copyright / legal caution** — royalty-free music + licensed stock (Pexels) /
  generated only; a legal-caution pass flags company names + financial/legal claims and
  hedges, disclaims, or pulls them.
- **Metadata-spam guard** — title/tag generator constrained (length, no stuffing, no
  policy-risky clickbait); checked against spam patterns before publish.
- **Quality floor** — the vision critic must clear a bar; stills/stock auto-get
  pan/Ken-Burns + kinetic highlights + captions to look premium; sub-bar assets are
  re-rolled.

## 6. Approval & Telegram

- On **QC ✓ + guardrails ✓** → status **awaiting approval** → Telegram: thumbnail +
  title + QC score + **[Approve] [Skip] [Preview]**.
- **Approve** → schedule publish at the day's slot. **Skip** → kill/regenerate.
  **Auto-approve** fallback: QC ≥ 8.5 (configurable) and no response in ~15h
  (configurable, default on) → self-approve so the daily streak holds.
- **Start / Pause** from Telegram too. Callbacks hit a **signed, chat-ID-locked**
  webhook.
- **Weekly digest** (Telegram): posted count, spend vs. $60, **YPP progress** (subs,
  watch-hours, Shorts-views), top/worst performers, what the optimizer changed, next
  week's plan.

## 7. Metrics → strategy feedback loop

- Add OAuth scopes **`yt-analytics.readonly`** (+ monetary for revenue). One-time
  re-consent + new refresh token (steps documented at build, mirroring
  `docs/YouTube-API-creation.md`).
- Daily pull: retention curves, avg view duration, CTR, traffic sources, subs,
  watch-hours, est. revenue → stored per video + channel.
- The optimizer (extended) correlates outcomes → reshapes **topic weights,
  title/thumbnail patterns, posting time, and the Shorts/long-form mix**.

## 8. Monetization targeting (dynamic mix tilt)

- Track distance to **both** YPP paths: (a) 1k subs + 4k watch-hours, (b) 10M
  Shorts views/90d.
- Operator **tilts the mix toward the nearer path** within a guard band
  (**Shorts 60–85%**, default 75%): lean more long-form when watch-hours are the
  closer win; lean shorter when Shorts views are surging. Cadence ramps up only as the
  channel ages and performs.

## 9. Controls & semantics

- **Start Auto Pipeline** (homepage) = create/activate the operator run, anchor the
  budget cycle.
- **Pause** = temporary halt; resume later; budget clock keeps elapsing.
- **Stop** = end the run entirely.
- Neither resets the $60 before the 30-day mark; the cycle still rolls at +30d.

## 10. Data model additions (provisional)

- **`operator_runs`** — `id, project_id, status ('active'|'paused'|'stopped'),
  cycle_start, cycle_budget_usd, spent_usd, config jsonb, created_at`.
- **Channel analytics** — extend `analytics_snapshots` (or a new `channel_analytics`)
  for retention, avg view duration, CTR, watch-hours, subs, est. revenue.
- **Content/topic log** — for dedup + coverage (titles + topic tags; optional
  pgvector embedding column as an upgrade).
- **`projects` config** — Telegram chat id, auto-approve hours + QC bar, per-format
  caps, mix guard band, posting slot/timezone (in `operator_runs.config` or project
  columns).

## 11. Phased build order (each phase shippable + a checkpoint)

- **A — Operator core:** `operator_runs`, heartbeat cron, anchored budget governor +
  split caps, cadence seeding via Build & Post, Start/Stop UI.
  *Checkpoint: produces 1/day to QC-hold under $60.*
- **B — Telegram:** notifier + webhook + Approve/Skip/Start/Pause + auto-approve
  timeout + weekly digest. *Checkpoint: approve & control from your phone.*
- **C — Guardrails:** topic planner + dedup, fact-check, copyright/legal, metadata,
  quality floor. *Checkpoint: each guard blocks a planted bad case.*
- **D — Metrics loop:** Analytics scope + adapter + optimizer correlation.
  *Checkpoint: strategy shifts from real retention/CTR.*
- **E — Monetization + ramp:** YPP tracker, dynamic mix tilt, cadence ramp.
  *Checkpoint: dashboard shows progress; mix auto-tilts.*
- **F — Hardening + go-live:** dry-run, observability, then flip it on for the 2-month
  run.

## 12. Top risks & mitigations

- **YouTube throttling/ban** → cadence cap + anti-dup + copyright/metadata guards +
  gradual ramp.
- **Bad auto-approve** → high QC bar, your override, instant Stop.
- **Analytics lag (~48h)** → optimizer uses rolling windows.
- **Cost overrun** → hard governor throttles tier, never the cap.
- **Hallucinated facts** → fact-check gate + caution softening.

## 13. Defaults (change anytime)

- Long-form cap **$4.50**, Shorts **$1.00**; auto-approve **QC ≥ 8.5 after 15h**;
  digest **Mondays ~9am CT**; semantic dedup via **Claude judge** first (pgvector
  later); posting slot **optimizer-chosen** once Analytics data exists (fixed daily
  slot until then — operator-set time + timezone).

## 14. Setup prerequisites (gathered as phases need them)

1. **Telegram** (Phase B): `TELEGRAM_BOT_TOKEN` (@BotFather) + your chat id as secrets.
2. **Analytics** (Phase D): re-consent YouTube OAuth with `yt-analytics.readonly`
   (+ monetary) and refresh the per-project token.
3. **Posting slot** (Phase A): preferred daily time + timezone for the pre-Analytics slot.

---

*Living document — update as phases land. Source of truth for the Auto Pilot
Operator. Companion to `docs/Auto-Fix-Loop.md` and `docs/faceless-studio-app-map.md`.*

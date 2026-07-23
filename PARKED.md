# Parked systems — ClickMax transition

Phase 0 audit results (Fable5-ClickMax-Transition-Build-Plan §2.3, §4.4) and the
resulting park decisions. Rule applied: **functioning → keep; dormant/stub → park.**
Everything parked is preserved on branch `parked/post-clickmax` (snapshot of main
at tag `pre-clickmax-transition`); nothing is hard-deleted until a 30-day
earn-back review approves it.

## Verdict table (audited 2026-07-23)

| Item | Verdict | Decision |
|---|---|---|
| Clean House (runner, cron, panel, migrations 0063–0067) | FUNCTIONING — live cron + workflow + admin UI, drives real `decideGate`, MVDA-cut integration | **KEEP** (plan §2.3 overridden by audit rule) |
| Agentic Harness / `packages/agent` (MVDA Cut Agent worker) | FUNCTIONING — `agent.yml` every 30 min, `agent_sessions` consumed by editing-research + MVDA scoreboard | **KEEP** |
| Self-Watch Loop (`watch-runner`/`watch-gate`) | Wired into live autofix/director/triage paths; judges neutral without keys | **KEEP** |
| taste-profile (`taste.ts`, settings card, migration 0061) | FUNCTIONING — live settings UI, profile read downstream | **KEEP** |
| monetization.ts | FUNCTIONING — feeds operator daily caps + shorts mix | **KEEP** |
| lesson-synthesizer | FUNCTIONING — feeds the kept memory loop | **KEEP** |
| variant-judge (+ best-of-n, bandit, format-bandit) | DORMANT→functioning — live call sites (metadata selection, operator planning), inert without QC keys / below data floor | **KEEP** (learning capability per decision 4; inert = zero cost) |
| competitive-judge, transition-critic, stick-choreographer | DORMANT — live call sites, gated off without keys/mode | **KEEP** (same rationale) |
| twelvelabs.ts | STUB — provider adapter, inert without key | **KEEP** (1.4 KB, gated) |
| Core learning loop (qc_reviews, judge_labels, memory/memory-service, outcome-audit, optimizer cron) | FUNCTIONING | **KEEP** (plan §4.4) |
| VCE flags + adapters (art-director, visual-bible, visual-grounding, seed-vision) | DORMANT (flags default false) | **KEEP** — folded into invisible under-layer (plan §4.5); `compositor` flag is dead (never read) → **DELETE flag only** |
| editor-flags suite (`editor-flags.ts`: assembly/proEditor/keyframes/segmentAgent) + `/assembly` route | DORMANT — all flags false; `/assembly` 404s in prod | **PARK** (Phase 4). `/edit` route itself stays — not flag-gated, shared with the MVDA agent |
| translate.ts / localization.ts | STUB/DEAD — no live caller | **PARK** (Phase 4) |
| `insights` page | ALREADY DEAD — `redirect("/")`; `insights-list.tsx` / `judge-calibration.tsx` orphaned | **PARK** orphaned components (Phase 4) |
| `costs` page, `intel` page | LIVE dashboards | **PARK UI in Phase 3** per decision 4 (ledger, `video_intel` worker + table stay; spend surfaces move to composer chips + header total + chat) |
| `packages/intel` worker (`video-intel.yml`) | DORMANT — worker live, feed uncertain | **KEEP worker**, park its dashboard with `intel` page |

## Parking executed (Phase 4, 2026-07-23)

Everything below is preserved in full on `parked/post-clickmax`
(= main at tag `pre-clickmax-transition`).

- **Deleted from the transition branch:** `src/lib/adapters/translate.ts`,
  `packages/core/src/localization.ts` (+ its index export and
  `tests/localization.test.ts`) — dead code with no live callers.
- **UI removed, mechanism kept (same treatment as VCE):** the Editor & Assembly
  flags card in Settings (`editor-flags.ts` stays; all flags off; the
  app_settings override remains the operator escape hatch). The `/assembly`
  route remains flag-gated → unreachable (effectively parked in place).
- **Dashboards parked in Phase 3:** `/costs` and `/intel` now redirect home;
  Spend removed from nav. Ledger + video-intel worker/table unchanged.
- **Correction during execution:** `insights/insights-list.tsx` is NOT
  orphaned (Feed + Home import `InsightCard`/`GenerateInsightsButton`) — kept.

## Earn-back protocol

30-day clock starts when Phase 4 ships. For each parked item: (a) a concrete
moment occurred where it was missed → un-park with a UX home in the new
workspace; (b) still unused → stays parked another 30 days; (c) second
consecutive unused review → eligible for deletion. Append review notes here.

## Consolidation notes captured for Phase 1

- `runPipeline` (hop loop, engine.ts:1840) and `runDirectedStage` (single step,
  engine.ts:1943) share the same stage switch + money rails; extract
  `advanceStage(videoId, {mode})` as the single-step primitive, make
  `runPipeline` a loop over it, `fullAutoGenerate` a wrapper to render.
- Two autonomy configs exist: `projects.autonomy` per-gate map (read at
  engine.ts:238, clean-house-runner.ts:329, mcp/tools.ts, actions/projects.ts)
  and operator `config.autonomy` on build runs (operator.ts:811, db/queries.ts:157).
  Both fold into `projects.workspace_mode` (director|autopilot); migration maps both.
- No idea→render golden test existed; `tests/golden-path.test.ts` (Phase 0) now
  pins IDEA → APPROVED with mock providers, plus director-mode no-op and
  kill-switch rails.

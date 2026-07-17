# Clean House — Build Spec

A single admin-driven system that triages an entire project library and drives
every salvageable asset to **Ready-to-publish** (passing final score), flags the
truly-unfixable in red for manual handling, and — with two supporting features
(an **archive** state and a **library-size guardrail**) — lets the operator
clear the working library back to a small, controlled set.

Motivation: experimentation with autonomous generation, the full-auto calendar,
and a long-running idea generator can bloat a project library with stalled and
stagnant assets. Clean House resolves every asset to a terminal state
(ready → publish/download/archive, or flagged → kill/recreate) in one governed
sweep.

---

## 1. Principles (locked with the operator)

- **Admin-only.** Gated by the existing `getIsAdmin` / admin allowlist. The
  launcher and all Clean House actions are hidden for non-admins.
- **Available in both director and autonomous modes.**
- **Triage-first.** No paid generation runs until the operator approves a plan
  with a per-asset verdict and a total cost estimate.
- **Stops at Ready-to-publish (APPROVED).** Clean House never uploads to
  YouTube. The operator makes every go-live decision.
- **Flag, don't kill.** Assets deemed unfixable get a red border + a structured
  "kill or recreate" card. Killing is always a manual, human action.
- **Per-run budget ceiling.** The operator sets a hard $ cap; the run shows an
  estimate before starting and stops enqueuing when the projected spend would
  exceed the ceiling.
- **Director-mode authorization:** approving the triage plan authorizes
  autonomous execution *for that run* (per-gate approval is waived within the
  run) — but the run still stops at Ready and never publishes.
- **Interruptible + resumable.** Pause/Cancel stops new work and lets in-flight
  assets finish; a crashed run resumes from persisted item state.

---

## 2. Data model (new)

### 2.1 `clean_house_runs`
One row per sweep (mirrors `build_runs`; enables audit + resume).

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `project_id` | uuid → projects (cascade) | |
| `status` | text | `planning` → `awaiting_approval` → `running` → `paused` → `done` / `cancelled` |
| `scope` | jsonb | `{ mode: "all" \| "selected", videoIds: [...] }` |
| `budget_ceiling_usd` | numeric | operator-set hard cap |
| `est_cost_usd` | numeric | triage estimate |
| `spent_usd` | numeric | live-summed as it runs |
| `created_by` | uuid | the admin who launched it |
| `created_at` | timestamptz | |

### 2.2 `clean_house_items`
Per asset in the run (powers the live board + the final report).

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `run_id` | uuid → clean_house_runs (cascade) | |
| `video_id` | uuid → videos (cascade) | |
| `salvageability` | numeric | 0..1 |
| `verdict` | text | `advance` \| `flag` \| `skip` (post-approval, operator-overridable) |
| `est_cost_usd` | numeric | |
| `actions` | jsonb | the specific steps to advance (rescript / regen N / rerender / autofix) |
| `outcome` | text | null → `ready` \| `flagged` \| `skipped` |
| `spent_usd` | numeric | actual, per asset (feeds cost reconciliation) |

### 2.3 `videos` additions
- `archived` boolean default false, `archived_at` timestamptz — orthogonal to
  pipeline status. Archived items leave the active library.
- `flagged_unfixable` boolean default false + `flag_reason` text — drives the
  red border + the structured blocker card.

### 2.4 `projects` additions
- `library_size_limit` int default **5** — the guardrail, editable anytime in
  Project Settings.

---

## 3. Flow

### Phase 1 — Select & Triage (cheap; NO paid generation)
1. Admin opens the Clean House launcher on the Library / Backlot board.
2. **Scope:** a **Select all** button + per-tile checkboxes for a subset.
3. For each selected asset the MVDA + critics compute a **salvageability score**
   and a proposed **verdict**, using data already on hand — latest QC score,
   `watch_review`, media/technical QC, `paused_reason`, prior autofix attempts,
   current stage — plus at most one light, bounded LLM judgment per asset:
   - **advance** — feasible to reach a passing final score; carries the concrete
     `actions` (rewrite/new script, regen N assets, re-render, autofix) and a
     per-asset **cost estimate** (reuse `estimateTierCost` / `estimateBuildCost`).
   - **flag** — unlikely fixable (already failed autofix, fundamentally weak);
     red border, manual.
4. The operator sees the full plan + total estimate, can **override any verdict**
   (force-advance / force-flag / exclude), sets the **per-run $ ceiling**, and
   **Approves**. Approval flips the run to `running`.

### Phase 2 — Execute (after approval)
- Each `advance` asset is walked forward from its current status through the
  existing stage runners:
  `scripting → assets (provider fallback #11 + source inspection #7) → render →
  technical QC #6 + watch gate → autofix (max 2 rounds, B7) → APPROVED (Ready)`.
- Fails after the 2-round cap → **auto-converts to `flag`** (red) with a
  structured blocker card explaining why. Never killed.
- **Budget ceiling** enforced: stop enqueuing when projected spend would exceed
  the ceiling; unreached assets become `skipped` (logged).
- **Throttled concurrency** (default ~2–3 assets in flight) to avoid render-farm
  / provider rate-limit pressure; provider fallback chains add resilience.
- Respects the global **kill switch**. Every action logs to the **decision
  trail (#9)** + the item row. Live on the **Backlot board (#8)** with
  `partial_progress`. **Pause/Cancel** stops new work, lets in-flight finish.
  Resumable from item state on crash.

### Terminal outcomes (per asset)
- **Ready-to-publish** (APPROVED, passing QC) → awaits the operator's upload/download.
- **Flagged-unfixable** (red) → structured "kill or recreate" card; manual only.
- **Skipped** (at cap / excluded) → untouched, logged.

A **run report** summarizes: X ready · Y flagged · Z skipped · total spent vs ceiling.

---

## 4. Archive state

- New `videos.archived` flag + a one-click **Archive** action on ready/published
  tiles, plus a bulk **"archive all published."**
- Archived assets drop out of the active library sections into a collapsible
  **Archive** filter/section (still reachable, never deleted).
- This is the mechanism that shrinks the working library after Clean House.

---

## 5. Library-size guardrail

- `projects.library_size_limit` (default **5**, editable anytime in Project
  Settings).
- **Counts toward the limit:** every asset in the working pipeline
  (Ideas → Ready) **except** Published/Tracking, Killed, and Archived.
- When the count reaches the limit, **autonomous seeding pauses** (operator,
  full-auto calendar, idea generator stop creating *new* assets) and a banner
  shows "Library N/N — clear or raise the limit." Manual creation is still
  allowed, with a warning. Directly prevents the runaway-idea-generator situation.

---

## 6. UI (dark / on-brand with the redesign)

- **Launcher + triage panel** (admin-only): Select all + per-tile checkboxes;
  plan table with salvageability bars, per-asset actions + cost, total estimate,
  and the ceiling input; Approve / Cancel.
- **Live run view** on the Backlot board: stages lighting up, per-asset progress,
  running spend vs ceiling, Pause/Cancel.
- **Red-flag** blocker cards (reuse the B5 structured blocker component).
- **Archive** action + Archive section/filter.
- **Settings:** library-size limit control in Project Settings.

---

## 7. Testing

- Pure logic (unit): salvageability scoring, per-asset + run cost estimate,
  budget-ceiling stop, guardrail counting, verdict overrides.
- A **mock-mode dry run** of the whole sweep (no spend) — a smoke-style gate.
- Visual QA: triage/approval panel, live run, flagged cards, archive flow,
  settings control.

---

## 8. Recommended build order

1. **Archive state + library-size guardrail** — small, cheap, immediately useful
   (stops further bloat during experimentation).
2. **Clean House** — the triage + execution orchestrator, built on top and on the
   existing QC / provider-fallback / decision-trail / structured-blocker systems.

---

## Completion log

> ✅ **Phase 1 — archive state + library-size guardrail (shipped).** `0062`:
> `videos.archived`/`archived_at`, `projects.library_size_limit` (default 5).
> Pure `countsTowardLibraryLimit` / `activeLibraryCount` / `isOverLibraryLimit`
> in `library.ts` (working pipeline Ideas→Ready; excludes Published/Tracking,
> Killed, Archived). `getLibrary` now returns `archived` + `activeCount` and
> keeps archived assets out of the active sections. Actions
> (`librarymgmt.ts`): `setVideoArchived`, `archiveAllPublished`,
> `setLibrarySizeLimit`. **Guardrail enforced** in the operator seed loop —
> autonomous seeding stops with `library-at-capacity` when the working library
> is full. UI: guardrail banner + Archive section (collapsible) + per-tile
> Archive / bulk "Archive all published" / Restore, and a **Working-library
> limit** slider in project Settings. Verified: `tsc`, `eslint`, **948/948
> vitest** (+4, action manifest updated), `next build`, visual QA.

> ✅ **Phase 2 — Clean House triage + orchestrator (shipped).** `0063`:
> `clean_house_runs` + `clean_house_items` + `videos.flagged_unfixable`/
> `flag_reason`. Pure core `clean-house.ts` (`triageAsset` salvageability +
> verdict, `estimateRemediationUsd`, `planCleanHouse`, `cleanHouseBudgetStop`).
> Admin-gated runner: free triage from existing signals (QC / watch / media-QC /
> autofix attempts) → an `awaiting_approval` plan; `approveCleanHouseRun`
> (verdict overrides + ceiling); `advanceCleanHouseRun` ticks the run —
> advancing each `advance` asset one forward step through the EXISTING gates
> (`decideGate`), running a revision when FINAL QC is below floor, flagging at
> the 2-round cap, respecting the budget ceiling + kill switch, logging every
> step to the decision trail — plus pause/cancel. **Stops at Ready (APPROVED);
> never publishes; never auto-kills.** UI: an admin-only **Clean House panel**
> on the Library (triage → plan chips + ceiling → approve → live run with
> ready/flagged/pending + spend vs ceiling + advance/pause/cancel); flagged
> assets get the **red border** + reason. Scope is "all" today. Verified: `tsc`,
> `eslint`, **961/961 vitest** (+7, action manifest updated), `next build`,
> visual QA.
>
> _Follow-ups (noted): per-tile subset selection for triage; a cron hook so an
> approved run auto-advances async render/clip work without a manual "Advance
> now"; Clean House progress on the Backlot board._
>
> ✅ **Follow-up — subset triage + hands-off auto-advance (shipped).** `0064`
> adds the run lock + rail/stall state (`locked_at`, `tick_count`,
> `no_progress_ticks`, `last_progress`, `paused_reason`; item `inflight_since`,
> `nudges`).
> - **Subset triage.** The Clean House panel now has **Select assets** → a
>   checklist (per-asset status chips) with **select-all/clear-all** and a live
>   count → **Triage N selected**, wiring `startCleanHouseTriage(projectId,
>   "selected", ids)`. "Triage library" (all) is unchanged.
> - **Auto-advance.** A CRON_SECRET-guarded `/api/cron/clean-house` route (+
>   `clean-house.yml`, every 15 min) calls `driveAllCleanHouseRuns()` which ticks
>   every `running` run through the shared `advanceCleanHouseRun` path. Guardrails
>   folded into the tick, in order: **atomic lock claim** (idempotency / double-run
>   — a 5-min-leased `locked_at`, reclaimable after a crash, mirrors the operator's
>   `last_seed_key`); the **kill switch**; **termination rails**
>   (`CLEAN_HOUSE_MAX_TICKS` / `MAX_NO_PROGRESS_TICKS` → auto-pause + record reason
>   + Telegram escalation); the **real-ledger hard budget stop**
>   (`cleanHouseLedgerStop` reconciles `cost_ledger` for the run's assets since it
>   began — the authoritative ceiling, not the estimate); a **per-tick concurrency
>   throttle** (`CLEAN_HOUSE_MAX_ADVANCES_PER_TICK = 3`); and **stall handling**
>   (`cleanHouseStallAction` — an in-flight asset waits, then nudges its worker
>   (bounded), then is flagged). **Completion + pause/failure notifications** go
>   out via Telegram; the panel surfaces the auto-pause reason. Still stops at
>   Ready; still never publishes; still never auto-kills (flags only).
> - Verified: `tsc`, `eslint`, **968/968 vitest** (+7 guardrail tests),
>   `next build` (route registered), visual QA of the subset picker.

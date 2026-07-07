# Fable5 — Autonomous Re-Script Follow-Up (Self-Watch Layer 2, full version)

**Status:** **STAGES A + B BUILT & GREEN (2026-07-07)** — merged behind the
kill-switch **OFF** (per §8). Execution stays disabled until Stage C's dry-run
and Stage D's canary (operational stages, run on real traffic).

> **Build status (2026-07-07):**
> - **Shipped:** `autoRescriptFromFinal` (engine primitive, exported);
>   `src/lib/pipeline/auto-rescript.ts` (`autoRescriptMode` on/dry/off +
>   `shouldAutoRescript`, pure); the autofix call-site (env-gated re-script
>   with full bookkeeping, `dry` would-rescript logging to `operator_events`,
>   global kill-switch honored, fallback = the shipped Layer-2 guidance-hold,
>   byte-for-byte); the **outcome guard** (first fresh critique after a
>   re-script logs the QC-delta to `operator_events` kind `auto_rescript`;
>   Δ≤0 → held, never re-attempted); `AutofixState` gains `autoRescripted` /
>   `rescriptFromScore` / `rescriptSettled`.
> - **Tests (Stage A/B, 24 new, all green):** predicate + mode truth tables;
>   the engine primitive run with the REAL `runScripting` in mock-adapter
>   mode — pinning open question §9.1: it reads `latestNotes`, writes a new
>   script version, lands `SCRIPT_READY`, re-arms `auto_finish`, refuses any
>   non-FINAL_REVIEW status with zero writes; the call-site: fires once with
>   exact side-effects, once-per-video, dry-mode logging, env-off /
>   non-auto-pilot / kill-switch / non-structural fallbacks, and both
>   outcome-guard branches (regressive → hold + delta; improved → done).
> - **§9 answers:** #1 pinned by test (above). #3 confirmed — the predicate
>   gates on `auto_pilot_run`. #2 and #4 are Stage C/D observations by design
>   (the continuation + cycle-budget debits are live-traffic behavior; the
>   normal pipeline budget guards apply unchanged).
> - **Still open (operational):** Stage C dry-run (`AUTOFIX_AUTO_RESCRIPT=dry`,
>   built and tested — flip the env var), Stage D canary, the insights
>   win-rate tile (compute from `operator_events` kind `auto_rescript` meta
>   deltas once Stage C/D produce data).

This is the tested-follow-up to Self-Watch Layer 2.
Layer 2 shipped the *safe* half (a structural QC failure is held with a specific,
banded-model, notes-driven brief as its `paused_reason`). This spec is the
*autonomous* half: instead of holding, re-script the video from that brief,
re-generate, re-render, and re-judge — bounded, kill-switched, and outcome-gated.

**Why it's a separate, gated build:** it drives a full re-script → re-generate →
re-render synchronously from the auto-fix sweep. That can't be exercised in the
dev harness (no live render farm / generation pipeline), so it must be de-risked
with a dry-run + canary before it runs autonomously. Do **not** enable execution
until the test plan below is green.

---

## 1. Goal / non-goals

**Goal:** when a `FINAL_REVIEW` render fails QC for a *structural / script* reason
that visual re-rolls can't fix (starved beat, weak hook, pacing, thin variety),
autonomously rewrite the script from the QC work-order and let the video re-flow
to a fresh render — once per video, then hold.

**Non-goals:** re-timing beats without a re-script; adding brand-new asset types
(data-viz, lower-thirds) as a distinct action (that's a generation-pipeline
feature, separate); touching the human "revise at final review" semantics.

---

## 2. Why the naive approaches fail (established)

- `decideGate({decision:"revision"})` at FINAL → `REVISION_TARGET.FINAL =
  "ASSEMBLING"` (`packages/core/src/state-machine.ts:54`). `runAssembly` only
  re-renders the *identical* beats/assets and never calls `runScripting` — the
  brief is written to `approvals` but never consumed. Net: a wasted re-render.
- `stepBackStage(FINAL_REVIEW)` → `PREVIOUS_STAGE.FINAL_REVIEW = "ASSETS_READY"`
  with `auto_finish:false` and (optionally) **deletes all assets incl. VO**
  (`engine.ts:3823`). It strands the video paused; not autonomous.

Neither re-scripts. The only proven re-script mechanism is the one the
**script-stage auto-revision** already uses (`engine.ts:2855-2863`).

---

## 3. Mechanism — mirror the proven script-stage pattern, from FINAL

The script-stage auto-revision does exactly what we need, one gate earlier:

```ts
await db.from("approvals").insert({
  video_id, gate: "SCRIPT", decision: "revision", decided_by: "autopilot",
  notes, decided_at: new Date().toISOString(),
});
await runScripting(db, video, project);   // reads latestNotes → new script → SCRIPT_READY
```

`latestNotes` (`engine.ts:305`) reads the **latest** `decision='revision'`
approval for the video, *regardless of gate*. So the same two steps re-script a
`FINAL_REVIEW` video. `runScripting` is private to `engine.ts`, so wrap it.

**New exported engine function** (`src/lib/pipeline/engine.ts`):

```ts
/** Autonomous re-script from a FINAL structural failure (Self-Watch Layer 2).
    Records the brief as a revision approval, rewrites the script, and lets the
    full-auto continuation re-generate + re-render. Returns the new status. */
export async function autoRescriptFromFinal(
  db: Db, video: Video, project: Project, brief: string,
): Promise<EngineResult> {
  if (video.status !== "FINAL_REVIEW") return { ok: false, error: "not at final review" };
  await db.from("approvals").insert({
    video_id: video.id, gate: "SCRIPT", decision: "revision",
    decided_by: "autopilot", notes: brief.slice(0, 2000), decided_at: new Date().toISOString(),
  });
  await runScripting(db, video, project);        // → SCRIPT_READY (new script version)
  // Re-arm the full-auto continuation so it flows SCRIPT_READY → assets → render.
  await db.from("videos").update({ auto_finish: true, paused_reason: null }).eq("id", video.id);
  return { ok: true };
}
```

**Auto-fix call site** (`autofix.ts`, replacing the current guidance-hold branch
when the guard passes):

```ts
if (plan.changes.length === 0) {
  const structural = (critique.issues ?? []).some(isStructuralIssue);
  const brief = structural && qcNotes
    ? await composeRevisionBrief({ model: fixModel, qcNotes, issues })   // banded model
    : null;
  if (brief && shouldAutoRescript({
        enabled: AUTOFIX_AUTO_RESCRIPT_ON,        // env kill-switch, default OFF
        autoPilot: video.auto_pilot_run,          // only videos the pipeline will re-flow
        alreadyRescripted: Boolean(state.autoRescripted),
      })) {
    if (brief.costUsd > 0) await recordCost(db, video, "autofix:brief", brief.costUsd, "Auto-fix revision brief");
    const r = await autoRescriptFromFinal(db, video, project, brief.brief);
    if (r.ok) {
      state.autoRescripted = true;              // once-per-video bound (durable on autofix_state)
      state.status = "rerendering";
      state.actedOnAt = critique.at;
      await setState(db, video.id, state);
      await db.from("autofix_runs").insert({ project_id: project.id, video_id: video.id, loop,
        attempt: attempts + 1, tier: "tier1", from_score: score,
        changes: ["Auto-rescript from QC notes"], status: "applied" });
      return { acted: true, kind: "fixed", score, changes: ["Auto-rescript from QC notes"] };
    }
  }
  // else → the safe guidance-hold that shipped in Layer 2 (unchanged fallback).
}
```

`shouldAutoRescript` is a pure, unit-tested predicate (mirrors the removed
`shouldAutoRevise`): `enabled && autoPilot && !alreadyRescripted`.

---

## 4. Exact state transitions

```
FINAL_REVIEW (QC structural fail, no visual fix, auto_pilot_run, !autoRescripted, kill-switch ON)
  │  insert approvals{gate:SCRIPT, decision:revision, notes:brief, decided_by:autopilot}
  │  runScripting()                        ── reads latestNotes(brief) → new script version
  ▼
SCRIPT_READY (auto_finish=true)            ── autofix_state.autoRescripted=true, status="rerendering"
  │  full-auto continuation (existing cron / runPipeline) — NOT driven by autofix
  ▼
GENERATING_ASSETS → ASSETS_READY           ── regenerates VO (narration changed) + visuals
  ▼
ASSEMBLING → (render farm) → FINAL_REVIEW   ── fresh cut, fresh vision_review / QC
  ▼
autofix sweep re-engages:
  • autoRescripted==true → shouldAutoRescript=false → never re-scripts again
  • new score ≥ threshold → done (published normally)
  • new score < threshold → banded visual fixes (Layer 1) or held
```

While the video is **not** at `FINAL_REVIEW` (SCRIPT_READY … ASSEMBLING), the
auto-fix sweep's `status !== "FINAL_REVIEW"` filter skips it, and the operator's
approval pass waits on `autofix_state.status ∈ {done,held}` — so nothing publishes
mid-rescript.

---

## 5. Guardrails & bounds

| Guard | Mechanism |
|---|---|
| **Once per video** | `autofix_state.autoRescripted` — durable (no code resets `autofix_state`; `setState`/CAS spread it). Re-add the field to `AutofixState`. |
| **Kill-switch** | `AUTOFIX_AUTO_RESCRIPT` env (default **off**). Off → the shipped guidance-hold. Also honor the global `kill_switch` app-setting. |
| **Only re-flowable videos** | `video.auto_pilot_run` — guarantees the full-auto continuation drives SCRIPT_READY forward. Manual/build-run videos fall back to the guidance-hold (they'd otherwise strand at SCRIPT_READY). |
| **Structural-only** | `critique.issues.some(isStructuralIssue)` — visual-fixable failures still go through Layer 1's banded re-rolls first. |
| **Spend** | The re-generation runs through the **normal pipeline budget guards** + the operator's rolling cycle budget — a re-script is one full production cycle, so it's counted there, not against the autofix `spendCap`. The revision-approval cap is autopilot-exempt, so the once-flag is the true bound. |
| **Outcome guard** | On return, compare the new FINAL score to `state.bestScore` (pre-rescript). If it did **not** improve, the re-script is a failure — hold + log; never re-attempt (flag already set). |

---

## 6. Failure modes & mitigations

1. **Infinite re-script loop** → bounded by `autoRescripted` (once). Test asserts a
   second FINAL pass never re-scripts.
2. **Stranding at SCRIPT_READY** → only fire for `auto_pilot_run` (has a
   continuation) + `auto_finish=true`. Non-auto-pilot → guidance-hold.
3. **VO not regenerated for changed narration** → the normal SCRIPT_READY→assets
   flow regenerates VO for changed beats (verify: the beat-content-hash logic at
   `engine.ts:800` re-gens changed beats). Test asserts new VO assets exist.
4. **Cost blow-up** → a re-script is a full cycle; bounded by the operator cycle
   budget + the once-flag. Dry-run measures fire-rate before enabling.
5. **`runScripting` from FINAL_REVIEW misbehaves** (it normally runs from a
   scripting context) → the #1 thing the integration test must pin: that it reads
   `latestNotes`, produces a new script version, and lands SCRIPT_READY without
   corrupting state. Open question §9.
6. **Regressive re-script** (new script worse than old) → outcome guard holds it;
   feature auto-disables if win-rate < threshold over N videos (§7).

---

## 7. De-risking test plan (do NOT enable execution until green)

**Stage A — Unit (pure, in this harness):**
- `shouldAutoRescript` truth table (enabled/autoPilot/alreadyRescripted).
- `composeRevisionBrief` already covered; assert cost threading.

**Stage B — Integration (mocked DB + stubbed `runScripting`/pipeline):**
- Assert the exact side-effects: one `approvals` row (gate SCRIPT, decision
  revision, autopilot, notes=brief); `runScripting` called once; `auto_finish=true`;
  `autofix_state.autoRescripted=true`, `status="rerendering"`.
- Assert **idempotency**: a second `processAutofixForVideo` with
  `autoRescripted=true` does **not** insert another approval / call runScripting.
- Assert **fallback**: kill-switch off, or non-auto-pilot, or non-structural →
  guidance-hold, no approval inserted.
- Assert **degraded**: `composeRevisionBrief` null → guidance-hold, no rescript.

**Stage C — Dry-run on real traffic (staging, execution OFF):**
- Add `AUTOFIX_AUTO_RESCRIPT=dry` mode: log `would-rescript {videoId, score,
  brief}` to `operator_events` **without** executing. Run for ~1–2 weeks.
- Measure: fire-rate (what % of structural holds would trigger), which videos,
  brief quality (eyeball 20). Decide go/no-go.

**Stage D — Canary (one project, execution ON):**
- Enable `AUTOFIX_AUTO_RESCRIPT=on` for a single low-stakes project.
- Watch: (a) does the video actually re-flow to a fresh FINAL_REVIEW? (b) QC-delta
  (new FINAL score − pre-rescript `bestScore`) — the win metric; (c) cost per
  rescript; (d) zero stranding (no video stuck at SCRIPT_READY > 1 cycle).
- **Auto-disable gate:** if win-rate (QC-delta > 0) < 50% over the first ~10
  rescripts, or any stranding occurs, flip the kill-switch and diagnose.

**Stage E — Global.** Enable once canary shows positive median QC-delta, no
stranding, and cost within the cycle budget.

**Observability (build alongside):**
- `autofix_runs` row per rescript (already in the call site).
- `operator_events` "auto_rescript" with the QC-delta on return.
- An insights tile: **rescript win-rate** (median QC-delta, n) — the same
  outcome-audit discipline as C3. If win-rate decays, the feature is drifting.

---

## 8. Rollout sequence

`Stage A/B (this harness) → merge behind kill-switch OFF → Stage C dry-run →
Stage D canary → Stage E global`. The kill-switch stays permanently (operator can
disable). The shipped guidance-hold is always the fallback, so turning it off is
zero-risk.

---

## 9. Open questions (resolve during Stage B/C)

1. **Does `runScripting` run cleanly from `FINAL_REVIEW`?** It's only ever been
   called from a scripting context. Confirm it doesn't assume prior status, reads
   the latest script version to revise, and lands SCRIPT_READY. *(Highest-risk
   unknown — Stage B must pin it.)*
2. **Does the SCRIPT_READY→assets continuation regenerate VO for changed beats
   automatically for `auto_pilot_run` videos, or does it need an explicit nudge?**
   (Verify the `auto_finish` + operator/`runPipeline` continuation actually fires.)
3. **Build-run (non-operator) videos:** confirmed they lack the continuation →
   they must stay on the guidance-hold. Verify `auto_pilot_run` is the right flag
   (vs `operator_run_id`).
4. **Interaction with the operator's cycle budget:** a rescript is a full extra
   production. Confirm it's debited correctly and can't blow the cycle cap.

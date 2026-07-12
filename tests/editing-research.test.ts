/**
 * Editing-craft research gates (Phase E, §11 KD4 + C4). The pure pre-flight
 * gate must refuse a run for every mechanical reason — kill switch, too few
 * real agent cuts, budget — before any money can move.
 */
import { describe, expect, it } from "vitest";
import {
  MIN_AGENT_CUTS,
  RESEARCH_RUN_CAP_USD,
  researchGate,
} from "../src/lib/pipeline/editing-research";
import { RESEARCH_MONTHLY_CAP_USD } from "../src/lib/pipeline/ledger";

const BASE = {
  killSwitch: false,
  agentCuts: MIN_AGENT_CUTS,
  monthSpendUsd: 0,
  capUsd: RESEARCH_MONTHLY_CAP_USD,
  aboutToSpendUsd: RESEARCH_RUN_CAP_USD,
};

describe("researchGate", () => {
  it("opens when every gate is satisfied", () => {
    expect(researchGate(BASE)).toEqual({ ok: true });
  });

  it("kill switch closes it unconditionally (KD4 test 4)", () => {
    const g = researchGate({ ...BASE, killSwitch: true });
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.reason).toMatch(/kill switch/);
  });

  it("C4: closed until the agent has cut ≥5 real videos", () => {
    const g = researchGate({ ...BASE, agentCuts: MIN_AGENT_CUTS - 1 });
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.reason).toMatch(/agent cuts/);
    expect(researchGate({ ...BASE, agentCuts: MIN_AGENT_CUTS }).ok).toBe(true);
  });

  it("pre-flight abort when month spend + the run's ceiling reaches the cap (KD4 test 1)", () => {
    // Already at the cap.
    expect(researchGate({ ...BASE, monthSpendUsd: RESEARCH_MONTHLY_CAP_USD }).ok).toBe(false);
    // The reservation pushes it over — abort BEFORE spending.
    const g = researchGate({
      ...BASE,
      monthSpendUsd: RESEARCH_MONTHLY_CAP_USD - RESEARCH_RUN_CAP_USD / 2,
    });
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.reason).toMatch(/research budget/);
    // Just under, with room for the full run: opens.
    expect(
      researchGate({ ...BASE, monthSpendUsd: RESEARCH_MONTHLY_CAP_USD - RESEARCH_RUN_CAP_USD - 0.01 }).ok,
    ).toBe(true);
  });

  it("the separate budget line: production spend does not appear in the gate's inputs", () => {
    // The gate reads ONLY research-scope month spend — a channel that burned
    // its whole production budget still gets research (and vice versa). This
    // is structural: researchMonthSpend() filters provider='research' AND
    // project_id IS NULL, so the two ledgers cannot intersect (KD4 test 3's
    // positive half; the query-shape assertion lives in the ledger itself).
    expect(researchGate({ ...BASE, monthSpendUsd: 0 }).ok).toBe(true);
  });
});

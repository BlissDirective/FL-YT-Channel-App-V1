import "server-only";
import { anthropicFetch } from "./anthropic";
import { anthropicCostUsd } from "./pricing";

/**
 * Script prose fact-check gate (Enhancement Plan Phase 4.2; Tier 5 spec).
 * The dataviz pipeline fact-checks chart FIGURES and editorialGuard checks
 * legal/spam — but nothing checked the script's prose claims, and for a
 * faceless channel one confidently-wrong viral video is a channel-level
 * risk. This pass extracts the script's load-bearing factual claims and
 * verifies them, search-grounded when the API's web-search tool is enabled
 * (FACT_CHECK_SEARCH != "off"), plausibility-only otherwise.
 *
 * Output is a 0–10 risk score (10 = confidently false claims central to the
 * video). The engine holds the video at the SCRIPT gate when
 * risk >= quality_gates.factRiskMax. Mock mode (no key) returns risk 0 so
 * credential-less installs flow end-to-end.
 */

const MODEL = process.env.FACT_CHECK_MODEL?.trim() || "claude-sonnet-4-6";
const MAX_SEARCHES = 4;

export type FactCheckClaim = {
  claim: string;
  verdict: "verified" | "unverified" | "false";
  note: string;
};

export type FactCheckResult = {
  risk: number; // 0-10
  claims: FactCheckClaim[];
  searched: boolean;
  costUsd: number;
  provider: "anthropic" | "mock";
};

export function isFactCheckLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const DELIVER_TOOL = {
  name: "deliver_fact_check",
  description: "Deliver the structured fact-check verdict.",
  input_schema: {
    type: "object",
    properties: {
      risk: {
        type: "number",
        description:
          "0-10 overall risk. 0-2: nothing material to verify or all verified. 3-6: some unverifiable claims, none central. 7-10: false or highly dubious claims that carry the video.",
      },
      claims: {
        type: "array",
        items: {
          type: "object",
          properties: {
            claim: { type: "string" },
            verdict: { type: "string", enum: ["verified", "unverified", "false"] },
            note: { type: "string", description: "One-line evidence/reason (cite the source when searched)." },
          },
          required: ["claim", "verdict", "note"],
        },
      },
    },
    required: ["risk", "claims"],
  },
} as const;

export async function factCheckScript(opts: {
  title: string;
  niche: string;
  beats: { idx: number; text: string }[];
}): Promise<FactCheckResult> {
  if (!isFactCheckLive()) {
    return { risk: 0, claims: [], searched: false, costUsd: 0, provider: "mock" };
  }

  const useSearch = (process.env.FACT_CHECK_SEARCH ?? "on") !== "off";
  const body = opts.beats.map((b) => `[${b.idx}] ${b.text}`).join("\n");
  const tools: unknown[] = [DELIVER_TOOL];
  if (useSearch) {
    tools.unshift({ type: "web_search_20250305", name: "web_search", max_uses: MAX_SEARCHES });
  }

  const res = await anthropicFetch({
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system:
        "You are a rigorous fact-checker for a YouTube channel. Extract the 3-6 most load-bearing FACTUAL claims " +
        "(numbers, dates, events, attributions — not opinions or framing) from the script, verify each" +
        (useSearch ? " using web search (be frugal — check only what matters)," : " against your knowledge,") +
        " then call deliver_fact_check exactly once. Unverifiable-but-plausible claims are 'unverified', not 'false'. " +
        "Judge risk by how central the shaky claims are to the video's promise.",
      messages: [
        {
          role: "user",
          content: `TITLE: ${opts.title}\nNICHE: ${opts.niche}\n\nSCRIPT BEATS:\n${body}`,
        },
      ],
      tools,
      tool_choice: { type: "auto" },
    }),
  });

  if (!res.ok) {
    // Fail-open with a marker: a fact-check outage must not hold every script,
    // but the engine records that the check didn't run (risk null-ish 0 + note).
    console.error(`fact-check failed (${res.status}): ${(await res.text()).slice(0, 160)}`);
    return {
      risk: 0,
      claims: [{ claim: "(fact-check unavailable)", verdict: "unverified", note: `API ${res.status}` }],
      searched: false,
      costUsd: 0,
      provider: "anthropic",
    };
  }

  const data = (await res.json()) as {
    content: ({ type: "tool_use"; name: string; input: { risk?: number; claims?: FactCheckClaim[] } } | { type: string })[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const tu = data.content.find(
    (b): b is Extract<typeof data.content[number], { type: "tool_use" }> =>
      b.type === "tool_use" && (b as { name?: string }).name === "deliver_fact_check",
  );
  const risk = Math.min(Math.max(Number(tu?.input.risk ?? 0), 0), 10);
  const claims = (tu?.input.claims ?? []).slice(0, 8).map((c) => ({
    claim: String(c.claim ?? "").slice(0, 240),
    verdict: (["verified", "unverified", "false"].includes(c.verdict) ? c.verdict : "unverified") as FactCheckClaim["verdict"],
    note: String(c.note ?? "").slice(0, 240),
  }));
  return {
    risk,
    claims,
    searched: useSearch,
    costUsd: anthropicCostUsd(MODEL, data.usage.input_tokens, data.usage.output_tokens),
    provider: "anthropic",
  };
}

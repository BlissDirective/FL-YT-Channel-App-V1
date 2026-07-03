import "server-only";
import { anthropicFetch } from "./anthropic";

/**
 * Anthropic Message Batches + a parallel real-time fan-out helper (Harness C6).
 *
 * Best-of-N (C2) needs to run N generation/judge calls at once. Two modes:
 *  - `parallelMessages` (default): N concurrent real-time calls with a
 *    concurrency cap — fast, fits a synchronous pipeline stage, keeps the
 *    operator-facing path responsive.
 *  - `runBatch` (opt-in via ANTHROPIC_USE_BATCH): the Message Batches API —
 *    flat 50% off, stacks with prompt caching — for latency-tolerant overnight
 *    work (cron fan-outs). Adds minutes of latency, so it's off by default.
 *
 * Both return results positionally aligned to the input requests, with `null`
 * for any failed/absent result so callers can filter.
 */

const BATCH_URL = "https://api.anthropic.com/v1/messages/batches";

export type MessageParams = Record<string, unknown>;

/** Content blocks of a successful message result (tool_use / text). */
export type MessageContent = { type: string; input?: Record<string, unknown>; text?: string }[];
export type MessageResult = {
  content: MessageContent;
  usage: { input_tokens: number; output_tokens: number };
} | null;

export function isBatchEnabled(): boolean {
  return process.env.ANTHROPIC_USE_BATCH === "1";
}

const HEADERS = () => ({
  "x-api-key": process.env.ANTHROPIC_API_KEY!,
  "anthropic-version": "2023-06-01",
  "content-type": "application/json",
});

/**
 * Run N message requests concurrently (real-time). `limit` caps in-flight
 * calls so a large fan-out can't burst the rate limit. Never throws — a failed
 * call resolves to null in its slot.
 */
export async function parallelMessages(
  requests: MessageParams[],
  limit = 4,
): Promise<MessageResult[]> {
  const results: MessageResult[] = new Array(requests.length).fill(null);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= requests.length) return;
      try {
        const res = await anthropicFetch({
          method: "POST",
          headers: HEADERS(),
          body: JSON.stringify(requests[i]),
        });
        if (res.ok) results[i] = (await res.json()) as MessageResult;
      } catch (err) {
        console.error(`parallelMessages[${i}] failed:`, err);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, requests.length) }, worker));
  return results;
}

// ── Message Batches API (opt-in) ──────────────────────────────────────

/** Parse one JSONL result line into a positional (customId, result) pair. */
export function parseBatchResultLine(line: string): { customId: string; result: MessageResult } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const row = JSON.parse(trimmed) as {
      custom_id?: string;
      result?: { type?: string; message?: MessageResult };
    };
    if (!row.custom_id) return null;
    const ok = row.result?.type === "succeeded";
    return { customId: row.custom_id, result: ok ? (row.result?.message ?? null) : null };
  } catch {
    return null;
  }
}

/** Map a JSONL results body back to input order via custom_id = index. */
export function collectBatchResults(jsonl: string, count: number): MessageResult[] {
  const byId = new Map<string, MessageResult>();
  for (const line of jsonl.split("\n")) {
    const parsed = parseBatchResultLine(line);
    if (parsed) byId.set(parsed.customId, parsed.result);
  }
  return Array.from({ length: count }, (_, i) => byId.get(String(i)) ?? null);
}

/**
 * Submit a batch, poll to completion, and return results in input order.
 * Falls back to `parallelMessages` if batch is disabled or the submit fails,
 * so callers get results either way.
 */
export async function runBatch(
  requests: MessageParams[],
  opts: { maxWaitMs?: number; pollMs?: number; parallelLimit?: number } = {},
): Promise<MessageResult[]> {
  if (!isBatchEnabled() || requests.length === 0) {
    return parallelMessages(requests, opts.parallelLimit);
  }
  try {
    const submit = await fetch(BATCH_URL, {
      method: "POST",
      headers: HEADERS(),
      body: JSON.stringify({
        requests: requests.map((params, i) => ({ custom_id: String(i), params })),
      }),
    });
    if (!submit.ok) throw new Error(`batch submit ${submit.status}`);
    const { id } = (await submit.json()) as { id: string };

    const deadline = Date.now() + (opts.maxWaitMs ?? 20 * 60_000);
    const pollMs = opts.pollMs ?? 10_000;
    for (;;) {
      if (Date.now() > deadline) throw new Error("batch timed out");
      await new Promise((r) => setTimeout(r, pollMs));
      const st = await fetch(`${BATCH_URL}/${id}`, { headers: HEADERS() });
      if (!st.ok) continue;
      const body = (await st.json()) as { processing_status?: string; results_url?: string };
      if (body.processing_status !== "ended") continue;
      if (!body.results_url) throw new Error("batch ended without results_url");
      const resultsRes = await fetch(body.results_url, { headers: HEADERS() });
      const jsonl = await resultsRes.text();
      return collectBatchResults(jsonl, requests.length);
    }
  } catch (err) {
    console.error("runBatch failed — falling back to parallel:", err);
    return parallelMessages(requests, opts.parallelLimit);
  }
}

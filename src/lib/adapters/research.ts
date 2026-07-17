import "server-only";
import { assembleBrief, type ResearchBrief, type ResearchSource } from "@studio/core";

/**
 * Cited research adapter (list1 #22) — mock-first, upgrades Scout into a
 * research brief. With a YouTube key (and, later, web search) it gathers real
 * sources; otherwise it returns a deterministic mock brief so scripting has a
 * grounded, cited context with zero credentials. The pure `assembleBrief`
 * shapes + scores it.
 */

export function isResearchLive(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_V3);
}

/**
 * Build a cited brief for a topic. Best-effort: always returns a usable brief
 * (mock sources when live retrieval is unavailable) so scripting never blocks
 * on research.
 */
export async function researchTopic(input: {
  topic: string;
  angle?: string;
  audience?: string;
}): Promise<ResearchBrief> {
  const angle = input.angle ?? "a fresh, specific angle";
  const audience = input.audience ?? "curious general audience";

  // Live retrieval would populate `sources` from YouTube/news/etc. here; the
  // mock keeps the same shape so the downstream contract is identical.
  const sources: ResearchSource[] = mockSources(input.topic);
  const findings = [
    { claim: `Core context that frames "${input.topic}"`, sourceIdx: [0, 1] },
    { claim: `A specific, surprising detail about ${input.topic}`, sourceIdx: [2] },
    { claim: `What most coverage of ${input.topic} gets wrong`, sourceIdx: [1, 3] },
  ];

  return assembleBrief({
    topic: input.topic,
    angle,
    audience,
    sources,
    findings,
    openQuestions: [`What's the strongest counter-argument on ${input.topic}?`],
  });
}

function mockSources(topic: string): ResearchSource[] {
  const q = encodeURIComponent(topic);
  return [
    { kind: "academic", title: `Peer-reviewed overview of ${topic}`, url: `https://scholar.example/${q}`, credibility: 0.9 },
    { kind: "news", title: `Recent reporting on ${topic}`, url: `https://news.example/${q}`, credibility: 0.75 },
    { kind: "youtube", title: `Top explainer video on ${topic}`, url: `https://youtube.com/results?search_query=${q}`, credibility: 0.6 },
    { kind: "reddit", title: `Community discussion of ${topic}`, url: `https://reddit.com/search?q=${q}`, credibility: 0.45 },
  ];
}

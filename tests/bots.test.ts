/**
 * Channel bots (docs/bots/README.md): the rails are server-side. A bot token
 * sees only its allowlist, acts only on its own channel, runs one video at a
 * time, must learn (lesson + research) before its next import, and cannot
 * start production past its monthly Higgsfield cap.
 */
import { describe, expect, it, vi } from "vitest";
import { fakeDb } from "./helpers/fake-db";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("tests pass an explicit db");
  },
}));

import { enforceBot, hashToken, newBotToken, type BotContext } from "@/lib/bots/agents";
import { toolVisible } from "@/lib/mcp/tools";

const bot: BotContext = { id: "b1", name: "earthlines-bot", projectId: "p1", monthlyCapUsd: 600 };

function seed(extra: Record<string, unknown[]> = {}) {
  return fakeDb({
    projects: [{ id: "p1", name: "Earthlines" }, { id: "p2", name: "Other" }],
    videos: [{ id: "vx", project_id: "p2", status: "FINAL_REVIEW", title: "Not yours", directed: true }],
    cost_ledger: [],
    bot_lessons: [],
    bot_research: [],
    ...extra,
  } as never);
}

describe("bot tool visibility", () => {
  it("bots see only their allowlist; bot-only and director tools are scoped", () => {
    expect(toolVisible("get_bot_brief", "bot")).toBe(true);
    expect(toolVisible("produce_directed", "bot")).toBe(true);
    for (const t of ["approve_gate", "save_voice", "update_project", "full_auto_generate", "create_bot_agent", "sync_bot_playbook"]) {
      expect(toolVisible(t, "bot")).toBe(false);
    }
    expect(toolVisible("get_bot_brief", "control")).toBe(false);
    expect(toolVisible("create_bot_agent", "control")).toBe(true);
    expect(toolVisible("bot_digest", "read")).toBe(false);
    expect(toolVisible("get_qc_pack", "read")).toBe(true);
  });

  it("tokens are prefixed and stored only as a hash", () => {
    const t = newBotToken();
    expect(t.startsWith("fsbot_")).toBe(true);
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).not.toContain(t);
  });
});

describe("enforceBot rails", () => {
  it("refuses tools outside the allowlist", async () => {
    await expect(enforceBot(seed() as never, bot, "approve_gate", {})).rejects.toThrow(/not available/);
  });

  it("refuses another channel's project or video", async () => {
    await expect(enforceBot(seed() as never, bot, "list_lessons", { projectId: "p2" })).rejects.toThrow(/own channel/);
    await expect(enforceBot(seed() as never, bot, "get_qc_pack", { videoId: "vx" })).rejects.toThrow(/not in your channel/);
  });

  it("injects the bot's projectId", async () => {
    const args: Record<string, unknown> = {};
    await enforceBot(seed() as never, bot, "list_lessons", args);
    expect(args.projectId).toBe("p1");
  });

  it("one video at a time", async () => {
    const db = seed({ videos: [{ id: "v1", project_id: "p1", status: "GENERATING_ASSETS", title: "Busy", directed: true }] });
    await expect(enforceBot(db as never, bot, "import_script", {})).rejects.toThrow(/One video at a time/);
  });

  it("learn before the next video: lesson + research on the last finished one", async () => {
    const vids = [{ id: "v1", project_id: "p1", status: "FINAL_REVIEW", title: "Done", directed: true, bot_agent_id: "b1" }];
    await expect(enforceBot(seed({ videos: vids }) as never, bot, "import_script", {})).rejects.toThrow(/Learn before the next video/);
    const ok = seed({
      videos: vids,
      bot_lessons: [{ id: "l1", video_id: "v1", project_id: "p1" }],
      bot_research: [{ id: "r1", video_id: "v1", project_id: "p1" }],
    });
    await expect(enforceBot(ok as never, bot, "import_script", {})).resolves.toBeUndefined();
  });

  it("cap: no new generations once the month's Higgsfield spend reaches the cap", async () => {
    const db = seed({ cost_ledger: [{ id: "c1", project_id: "p1", provider: "higgsfield-video", usd: 600, at: new Date().toISOString() }] });
    await expect(enforceBot(db as never, bot, "make_reference_still", {})).rejects.toThrow(/cap reached/);
  });
});

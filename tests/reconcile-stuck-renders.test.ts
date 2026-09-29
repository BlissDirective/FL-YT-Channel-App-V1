/**
 * reconcileStuckRenders heals a video stranded at ASSEMBLING after the farm
 * stored its cut. It must NOT heal a video whose newest staged cut (edit
 * document) postdates its newest render: that cut is a revision still waiting
 * for the farm, and healing it parks the video on the stale render (9/29).
 */
import { describe, expect, it, vi } from "vitest";
import { fakeDb } from "./helpers/fake-db";

vi.mock("@/lib/push", () => ({ isPushConfigured: () => false, sendPushToAll: async () => {} }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    throw new Error("test must pass an explicit db");
  },
}));

import { reconcileStuckRenders } from "@/lib/pipeline/engine";

const OLD = "2026-09-29T10:00:00.000Z";

function seed(renderAt: string, eddAt: string) {
  return fakeDb({
    videos: [{ id: "v1", status: "ASSEMBLING", updated_at: OLD, youtube_video_id: null }],
    assets: [{ id: "a1", video_id: "v1", kind: "render", storage_path: "videos/v1/short.mp4", created_at: renderAt }],
    edit_documents: [{ id: "e1", video_id: "v1", version: 2, created_at: eddAt }],
  });
}

describe("reconcileStuckRenders", () => {
  it("heals a video whose render is newer than its last staged cut", async () => {
    const db = seed("2026-09-29T09:30:00.000Z", "2026-09-29T09:00:00.000Z");
    const r = await reconcileStuckRenders(db as never);
    expect(r.healed).toBe(1);
    expect(db.row("videos", "v1")?.status).toBe("FINAL_REVIEW");
  });

  it("leaves a re-staged revision waiting for the farm", async () => {
    const db = seed("2026-09-28T22:31:00.000Z", "2026-09-29T09:00:00.000Z");
    const r = await reconcileStuckRenders(db as never);
    expect(r.healed).toBe(0);
    expect(db.row("videos", "v1")?.status).toBe("ASSEMBLING");
  });
});

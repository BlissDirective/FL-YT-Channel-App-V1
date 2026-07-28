/**
 * Forced-alignment for sing-along captions. The alignment MATH is the risky
 * part (LCS anchor matching + interpolation of unmatched runs), so we drive the
 * real aligner against a mocked ASR: a Whisper stand-in that returns a few
 * accurate word onsets and mishears the rest, exactly like real singing ASR.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/adapters/fal", () => ({
  isFalLive: () => true,
  falTranscribeWords: vi.fn(),
}));

import { alignLyricsToAudio, lyricTokens } from "@/lib/adapters/align";
import { falTranscribeWords } from "@/lib/adapters/fal";

const LYRICS = `[Verse 1]
My turn, your turn
Wait a moment
(clap, clap!)
Then it's mine`;

describe("lyricTokens", () => {
  it("drops section tags and parenthetical stage directions", () => {
    expect(lyricTokens(LYRICS)).toEqual([
      "My",
      "turn,",
      "your",
      "turn",
      "Wait",
      "a",
      "moment",
      "Then",
      "it's",
      "mine",
    ]);
  });
});

describe("alignLyricsToAudio", () => {
  it("pins matched words to ASR times and interpolates the gaps, monotonically", async () => {
    // ASR heard most words with real onsets, but mangled "moment" → "momen"
    // (an unmatched token that must be interpolated between its neighbours).
    (falTranscribeWords as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      costUsd: 0.01,
      words: [
        { w: "my", start: 0.0, end: 0.4 },
        { w: "turn", start: 0.4, end: 0.8 },
        { w: "your", start: 0.9, end: 1.2 },
        { w: "turn", start: 1.2, end: 1.6 },
        { w: "wait", start: 2.0, end: 2.3 },
        { w: "a", start: 2.3, end: 2.4 },
        // "moment" misheard → no anchor here
        { w: "then", start: 3.4, end: 3.7 },
        { w: "its", start: 3.7, end: 3.9 },
        { w: "mine", start: 3.9, end: 4.4 },
      ],
    });

    const res = await alignLyricsToAudio({ audioUrl: "https://signed/song", lyrics: LYRICS, durationSec: 5 });
    expect(res).not.toBeNull();
    const words = res!.words;
    // One timing per lyric token, in lyric order.
    expect(words.map((w) => w.w)).toEqual(lyricTokens(LYRICS));

    // Anchored word lands on its real onset.
    const wait = words.find((w) => w.w === "Wait")!;
    expect(wait.start).toBeCloseTo(2.0, 3);

    // The misheard "moment" is interpolated strictly between "a" (2.4) and the
    // next anchor "Then" (3.4).
    const moment = words.find((w) => w.w === "moment")!;
    expect(moment.start).toBeGreaterThan(2.4);
    expect(moment.start).toBeLessThan(3.4);

    // Times never go backwards.
    for (let i = 1; i < words.length; i++) {
      expect(words[i].start).toBeGreaterThanOrEqual(words[i - 1].start);
      expect(words[i].end).toBeGreaterThan(words[i].start);
    }
  });

  it("falls back to null when the ASR returns nothing to anchor on", async () => {
    (falTranscribeWords as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ costUsd: 0.01, words: [] });
    expect(await alignLyricsToAudio({ audioUrl: "https://signed/song", lyrics: LYRICS })).toBeNull();
  });
});

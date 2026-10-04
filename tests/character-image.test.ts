import { describe, expect, it } from "vitest";
import { characterImageErrors, characterImagePath } from "@/lib/pipeline/character-image";
import { estimateRefImageCost, getRefImageModel } from "@/lib/adapters/reference-image";

const base = { projectId: "p1", name: "Hero front", prompt: "full body, front view" };

describe("make_character_image", () => {
  it("accepts storage-path references and rejects URLs, traversal and too many refs", () => {
    expect(characterImageErrors({ ...base, references: ["refs/p1/char-master-abc.png"] })).toEqual([]);
    expect(characterImageErrors({ ...base, references: ["https://x.test/a.png"] })).toHaveLength(1);
    expect(characterImageErrors({ ...base, references: ["../a.png"] })).toHaveLength(1);
    expect(characterImageErrors({ ...base, references: Array(7).fill("refs/p1/a.png") })).toHaveLength(1);
    expect(characterImageErrors({ ...base, model: "dall-e" })).toHaveLength(1);
    expect(characterImageErrors({ ...base, prompt: " " })).toHaveLength(1);
  });

  it("stores each distinct request at its own deterministic path", () => {
    const a = characterImagePath(base);
    expect(a).toMatch(/^refs\/p1\/char-hero-front-[0-9a-f]{10}$/);
    expect(characterImagePath(base)).toBe(a); // a retry finds the paid image
    expect(characterImagePath({ ...base, references: ["refs/p1/m.png"] })).not.toBe(a);
    expect(characterImagePath({ ...base, resolution: "4K" })).not.toBe(a);
  });

  it("bills Nano Banana Pro 4K at twice the base rate", () => {
    const nb = getRefImageModel("nano-banana-pro")!;
    expect(estimateRefImageCost(nb, 1, "2K")).toBe(0.15);
    expect(estimateRefImageCost(nb, 1, "4K")).toBe(0.3);
    expect(estimateRefImageCost(getRefImageModel("flux-2-pro")!, 2, "4K")).toBe(0.06);
  });
});

import "server-only";

/**
 * Pixel-level sanity check for a freshly generated still (Tier 2). Rejects
 * empty/tiny files and near-solid/blank renders BEFORE they reach the render —
 * a dead generation caught here costs one re-roll, not a wasted render + vision
 * critique round. Uses sharp; if sharp is unavailable or decoding fails it
 * degrades to a size-only check and never blocks on its own absence.
 */

export type ImageVerdict = { bad: boolean; reason?: string };

const MIN_BYTES = 2048; // a real 16:9 still is far larger than 2 KB
const MIN_DIM = 256; // FLUX 16:9 renders are ~1024px+
const FLAT_STDEV = 3; // per-channel stdev below this ≈ a solid color

export async function inspectStill(bytes: Buffer | Uint8Array): Promise<ImageVerdict> {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (buf.byteLength < MIN_BYTES) return { bad: true, reason: "suspiciously small file" };
  try {
    const sharp = (await import("sharp")).default;
    const image = sharp(buf, { failOn: "none" });
    const meta = await image.metadata();
    if (!meta.width || !meta.height || meta.width < MIN_DIM || meta.height < MIN_DIM) {
      return { bad: true, reason: `invalid dimensions (${meta.width ?? "?"}x${meta.height ?? "?"})` };
    }
    const stats = await image.stats();
    const maxStdev = Math.max(...stats.channels.map((c) => c.stdev));
    if (maxStdev < FLAT_STDEV) return { bad: true, reason: "near-solid/blank image" };
    return { bad: false };
  } catch {
    // sharp missing or decode failed → don't block on the check itself.
    return { bad: false };
  }
}

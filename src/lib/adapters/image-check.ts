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

/**
 * 64-bit average perceptual hash (16 hex chars) of an image, for cheap
 * near-identical-visual detection across a video's beats. Returns null when
 * sharp is unavailable or decoding fails.
 */
export async function perceptualHash(bytes: Buffer | Uint8Array): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default;
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    const data = await sharp(buf).grayscale().resize(8, 8, { fit: "fill" }).raw().toBuffer();
    let sum = 0;
    for (let i = 0; i < 64; i++) sum += data[i];
    const avg = sum / 64;
    let hex = "";
    for (let i = 0; i < 64; i += 4) {
      let nibble = 0;
      for (let b = 0; b < 4; b++) nibble = (nibble << 1) | (data[i + b] >= avg ? 1 : 0);
      hex += nibble.toString(16);
    }
    return hex;
  } catch {
    return null;
  }
}

/** Hamming distance between two equal-length hex pHashes (0 = identical). */
export function hammingDistance(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

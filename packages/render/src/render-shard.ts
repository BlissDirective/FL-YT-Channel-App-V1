/**
 * Render-farm sharding. One hosted runner renders one video at a time and a
 * 720p long-form takes about an hour, so a single lane backs every Short up
 * behind every long-form (9/29: 12 videos queued). render.yml runs N lanes;
 * each renders only the videos whose id hashes to its shard, so lanes never
 * pick the same video and need no claim column.
 */
export type RenderShard = { index: number; count: number };

export function renderShardFromEnv(env: Record<string, string | undefined> = process.env): RenderShard {
  const count = Math.max(1, Math.floor(Number(env.RENDER_SHARDS) || 1));
  const index = Math.floor(Number(env.RENDER_SHARD) || 0);
  return { count, index: index >= 0 && index < count ? index : 0 };
}

/** FNV-1a over the id: stable across runs and runners. */
export function shardOf(id: string, count: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % Math.max(1, count);
}

export const inShard = (id: string, s: RenderShard): boolean => s.count <= 1 || shardOf(id, s.count) === s.index;

/** Publishing and EDD previews are singletons: only lane 0 runs them. */
export const isLeadShard = (s: RenderShard): boolean => s.index === 0;

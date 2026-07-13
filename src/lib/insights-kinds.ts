/**
 * Which proposed-template kinds the pipeline ACTUALLY consumes.
 *
 * `getActiveTemplate` (engine.ts) is only ever called for the "script" kind
 * during generation, so a "script" template insight is a closed loop — applying
 * it versions a new template the next script read uses. Other kinds
 * (scoring/thumbnail/metadata) can be proposed but nothing reads them yet, so
 * "applying" one would be a dead write. This set keeps the UI and the apply
 * action honest: only consumed kinds offer a real "Apply" (and write a template
 * row); the rest are advisory ("Mark done"). Add a kind here the moment a
 * generation path starts reading it.
 */
export const CONSUMED_TEMPLATE_KINDS = new Set<string>(["script"]);

/** Does applying this insight actually change future pipeline behavior? */
export function insightIsApplicable(kind: string | null | undefined, body: string | null | undefined): boolean {
  return Boolean(kind && body && CONSUMED_TEMPLATE_KINDS.has(kind));
}

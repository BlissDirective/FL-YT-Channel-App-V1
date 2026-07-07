/**
 * Auto-Rescript gating (Fable5-Auto-Rescript-Spec.md §3/§5) — the pure,
 * unit-tested half of the autonomous re-script decision. The env kill-switch
 * has three positions:
 *
 *   AUTOFIX_AUTO_RESCRIPT=on   execute the re-script (Stage D/E)
 *   AUTOFIX_AUTO_RESCRIPT=dry  log "would-rescript" to operator_events only
 *                              (Stage C dry-run; nothing executes)
 *   unset / anything else      OFF — the shipped Layer-2 guidance-hold
 *
 * Execution additionally honors the global kill_switch app-setting at the
 * call site. The once-per-video bound lives on autofix_state.autoRescripted.
 */

export type AutoRescriptMode = "on" | "dry" | "off";

export function autoRescriptMode(
  env: string | undefined = process.env.AUTOFIX_AUTO_RESCRIPT,
): AutoRescriptMode {
  if (env === "on") return "on";
  if (env === "dry") return "dry";
  return "off";
}

/** The predicate the spec pins (mirrors the removed shouldAutoRevise):
    fire only when enabled, only for videos the full-auto continuation will
    re-flow (auto_pilot_run), and only once per video. */
export function shouldAutoRescript(opts: {
  enabled: boolean;
  autoPilot: boolean;
  alreadyRescripted: boolean;
}): boolean {
  return opts.enabled && opts.autoPilot && !opts.alreadyRescripted;
}

import { redirect } from "next/navigation";

/** ClickMax transition decision 4 (Phase 3): the Spend dashboard is parked.
    Cost surfaces at the point of click — composer/Continue USD estimates, the
    workspace header total, and chat ("what have I spent?"). The ledger and
    all cost queries are unchanged; the full page lives on
    parked/post-clickmax pending the 30-day earn-back review (PARKED.md). */
export default function CostsRedirect() {
  redirect("/");
}

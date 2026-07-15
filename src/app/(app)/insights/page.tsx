import { redirect } from "next/navigation";

/** UI v2 cutover (Phase 7, D-12): insights live in each project's Feed;
    judge calibration moved to Settings. */
export default function InsightsRedirect() {
  redirect("/");
}

import { redirect } from "next/navigation";

/** ClickMax transition decision 4 (Phase 3): the Intel dashboard is parked.
    The video-intel worker and `video_intel` table keep running; blueprints
    surface through chat and the learning loop. Full page preserved on
    parked/post-clickmax pending the 30-day earn-back review (PARKED.md). */
export default function IntelRedirect() {
  redirect("/");
}

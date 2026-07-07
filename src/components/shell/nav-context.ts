/**
 * UI v2 navigation context (Phase 6, §5): the two-level IA. Inside a project
 * the tabs are Library · Autopilot · Feed · Settings; globally they are
 * Home · Spend · Settings (+ Styleguide on desktop, D-13). Insights and
 * Intel leave primary navigation (D-8/D-12) — they live in the Feed and as
 * summonable tools.
 */
import {
  Bot,
  LayoutDashboard,
  ListVideo,
  Newspaper,
  Palette,
  Settings,
  Wallet,
} from "lucide-react";

export const isUiV2Client = () => process.env.NEXT_PUBLIC_UI_V2 === "1";

/** /projects/{uuid}… → the project id (null for /projects/new and others). */
export function projectIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/projects\/([0-9a-f-]{36})(\/|$)/);
  return m ? m[1] : null;
}

export type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Extra path fragments that count as active (e.g. the Canvas → Library). */
  activeAlso?: string[];
};

export function globalNavV2(): NavItem[] {
  return [
    { label: "Home", href: "/", icon: LayoutDashboard },
    { label: "Spend", href: "/costs", icon: Wallet },
    { label: "Styleguide", href: "/styleguide", icon: Palette },
    { label: "Settings", href: "/settings", icon: Settings },
  ];
}

export function projectNavV2(projectId: string): NavItem[] {
  const base = `/projects/${projectId}`;
  return [
    // The Asset Canvas (…/videos/…) is the Library's detail view.
    { label: "Library", href: `${base}/library`, icon: ListVideo, activeAlso: [`${base}/videos/`] },
    { label: "Autopilot", href: `${base}/autopilot`, icon: Bot },
    { label: "Feed", href: `${base}/feed`, icon: Newspaper },
    { label: "Settings", href: `${base}/settings`, icon: Settings },
  ];
}

export function navIsActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  return (
    pathname.startsWith(item.href) ||
    (item.activeAlso ?? []).some((frag) => pathname.startsWith(frag) || pathname.includes(frag))
  );
}

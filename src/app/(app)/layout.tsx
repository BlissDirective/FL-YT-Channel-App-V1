import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/sora";
import { TopNav } from "@/components/shell/top-nav";
import { MobileNav } from "@/components/shell/mobile-nav";

/**
 * App shell — the authenticated control-panel chrome (top nav, mobile nav,
 * cinema-dark studio surface). Lives in the (app) route group so the public
 * (marketing) route group can render full-bleed without any app chrome. Route
 * groups don't change URLs, so every app path is unchanged.
 *
 * Loads the two display faces (Space Grotesk / Sora) the hero uses, so
 * headings match end to end (#8 redesign), and mounts a fixed aurora
 * atmosphere behind the panel for depth.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="app-aurora" aria-hidden />
      {/* Top safe-area inset keeps the header clear of the mobile status
          bar / notch when installed as a PWA or viewed in a browser whose
          chrome overlays the viewport. */}
      <div className="relative z-10 mx-auto min-h-screen max-w-[1440px] p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5">
        <div className="min-h-[calc(100vh-2.5rem)] rounded-panel border border-line bg-surface/80 shadow-float backdrop-blur-xl">
          <TopNav />
          {/* Bottom padding below `sm` keeps content clear of the tab bar. */}
          <main className="px-4 pb-24 sm:px-8 sm:pb-8">{children}</main>
        </div>
      </div>
      <MobileNav />
    </>
  );
}

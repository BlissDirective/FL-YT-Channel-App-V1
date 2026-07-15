import { TopNav } from "@/components/shell/top-nav";
import { MobileNav } from "@/components/shell/mobile-nav";

/**
 * App shell — the authenticated control-panel chrome (top nav, mobile nav,
 * warm rounded surface). Lives in the (app) route group so the public
 * (marketing) route group can render full-bleed without any app chrome. Route
 * groups don't change URLs, so every app path is unchanged.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* Top safe-area inset keeps the header clear of the mobile status
          bar / notch when installed as a PWA or viewed in a browser whose
          chrome overlays the viewport. */}
      <div className="mx-auto min-h-screen max-w-[1440px] p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5">
        <div className="min-h-[calc(100vh-2.5rem)] rounded-panel bg-surface shadow-card">
          <TopNav />
          {/* Bottom padding below `sm` keeps content clear of the tab bar. */}
          <main className="px-4 pb-24 sm:px-8 sm:pb-8">{children}</main>
        </div>
      </div>
      <MobileNav />
    </>
  );
}

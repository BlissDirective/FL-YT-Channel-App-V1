import type { Metadata } from "next";
import { LegalShell, H2 } from "../legal-shell";

export const dynamic = "force-static";
export const metadata: Metadata = { title: "Terms — Faceless Studio" };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Use (Pre-launch)" updated="July 2026">
      <p>
        These terms cover your use of this pre-launch website and the launch
        waitlist. They will be replaced by full product terms before the service
        becomes available.
      </p>

      <H2>The waitlist</H2>
      <p>
        Joining the list registers your interest and lets us contact you about
        the launch. It is not a purchase, a subscription, or a guarantee of
        access, pricing, features, or a launch date. Any pricing or founding-
        operator offers mentioned are indicative and may change.
      </p>

      <H2>Acceptable use</H2>
      <p>
        Please submit only your own email address and don&apos;t attempt to
        disrupt, probe, or overload the site. We may remove entries that appear
        automated or abusive.
      </p>

      <H2>No warranty</H2>
      <p>
        This site is provided &quot;as is&quot; during pre-launch, without
        warranties of any kind. Demonstrations shown are illustrative of intended
        functionality.
      </p>

      <H2>Independence</H2>
      <p>
        Faceless Studio is an independent product and is not affiliated with,
        endorsed by, or sponsored by YouTube, Google, or any other platform named
        on this site. See our{" "}
        <a href="/legal/disclaimer" className="underline hover:text-[var(--m-ink)]">
          disclaimer
        </a>
        .
      </p>

      <H2>Changes</H2>
      <p>
        We may update these terms as we approach launch. Material changes will be
        reflected by the &quot;last updated&quot; date above.
      </p>

      <H2>Contact</H2>
      <p>
        <span className="text-[var(--m-ink)]">hello@faceless.studio</span>{" "}
        (placeholder — to be confirmed before launch).
      </p>
    </LegalShell>
  );
}

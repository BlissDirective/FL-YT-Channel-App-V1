import type { Metadata } from "next";
import { LegalShell, H2 } from "../legal-shell";

export const dynamic = "force-static";
export const metadata: Metadata = { title: "Disclaimer — Faceless Studio" };

export default function DisclaimerPage() {
  return (
    <LegalShell title="Disclaimer" updated="July 2026">
      <H2>Not affiliated with YouTube or Google</H2>
      <p>
        Faceless Studio is an independent product. It is{" "}
        <span className="text-[var(--m-ink)]">
          not affiliated with, endorsed by, sponsored by, or in any way officially
          connected to YouTube, Google, or any of their subsidiaries or
          affiliates
        </span>
        . &quot;YouTube&quot; and other product and company names mentioned are the
        trademarks of their respective owners and are used for identification and
        reference only.
      </p>

      <H2>Your channel, your responsibility</H2>
      <p>
        Any videos you produce and publish remain your responsibility and are
        posted under your own account. You are responsible for complying with the
        terms, policies, and community guidelines of any platform you upload to,
        including content, disclosure, and monetization rules.
      </p>

      <H2>No results guaranteed</H2>
      <p>
        Nothing on this site is a promise of views, subscribers, revenue, or any
        specific outcome. Illustrative numbers and demonstrations describe how the
        tool is intended to work, not a guaranteed result.
      </p>
    </LegalShell>
  );
}

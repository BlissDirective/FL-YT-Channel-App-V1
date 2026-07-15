import type { Metadata } from "next";
import { LegalShell, H2 } from "../legal-shell";

export const dynamic = "force-static";
export const metadata: Metadata = { title: "Privacy Policy — Faceless Studio" };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="July 2026">
      <p>
        This policy explains what we collect when you join the Faceless Studio
        launch list and how we use it. We aim to collect the minimum needed to
        run a pre-launch waitlist.
      </p>

      <H2>What we collect</H2>
      <p>
        When you join the list we store the email address you provide, the page
        or campaign you came from (referrer and UTM parameters, if any), and the
        time you joined. We do not ask for a name, payment details, or any
        special-category data at this stage.
      </p>

      <H2>Why we collect it</H2>
      <p>
        To notify you about the launch, send a small number of build-log updates,
        and understand which channels bring interested operators. We rely on your
        consent, given when you submit the form, as the legal basis for this
        processing.
      </p>

      <H2>Who we share it with</H2>
      <p>
        We store the list with our infrastructure providers (our database and
        hosting vendors) acting as processors on our behalf. We do not sell your
        data. If we later use an email delivery provider to send confirmations,
        we will update this policy to name it.
      </p>

      <H2>Retention</H2>
      <p>
        We keep your email until you ask us to remove it or until the launch list
        is no longer needed, whichever comes first.
      </p>

      <H2>Your rights</H2>
      <p>
        Depending on where you live (for example, under GDPR or CCPA), you may
        have the right to access, correct, delete, or export your data, and to
        withdraw consent at any time. To exercise any of these, email us at the
        address below and we will action it.
      </p>

      <H2>Contact</H2>
      <p>
        Questions or requests: <span className="text-[var(--m-ink)]">privacy@faceless.studio</span>{" "}
        (placeholder — to be confirmed before launch).
      </p>
    </LegalShell>
  );
}

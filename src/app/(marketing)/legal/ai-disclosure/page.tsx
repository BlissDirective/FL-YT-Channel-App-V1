import type { Metadata } from "next";
import { LegalShell, H2 } from "../legal-shell";

export const dynamic = "force-static";
export const metadata: Metadata = { title: "AI Disclosure — Faceless Studio" };

export default function AiDisclosurePage() {
  return (
    <LegalShell title="AI Content Disclosure" updated="July 2026">
      <p>
        Faceless Studio uses AI systems to help research, script, voice, and
        render videos. We believe in being upfront about that — with you and with
        your audience.
      </p>

      <H2>Synthetic media labeling</H2>
      <p>
        Some platforms (including YouTube) require creators to disclose realistic
        content that is generated or meaningfully altered by AI. The publishing
        tools are designed to make setting that disclosure straightforward, with
        the AI-content flag defaulted on. You remain responsible for applying the
        correct disclosure for your content on each platform.
      </p>

      <H2>Human control</H2>
      <p>
        AI does the labor; a human keeps the veto. Quality gates, a vision judge,
        and an editable, versioned timeline mean you can review and override what
        the system produces before anything is published.
      </p>

      <H2>Provider terms</H2>
      <p>
        Generation runs on third-party AI providers, each with their own usage
        terms. Your use of generated output should respect those terms and any
        applicable rights of third parties.
      </p>
    </LegalShell>
  );
}

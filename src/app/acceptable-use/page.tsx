import type { Metadata } from "next";
import { CheckSquare } from "lucide-react";
import LegalLayout, { LegalSection, P, Strong } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description: "TradCopilot acceptable use policy — the rules and prohibited conduct that keep our AI trading copilot platform safe and lawful.",
};

export default function AcceptableUsePage() {
  return (
    <LegalLayout title="Acceptable Use Policy" updated="July 12, 2026" icon={<CheckSquare size={24} />}>
      <LegalSection title="1. Lawful Use Only">
        <P>
          You agree to use TradCopilot strictly in compliance with all applicable local, national, and international laws, regulations, and financial guidelines.
        </P>
      </LegalSection>

      <LegalSection title="2. No Market Manipulation">
        <P>
          You may not use the Service, its analytics, or its AI chart evaluation outputs to coordinate or facilitate any form of market manipulation, including pump-and-dump operations, front-running, wash trading, or distributing false information to influence asset prices.
        </P>
      </LegalSection>

      <LegalSection title="3. No Account Sharing">
        <P>
          Your TradCopilot account and Pro Terminal access are for your personal, individual use only. You may not share your login credentials, API session keys, or subscription access with third parties.
        </P>
      </LegalSection>

      <LegalSection title="4. No Automated Trading Bots">
        <P>
          TradCopilot is designed as an interactive copilot for human discretionary traders. <Strong>You are strictly prohibited from parsing or scraping TradCopilot&apos;s API endpoints or AI outputs to power automated algorithmic trading bots, automated order routers, or automated execution scripts.</Strong>
        </P>
      </LegalSection>

      <LegalSection title="5. No Harassment or Abuse">
        <P>
          You may not upload, journal, or transmit any content through the Service that is threatening, abusive, defamatory, harassing, obscene, or promotes discrimination of any kind.
        </P>
      </LegalSection>

      <LegalSection title="6. No Reverse Engineering">
        <P>
          You may not attempt to reverse engineer, decompile, disable, or bypass any security constraints, feature limits, telemetry modules, or subscription access checkpoints built into the TradCopilot application.
        </P>
      </LegalSection>

      <LegalSection title="7. Reporting Violations">
        <P>
          If you identify a violation of this Acceptable Use Policy, please report it immediately to our security compliance team at <Strong>security@tradcopilot.com</Strong> or <Strong>ashok.msc2010@gmail.com</Strong>.
        </P>
      </LegalSection>
    </LegalLayout>
  );
}
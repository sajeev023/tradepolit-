import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import LegalLayout, { LegalSection, P, Strong } from "@/components/legal/LegalLayout";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "How TradCopilot collects, uses, and protects your personal data: trading journal content, third-party processors, retention, and deletion rights.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="July 12, 2026" icon={<Shield size={24} />}>
      <LegalSection title="1. Information We Collect">
        <P>
          We collect information to provide and improve our services. This includes:
        </P>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><Strong>Account Information:</Strong> Name, email address, password, and profile preferences.</li>
          <li><Strong>Trading Data:</Strong> Trade entries (symbols, sizes, entry/exit prices, timestamps, execution types).</li>
          <li><Strong>Journal Content:</Strong> Text logs, mood indicators, lessons learned, and chart screenshot metadata.</li>
          <li><Strong>Behavioral Data:</Strong> Patterns compiled by our telemetry engine (e.g., trade frequency, gap times between trades to detect overtrading or revenge trading).</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How We Use Your Data">
        <P>
          We use the collected data for the following purposes:
        </P>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>To provide and maintain the Service (generating performance analytics, displaying interactive charts).</li>
          <li>To power the AI Copilot Chat, providing contextually relevant behavioral insights using your history.</li>
          <li>To run telemetry algorithms that notify you of potential overtrading or revenge-trading states.</li>
          <li>To compile aggregate, anonymized technical metrics to improve our AI model prompts and latency.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Data Storage & Security">
        <P>
          Your data is stored securely using production-grade cloud databases (Supabase / PostgreSQL) protected by SSL encryption in transit and AES-256 encryption at rest. Any external API credentials or session state data you store in Settings are encrypted using secure environmental keys. We retain your data as long as your account remains active.
        </P>
      </LegalSection>

      <LegalSection title="4. Third-Party Services">
        <P>
          We integrate with secure third-party services to fulfill critical platform needs:
        </P>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><Strong>Inference API Providers:</Strong> Groq, NVIDIA, and Google Gemini to execute the model racing chat and weekly telemetry reports.</li>
          <li><Strong>Market Data Feed:</Strong> Binance Spot WebSocket feed to stream real-time price updates.</li>
          <li><Strong>Authentication:</Strong> Google OAuth / Supabase Auth to enable secure logins.</li>
          <li><Strong>Payment Handling:</Strong> Stripe, Razorpay, or Gumroad for processing Pro Terminal purchases.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Cookies & Tracking">
        <P>
          We use essential and functional cookies to maintain your login session, persist page state, and save your theme selection. We do NOT use any marketing trackers, cross-site trackers, or advertising cookie scripts.
        </P>
      </LegalSection>

      <LegalSection title="6. Data Sharing">
        <P>
          <Strong>We do NOT sell, rent, or trade your personal or trading history data to third-party advertising companies or brokers.</Strong> Data is only shared with database hosters and inference providers as required to execute standard platform calculations.
        </P>
      </LegalSection>

      <LegalSection title="7. Your Rights (GDPR / CCPA)">
        <P>
          You retain full ownership rights over your personal data. You have the right to request access to your trading history, export your logs, update your account information, or request permanent deletion of your account and all associated metrics from our database. Data deletion requests can be triggered directly in Settings or by contacting support.
        </P>
      </LegalSection>

      <LegalSection title="8. Children's Privacy">
        <P>
          The Service is not intended for use by children. We do not knowingly collect personal information from individuals under the age of 13. If we discover that a user under 13 has registered, we will delete their account details immediately in compliance with COPPA rules.
        </P>
      </LegalSection>

      <LegalSection title="9. International Data Transfers">
        <P>
          By accessing TradCopilot, you acknowledge that your data may be processed in region-locked cloud environments outside of your home country (including servers hosted in the US, India, or Singapore). We ensure all database providers implement proper data privacy safeguards.
        </P>
      </LegalSection>

      <LegalSection title="10. Contact Information">
        <P>
          For data access requests or questions about this Privacy Policy, please contact our privacy compliance lead at <Strong>support@tradcopilot.com</Strong> or <Strong>ashok.msc2010@gmail.com</Strong>.
        </P>
      </LegalSection>
    </LegalLayout>
  );
}
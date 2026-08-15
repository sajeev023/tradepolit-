import type { Metadata } from "next";
import { FileText } from "lucide-react";
import LegalLayout, { LegalSection, P, Strong } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "TradCopilot terms of service — the rules and guidelines for using our AI-powered trading copilot platform.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="July 12, 2026" icon={<FileText size={24} />}>
      <LegalSection title="1. Acceptance of Terms">
        <P>
          By accessing or using TradCopilot (the &quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must immediately cease using the platform.
        </P>
      </LegalSection>

      <LegalSection title="2. Description of Service">
        <P>
          TradCopilot is an AI-powered trading copilot and performance analysis platform offering trading journals, performance calculators, backtesting engines, and behavioral review tools. <Strong>TradCopilot is NOT a financial broker, does NOT execute trades, does NOT manage client funds, and does NOT provide direct financial or investment advice.</Strong> All calculations, alerts, and AI insights are for educational and analytical purposes only.
        </P>
      </LegalSection>

      <LegalSection title="3. User Accounts">
        <P>
          To access certain features of the Service, you must register for an account. You must be at least 13 years of age to register. You agree to provide accurate, complete, and current information, and to maintain the security and confidentiality of your credentials. You are solely responsible for all activities occurring under your account.
        </P>
      </LegalSection>

      <LegalSection title="4. Free vs Pro Plans">
        <P>
          We offer both Free and paid Pro Terminal plans. The Free plan includes basic journaling and limited features. The Pro Terminal plan unlocks advanced analytics, unlimited AI chart analyses, weekly behavioral reports, and real-time overtrading alerts. We reserve the right to modify the features and limitations of either plan at any time.
        </P>
      </LegalSection>

      <LegalSection title="5. Payment Terms">
        <P>
          Paid subscription services are processed securely via third-party providers (such as Stripe, Razorpay, or Gumroad). Subscriptions are billed on a recurring monthly or annual basis. You may cancel your subscription at any time. Upon cancellation, you will continue to have access to the Pro Terminal features until the end of your current billing period.
        </P>
      </LegalSection>

      <LegalSection title="6. Intellectual Property">
        <P>
          All proprietary content, source code, logo, brand assets, design systems, algorithms, graphics, and software constituting the TradCopilot application are owned by TradCopilot and are protected by copyright, trademark, and intellectual property laws.
        </P>
      </LegalSection>

      <LegalSection title="7. User-Generated Content">
        <P>
          You retain ownership of any data, journal logs, notes, or screenshot configurations you input into the Service (&quot;User Content&quot;). By submitting User Content, you grant TradCopilot a worldwide, non-exclusive, royalty-free license to store, process, host, and retrieve the data to provide the Service to you.
        </P>
      </LegalSection>

      <LegalSection title="8. Prohibited Conduct">
        <P>
          You agree not to engage in any prohibited activities, including but not limited to: reverse engineering the application or its AI triggers, automated scraping of market feeds, account sharing, executing automated bots using our API endpoints, and using the service for market manipulation or illegal actions.
        </P>
      </LegalSection>

      <LegalSection title="9. Limitation of Liability">
        <P>
          Trading financial markets involves substantial risk of loss. To the maximum extent permitted by law, TradCopilot, its founders, and affiliates shall not be liable for any trading losses, financial damages, loss of profits, data errors, or system downtime resulting from your use of the platform.
        </P>
      </LegalSection>

      <LegalSection title="10. Disclaimer of Warranties">
        <P>
          The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
        </P>
      </LegalSection>

      <LegalSection title="11. Termination">
        <P>
          We reserve the right to suspend or terminate your account and access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users or the business.
        </P>
      </LegalSection>

      <LegalSection title="12. Governing Law">
        <P>
          These Terms of Service shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any legal action arising under these terms shall be subject to the exclusive jurisdiction of the courts located in Karnataka, India.
        </P>
      </LegalSection>

      <LegalSection title="13. Changes to Terms">
        <P>
          We may update these Terms of Service from time to time. We will notify you of any material changes by posting the updated terms on this page and updating the &quot;Last updated&quot; date.
        </P>
      </LegalSection>

      <LegalSection title="14. Contact Information">
        <P>
          If you have any questions about these Terms, please contact us at <Strong>support@tradcopilot.com</Strong> or <Strong>ashok.msc2010@gmail.com</Strong>.
        </P>
      </LegalSection>
    </LegalLayout>
  );
}
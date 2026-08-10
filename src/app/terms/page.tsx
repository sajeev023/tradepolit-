import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "TradCopilot terms of service — the rules and guidelines for using our AI-powered trading copilot platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen py-16 px-6 max-w-3xl mx-auto flex flex-col justify-between" style={{ backgroundColor: "var(--color-bg-primary)" }}>
      <div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold mb-8 text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div className="flex items-center gap-2 mb-6 text-cyan-400">
          <FileText size={24} />
          <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
        </div>

        <p className="text-xs mb-8 text-zinc-500">Last updated: July 12, 2026</p>

        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using TradCopilot (the &quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must immediately cease using the platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">2. Description of Service</h2>
            <p>
              TradCopilot is an AI-powered trading copilot and performance analysis platform offering trading journals, performance calculators, backtesting engines, and behavioral review tools. **TradCopilot is NOT a financial broker, does NOT execute trades, does NOT manage client funds, and does NOT provide direct financial or investment advice.** All calculations, alerts, and AI insights are for educational and analytical purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">3. User Accounts</h2>
            <p>
              To access certain features of the Service, you must register for an account. You must be at least 13 years of age to register. You agree to provide accurate, complete, and current information, and to maintain the security and confidentiality of your credentials. You are solely responsible for all activities occurring under your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">4. Free vs Pro Plans</h2>
            <p>
              We offer both Free and paid Pro Terminal plans. The Free plan includes basic journaling and limited features. The Pro Terminal plan unlocks advanced analytics, unlimited AI chart analyses, weekly behavioral reports, and real-time overtrading alerts. We reserve the right to modify the features and limitations of either plan at any time.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">5. Payment Terms</h2>
            <p>
              Paid subscription services are processed securely via third-party providers (such as Stripe, Razorpay, or Gumroad). Subscriptions are billed on a recurring monthly or annual basis. You may cancel your subscription at any time. Upon cancellation, you will continue to have access to the Pro Terminal features until the end of your current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">6. Intellectual Property</h2>
            <p>
              All proprietary content, source code, logo, brand assets, design systems, algorithms, graphics, and software constituting the TradCopilot application are owned by TradCopilot and are protected by copyright, trademark, and intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">7. User-Generated Content</h2>
            <p>
              You retain ownership of any data, journal logs, notes, or screenshot configurations you input into the Service (&quot;User Content&quot;). By submitting User Content, you grant TradCopilot a worldwide, non-exclusive, royalty-free license to store, process, host, and retrieve the data to provide the Service to you.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">8. Prohibited Conduct</h2>
            <p>
              You agree not to engage in any prohibited activities, including but not limited to: reverse engineering the application or its AI triggers, automated scraping of market feeds, account sharing, executing automated bots using our API endpoints, and using the service for market manipulation or illegal actions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">9. Limitation of Liability</h2>
            <p>
              Trading financial markets involves substantial risk of loss. To the maximum extent permitted by law, TradCopilot, its founders, and affiliates shall not be liable for any trading losses, financial damages, loss of profits, data errors, or system downtime resulting from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">10. Disclaimer of Warranties</h2>
            <p>
              The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">11. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account and access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users or the business.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">12. Governing Law</h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any legal action arising under these terms shall be subject to the exclusive jurisdiction of the courts located in Karnataka, India.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">13. Changes to Terms</h2>
            <p>
              We may update these Terms of Service from time to time. We will notify you of any material changes by posting the updated terms on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">14. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at **support@tradcopilot.com** or **ashok.msc2010@gmail.com**.
            </p>
          </section>
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t border-zinc-800 text-[11px] text-zinc-500 text-center">
        © 2026 TradCopilot. Educational and analytical services only.
      </footer>
    </div>
  );
}

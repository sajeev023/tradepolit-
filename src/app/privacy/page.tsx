import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "TradePilot privacy policy — how we collect, use, and protect your personal data when you use our AI trading copilot.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-16 px-6 max-w-3xl mx-auto flex flex-col justify-between" style={{ backgroundColor: "var(--color-bg-primary)" }}>
      <div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold mb-8 text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div className="flex items-center gap-2 mb-6 text-teal-400">
          <Shield size={24} />
          <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
        </div>

        <p className="text-xs mb-8 text-zinc-500">Last updated: July 12, 2026</p>

        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">1. Information We Collect</h2>
            <p>
              We collect information to provide and improve our services. This includes:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>**Account Information:** Name, email address, password, and profile preferences.</li>
              <li>**Trading Data:** Trade entries (symbols, sizes, entry/exit prices, timestamps, execution types).</li>
              <li>**Journal Content:** Text logs, mood indicators, lessons learned, and chart screenshot metadata.</li>
              <li>**Behavioral Data:** Patterns compiled by our telemetry engine (e.g., trade frequency, gap times between trades to detect overtrading or revenge trading).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">2. How We Use Your Data</h2>
            <p>
              We use the collected data for the following purposes:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>To provide and maintain the Service (generating performance analytics, displaying interactive charts).</li>
              <li>To power the AI Copilot Chat, providing contextually relevant behavioral insights using your history.</li>
              <li>To run telemetry algorithms that notify you of potential overtrading or revenge-trading states.</li>
              <li>To compile aggregate, anonymized technical metrics to improve our AI model prompts and latency.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">3. Data Storage & Security</h2>
            <p>
              Your data is stored securely using production-grade cloud databases (Supabase / PostgreSQL) protected by SSL encryption in transit and AES-256 encryption at rest. Any external API credentials or session state data you store in Settings are encrypted using secure environmental keys. We retain your data as long as your account remains active.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">4. Third-Party Services</h2>
            <p>
              We integrate with secure third-party services to fulfill critical platform needs:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>**Inference API Providers:** Groq, NVIDIA, and Google Gemini to execute the model racing chat and weekly telemetry reports.</li>
              <li>**Market Data Feed:** Binance Spot WebSocket feed to stream real-time price updates.</li>
              <li>**Authentication:** Google OAuth / Supabase Auth to enable secure logins.</li>
              <li>**Payment Handling:** Stripe, Razorpay, or Gumroad for processing Pro Terminal purchases.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">5. Cookies & Tracking</h2>
            <p>
              We use essential and functional cookies to maintain your login session, persist page state, and save your theme selection. We do NOT use any marketing trackers, cross-site trackers, or advertising cookie scripts.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">6. Data Sharing</h2>
            <p>
              **We do NOT sell, rent, or trade your personal or trading history data to third-party advertising companies or brokers.** Data is only shared with database hosters and inference providers as required to execute standard platform calculations.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">7. Your Rights (GDPR / CCPA)</h2>
            <p>
              You retain full ownership rights over your personal data. You have the right to request access to your trading history, export your logs, update your account information, or request permanent deletion of your account and all associated metrics from our database. Data deletion requests can be triggered directly in Settings or by contacting support.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">8. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for use by children. We do not knowingly collect personal information from individuals under the age of 13. If we discover that a user under 13 has registered, we will delete their account details immediately in compliance with COPPA rules.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">9. International Data Transfers</h2>
            <p>
              By accessing TradePilot, you acknowledge that your data may be processed in region-locked cloud environments outside of your home country (including servers hosted in the US, India, or Singapore). We ensure all database providers implement proper data privacy safeguards.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">10. Contact Information</h2>
            <p>
              For data access requests or questions about this Privacy Policy, please contact our privacy compliance lead at **support@tradepilot.com** or **ashok.msc2010@gmail.com**.
            </p>
          </section>
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t border-zinc-800 text-[11px] text-zinc-500 text-center">
        © 2026 TradePilot. Educational and analytical services only.
      </footer>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Landmark } from "lucide-react";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "TradCopilot refund policy — 7-day money-back guarantee on Pro plan subscriptions. Terms and conditions for refunds and cancellations.",
};

export default function RefundPage() {
  return (
    <div className="min-h-screen py-16 px-6 max-w-3xl mx-auto flex flex-col justify-between" style={{ backgroundColor: "var(--color-bg-primary)" }}>
      <div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold mb-8 text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div className="flex items-center gap-2 mb-6 text-teal-400">
          <Landmark size={24} />
          <h1 className="text-2xl font-bold text-white">Refund Policy</h1>
        </div>

        <p className="text-xs mb-8 text-zinc-500">Last updated: July 12, 2026</p>

        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">1. Subscription Billing</h2>
            <p>
              TradCopilot Pro Terminal subscriptions are billed on a recurring monthly or annual basis depending on the plan selected during checkout. Charges are processed automatically via our secure payment partners (Stripe, Razorpay, or Gumroad).
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">2. Cancellation Policy</h2>
            <p>
              You may cancel your subscription at any time by navigating to Settings → Subscription in your dashboard or by emailing our support team. Upon cancellation, you will retain full access to all Pro features until the end of your current active billing cycle. We do not offer partial refunds or prorated credits for unused periods.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">3. Refund Eligibility</h2>
            <p>
              We stand by our product and offer a **7-day money-back guarantee** for first-time subscribers. If you are not satisfied with the TradCopilot Pro Terminal, you can request a full refund within 7 calendar days of your initial purchase date.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">4. How to Request a Refund</h2>
            <p>
              To request a refund, please send an email to **support@tradcopilot.com** or **ashok.msc2010@gmail.com** with the subject line &quot;Refund Request&quot; and include the following:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your account email address</li>
              <li>Your checkout reference number or invoice ID</li>
              <li>A brief explanation of why you are requesting the refund (your feedback helps us improve the service)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">5. Processing Time</h2>
            <p>
              Once a refund request is approved, we will initiate a credit immediately back to your original payment method. The refund will typically appear in your account within 5 to 10 business days, depending on your card issuer or banking institution.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">6. Exceptions</h2>
            <p>
              Refunds are subject to the following limitations:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>No refunds will be granted after the initial 7-day trial window has passed.</li>
              <li>The refund guarantee only applies to your first billing cycle. Subsequent monthly or annual renewals are not eligible for refunds.</li>
              <li>Accounts that have been suspended or terminated for violating our Terms of Service or Acceptable Use Policy are not eligible for refunds.</li>
            </ul>
          </section>
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t border-zinc-800 text-[11px] text-zinc-500 text-center">
        © 2026 TradCopilot. Educational and analytical services only.
      </footer>
    </div>
  );
}

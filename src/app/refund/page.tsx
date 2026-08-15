import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import LegalLayout, { LegalSection, P, Strong } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "TradCopilot refund policy — 7-day money-back guarantee on Pro plan subscriptions. Terms and conditions for refunds and cancellations.",
};

export default function RefundPage() {
  return (
    <LegalLayout title="Refund Policy" updated="July 12, 2026" icon={<Landmark size={24} />}>
      <LegalSection title="1. Subscription Billing">
        <P>
          TradCopilot Pro Terminal subscriptions are billed on a recurring monthly or annual basis depending on the plan selected during checkout. Charges are processed automatically via our secure payment partners (Stripe, Razorpay, or Gumroad).
        </P>
      </LegalSection>

      <LegalSection title="2. Cancellation Policy">
        <P>
          You may cancel your subscription at any time by navigating to Settings → Subscription in your dashboard or by emailing our support team. Upon cancellation, you will retain full access to all Pro features until the end of your current active billing cycle. We do not offer partial refunds or prorated credits for unused periods.
        </P>
      </LegalSection>

      <LegalSection title="3. Refund Eligibility">
        <P>
          We stand by our product and offer a <Strong>7-day money-back guarantee</Strong> for first-time subscribers. If you are not satisfied with the TradCopilot Pro Terminal, you can request a full refund within 7 calendar days of your initial purchase date.
        </P>
      </LegalSection>

      <LegalSection title="4. How to Request a Refund">
        <P>
          To request a refund, please send an email to <Strong>support@tradcopilot.com</Strong> or <Strong>ashok.msc2010@gmail.com</Strong> with the subject line &quot;Refund Request&quot; and include the following:
        </P>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Your account email address</li>
          <li>Your checkout reference number or invoice ID</li>
          <li>A brief explanation of why you are requesting the refund (your feedback helps us improve the service)</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Processing Time">
        <P>
          Once a refund request is approved, we will initiate a credit immediately back to your original payment method. The refund will typically appear in your account within 5 to 10 business days, depending on your card issuer or banking institution.
        </P>
      </LegalSection>

      <LegalSection title="6. Exceptions">
        <P>
          Refunds are subject to the following limitations:
        </P>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>No refunds will be granted after the initial 7-day trial window has passed.</li>
          <li>The refund guarantee only applies to your first billing cycle. Subsequent monthly or annual renewals are not eligible for refunds.</li>
          <li>Accounts that have been suspended or terminated for violating our Terms of Service or Acceptable Use Policy are not eligible for refunds.</li>
        </ul>
      </LegalSection>
    </LegalLayout>
  );
}
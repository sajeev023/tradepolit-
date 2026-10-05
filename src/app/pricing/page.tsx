import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Mark } from "@/components/shell/mark";
import { BRAND } from "@/lib/brand";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Pricing — Free Plan & $7.49/mo Pro Terminal",
  description:
    "Start free with 5 AI analyses per day, no card required. Upgrade to Pro at $7.49/month for unlimited analyses and alerts, performance analytics, and weekly reports. 7-day trial.",
  path: "/pricing",
  keywords: [
    "tradcopilot pricing",
    "ai trading tool cost",
    "crypto analysis tool pricing",
    "forex analysis subscription",
  ],
});

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <JsonLd data={[breadcrumbJsonLd([{ name: "Pricing", path: "/pricing" }])]} />
      <nav className="h-12 sm:h-14 glass sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 lg:px-10 select-none border-b border-[var(--color-border-subtle)]">
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0" aria-label={`${BRAND.name} home`}>
          <Mark size={28} />
          <span className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">{BRAND.name}</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/" className="btn-ghost text-[13px] gap-1.5">
            <ArrowLeft size={14} />
            Back to Home
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-16 lg:py-24">
        <div className="text-center space-y-2 sm:space-y-3 mb-6 sm:mb-12 lg:mb-16 animate-enter">
          <span className="tp-eyebrow-mono">Pricing</span>
          <h1 className="font-serif text-[clamp(2.6rem,1.8rem+3vw,4.2rem)] font-normal leading-[1] tracking-[-0.02em] text-[var(--color-text-primary)]">
            Start free. Pay when it <em className="text-[var(--accent)]">pays off.</em>
          </h1>
          <p className="text-[14px] sm:text-[16px] text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
            Free forever for the essentials. Upgrade when you want unlimited analysis and the full discipline toolkit. Cancel anytime.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {[1, 2].map((i) => (
                <div key={i} className="card p-7 space-y-5 animate-pulse">
                  <div className="h-4 w-24 bg-[var(--color-bg-tertiary)] rounded" />
                  <div className="h-10 w-20 bg-[var(--color-bg-tertiary)] rounded" />
                  <div className="h-10 w-full bg-[var(--color-bg-tertiary)] rounded" />
                  <div className="h-px bg-[var(--color-border-subtle)]" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="h-4 w-full bg-[var(--color-bg-tertiary)] rounded" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <PricingCards />
        </Suspense>

        <p className="text-center text-[12px] text-[var(--color-text-quaternary)] mt-10">
          USD pricing · Cancel anytime · 7-day money-back guarantee. Questions? See the{" "}
          <Link href="/faq" className="underline underline-offset-2 hover:text-[var(--color-text-secondary)]">
            FAQ
          </Link>{" "}
          or read our{" "}
          <Link href="/refund" className="underline underline-offset-2 hover:text-[var(--color-text-secondary)]">
            refund policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

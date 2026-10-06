import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-y border-[var(--hairline)] bg-[var(--panel-1)]">
      {/* the horizon line again — the page ends where it began */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(var(--accent-rgb),0.7) 30%, rgba(var(--accent-rgb),0.7) 70%, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[240px] w-[min(760px,90%)] -translate-x-1/2 rounded-full opacity-[0.1] blur-[90px]"
        style={{ background: "var(--accent)" }}
      />
      <div className="relative mx-auto max-w-[860px] px-5 py-16 text-center sm:py-24 lg:py-28">
        <Reveal blur className="flex flex-col items-center">
          <span className="tp-eyebrow-mono">Clear for takeoff</span>
          <h2 className="mt-4 font-serif text-[clamp(38px,8vw,76px)] leading-[0.98] tracking-[-0.025em] text-[var(--ink)]">
            Trade with a <em className="text-[var(--accent)]">memory.</em>
          </h2>
          <p className="tp-body mt-5 max-w-[460px]">
            Free to start, no credit card. Keep your broker and charting platform — TradePilot sits beside them, read-only.
          </p>
          <div data-onpage-cta className="mt-8 flex w-full flex-col items-stretch justify-center gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <Link href="/signup" className="btn-primary btn-lg group">
              Get started free
              <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link href="/login" className="btn-secondary btn-lg">
              Sign in
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

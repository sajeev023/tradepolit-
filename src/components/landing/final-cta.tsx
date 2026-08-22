import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

export function FinalCta() {
  return (
    <section className="tc-band-alt">
      <div className="tc-section tc-section--narrow !py-8 sm:!py-14 lg:!py-20 text-center relative">
        <div className="tc-aurora" aria-hidden="true" />
        <Reveal blur className="space-y-3 sm:space-y-5 relative z-10">
          <span className="tp-eyebrow-mono">GET STARTED</span>
          <h2 className="tp-h2 max-w-xl mx-auto">
            Execute with structured discipline
          </h2>
          <p className="tp-body max-w-md mx-auto">
            Free access with zero credit card requirement. Keep using your primary broker and charting platforms alongside it.
          </p>
          <div data-onpage-cta className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 pt-1 sm:pt-2 w-full sm:w-auto">
            <Link
              href="/signup"
              className="group w-full sm:w-auto h-10 sm:h-11 px-5 sm:px-6 rounded-md text-[13px] font-semibold inline-flex items-center justify-center gap-2 text-[var(--bg-primary)] transition-transform active:scale-[0.98]"
              style={{ background: "var(--accent)" }}
            >
              <span>Get Started Free</span>
              <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto h-10 sm:h-11 px-5 rounded-md border border-[var(--color-border-strong)] text-[var(--ink)] hover:border-[var(--accent)] text-[13px] font-semibold inline-flex items-center justify-center transition-colors"
            >
              Sign in
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
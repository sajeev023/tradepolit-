import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

export function FinalCta() {
  return (
    <section className="tc-band-alt">
      <div className="tc-section tc-section--narrow text-center">
        <Reveal blur className="space-y-5">
          <span className="tp-eyebrow-mono">Start now</span>
          <h2 className="tp-h2 max-w-xl mx-auto">
            Bring discipline to your <span className="tc-accent-phrase">next trade.</span>
          </h2>
          <p className="tp-body max-w-md mx-auto">
            Two free AI scans. No credit card required. Keep using your existing charting platform alongside it.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/signup"
              className="group h-12 px-6 rounded-xl text-[14px] font-bold inline-flex items-center justify-center gap-2 text-[var(--bg-primary)] transition-transform active:scale-[0.98]"
              style={{ background: "var(--accent)" }}
            >
              <span>Start Free — No Card Required</span>
              <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="h-12 px-5 rounded-xl border border-[var(--color-border-strong)] text-[var(--ink)] hover:border-[var(--accent)] text-[13px] font-semibold inline-flex items-center justify-center transition-colors"
            >
              Sign in
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
import Link from "next/link";
import { TrendingUp } from "lucide-react";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border-subtle)] bg-[var(--bg-band)] py-12 text-[var(--muted)] text-xs">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2 text-[var(--ink)] font-semibold text-sm">
              <div
                className="flex items-center justify-center rounded-md w-6 h-6"
                style={{ background: "linear-gradient(135deg, var(--accent-bright), var(--accent))" }}
              >
                <TrendingUp size={13} color="#05070B" strokeWidth={2.5} />
              </div>
              TradCopilot
            </Link>
            <p className="text-[12px] leading-relaxed text-[var(--muted)]">
              Read-only AI trading copilot for crypto and forex market analysis, journaling, and behavioral discipline.
            </p>
          </div>

          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] mb-3 font-semibold">
              Product
            </h4>
            <ul className="space-y-2">
              <li><Link href="/" className="hover:text-[var(--ink)] transition-colors">Overview</Link></li>
              <li><Link href="/features" className="hover:text-[var(--ink)] transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-[var(--ink)] transition-colors">Pricing</Link></li>
              <li><Link href="/changelog" className="hover:text-[var(--ink)] transition-colors">Changelog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] mb-3 font-semibold">
              Analysis & Risk
            </h4>
            <ul className="space-y-2">
              <li><Link href="/ai-chart-analysis" className="hover:text-[var(--ink)] transition-colors">AI Chart Analysis</Link></li>
              <li><Link href="/risk-management" className="hover:text-[var(--ink)] transition-colors">Risk Management</Link></li>
              <li><Link href="/disclaimer" className="hover:text-[var(--ink)] transition-colors">Risk Disclaimer</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] mb-3 font-semibold">
              Legal
            </h4>
            <ul className="space-y-2">
              <li><Link href="/terms" className="hover:text-[var(--ink)] transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-[var(--ink)] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/refund" className="hover:text-[var(--ink)] transition-colors">Refund Policy</Link></li>
              <li><Link href="/acceptable-use" className="hover:text-[var(--ink)] transition-colors">Acceptable Use</Link></li>
              <li><Link href="/cookies" className="hover:text-[var(--ink)] transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>© {year} TradCopilot Inc. All rights reserved. Read-only analytical tool.</p>
          <div className="flex items-center gap-4">
            <Link href="/disclaimer" className="hover:text-[var(--ink)] transition-colors">Disclaimer</Link>
            <Link href="/terms" className="hover:text-[var(--ink)] transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-[var(--ink)] transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { TrendingUp, Mail } from "lucide-react";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border-subtle)] bg-[var(--bg-band)] py-12 text-[var(--muted)] text-xs">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 space-y-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 space-y-3.5 pr-4">
            <Link href="/" className="flex items-center gap-2 text-[var(--ink)] font-semibold text-sm">
              <div
                className="flex items-center justify-center rounded-md w-6 h-6"
                style={{ background: "linear-gradient(135deg, var(--accent-bright), var(--accent))" }}
              >
                <TrendingUp size={13} color="#05070B" strokeWidth={2.5} />
              </div>
              <span>TradCopilot</span>
            </Link>
            <p className="text-[12px] leading-relaxed text-[var(--muted)] max-w-sm">
              Read-only AI trading copilot for crypto and forex day traders: live technical chart analysis, automated session journaling, and behavioral risk guardrails.
            </p>
            <div className="flex items-center gap-3 pt-1 text-[11px] text-[var(--muted)]">
              <a
                href="https://x.com/tradcopilot"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--ink)] transition-colors"
              >
                @tradcopilot
              </a>
              <span>·</span>
              <a
                href="mailto:hello@tradcopilot.com"
                className="hover:text-[var(--ink)] transition-colors inline-flex items-center gap-1"
              >
                <Mail size={12} /> hello@tradcopilot.com
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div className="space-y-3">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] font-semibold">
              Product
            </h4>
            <ul className="space-y-2 text-[12px]">
              <li><Link href="/features" className="hover:text-[var(--ink)] transition-colors">All Features</Link></li>
              <li><Link href="/ai-trading-copilot" className="hover:text-[var(--ink)] transition-colors">What Is an AI Trading Copilot?</Link></li>
              <li><Link href="/ai-chart-analysis" className="hover:text-[var(--ink)] transition-colors">AI Chart Analysis</Link></li>
              <li><Link href="/crypto-market-analysis" className="hover:text-[var(--ink)] transition-colors">Crypto Market Analysis</Link></li>
              <li><Link href="/forex-market-analysis" className="hover:text-[var(--ink)] transition-colors">Forex Market Analysis</Link></li>
              <li><Link href="/trading-journal" className="hover:text-[var(--ink)] transition-colors">Trading Journal</Link></li>
              <li><Link href="/risk-management" className="hover:text-[var(--ink)] transition-colors">Risk Management</Link></li>
              <li><Link href="/trading-alerts" className="hover:text-[var(--ink)] transition-colors">Trading Alerts</Link></li>
              <li><Link href="/pricing" className="hover:text-[var(--ink)] transition-colors">Pricing &amp; Plans</Link></li>
              <li><Link href="/changelog" className="hover:text-[var(--ink)] transition-colors">Changelog</Link></li>
            </ul>
          </div>

          {/* Guides & Comparisons */}
          <div className="space-y-3">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] font-semibold">
              Guides &amp; Compare
            </h4>
            <ul className="space-y-2 text-[12px]">
              <li><Link href="/guides" className="hover:text-[var(--ink)] transition-colors">All Guides</Link></li>
              <li><Link href="/guides/position-sizing-guide" className="hover:text-[var(--ink)] transition-colors">Position Sizing Guide</Link></li>
              <li><Link href="/guides/technical-indicators" className="hover:text-[var(--ink)] transition-colors">Technical Indicators</Link></li>
              <li><Link href="/guides/multi-timeframe-analysis" className="hover:text-[var(--ink)] transition-colors">Multi-Timeframe Analysis</Link></li>
              <li><Link href="/guides/trading-discipline" className="hover:text-[var(--ink)] transition-colors">Trading Discipline</Link></li>
              <li><Link href="/guides/support-and-resistance" className="hover:text-[var(--ink)] transition-colors">Support &amp; Resistance</Link></li>
              <li><Link href="/compare" className="hover:text-[var(--ink)] transition-colors">Compare Tools</Link></li>
              <li><Link href="/compare/tradcopilot-vs-tradingview" className="hover:text-[var(--ink)] transition-colors">vs TradingView</Link></li>
              <li><Link href="/compare/tradcopilot-vs-chatgpt" className="hover:text-[var(--ink)] transition-colors">vs ChatGPT</Link></li>
              <li><Link href="/faq" className="hover:text-[var(--ink)] transition-colors">Knowledge Base FAQ</Link></li>
              <li><Link href="/about" className="hover:text-[var(--ink)] transition-colors">About &amp; Mission</Link></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="space-y-3">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] font-semibold">
              Legal &amp; Trust
            </h4>
            <ul className="space-y-2 text-[12px]">
              <li><Link href="/disclaimer" className="hover:text-[var(--ink)] transition-colors font-medium text-[var(--ink)]">Risk Disclaimer</Link></li>
              <li><Link href="/terms" className="hover:text-[var(--ink)] transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-[var(--ink)] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/refund" className="hover:text-[var(--ink)] transition-colors">Refund Policy</Link></li>
              <li><Link href="/acceptable-use" className="hover:text-[var(--ink)] transition-colors">Acceptable Use</Link></li>
              <li><Link href="/cookies" className="hover:text-[var(--ink)] transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-6 border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>© {year} TradCopilot Inc. All rights reserved. Read-only analytical terminal. Not financial advice.</p>
          <div className="flex items-center gap-4">
            <LanguageSwitcher variant="footer" />
            <Link href="/disclaimer" className="hover:text-[var(--ink)] transition-colors">Disclaimer</Link>
            <Link href="/terms" className="hover:text-[var(--ink)] transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-[var(--ink)] transition-colors">Privacy</Link>
            <Link href="/login" className="hover:text-[var(--accent)] font-medium transition-colors">Terminal Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

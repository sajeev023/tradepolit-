import Link from "next/link";
import { Mail } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   Footer (v2) — real contact, legal links, read-only disclaimer, and the
   revision stamp (2.5) bottom-right. All routes preserved verbatim.
   ═══════════════════════════════════════════════════════════════════════ */

const LEGAL = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Refund", href: "/refund" },
  { label: "Disclaimer", href: "/disclaimer" },
  { label: "Cookies", href: "/cookies" },
  { label: "Use Policy", href: "/acceptable-use" },
  { label: "App Login", href: "/login" },
];

export function V2Footer() {
  return (
    <footer
      className="v2-section v2-aurora v2-aurora-market"
      style={{ paddingTop: 72, paddingBottom: 56 }}
    >
      <div className="v2-shell">
        <div className="ts-divider v2-ts mb-8" aria-hidden="true">
          <span>09:34 EDT</span>
        </div>

        <div className="flex flex-col gap-8">
          {/* Brand + contact */}
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3 max-w-md">
              <div className="flex items-center gap-2.5">
                <span
                  className="v2-mono flex h-6 w-6 items-center justify-center rounded-md text-[12px] font-bold"
                  style={{
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--hairline)",
                    color: "var(--text-primary)",
                  }}
                >
                  TC
                </span>
                <span className="v2-mono text-[13px] font-semibold v2-fg">TRADCOPILOT</span>
                <span
                  className="v2-mono ml-1 rounded px-1.5 py-0.5 text-[10px]"
                  style={{ border: "1px solid var(--hairline)", color: "var(--text-secondary)" }}
                >
                  READ-ONLY · NO BROKER ACCESS
                </span>
              </div>
              <p className="v2-body text-[12px] leading-relaxed">
                TradCopilot is a read-only analysis copilot. It does not execute
                trades, custody funds, or connect to your brokerage. Nothing on
                this site is financial advice. Markets carry risk — trade your
                own plan.
              </p>
            </div>
            <a
              href="mailto:hello@tradcopilot.com"
              className="v2-link inline-flex items-center gap-1.5 text-[12px] self-start"
            >
              <Mail size={13} />
              hello@tradcopilot.com
            </a>
          </div>

          {/* Legal row + stamp */}
          <div
            className="flex flex-col gap-4 pt-6 md:flex-row md:items-end md:justify-between"
            style={{ borderTop: "1px solid var(--hairline)" }}
          >
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]">
              {LEGAL.map((l) => (
                <Link key={l.href} href={l.href} className="v2-link text-[12px]">
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <p className="v2-mono text-[11px] v2-muted">© 2026 TradCopilot Inc.</p>
              <span className="v2-stamp" title="Revision">
                TRADCOPILOT · v2.4 — Aug 2026
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
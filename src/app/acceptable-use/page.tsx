import Link from "next/link";
import { ArrowLeft, CheckSquare } from "lucide-react";

export default function AcceptableUsePage() {
  return (
    <div className="min-h-screen py-16 px-6 max-w-3xl mx-auto flex flex-col justify-between" style={{ backgroundColor: "var(--color-bg-primary)" }}>
      <div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold mb-8 text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div className="flex items-center gap-2 mb-6 text-teal-400">
          <CheckSquare size={24} />
          <h1 className="text-2xl font-bold text-white">Acceptable Use Policy</h1>
        </div>

        <p className="text-xs mb-8 text-zinc-500">Last updated: July 12, 2026</p>

        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">1. Lawful Use Only</h2>
            <p>
              You agree to use TradCopilot strictly in compliance with all applicable local, national, and international laws, regulations, and financial guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">2. No Market Manipulation</h2>
            <p>
              You may not use the Service, its analytics, or its AI chart evaluation outputs to coordinate or facilitate any form of market manipulation, including pump-and-dump operations, front-running, wash trading, or distributing false information to influence asset prices.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">3. No Account Sharing</h2>
            <p>
              Your TradCopilot account and Pro Terminal access are for your personal, individual use only. You may not share your login credentials, API session keys, or subscription access with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">4. No Automated Trading Bots</h2>
            <p>
              TradCopilot is designed as an interactive copilot for human discretionary traders. **You are strictly prohibited from parsing or scraping TradCopilot&apos;s API endpoints or AI outputs to power automated algorithmic trading bots, automated order routers, or automated execution scripts.**
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">5. No Harassment or Abuse</h2>
            <p>
              You may not upload, journal, or transmit any content through the Service that is threatening, abusive, defamatory, harassing, obscene, or promotes discrimination of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">6. No Reverse Engineering</h2>
            <p>
              You may not attempt to reverse engineer, decompile, disable, or bypass any security constraints, feature limits, telemetry modules, or subscription access checkpoints built into the TradCopilot application.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">7. Reporting Violations</h2>
            <p>
              If you identify a violation of this Acceptable Use Policy, please report it immediately to our security compliance team at **security@tradcopilot.com** or **ashok.msc2010@gmail.com**.
            </p>
          </section>
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t border-zinc-800 text-[11px] text-zinc-500 text-center">
        © 2026 TradCopilot. Educational and analytical services only.
      </footer>
    </div>
  );
}

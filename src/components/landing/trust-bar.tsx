import { ShieldCheck, BarChart3, Lock } from "lucide-react";

// Verifiable product facts only — no performance claims, no fabricated stats.
// Each line is something a trader can confirm by opening the demo.
const signals = [
  {
    icon: <Lock size={14} />,
    title: "Read-only by design",
    sub: "No broker connection. We never touch your capital.",
  },
  {
    icon: <BarChart3 size={14} />,
    title: "Real-time market data",
    sub: "Live Binance & OANDA telemetry, not cached bars.",
  },
  {
    icon: <ShieldCheck size={14} />,
    title: "Behavioral coaching",
    sub: "Revenge-trade and overtrading detection built in.",
  },
];

export function TrustBar() {
  return (
    <section className="border-y border-border bg-card/40 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-5 sm:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
          {signals.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                {s.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-foreground leading-tight">{s.title}</div>
                <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
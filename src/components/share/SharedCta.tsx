"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LineChart, Loader2, Sparkles } from "lucide-react";

/**
 * The growth-loop CTA on shared analysis pages: "get your own analysis."
 * Deep-links a visitor straight into the charts workbench (signup →
 * first value), seeded with the same symbol they were looking at.
 */
export function SharedCta({ symbol }: { symbol: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const start = () => {
    setLoading(true);
    // Instant demo → the fastest path to value; signup is offered
    // at the conversion modal after the first analysis.
    router.push(`/signup?symbol=${encodeURIComponent(symbol)}`);
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-center space-y-3">
      <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 text-blue-400">
        <Sparkles className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-white font-semibold">Want this for your own chart?</h2>
        <p className="text-sm text-zinc-400 mt-1">
          TradCopilot analyzes any chart with validated trade logic — every entry, stop, and target is checked for
          mathematical consistency before it reaches you. 5 free analyses a day.
        </p>
      </div>
      <button
        onClick={start}
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LineChart className="h-4 w-4" />}
        Analyze {symbol} free
      </button>
    </div>
  );
}

export default SharedCta;
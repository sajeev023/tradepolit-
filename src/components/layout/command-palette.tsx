"use client";

import { useState, useEffect } from "react";
import { useUIStore } from "@/lib/stores/ui-store";
import { Search, X, BookOpen, FlaskConical, Newspaper, LineChart, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function SearchCommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>({ trades: [], strategies: [], news: [], assets: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ trades: [], strategies: [], news: [], assets: [] });
      return;
    }

    const delay = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const body = await res.json();
          setResults(body.data);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  // Handle ESC close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    }
    if (commandPaletteOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const hasResults =
    results.trades.length > 0 ||
    results.strategies.length > 0 ||
    results.news.length > 0 ||
    results.assets.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border glass-elevated overflow-hidden shadow-2xl" style={{ borderColor: "var(--color-border-subtle)" }}>
        {/* Input area */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: "var(--color-border-subtle)", backgroundColor: "var(--color-bg-secondary)" }}>
          <Search size={18} style={{ color: "var(--color-text-tertiary)" }} />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trades, assets, strategies..."
            className="flex-1 text-sm bg-transparent outline-none border-none text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)]"
          />
          {isLoading && <Loader2 size={16} className="animate-spin text-teal-400" />}
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results area */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4" style={{ backgroundColor: "var(--color-bg-primary)" }}>
          {!query.trim() ? (
            <div className="text-center py-8 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Type your search query to seek matching system assets and logs.
            </div>
          ) : !hasResults && !isLoading ? (
            <div className="text-center py-8 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              No matches found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="space-y-4">
              {/* Assets results */}
              {results.assets.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider px-3 mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>
                    Matching Assets
                  </div>
                  {results.assets.map((asset: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setCommandPaletteOpen(false);
                        router.push(`/charts?symbol=${encodeURIComponent(asset.symbol)}`);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-800/30 text-xs font-semibold"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      <LineChart size={14} className="text-teal-400" />
                      <span>{asset.symbol}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Trades results */}
              {results.trades.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider px-3 mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>
                    Trade Logs
                  </div>
                  {results.trades.map((trade: any) => (
                    <div
                      key={trade.id}
                      onClick={() => {
                        setCommandPaletteOpen(false);
                        router.push("/journal");
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-800/30 text-xs font-semibold"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <BookOpen size={14} className="text-teal-400" />
                        <span>{trade.instrument} {trade.direction}</span>
                      </div>
                      <span className="font-mono text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
                        {new Date(trade.openedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Strategies results */}
              {results.strategies.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider px-3 mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>
                    Strategies
                  </div>
                  {results.strategies.map((strat: any) => (
                    <div
                      key={strat.id}
                      onClick={() => {
                        setCommandPaletteOpen(false);
                        router.push("/backtester");
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-800/30 text-xs font-semibold"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      <FlaskConical size={14} className="text-teal-400" />
                      <span>{strat.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* News results */}
              {results.news.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider px-3 mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>
                    Market Intelligence Headlines
                  </div>
                  {results.news.map((n: any) => (
                    <a
                      key={n.id}
                      href={n.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setCommandPaletteOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/30 text-xs font-semibold block truncate"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      <Newspaper size={14} className="text-teal-400 shrink-0" />
                      <span className="truncate">{n.headline}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

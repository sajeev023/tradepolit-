"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useUIStore } from "@/lib/stores/ui-store";
import {
  Search,
  X,
  BookOpen,
  FlaskConical,
  Newspaper,
  LineChart,
  Loader2,
  Compass,
  LayoutDashboard,
  CheckCircle2,
  Eye,
  Settings,
  Keyboard
} from "lucide-react";
import { useRouter } from "next/navigation";

type SelectableItem = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  shortcut?: string;
  icon: "asset" | "trade" | "strategy" | "news" | "decision" | "navigation";
  href?: string;
  external?: boolean;
  onSelect: () => void;
};

export function SearchCommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>({ trades: [], strategies: [], news: [], assets: [] });
  const [theses, setTheses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([]);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Fetch theses for quick decision search
  useEffect(() => {
    if (commandPaletteOpen) {
      fetch("/api/v1/theses?status=ALL")
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => {
          if (body?.data) setTheses(body.data);
        })
        .catch(() => {});
    }
  }, [commandPaletteOpen]);

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
    }, 250);

    return () => clearTimeout(delay);
  }, [query]);

  const close = useCallback(() => {
    setCommandPaletteOpen(false);
    setShowShortcutsHelp(false);
    setTimeout(() => previouslyFocused.current?.focus(), 0);
  }, [setCommandPaletteOpen]);

  // Global "G then key" shortcuts handler
  useEffect(() => {
    let lastKey = "";
    let lastKeyTime = 0;

    function handleGlobalKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);

      // Trigger palette on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // If user is typing in a text field or dialog is open, skip single-letter shortcuts
      if (isInput || commandPaletteOpen) return;

      const now = Date.now();

      // Show shortcuts on '?'
      if (e.key === "?" && !e.shiftKey) {
        // usually shift+? on standard keyboard
      } else if (e.key === "?") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        setShowShortcutsHelp(true);
        return;
      }

      // 'G' sequence
      if (e.key.toLowerCase() === "g") {
        lastKey = "g";
        lastKeyTime = now;
        return;
      }

      if (lastKey === "g" && now - lastKeyTime < 1000) {
        const k = e.key.toLowerCase();
        if (k === "d") {
          e.preventDefault();
          router.push("/dashboard");
        } else if (k === "t") {
          e.preventDefault();
          router.push("/theses");
        } else if (k === "m") {
          e.preventDefault();
          router.push("/charts");
        } else if (k === "c") {
          e.preventDefault();
          router.push("/calibration");
        } else if (k === "w") {
          e.preventDefault();
          router.push("/watchlist");
        } else if (k === "j") {
          e.preventDefault();
          router.push("/journal");
        } else if (k === "p") {
          e.preventDefault();
          router.push("/patterns");
        } else if (k === "s") {
          e.preventDefault();
          router.push("/settings");
        }
        lastKey = "";
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [commandPaletteOpen, router, setCommandPaletteOpen]);

  // Build items list
  const flatItems: SelectableItem[] = useMemo(() => {
    const items: SelectableItem[] = [];

    // When query is empty, show Quick Navigation & Jump List
    if (!query.trim()) {
      const navCommands: Array<{ label: string; href: string; hint: string; shortcut: string }> = [
        { label: "Dashboard Overview", href: "/dashboard", hint: "Workstation pulse & KPIs", shortcut: "G D" },
        { label: "Decisions Ledger", href: "/theses", hint: "Active & historical trade theses", shortcut: "G T" },
        { label: "Decision Calibration", href: "/calibration", hint: "Confidence vs observed outcomes", shortcut: "G C" },
        { label: "Markets / Terminal", href: "/charts", hint: "Live chart & Decision Brief desk", shortcut: "G M" },
        { label: "Intelligent Watchlist", href: "/watchlist", hint: "Assets deserving attention", shortcut: "G W" },
        { label: "Personal Patterns", href: "/patterns", hint: "Process vs outcome DecisionScore", shortcut: "G P" },
        { label: "Trading Journal", href: "/journal", hint: "Session entries & executions", shortcut: "G J" },
        { label: "Settings", href: "/settings", hint: "Preferences & API keys", shortcut: "G S" },
      ];

      for (const cmd of navCommands) {
        items.push({
          id: `nav-${cmd.href}`,
          group: "Quick Navigation",
          label: cmd.label,
          hint: cmd.hint,
          shortcut: cmd.shortcut,
          icon: "navigation",
          onSelect: () => {
            close();
            router.push(cmd.href);
          },
        });
      }

      // Also list recent open decisions if any
      for (const t of (theses || []).slice(0, 4)) {
        items.push({
          id: `thesis-quick-${t.id}`,
          group: "Recent Decisions",
          label: `${t.symbol} ${t.bias} (${t.timeframe})`,
          hint: `Target: $${Number(t.target).toLocaleString()}`,
          icon: "decision",
          onSelect: () => {
            close();
            router.push(`/theses/${t.id}`);
          },
        });
      }

      return items;
    }

    // Matching decisions
    const q = query.toLowerCase();
    const matchingTheses = (theses || [])
      .filter((t: any) => t.symbol.toLowerCase().includes(q) || (t.setupType || "").toLowerCase().includes(q))
      .slice(0, 5);
    for (const t of matchingTheses) {
      items.push({
        id: `thesis-${t.id}`,
        group: "Matching Decisions",
        label: `${t.symbol} ${t.bias} (${t.status})`,
        hint: `Entry: $${Number(t.entryZone).toLocaleString()}`,
        icon: "decision",
        onSelect: () => {
          close();
          router.push(`/theses/${t.id}`);
        },
      });
    }

    // Matching assets
    let assetIndex = 0;
    for (const asset of results.assets || []) {
      items.push({
        id: `asset-${assetIndex}`,
        group: "Matching Assets",
        label: asset.symbol,
        icon: "asset",
        onSelect: () => {
          close();
          router.push(`/charts?symbol=${encodeURIComponent(asset.symbol)}`);
        },
      });
      assetIndex += 1;
    }

    // Matching trades
    for (const trade of results.trades || []) {
      items.push({
        id: `trade-${trade.id}`,
        group: "Trade Logs",
        label: `${trade.instrument} ${trade.direction}`,
        hint: new Date(trade.openedAt).toLocaleDateString(),
        icon: "trade",
        onSelect: () => {
          close();
          router.push("/journal");
        },
      });
    }

    // Matching strategies
    for (const strat of results.strategies || []) {
      items.push({
        id: `strategy-${strat.id}`,
        group: "Strategies",
        label: strat.name,
        icon: "strategy",
        onSelect: () => {
          close();
          router.push("/backtester");
        },
      });
    }

    return items;
  }, [query, theses, results, router, close]);

  useEffect(() => {
    setActiveIndex(0);
  }, [flatItems.length]);

  const hasResults = flatItems.length > 0;

  // ESC close + focus trap + arrow/enter navigation
  useEffect(() => {
    if (!commandPaletteOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    const t = setTimeout(() => inputRef.current?.focus(), 0);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables && focusables.length > 0) {
          const list = Array.from(focusables);
          const first = list[0];
          const last = list[list.length - 1];
          const active = document.activeElement;
          if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
          }
        }
        return;
      }
      if (!hasResults) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % flatItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(flatItems.length - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flatItems[activeIndex];
        if (item) item.onSelect();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(t);
    };
  }, [commandPaletteOpen, close, flatItems, hasResults, activeIndex]);

  useEffect(() => {
    const el = rowRefs.current[activeIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!commandPaletteOpen) return null;

  const iconFor = (icon: SelectableItem["icon"]) => {
    const cls = "shrink-0 text-[var(--color-accent-primary)]";
    if (icon === "navigation") return <Compass size={14} className={cls} />;
    if (icon === "decision") return <CheckCircle2 size={14} className="shrink-0 text-[var(--color-profit)]" />;
    if (icon === "asset") return <LineChart size={14} className={cls} />;
    if (icon === "trade") return <BookOpen size={14} className={cls} />;
    if (icon === "strategy") return <FlaskConical size={14} className={cls} />;
    return <Newspaper size={14} className={cls} />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-md select-none"
      onClick={close}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-xl border border-[var(--color-border-strong)] bg-[#0A0F18] overflow-hidden shadow-2xl"
      >
        {/* Input area */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]">
          <Search size={16} className="text-[var(--color-accent-primary)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decisions, assets, navigation, trades..."
            className="flex-1 text-sm bg-transparent outline-none border-none text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] font-sans"
          />
          {isLoading && <Loader2 size={15} className="animate-spin text-[var(--color-accent-primary)]" />}
          <div className="flex items-center gap-1.5">
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] text-[var(--color-text-quaternary)]">
              ESC
            </kbd>
            <button
              onClick={close}
              className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-primary)] p-1 rounded hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Results area */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3 custom-scrollbar">
          {showShortcutsHelp ? (
            <div className="p-4 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-semibold text-[var(--color-text-primary)] pb-2 border-b border-[var(--color-border-subtle)]">
                <Keyboard size={15} className="text-[var(--color-accent-primary)]" />
                Keyboard Shortcuts Reference
              </div>
              <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
                <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-deepest)]">
                  <span className="text-[var(--color-text-tertiary)]">Search & Jump</span>
                  <span className="text-[var(--color-accent-primary)] font-bold">⌘K / Ctrl+K</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-deepest)]">
                  <span className="text-[var(--color-text-tertiary)]">Dashboard</span>
                  <span className="text-[var(--color-text-primary)] font-bold">G D</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-deepest)]">
                  <span className="text-[var(--color-text-tertiary)]">Decisions</span>
                  <span className="text-[var(--color-text-primary)] font-bold">G T</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-deepest)]">
                  <span className="text-[var(--color-text-tertiary)]">Calibration</span>
                  <span className="text-[var(--color-text-primary)] font-bold">G C</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-deepest)]">
                  <span className="text-[var(--color-text-tertiary)]">Markets</span>
                  <span className="text-[var(--color-text-primary)] font-bold">G M</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-deepest)]">
                  <span className="text-[var(--color-text-tertiary)]">Watchlist</span>
                  <span className="text-[var(--color-text-primary)] font-bold">G W</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-deepest)]">
                  <span className="text-[var(--color-text-tertiary)]">Patterns</span>
                  <span className="text-[var(--color-text-primary)] font-bold">G P</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-deepest)]">
                  <span className="text-[var(--color-text-tertiary)]">Journal</span>
                  <span className="text-[var(--color-text-primary)] font-bold">G J</span>
                </div>
              </div>
            </div>
          ) : !hasResults && !isLoading ? (
            <div className="text-center py-8 text-xs text-[var(--color-text-tertiary)]">
              No matching results for &quot;{query}&quot;
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const groups: { group: string; items: { item: SelectableItem; index: number }[] }[] = [];
                flatItems.forEach((item, index) => {
                  const last = groups[groups.length - 1];
                  if (!last || last.group !== item.group) {
                    groups.push({ group: item.group, items: [{ item, index }] });
                  } else {
                    last.items.push({ item, index });
                  }
                });

                return groups.map((g) => (
                  <div key={g.group}>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider px-3 mb-1 text-[var(--color-text-tertiary)]">
                      {g.group}
                    </div>
                    <div className="space-y-0.5">
                      {g.items.map(({ item, index }) => {
                        const isActive = index === activeIndex;
                        return (
                          <button
                            key={item.id}
                            ref={(el) => {
                              rowRefs.current[index] = el;
                            }}
                            type="button"
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={item.onSelect}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs w-full text-left transition-colors ${
                              isActive
                                ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]"
                                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                            }`}
                          >
                            {iconFor(item.icon)}
                            <span className="truncate font-medium">{item.label}</span>
                            {item.hint && (
                              <span className="text-[11px] text-[var(--color-text-quaternary)] truncate ml-1">
                                · {item.hint}
                              </span>
                            )}
                            {item.shortcut && (
                              <kbd className="ml-auto font-mono text-[10px] px-1.5 py-0.2 rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)] text-[var(--color-text-tertiary)]">
                                {item.shortcut}
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Footer shortcuts bar */}
        <div className="px-4 py-2 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/70 flex items-center justify-between text-[10px] font-mono text-[var(--color-text-quaternary)]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <button
            onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
            className="hover:text-[var(--color-accent-primary)] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Keyboard size={12} />
            <span>{showShortcutsHelp ? "Back to Commands" : "Press ? for Shortcuts"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useUIStore } from "@/lib/stores/ui-store";
import { Search, X, BookOpen, FlaskConical, Newspaper, LineChart, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type SelectableItem = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: "asset" | "trade" | "strategy" | "news";
  href?: string;
  external?: boolean;
  onSelect: () => void;
};

export function SearchCommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>({ trades: [], strategies: [], news: [], assets: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([]);
  const previouslyFocused = useRef<HTMLElement | null>(null);

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

  const close = useCallback(() => {
    setCommandPaletteOpen(false);
    // Restore focus to the element that opened the palette (e.g. ⌘K trigger).
    setTimeout(() => previouslyFocused.current?.focus(), 0);
  }, [setCommandPaletteOpen]);

  // Build a flat, ordered list of selectable result rows.
  const flatItems: SelectableItem[] = useMemo(() => {
    const items: SelectableItem[] = [];
    (results.assets || []).forEach((asset: any, idx: number) =>
      items.push({
        id: `asset-${idx}`,
        group: "Matching Assets",
        label: asset.symbol,
        icon: "asset",
        onSelect: () => {
          setCommandPaletteOpen(false);
          router.push(`/charts?symbol=${encodeURIComponent(asset.symbol)}`);
        },
      }),
    );
    (results.trades || []).forEach((trade: any) =>
      items.push({
        id: `trade-${trade.id}`,
        group: "Trade Logs",
        label: `${trade.instrument} ${trade.direction}`,
        hint: new Date(trade.openedAt).toLocaleDateString(),
        icon: "trade",
        onSelect: () => {
          setCommandPaletteOpen(false);
          router.push("/journal");
        },
      }),
    );
    (results.strategies || []).forEach((strat: any) =>
      items.push({
        id: `strategy-${strat.id}`,
        group: "Strategies",
        label: strat.name,
        icon: "strategy",
        onSelect: () => {
          setCommandPaletteOpen(false);
          router.push("/backtester");
        },
      }),
    );
    (results.news || []).forEach((n: any) =>
      items.push({
        id: `news-${n.id}`,
        group: "Market Intelligence Headlines",
        label: n.headline,
        href: n.url,
        external: true,
        icon: "news",
        onSelect: () => {
          setCommandPaletteOpen(false);
        },
      }),
    );
    return items;
  }, [results, router, setCommandPaletteOpen]);

  // Reset the active row whenever the result set changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [flatItems.length]);

  const hasResults = flatItems.length > 0;

  // ESC close + focus trap + arrow/enter/home/end navigation.
  useEffect(() => {
    if (!commandPaletteOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    // Move focus into the dialog on open.
    const t = setTimeout(() => inputRef.current?.focus(), 0);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      // Focus trap — keep Tab cycling within the dialog.
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
      // Result navigation (only meaningful when there are rows).
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

  // Keep the active row scrolled into view as the user arrows through results.
  useEffect(() => {
    const el = rowRefs.current[activeIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!commandPaletteOpen) return null;

  const iconFor = (icon: SelectableItem["icon"]) => {
    const cls = "shrink-0 text-[var(--color-accent-primary)]";
    if (icon === "asset") return <LineChart size={14} className={cls} />;
    if (icon === "trade") return <BookOpen size={14} className={cls} />;
    if (icon === "strategy") return <FlaskConical size={14} className={cls} />;
    return <Newspaper size={14} className={cls} />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm"
      onClick={close}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette — search trades, assets, strategies and news"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-xl border glass-elevated overflow-hidden shadow-2xl"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        {/* Input area */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: "var(--color-border-subtle)", backgroundColor: "var(--color-bg-secondary)" }}>
          <Search size={18} style={{ color: "var(--color-text-tertiary)" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trades, assets, strategies..."
            aria-label="Search query"
            aria-controls="command-palette-results"
            aria-expanded={hasResults}
            aria-activedescendant={hasResults ? flatItems[activeIndex]?.id : undefined}
            className="flex-1 text-sm bg-transparent outline-none border-none text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)]"
          />
          {isLoading && <Loader2 size={16} className="animate-spin text-[var(--color-accent-primary)]" />}
          <button
            onClick={close}
            aria-label="Close command palette"
            className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-primary)] p-1 rounded-md hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results area */}
        <div
          id="command-palette-results"
          role="listbox"
          aria-label="Search results"
          className="max-h-96 overflow-y-auto p-2 space-y-4"
          style={{ backgroundColor: "var(--color-bg-primary)" }}
        >
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
              {(() => {
                // Group flat rows by their section so each group keeps tight
                // inter-row spacing while sections stay visually separated.
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
                    <div className="text-[10px] font-bold uppercase tracking-wider px-3 mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>
                      {g.group}
                    </div>
                    {g.items.map(({ item, index }) => {
                      const isActive = index === activeIndex;
                      const sharedProps = {
                        "data-active": isActive ? "true" : undefined,
                        ref: (el: HTMLButtonElement | HTMLAnchorElement | null) => {
                          rowRefs.current[index] = el;
                        },
                        onMouseEnter: () => setActiveIndex(index),
                        className: `flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs font-semibold w-full text-left transition-colors ${
                          isActive ? "bg-[var(--color-bg-hover)]" : "hover:bg-[var(--color-bg-hover)]"
                        }`,
                        style: { color: "var(--color-text-secondary)" },
                      };
                      return item.external && item.href ? (
                        <a
                          key={item.id}
                          {...(sharedProps as any)}
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => setCommandPaletteOpen(false)}
                          role="option"
                          aria-selected={isActive}
                        >
                          {iconFor(item.icon)}
                          <span className="truncate">{item.label}</span>
                        </a>
                      ) : (
                        <button
                          key={item.id}
                          {...(sharedProps as any)}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={item.onSelect}
                        >
                          {iconFor(item.icon)}
                          <span className="truncate">{item.label}</span>
                          {item.hint && (
                            <span className="ml-auto font-mono text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
                              {item.hint}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
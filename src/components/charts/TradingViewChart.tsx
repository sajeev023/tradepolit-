"use client";

import { useEffect, useRef, useState, memo, useId } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { profiler } from "@/lib/performance-profiler";
import { getTradingViewSymbol } from "@/lib/supported-symbols";
import { tradingViewIntervalFor } from "@/lib/timeframes";

interface TradingViewChartProps {
  symbol: string;
  timeframe?: string;
  isMaximized?: boolean;
}

export const TradingViewChart = memo(function TradingViewChart({
  symbol,
  timeframe = "1h",
  isMaximized = false,
}: TradingViewChartProps) {
  const renderStart = performance.now();

  const reactId = useId().replace(/:/g, "");
  const containerId = `tv-chart-container-${reactId}`;
  const widgetRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [widgetRetryKey, setWidgetRetryKey] = useState(0);
  const [wsReconnecting, setWsReconnecting] = useState(false);

  const isWidgetReadyRef = useRef(false);
  // Generation counter bumped every time the widget-init effect tears the
  // widget down (symbol/timeframe change, unmount). The sleep/wake reload
  // captures the generation before calling reload(); if it changed by the
  // time reload() returns, a symbol change won the race and the reload's
  // new widget must be discarded — not adopted — so it can't leak or steal
  // the ref from the freshly-initialized widget.
  const widgetGenerationRef = useRef(0);

  const tvSymbol = getTradingViewSymbol(symbol);
  const tvInterval = tradingViewIntervalFor(timeframe);

  // Track React component render cycles
  useEffect(() => {
    const duration = performance.now() - renderStart;
    profiler.recordComponentRender("TradingViewChart", duration);
  });

  // Script loading with 3 retries (runs only once)
  useEffect(() => {
    let active = true;
    let timeoutId: any = null;

    if ((window as any).TradingView) {
      setScriptLoaded(true);
      setLoadError(null);
      return;
    }

    const loadScript = () => {
      const existing = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
      if (existing) {
        existing.remove();
      }

      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;

      script.onload = () => {
        if (active) {
          setScriptLoaded(true);
          setLoadError(null);
        }
      };

      script.onerror = () => {
        if (!active) return;
        if (retryCount < 3) {
          const backoff = Math.pow(2, retryCount) * 1000;
          timeoutId = setTimeout(() => setRetryCount((prev) => prev + 1), backoff);
        } else {
          setLoadError("Failed to load charting interface. Please check your network connection.");
        }
      };

      document.head.appendChild(script);
    };

    loadScript();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [retryCount]);

  // Initialize widget once after script loads
  useEffect(() => {
    if (!scriptLoaded || !(window as any).TradingView) return;

    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    isWidgetReadyRef.current = false;

    const initStart = performance.now();
    profiler.recordWidgetInit();

    let widget: any;
    try {
      widget = new (window as any).TradingView.widget({
        width: "100%",
        height: "100%",
        symbol: tvSymbol,
        interval: tvInterval,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#121214",
        enable_publishing: false,
        hide_top_toolbar: true,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        container_id: containerId,
        studies: [
          "RSI@tv-basicstudies",
          "MACD@tv-basicstudies",
          "Moving Average Exponential@tv-basicstudies",
          "ATR@tv-basicstudies",
        ],
        disabled_features: [
          "header_widget_dom_node",
          "timeframes_toolbar",
          "control_bar",
          "display_market_status",
          "snapshot_trading_dialog",
          "show_logo_on_all_charts",
          "use_localstorage_for_settings",
        ],
        loading_screen: { backgroundColor: "#0A0A0B" },
      });
    } catch (err) {
      console.error("[TradingViewChart] Failed to initialize TradingView widget:", err);
      setLoadError("Chart initialization failed. Please reload the page.");
      return;
    }

    // tv.js embed widget API: `ready(cb)` fires when the iframe posts widgetReady.
    // (The full Charting Library's `onChartReady` does NOT exist on this prototype.)
    widget.ready(() => {
      const loadTime = performance.now() - initStart;
      profiler.recordChartLoad(loadTime);
      isWidgetReadyRef.current = true;
      console.log("[TELEMETRY-1] Raw widget data:", { symbol, tvSymbol, timeframe, tvInterval, status: "READY" });
    });

    widgetRef.current = widget;

    return () => {
      profiler.recordWidgetDestroy();
      // Bump the generation so any in-flight sleep/wake reload() knows the
      // widget it captured has been torn down and must NOT reassign widgetRef.
      widgetGenerationRef.current += 1;
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (_) {}
        widgetRef.current = null;
      }
      isWidgetReadyRef.current = false;
    };
  }, [scriptLoaded, tvSymbol, tvInterval, widgetRetryKey, containerId, symbol, timeframe]);

  // ResizeObserver for responsive chart container. The tv.js iframe is
  // width:100%/height:100%, so it auto-resizes with its container — we just
  // need to nudge TradingView to recalculate when the container changes
  // (sidebar collapse, AI panel toggle, mobile tab switch, orientation change).
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    // The TradingView iframe fills its container via CSS width/height:100%.
    // We observe the container for telemetry only; no synthetic resize events
    // are needed because the embed widget recalculates on its own reflow.
    const observer = new ResizeObserver(() => {
      // no-op: the widget handles its own resize
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [containerId]);

  // Event-driven WebSocket status (no polling)
  useEffect(() => {
    const handleOnline = () => setWsReconnecting(false);
    const handleOffline = () => setWsReconnecting(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sleep/wake detection with time drift check (2s interval, no status polling)
  // tv.js embed widget API: `reload()` replaces the iframe with a fresh render
  // to recover from stale data after sleep/wake (no `chart().resetData()` exists).
  useEffect(() => {
    let lastTime = Date.now();
    const interval = setInterval(() => {
      const currentTime = Date.now();
      if (currentTime - lastTime > 10000) {
        const w = widgetRef.current;
        if (w && isWidgetReadyRef.current && typeof w.reload === "function") {
          // Capture the generation BEFORE reload(). If a symbol change tears
          // the widget down while reload() is in flight, the generation bumps
          // and we discard the reloaded widget instead of adopting it.
          const generation = widgetGenerationRef.current;
          try {
            const maybeNew = w.reload();
            // tv.js reload() may return a new widget instance; capture it
            // only if our widget hasn't been torn down in the meantime.
            if (maybeNew && typeof maybeNew.remove === "function") {
              if (widgetGenerationRef.current === generation) {
                widgetRef.current = maybeNew;
                isWidgetReadyRef.current = false;
                maybeNew.ready(() => {
                  if (widgetGenerationRef.current === generation) {
                    isWidgetReadyRef.current = true;
                  }
                });
              } else {
                // A symbol change won the race — the new init effect owns the
                // ref. Discard the reload result so it can't leak or steal it.
                try { maybeNew.remove(); } catch (_) {}
              }
            }
          } catch (_) {}
        }
      }
      lastTime = currentTime;
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleManualRetry = () => {
    setLoadError(null);
    setRetryCount(0);
    setWidgetRetryKey((k) => k + 1);
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative ${isMaximized ? "border-0 rounded-none" : "border rounded-lg"} overflow-hidden`}
      style={{
        height: "100%",
        minHeight: "0",
        borderColor: "var(--color-border-subtle)",
        backgroundColor: "#0A0A0B",
      }}
    >
      {wsReconnecting && (
        <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-yellow-950/70 border border-yellow-500/30 text-yellow-500 text-[10px] font-bold tracking-wide flex items-center gap-1.5 backdrop-blur-md">
          <RefreshCw size={10} className="animate-spin" />
          <span>Reconnecting...</span>
        </div>
      )}

      {loadError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0B] p-6 text-center z-40">
          <AlertTriangle className="text-rose-500 mb-3" size={32} />
          <h3 className="text-sm font-bold text-white mb-1">Chart Load Failed</h3>
          <p className="text-xs text-[var(--color-text-secondary)] mb-4 max-w-[280px]">{loadError}</p>
          <button
            onClick={handleManualRetry}
            className="px-4 py-2 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-hover)] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={12} />
            Retry Connection
          </button>
        </div>
      ) : (
        !scriptLoaded && (
          <div className="absolute inset-0 flex flex-col justify-between p-4 bg-[#0A0A0B] z-30 animate-pulse">
            <div className="flex justify-between items-center pb-2 border-b border-[#1A1A1C]">
              <div className="flex items-center gap-3">
                <div className="h-6 w-24 bg-zinc-800 rounded" />
                <div className="h-4 w-12 bg-zinc-800 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-5 w-10 bg-zinc-800 rounded" />
                <div className="h-5 w-10 bg-zinc-800 rounded" />
                <div className="h-5 w-10 bg-zinc-800 rounded" />
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center relative">
              <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]" />
              <div className="text-zinc-600 text-xs font-semibold uppercase tracking-widest z-10 flex items-center gap-2">
                <RefreshCw size={12} className="animate-spin" />
                Initializing Chart...
              </div>
            </div>
            <div className="h-20 border-t border-[#1A1A1C] pt-2 flex items-center justify-between">
              <div className="h-4 w-16 bg-zinc-800 rounded" />
              <div className="h-4 w-32 bg-zinc-800 rounded" />
            </div>
          </div>
        )
      )}

      <div id={containerId} className="w-full h-full" />
    </div>
  );
});

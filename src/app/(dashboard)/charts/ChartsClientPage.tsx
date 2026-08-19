"use client";

import { useState, useEffect, useRef, useCallback, Profiler } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import type { PriceData } from "@/lib/types";
import { ChatHistorySidebar } from "@/components/charts/ChatHistorySidebar";
import { SavedAnalysesPanel } from "@/components/charts/SavedAnalysesPanel";
import { DemoConversionModal } from "@/components/DemoConversionModal";
import { analytics } from "@/lib/analytics";
import { useBinanceMultiStream, useBinanceStreamStatus, getLatestWebSocketPrice } from "@/hooks/useBinanceStream";
import { LivePriceCard } from "@/components/charts/LivePriceCard";
import { LivePriceTag } from "@/components/charts/LivePriceTag";
import { TradCopilotPanel } from "@/components/charts/TradCopilotPanel";
import { PerformanceOverlay } from "@/components/performance/PerformanceOverlay";
import { profiler } from "@/lib/performance-profiler";
import {
  TrendingUp,
  Bot,
  Sparkles,
  Send,
  Eye,
  X,
  Zap,
  Maximize2,
  Minimize2,
  Camera,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { getInstantFallbackAnalysis } from "@/lib/fallback-analysis";
import { SnapshotExportCard } from "@/components/charts/SnapshotExportCard";
import { formatPrice } from "@/lib/format-price";
import {
  CRYPTO_SYMBOLS,
  FOREX_SYMBOLS,
  INDEX_SYMBOLS,
  COMMODITY_SYMBOLS,
  BINANCE_WS_SYMBOLS,
  SYMBOL_REGISTRY,
  getExchangeName,
} from "@/lib/market-registry";

// Symbol groups for the chart selector UI. Driven by the market registry —
// adding a new market auto-populates this menu with no edit here.
const SYMBOLS = [
  { group: "Crypto", items: CRYPTO_SYMBOLS },
  { group: "Forex & Commodities", items: [...FOREX_SYMBOLS, ...COMMODITY_SYMBOLS] },
  { group: "Indices", items: INDEX_SYMBOLS },
];

interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  isAlert?: boolean;
  isStreaming?: boolean;
}

// AI analysis diagnostic phase — bound to real mutation fetch boundaries.
type AnalysisPhase = "connecting" | "analyzing";

// Generate proactive technical alerts based on compiled indicators
const generateProactiveAlerts = (data: any, symbol: string) => {
  const alerts: string[] = [];
  const coin = symbol.split("/")[0];

  if (data.lostVWAP) {
    alerts.push(`⚠ ${coin} LOST VWAP — Bulls losing intraday control. Watch for shift in momentum.`);
  }
  if (data.volumeSurgeRatio >= 1.8) {
    const pct = Math.round((data.volumeSurgeRatio - 1) * 100);
    alerts.push(`⚠ VOLUME SURGED ${pct}% ABOVE AVERAGE — This is not normal participation. Watch for breakout or distribution.`);
  }
  if (data.isVolatilitySpike) {
    alerts.push(`⚠ VOLATILITY SPIKE — ATR standard deviation expanded. Expect high turbulence and wider spreads.`);
  }
  if (data.liquiditySweep) {
    alerts.push(`⚠ LIQUIDITY SWEEP DETECTED — Price wicked below support at $${data.support} and reversed instantly. Classic stop hunt. Support held.`);
  }
  if (data.fakeBreakout) {
    alerts.push(`⚠ POSSIBLE FAKE BREAKOUT — Price broke resistance at $${data.resistance} but closed below it on low volume. No conviction.`);
  }
  if (data.approachingKeyLevel === "RESISTANCE") {
    alerts.push(`⚠ APPROACHING MAJOR RESISTANCE — Resistance at $${data.resistance} is being tested. Watch for rejection or breakout volume.`);
  }
  if (data.approachingKeyLevel === "SUPPORT") {
    alerts.push(`⚠ APPROACHING MAJOR SUPPORT — Support at $${data.support} is being tested. Watch for bounce or high-volume breakdown.`);
  }
  if (data.emaCrossover === "BULLISH") {
    alerts.push(`⚠ EMA BULLISH CROSSOVER CONFIRMED — Momentum shifting up. Short-term trend flipping bullish.`);
  } else if (data.emaCrossover === "BEARISH") {
    alerts.push(`⚠ EMA BEARISH CROSSOVER CONFIRMED — Momentum shifting down. Short-term trend flipping bearish.`);
  }
  if (data.macdCrossover === "BULLISH") {
    alerts.push(`⚠ MACD BULLISH CROSSOVER — Intraday momentum accelerating. Buyers stepping in.`);
  } else if (data.macdCrossover === "BEARISH") {
    alerts.push(`⚠ MACD BEARISH CROSSOVER — Intraday momentum decelerating. Watch for shift in control.`);
  }
  if (data.rsi >= 70) {
    alerts.push(`⚠ RSI OVERBOUGHT (${Math.round(data.rsi)}) — Trend is extended. Watch for bearish divergence or exhaustion wicks.`);
  } else if (data.rsi <= 30) {
    alerts.push(`⚠ RSI OVERSOLD (${Math.round(data.rsi)}) — Sellers are exhausted. Watch for bullish reversal triggers.`);
  }

  return alerts;
};

export function ChartsClientPage() {
  const router = useRouter();
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    if (typeof window === "undefined") return "BTC/USD";
    return localStorage.getItem("TradCopilot-default-symbol") || "BTC/USD";
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<"1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1W">(() => {
    if (typeof window === "undefined") return "4h";
    const tf = localStorage.getItem("TradCopilot-default-timeframe");
    const valid: Array<"1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1W"> = ["1m", "5m", "15m", "1h", "4h", "1d", "1W"];
    return valid.includes(tf as any) ? (tf as any) : "4h";
  });
  const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  // Inline analysis error — surfaced inside the Copilot panel, not a global
  // toast. The AI validation rejection is a result state for this surface, so
  // it lives here with a Retry, persisting until dismissed or re-run.
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const [liveIndicators, setLiveIndicators] = useState<any | null>(null);

  // ── Live watchlist prices via shared Binance WebSocket streams ──────────────────
  // WS-supported symbols stream live; the rest fall back to REST polling.
  const watchlistSymbols = BINANCE_WS_SYMBOLS;
  const watchlistStreamPrices = useBinanceMultiStream(watchlistSymbols);
  const [watchlistRestPrices, setWatchlistRestPrices] = useState<Record<string, { price: number; changePercent24h: number }>>({});

  // Merge: WebSocket prices override REST prices. Iterate the full registry
  // so every known symbol gets a price slot (live or polled).
  const watchlistPrices: Record<string, { price: number; changePercent24h: number }> = {};
  const ALL_WATCHLIST_SYMBOLS = [...CRYPTO_SYMBOLS, ...FOREX_SYMBOLS, ...INDEX_SYMBOLS, ...COMMODITY_SYMBOLS];
  for (const sym of ALL_WATCHLIST_SYMBOLS) {
    const ws = watchlistStreamPrices[sym];
    if (ws) {
      watchlistPrices[sym] = { price: ws.price, changePercent24h: ws.changePercent24h };
    } else if (watchlistRestPrices[sym]) {
      watchlistPrices[sym] = watchlistRestPrices[sym];
    }
  }

  // Chat History Sidebar
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  // Saved Analyses Panel
  const [showSavedAnalyses, setShowSavedAnalyses] = useState(false);
  // Market overview one-liners keyed by symbol
  const [marketOverview, setMarketOverview] = useState<Record<string, any>>({});
  // Welcome-back banner
  const [welcomeBack, setWelcomeBack] = useState<string | null>(null);
  // Bookmarked message IDs (session-local, prevents double-saving)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  // Subscription Plan & Usage counts
  const [subscriptionStatus, setSubscriptionStatus] = useState("FREE");
  const [analysesCountToday, setAnalysesCountToday] = useState(0);
  // Quota comes from the server (/api/v1/profile) — never hardcode a default.
  // The server is the single source of truth (see entitlements.ts YC_DEMO).
  const [analysisLimit, setAnalysisLimit] = useState<number | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showDemoConversionModal, setShowDemoConversionModal] = useState(false);
  const [demoAnalysesCount, setDemoAnalysesCount] = useState(0);

  // Chat state
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [mobileTab, setMobileTab] = useState<"watchlist" | "chart" | "copilot">("chart");
  const [isMobile, setIsMobile] = useState(false);
  // Mobile chart-options menu (three-dot). React state instead of imperative
  // getElementById / classList so the UI stays in sync with React's render.
  const [mobileChartMenuOpen, setMobileChartMenuOpen] = useState(false);

  // Rate-limiting refs for background alerts
  const triggeredAlertsRef = useRef<Set<string>>(new Set());
  const lastAlertTimeRef = useRef<number>(0);
  const alertCooldownsRef = useRef<Map<string, number>>(new Map());

  // Track the last analyzed symbol/timeframe to prevent redundant analysis runs
  const lastAnalyzedSymbolRef = useRef<string | null>(null);
  const lastAnalyzedTimeframeRef = useRef<string | null>(null);
  const isRestoringChatRef = useRef(false);
  // Tracks a legitimately restored analysis so we can skip re-analyzing only that
  // exact symbol/timeframe. Reset on manual symbol change.
  const restoredAnalysisRef = useRef<{ symbol: string; timeframe: string } | null>(null);

  // Restore session on mount — all fetches run in parallel for minimal latency
  useEffect(() => {
    const init = async () => {
      isRestoringChatRef.current = true;
      try {
        // Fire all three fetches in parallel — profile, chat, and market overview
        const [profileRes, chatRes, overviewRes] = await Promise.all([
          fetch("/api/v1/profile"),
          fetch("/api/v1/ai/chats/latest"),
          fetch("/api/v1/ai/market-overview"),
        ]);

        const [profileBody, chatBody, overviewBody] = await Promise.all([
          profileRes.json(),
          chatRes.json(),
          overviewRes.json(),
        ]);

        let activeStatus = "FREE";
        if (profileRes.ok && profileBody.data) {
          const { lastSymbol, lastTimeframe, plan, subscriptionStatus: rawStatus, dailyAnalysisCount, dailyAlertCount, analysisLimit: profileLimit, alertLimit: profileAlertLimit, isDemo: profileIsDemo } = profileBody.data;

          // Initial state is already seeded from localStorage synchronously; only
          // override if the server profile has a *different* persisted preference.
          const localSym = (typeof window !== "undefined" && localStorage.getItem("TradCopilot-default-symbol")) || null;
          const localTf = (typeof window !== "undefined" && localStorage.getItem("TradCopilot-default-timeframe")) || null;
          const serverSym = lastSymbol || localSym || "BTC/USD";
          const serverTf = lastTimeframe || localTf || "4h";
          if (serverSym !== selectedSymbol) setSelectedSymbol(serverSym);
          if (serverTf !== selectedTimeframe) setSelectedTimeframe(serverTf as any);

          const isUserPro = plan === "PRO" || rawStatus === "ACTIVE";
          activeStatus = isUserPro ? "PRO_ACTIVE" : "FREE";
          setSubscriptionStatus(activeStatus);

          if (dailyAnalysisCount !== undefined) setAnalysesCountToday(dailyAnalysisCount);
          if (profileLimit !== undefined) setAnalysisLimit(profileLimit);
          if (profileIsDemo !== undefined) setIsDemoMode(profileIsDemo);
        }

        const isPro = activeStatus === "PRO_ACTIVE";

        // Restore latest chat session (results already fetched in parallel)
        if (isPro && chatRes.ok && chatBody.data) {
          const session = chatBody.data;
          setChatId(session.id);
          if (Array.isArray(session.messages) && session.messages.length > 0) {
            isRestoringChatRef.current = true;
            setMessages(session.messages);
            const hasAnalysis = session.messages.some((m: any) => m.role === "assistant");
            if (hasAnalysis) {
              setAnalysisData({ _restored: true, bias: "RESTORED", confidence: "", support: "", resistance: "" });
              // Mark this exact symbol/timeframe as restored so the change effect
              // doesn't overwrite the restored session with a fresh analysis.
              if (session.symbol && session.timeframe) {
                restoredAnalysisRef.current = { symbol: session.symbol, timeframe: session.timeframe };
                lastAnalyzedSymbolRef.current = session.symbol;
                lastAnalyzedTimeframeRef.current = session.timeframe;
              }
            }
          }
        }

        // Load market overview one-liners (results already fetched in parallel)
        if (isPro && overviewRes.ok && overviewBody.data) {
          setMarketOverview(overviewBody.data);

          const items = Object.values(overviewBody.data as Record<string, any>);
          if (items.length > 0 && chatBody?.data?.messages?.length > 0) {
            const first = items[0] as any;
            const sym = first.symbol?.split("/")[0] ?? first.symbol;
            setWelcomeBack(`Welcome back! ${sym}: ${first.oneLiner}`);
            setTimeout(() => setWelcomeBack(null), 7000);
          }
        }
      } catch (err) {
        console.error("Session init failed:", err);
      } finally {
        setTimeout(() => { isRestoringChatRef.current = false; }, 0);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Persist symbol/timeframe changes to profile
  useEffect(() => {
    const save = async () => {
      try {
        await fetch("/api/v1/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastSymbol: selectedSymbol, lastTimeframe: selectedTimeframe }),
        });
      } catch (err) {
        console.error("Failed to persist chart session changes:", err);
      }
    };
    if (selectedSymbol && selectedTimeframe) save();
  }, [selectedSymbol, selectedTimeframe]);

  // REST fallback for non-crypto (Forex/Index) watchlist prices — polled every 30s
  useEffect(() => {
    const restSymbols = ["USD/JPY", "XAU/USD", "NASDAQ", "S&P500"];
    const fetchForexPrices = async () => {
      if (document.hidden) return;
      const updated: Record<string, { price: number; changePercent24h: number }> = {};
      await Promise.all(restSymbols.map(async (sym) => {
        try {
          const res = await fetch(`/api/v1/market/price?symbol=${encodeURIComponent(sym)}`, { signal: AbortSignal.timeout(5000) });
          const body = await res.json();
          if (res.ok && body.data) updated[sym] = { price: body.data.price, changePercent24h: body.data.changePercent24h };
        } catch (_) {}
      }));
      setWatchlistRestPrices(prev => ({ ...prev, ...updated }));
    };
    fetchForexPrices();
    const id = setInterval(fetchForexPrices, 30000);
    return () => clearInterval(id);
  }, []);

  // ── Mobile detection (matches dashboard layout breakpoint) ──────────────────
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Chart resize when mobile tab switches to chart ─────────────────────────
  useEffect(() => {
    if (mobileTab === "chart" && isMobile) {
      // TradingView widget measures container on window resize. When the chart
      // tab was hidden (display:none) its container had 0 width. Dispatch a
      // resize event after a frame so the widget re-measures its now-visible
      // container at full width.
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
    }
  }, [mobileTab, isMobile]);

  useEffect(() => {
    triggeredAlertsRef.current.clear();
  }, [selectedSymbol, selectedTimeframe]);

  // ─── Word-by-word streaming helper ───────────────────────────────────────────
  const streamMessage = useCallback((
    fullText: string,
    suffix: ChatMessage[] = [],
    onComplete?: () => void,
    delayMs = 40,
  ) => {
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newMsg: ChatMessage = {
      id: msgId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, newMsg]);

    const words = fullText.split(" ");
    let i = 0;

    const reveal = () => {
      if (i < words.length) {
        const idx = i;
        setMessages(prev =>
          prev.map(m =>
            m.id === msgId
              ? { ...m, content: words.slice(0, idx + 1).join(" "), isStreaming: idx < words.length - 1 }
              : m
          )
        );
        i += 1; // reveal one word per tick for smooth, readable streaming
        setTimeout(reveal, delayMs);
      } else {
        // Streaming done — append alert suffixes and call completion cb
        setMessages(prev => [
          ...prev.map(m => (m.id === msgId ? { ...m, content: fullText, isStreaming: false } : m)),
          ...suffix,
        ]);
        onComplete?.();
      }
    };

    setTimeout(reveal, 10);
  }, []);

  // ── Live ticker price via shared WebSocket (crypto) or REST poll (forex/index) ─────
  const wsStatus = useBinanceStreamStatus(selectedSymbol);
  const isWsDisconnected = wsStatus === "disconnected" || wsStatus === "reconnecting";
  const isWebSocketSymbol = BINANCE_WS_SYMBOLS.includes(selectedSymbol);

  const { data: priceData, refetch: refetchPrice, isFetching: priceFetching } = useQuery<PriceData>({
    queryKey: ["price", selectedSymbol],
    queryFn: async () => {
      const res = await fetch(`/api/v1/market/price?symbol=${encodeURIComponent(selectedSymbol)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to fetch price");
      return body.data;
    },
    // Enable REST polling for WebSocket symbols only when WS is disconnected
    // Non-WebSocket symbols always poll at 5s
    refetchInterval: isWebSocketSymbol ? (isWsDisconnected ? 5000 : false) : 5000,
  });

  const [isChartMaximized, setIsChartMaximized] = useState(false);

  useEffect(() => {
    if (isChartMaximized) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isChartMaximized]);

  // ─── Dynamic fallback helper ──────────────────────────────────────────────────
  // Stored in a ref so the analyze effect below doesn't list getDynamicFallback
  // in its dep array — that callback changes identity on every WebSocket price
  // tick (~100ms) because its own deps include `priceData`, which would re-run
  // the analyze effect body on every tick. The ref lets the effect read the
  // latest fallback without subscribing to its identity changes.
  const getDynamicFallback = useCallback((sym: string, tf: string) => {
    const fallbackData: any = {};
    const wsPriceVal = getLatestWebSocketPrice(selectedSymbol);
    const activePrice = wsPriceVal !== null ? wsPriceVal : priceData?.price;
    if (activePrice && sym === selectedSymbol) {
      fallbackData.currentPrice = activePrice;
    }
    if (liveIndicators && liveIndicators.symbol === selectedSymbol && sym === selectedSymbol) {
      fallbackData.support = liveIndicators.support;
      fallbackData.resistance = liveIndicators.resistance;
      fallbackData.rsi = liveIndicators.rsi;
      fallbackData.rsiLabel = liveIndicators.rsiLabel;
      fallbackData.bias = liveIndicators.bias;
      fallbackData.setupQuality = liveIndicators.setupQuality;
      fallbackData.confidence = liveIndicators.confidence;
      fallbackData.invalidationLevel = liveIndicators.invalidationLevel;
      fallbackData.trend = liveIndicators.trend;
    }
    return getInstantFallbackAnalysis(sym, tf, fallbackData);
  }, [priceData, liveIndicators, selectedSymbol]);
  const getDynamicFallbackRef = useRef(getDynamicFallback);
  useEffect(() => {
    getDynamicFallbackRef.current = getDynamicFallback;
  }, [getDynamicFallback]);

  // ─── Chart analysis mutation ──────────────────────────────────────────────────
  const analyzeMutation = useMutation({
    mutationFn: async (variables?: { symbol: string; timeframe: "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1W"; bypassCache?: boolean }) => {
      console.log(`[CLIENT] analyzeMutation start`, variables);
      setAnalysisError(null);
      const sym = variables?.symbol ?? selectedSymbol;
      const tf = variables?.timeframe ?? selectedTimeframe;
      const bypass = variables?.bypassCache ?? false;

      // Demo mode check: gate on the server-provided analysisLimit, not a hardcoded constant.
      if (isDemoMode && analysisLimit !== null && demoAnalysesCount >= analysisLimit) {
        setShowDemoConversionModal(true);
        analytics.trackSignupModalOpened("demo_limit_reached");
        throw new Error(`You've used your ${analysisLimit} free demo AI analyses. Create a free account to continue.`);
      }

      let telemetry = liveIndicators;
      const needsIndicatorFetch = !telemetry || telemetry.symbol !== sym || telemetry.timeframe !== tf;
      if (needsIndicatorFetch) {
        // REAL phase 1: fetching a live indicators snapshot from the market feed.
        setAnalysisPhase("connecting");
        console.log(`[SYNC] Client telemetry not found or mismatched for ${sym} ${tf}. Fetching indicators first...`);
        const indRes = await fetch(`/api/v1/market/indicators?symbol=${encodeURIComponent(sym)}&tf=${tf}`, {
          signal: AbortSignal.timeout(15000), // 15s — the analyze-chart fetch below has 30s; this pre-fetch must not hang indefinitely or the AI panel stays stuck on "AI analyzing..." forever.
        });
        const indBody = await indRes.json();
        if (!indRes.ok || !indBody.data) {
          throw new Error(indBody.error?.message || "Failed to fetch indicators snapshot before analysis");
        }
        telemetry = indBody.data;
        setLiveIndicators(telemetry);
      }

      console.log(`[SYNC] Triggering analysis for: ${sym} ${tf} at price $${telemetry?.currentPrice}`);

      const instantFallback = getDynamicFallback(sym, tf);
      if (instantFallback) {
        setAnalysisData(instantFallback);
      }

      // livePrice: send the WebSocket price so the backend can override the stale candle price
      const livePriceForAI = getLatestWebSocketPrice(sym) || priceData?.price;

      const payload = { symbol: sym, timeframe: tf, bypassCache: bypass, telemetry, livePrice: livePriceForAI };
      console.log("[TELEMETRY-3] Payload to API:", payload);

      try {
        // REAL phase 2: the server-side multi-model AI race (Groq → NVIDIA →
        // Gemini → OpenAI) over the compiled telemetry. This is the long step.
        setAnalysisPhase("analyzing");
        const res = await fetch("/api/v1/ai/analyze-chart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000), // 30s fetch timeout matching serverless capacity
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message || body.message || "Analysis failed");
        return body.data;
      } catch (err: any) {
        console.error(`[SYNC] Client analysis fetch error: ${err?.message}`);
        throw err;
      }
    },
    onSuccess: (data, variables) => {
      const targetSym = variables?.symbol ?? selectedSymbol;
      if (data.symbol && data.symbol !== selectedSymbol) {
        console.warn(`[SYNC] Discarding analysis for ${data.symbol}. User is currently on ${selectedSymbol}`);
        return;
      }
      if (targetSym !== selectedSymbol) {
        console.warn(`[SYNC] Discarding stale request for ${targetSym}. Active symbol: ${selectedSymbol}`);
        return;
      }

      const readyData = { ...data, loading: false };
      console.log("[TELEMETRY-6] AI response text:", readyData.coachNarrative);
      setAnalysisData(readyData);
      setAnalysisError(null);
      setChatId(null);
      setShowFollowUps(false);

      if (isDemoMode) {
        const nextCount = demoAnalysesCount + 1;
        setDemoAnalysesCount(nextCount);
        analytics.trackDemoAnalysis(nextCount, targetSym);
        const limit = analysisLimit ?? 0;
        if (limit > 0 && nextCount >= limit) {
          setTimeout(() => {
            setShowDemoConversionModal(true);
            analytics.trackSignupModalOpened("demo_limit_reached");
          }, 1500);
        }
      }

      // Perform validation log
      const wsPriceVal = getLatestWebSocketPrice(selectedSymbol);
      const chartPrice = wsPriceVal !== null ? wsPriceVal : (priceData?.price || 0);
      const telemetryPrice = readyData.currentPrice || 0;
      const aiPrice = readyData.currentPrice || 0;
      const diff = Math.abs(chartPrice - telemetryPrice);
      const diffPercent = telemetryPrice > 0 ? (diff / telemetryPrice) * 100 : 0;

      console.log(`[VALIDATION]
Chart Price: ${chartPrice}
Telemetry Price: ${telemetryPrice}
AI Price: ${aiPrice}
Timestamp: ${new Date().toISOString()}
Exchange: ${getExchangeName(readyData.symbol || selectedSymbol)}
Timeframe: ${readyData.timeframe || selectedTimeframe}
Symbol: ${readyData.symbol || selectedSymbol}
`);

      if (diffPercent > 0.01) {
        console.warn(`⚠ PRICE MISMATCH DETECTED
Chart: ${chartPrice}
Telemetry: ${telemetryPrice}
Difference: ${diff.toFixed(2)} (${diffPercent.toFixed(4)}%)
Source: ${getExchangeName(readyData.symbol || selectedSymbol)}
Timestamp: ${new Date().toISOString()}
`);
      }
      
      if (!readyData.cached) {
        setAnalysesCountToday(prev => prev + 1);
      }

      const alerts = generateProactiveAlerts(readyData, selectedSymbol);
      const alertMessages: ChatMessage[] = alerts.map(text => ({
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: "system",
        content: text,
        createdAt: new Date().toISOString(),
        isAlert: true,
      }));

      // Render cached analysis INSTANTLY (0ms delay) or fast-stream fresh analysis
      if (readyData.cached) {
        setMessages([
          {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: readyData.coachNarrative,
            createdAt: new Date().toISOString(),
            isStreaming: false,
          },
          ...alertMessages,
        ]);
        setShowFollowUps(true);
      } else {
        setMessages([]);
        streamMessage(readyData.coachNarrative, alertMessages, () => {
          setShowFollowUps(true);
        }, 8);
      }

      setIsBackgroundUpdating(false);
      toast.success(readyData.cached ? `Cached analysis loaded for ${selectedSymbol}` : `Analysis completed for ${selectedSymbol}`, { id: "analysis-success" });
    },
    onError: (err: any) => {
      setIsBackgroundUpdating(false);
      // Surface inline in the Copilot panel — NOT a global toast. The long
      // validation-rejection message was rendering as a huge persistent
      // bottom-right toast that covered the chart and the AI input.
      setAnalysisError(err?.message || "Analysis request timed out. Please try again.");
    },
  });

  const isPending = analyzeMutation.isPending && !isBackgroundUpdating;

  // ─── Follow-up chat mutation ──────────────────────────────────────────────────
  const chatMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const activeState = (analysisData && analysisData.symbol === selectedSymbol) ? analysisData : undefined;
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chatId || undefined,
          message: messageText,
          symbol: selectedSymbol,
          timeframe: selectedTimeframe,
          chartState: activeState,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to communicate with AI");
      return body.data;
    },
    onSuccess: (data) => {
      if (!chatId) setChatId(data.chat.id);
      setShowFollowUps(false);
      streamMessage(data.reply);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send message");
    },
  });

  // ─── Background alert monitoring (20s polling, paused when tab is hidden) ───
  useEffect(() => {
    let active = true;

    const checkAlerts = async () => {
      if (!active || document.hidden) return;
      try {
        const res = await fetch(`/api/v1/market/indicators?symbol=${encodeURIComponent(selectedSymbol)}&tf=${selectedTimeframe}`);
        const body = await res.json();
        if (!res.ok || !body.data) return;

        const data = body.data;
        setLiveIndicators(data);
        const { support, resistance } = data;
        const coin = selectedSymbol.split("/")[0];
        const now = Date.now();

        if (now - lastAlertTimeRef.current < 30000) return;

        const candidates: { key: string; text: string }[] = [];
        const add = (key: string, text: string) => {
          const last = alertCooldownsRef.current.get(key) || 0;
          if (now - last >= 600000) candidates.push({ key, text });
        };

        if (data.lostVWAP) add("vwap-lost", `⚠ ${coin} lost VWAP — Bulls losing intraday control. Watch for momentum shift.`);
        else if (data.reclaimedVWAP) add("vwap-reclaimed", `✓ ${coin} reclaimed VWAP — Bulls regain intraday control.`);
        if (data.rsi > 70) add("rsi-ob", `⚠ RSI above 70 — Overbought. Not a short signal, but tighten stops on longs.`);
        else if (data.rsi < 30) add("rsi-os", `⚠ RSI below 30 — Oversold. Potential bounce zone. Watch for reversal candles.`);
        else if (data.rsiCrossedBelow40) add("rsi-40", `⚠ RSI crossed below 40 — First sign of weakening. Longs should tighten stops.`);
        if (data.macdCrossover === "BEARISH") add("macd-bear", `⚠ MACD bearish crossover — ${selectedTimeframe.toUpperCase()} momentum shifting.`);
        else if (data.macdCrossover === "BULLISH") add("macd-bull", `✓ MACD bullish crossover — Momentum shifting positive. Look for pullback entries.`);
        if (data.volumeSurgeRatio > 2.5) add("vol-extreme", `🚨 Volume 250% above average — Potential institutional activity.`);
        else if (data.volumeSurgeRatio > 1.8) add("vol-spike", `⚠ Volume surged 180% above average — Not normal participation.`);
        if (data.brokenSupport) add("sup-broken", `⚠ ${coin} broke below $${support?.toLocaleString()} — Support lost.`);
        else if (data.brokenResistance) add("res-broken", `✓ ${coin} broke above $${resistance?.toLocaleString()} — Resistance cleared. Don't chase.`);
        if (data.emaCrossover === "BEARISH") add("ema-bear", `⚠ EMA 9/21 bearish crossover — Short-term trend shifting.`);
        else if (data.emaCrossover === "BULLISH") add("ema-bull", `✓ EMA 9/21 bullish crossover — Short-term trend positive.`);
        if (data.activeSession === "LONDON") add("sess-ldn", `🔔 London session started — Volatility increases. Watch for fake moves in first 30 min.`);
        else if (data.activeSession === "NEWYORK") add("sess-ny", `🔔 New York session — Highest volume session. Major moves in first 2 hours.`);
        else if (data.activeSession === "ASIA") add("sess-asia", `🔔 Asia session — Lower volatility. BTC often ranges.`);
        if (data.approachingKeyLevel === "SUPPORT") add("app-sup", `⚠ Approaching support at $${support?.toLocaleString()}. Watch for reaction.`);
        else if (data.approachingKeyLevel === "RESISTANCE") add("app-res", `⚠ Approaching resistance at $${resistance?.toLocaleString()}. Watch for rejection.`);
        if (data.atrExpansion) add("atr-exp", `⚠ Volatility expanding — ATR up 50%. Wider stops needed. Reduce size.`);
        if (data.consecutiveCandles === 4) add("cons-bull", `✓ Strong bullish momentum — 4 consecutive green candles.`);
        else if (data.consecutiveCandles === -4) add("cons-bear", `⚠ Strong bearish momentum — 4 consecutive red candles. Wait for reversal signal.`);

        if (candidates.length > 0) {
          const alert = candidates[0];

          // Check and record alert limit
          try {
            const recordRes = await fetch("/api/v1/ai/record-alert", { method: "POST" });
            const recordBody = await recordRes.json();
            if (recordRes.ok && recordBody.data) {
              if (!recordBody.data.allowed) {
                console.log(`[ALERT] Daily limit of 3 alerts reached. Alert suppressed.`);
                return;
              }
            }
          } catch (recordErr) {
            console.error("Failed to check/record alert limit:", recordErr);
          }

          setMessages(prev => [...prev, {
            id: `bg-alert-${Date.now()}`,
            role: "system",
            content: alert.text,
            createdAt: new Date().toISOString(),
            isAlert: true,
          }]);
          lastAlertTimeRef.current = now;
          alertCooldownsRef.current.set(alert.key, now);
          toast.warning(alert.text, { duration: 6000 });
        }
      } catch (err) {
        console.error("Background alerts check failed:", err);
      }
    };

    checkAlerts();
    const iv = setInterval(checkAlerts, 20000);
    return () => { active = false; clearInterval(iv); };
  }, [selectedSymbol, selectedTimeframe]);

  // Reset the (real) analysis phase when the mutation stops — success or error.
  // The phase itself is set inside mutationFn at the actual fetch boundaries,
  // never on a cosmetic timer, so the diagnostic reflects real progress only.
  useEffect(() => {
    if (!isPending) setAnalysisPhase(null);
  }, [isPending]);

  // Stable reference to the mutate function so the effect below doesn't
  // re-run every time the useMutation object changes (isPending toggles).
  const analyzeMutate = analyzeMutation.mutate;

  // Run analysis ONLY on symbol/timeframe change or first mount
  useEffect(() => {
    const hasSymbolChanged = lastAnalyzedSymbolRef.current !== selectedSymbol;
    const hasTimeframeChanged = lastAnalyzedTimeframeRef.current !== selectedTimeframe;

    if (hasSymbolChanged || hasTimeframeChanged) {
      console.log(`[SYNC] Symbol/timeframe changed: ${lastAnalyzedSymbolRef.current} -> ${selectedSymbol} (${selectedTimeframe})`);
      const prevSym = lastAnalyzedSymbolRef.current;

      // Update refs synchronously so a rapid second effect run won't see the
      // same pair as "changed" and fire another analysis.
      lastAnalyzedSymbolRef.current = selectedSymbol;
      lastAnalyzedTimeframeRef.current = selectedTimeframe;

      if (prevSym && prevSym !== selectedSymbol) {
        fetch("/api/v1/ai/invalidate-cache", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: prevSym, timeframe: selectedTimeframe }),
        }).catch(() => {});
      }

      const restored = restoredAnalysisRef.current;
      const isRestoredForCurrent = restored?.symbol === selectedSymbol && restored?.timeframe === selectedTimeframe;

      if (isRestoredForCurrent) {
        // Keep restored analysis intact; just mark the panel ready.
        restoredAnalysisRef.current = null;
        return;
      }

      // Immediately clear stale analysis state for previous symbol
      setAnalysisData(null);

      analyzeMutate({ symbol: selectedSymbol, timeframe: selectedTimeframe });
    }
  }, [selectedSymbol, selectedTimeframe, analyzeMutate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.getAttribute("contenteditable") === "true"
      );

      // CMD+I / Ctrl+I: refocus Chat Input box
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setAiPanelOpen(true);
        setTimeout(() => {
          chatInputRef.current?.focus();
        }, 50);
        return;
      }

      if (isInput) return;

      // Esc: close/collapse AI panel or exit fullscreen chart
      if (e.key === "Escape") {
        if (isChartMaximized) {
          setIsChartMaximized(false);
        } else {
          setAiPanelOpen(false);
        }
      }

      // F: toggle fullscreen chart (ignore if any modifier is held)
      if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        setIsChartMaximized(prev => !prev);
      }

      // Space: toggle AI panel
      if (e.key === " ") {
        e.preventDefault();
        setAiPanelOpen(prev => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isChartMaximized]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || chatMutation.isPending || isPending) return;
    const userText = inputText.trim();
    setInputText("");
    setShowFollowUps(false);
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: "user",
      content: userText,
      createdAt: new Date().toISOString(),
    }]);
    chatMutation.mutate(userText);
  };

  const handleQuickAction = (action: string) => {
    if (chatMutation.isPending || isPending) return;
    setShowFollowUps(false);
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: "user",
      content: action,
      createdAt: new Date().toISOString(),
    }]);
    chatMutation.mutate(action);
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopiedId(id);
    toast.success("Copied to clipboard", { duration: 2000, position: "top-right" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const [isExportingSnapshot, setIsExportingSnapshot] = useState(false);
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);

  const handleCaptureSnapshot = async () => {
    if (isExportingSnapshot) return;
    setIsExportingSnapshot(true);
    setIsCapturingSnapshot(true);
    const toastId = toast.loading("Generating high-resolution snapshot card...");

    // Wait for React to render the hidden snapshot card
    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
      // Dynamic import: html2canvas is a browser-only library. Loading it
      // lazily isolates any chunk-load failure to this feature only, so a
      // network error or build issue can't crash the whole charts page.
      const { default: html2canvas } = await import("html2canvas");

      const cardEl = document.getElementById("snapshot-export-card");
      if (!cardEl) throw new Error("Export card element not found");

      const canvas = await html2canvas(cardEl, {
        backgroundColor: "var(--background)",
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `TradCopilot-${selectedSymbol.replace("/", "-")}-${selectedTimeframe}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Snapshot exported successfully!", { id: toastId });
    } catch (err: any) {
      console.error("Snapshot export failed:", err);
      toast.error(`Export failed: ${err.message || err}`, { id: toastId });
    } finally {
      setIsExportingSnapshot(false);
      setIsCapturingSnapshot(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <Profiler id="ChartsPage" onRender={(id, phase, actualDuration) => profiler.recordComponentRender(id, actualDuration)}>
    <div className="flex flex-col gap-2 lg:gap-3 animate-fade-in min-h-0 overflow-hidden"
      style={{
        height: "calc(100dvh - var(--spacing-topbar) - 3rem)",
        maxWidth: "1600px",
        marginLeft: "auto",
        marginRight: "auto",
      }}>
      {/* WebSocket Disconnection Banner */}
      {isWebSocketSymbol && isWsDisconnected && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-amber-500/20 bg-[var(--color-warning-bg)] text-xs text-[var(--color-text-primary)] animate-message-in shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>Live market data is temporarily unavailable. Reconnecting...</span>
          </div>
        </div>
      )}

      {/* Welcome Back Banner */}
      {welcomeBack && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-[rgba(var(--accent-rgb),0.2)] bg-[var(--color-accent-primary-subtle)] text-xs text-[var(--color-text-primary)] animate-message-in shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
            </span>
            <span>{welcomeBack}</span>
          </div>
          <button
            onClick={() => setWelcomeBack(null)}
            className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)] transition-colors p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Header & Live Price Bar ────────────────────────────────────────────── */}
      <div className="flex flex-row items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-[13px] font-bold tracking-tight hidden lg:block" style={{ color: "var(--color-text-primary)" }}>
            Live Market Center
          </h1>
          <p className="text-[10px] hidden lg:block text-[var(--color-text-tertiary)] leading-none">
            Real-time interactive charting and context-aware AI day-trading copilot.
          </p>
        </div>

        <LivePriceCard
          symbol={selectedSymbol}
          initialPriceData={priceData || null}
          refetchPrice={refetchPrice}
          priceFetching={priceFetching}
        />
      </div>

      {/* ── Mobile tab switcher ───────────────────────────────────────────────── */}
      <div className="flex lg:hidden bg-[var(--color-bg-tertiary)] p-1 rounded-lg border border-[var(--color-border-default)] gap-1 w-full shrink-0">
        {(["watchlist", "chart", "copilot"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              if (tab === "copilot" && !aiPanelOpen) {
                setAiPanelOpen(true);
              }
              setMobileTab(tab);
            }}
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-md transition-all capitalize ${
              mobileTab === tab
                ? "bg-[var(--color-accent-primary-muted)] text-[var(--color-accent-primary)] border border-[rgba(var(--accent-rgb),0.2)]"
                : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {tab === "copilot" ? "AI Copilot" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 gap-4 items-stretch pb-4"
        style={{
          gridTemplateColumns: isMobile
            ? "1fr"
            : aiPanelOpen
              ? "minmax(140px,170px) 1fr minmax(270px,335px)"
              : "minmax(140px,170px) 1fr",
        }}>
        <div id="watchlist-panel" className={`flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar ${mobileTab === "watchlist" ? "flex" : "hidden lg:flex"}`}>
          <div className="card p-2.5 flex-1 flex flex-col min-h-[200px]">
            <h2 className="text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: "var(--color-text-tertiary)" }}>
              <Eye size={10} className="text-[var(--color-accent-primary)]" /> Watchlist
            </h2>
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              {SYMBOLS.map(group => (
                <div key={group.group} className="space-y-0.5">
                  <h3 className="text-[8px] font-bold tracking-widest uppercase text-[var(--color-text-quaternary)] select-none">{group.group}</h3>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map(item => {
                      const active = item === selectedSymbol;
                      const info = watchlistPrices[item];
                      const ovr = marketOverview[item];
                      const isBull = ovr?.bias?.includes("BUY") || ovr?.bias?.includes("LONG");
                      const isBear = ovr?.bias?.includes("SELL") || ovr?.bias?.includes("SHORT");
                      return (
                        <button
                          key={item}
                          onClick={() => { setSelectedSymbol(item); setMobileTab("chart"); }}
                          disabled={false}
                          className={`flex flex-col px-2 py-1.5 rounded-lg text-xs transition-all text-left font-mono border border-transparent w-full hover:bg-[var(--color-bg-hover)] cursor-pointer`}
                          style={{
                            backgroundColor: active ? "var(--color-bg-hover)" : "transparent",
                            color: active ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1">
                              {ovr && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: isBull ? "var(--color-profit)" : isBear ? "var(--color-loss)" : "var(--color-warning)",
                                    boxShadow: isBull ? "0 0 4px rgba(45, 212, 168, 0.4)" : isBear ? "0 0 4px rgba(255, 107, 107, 0.4)" : "none",
                                  }}
                                />
                              )}
                              <span className="font-semibold truncate text-[var(--color-text-primary)] min-w-0">{item}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {info && (
                                <span className="font-medium text-right text-[var(--color-text-secondary)] tabular-nums text-[10px]">
                                  {formatPrice(item, info.price)}
                                </span>
                              )}
                              {info && (
                                <span className={`text-[10px] font-mono select-none shrink-0 ${info.changePercent24h >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}`}>
                                  {info.changePercent24h >= 0 ? "+" : ""}{info.changePercent24h.toFixed(2)}%
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Market overview one-liner */}
                          {ovr?.oneLiner && (
                            <p className="text-[9px] leading-relaxed mt-1 text-[var(--color-text-quaternary)] font-sans font-normal line-clamp-2 whitespace-normal">
                              {ovr.oneLiner}
                            </p>
                          )}
                        </button>
                      );
                    })}

                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TradingView Chart */}
        <div 
          id="tradingview-chart" 
          className={`flex flex-col overflow-hidden transition-all duration-300 ${
            isChartMaximized 
              ? "fixed z-[9999] bg-[var(--background)] p-0 m-0 border-0 rounded-none shadow-none" 
              : `card border border-[var(--color-border-default)] h-full min-w-0 ${mobileTab === "chart" ? "flex" : "hidden lg:flex"}`
          }`}
          style={isChartMaximized ? { top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", margin: 0, borderRadius: 0 } : undefined}
        >
          {/* Chart header */}
          <div className="flex flex-wrap items-center justify-between px-3 py-1.5 border-b shrink-0 bg-[var(--color-bg-secondary)] border-[var(--color-border-subtle)] gap-2" style={{ minHeight: "40px" }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[var(--color-accent-primary-muted)] flex items-center justify-center border border-[rgba(var(--accent-rgb),0.2)]">
                  <TrendingUp size={14} style={{ color: "var(--color-accent-primary)" }} />
                </div>
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">{selectedSymbol}</span>
                {/* MARKET → EXCHANGE → INSTRUMENT hierarchy (registry-driven, no hardcoding) */}
                {SYMBOL_REGISTRY[selectedSymbol]?.assetClass && (
                  <span className="text-[9px] font-bold text-[var(--color-text-quaternary)] uppercase tracking-wider bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] px-1.5 py-0.5 rounded font-mono select-none">
                    {SYMBOL_REGISTRY[selectedSymbol].assetClass}
                  </span>
                )}
                <span className="text-[9px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] px-1.5 py-0.5 rounded font-mono select-none">
                  {getExchangeName(selectedSymbol)}
                </span>
              </div>

              <LivePriceTag
                symbol={selectedSymbol}
                initialPriceData={priceData || null}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              {/* Desktop timeframe selector */}
              <div className="hidden lg:flex bg-[var(--color-bg-tertiary)] p-0.5 rounded-lg border border-[var(--color-border-default)] gap-0.5 overflow-x-auto max-w-full scrollbar-none flex-nowrap shrink-0">
                {(["1m", "5m", "15m", "1h", "4h", "1d", "1W"] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`h-7 px-2 rounded-md text-[10px] font-semibold font-mono transition-all cursor-pointer flex items-center justify-center press-scale ${
                      selectedTimeframe === tf
                        ? "bg-[var(--color-accent-primary-muted)] text-[var(--color-accent-primary)] shadow-sm font-bold border border-[rgba(var(--accent-rgb),0.2)]"
                        : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              {/* Mobile compressed timeframe */}
              <div className="flex lg:hidden bg-[var(--color-bg-tertiary)] p-0.5 rounded-lg border border-[var(--color-border-default)] gap-1 overflow-x-auto scrollbar-none flex-nowrap timeframe-scroll-row">
                {(["1m", "5m", "15m", "1h", "4h", "1d"] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    style={{ minWidth: "44px", minHeight: "44px" }}
                    className={`rounded-md text-[13px] font-semibold font-mono transition-all cursor-pointer flex items-center justify-center timeframe-pill ${
                      selectedTimeframe === tf
                        ? "bg-[var(--color-bg-hover)] text-[var(--color-accent-primary)] shadow-sm font-bold border border-[rgba(var(--accent-rgb),0.2)]"
                        : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              {/* Desktop action buttons */}
              <div className="hidden lg:flex items-center gap-2">
                <button
                  onClick={handleCaptureSnapshot}
                  disabled={isExportingSnapshot}
                  className="btn-secondary h-8 w-8 flex items-center justify-center rounded-md border-[var(--color-border-default)] hover:border-[rgba(var(--accent-rgb),0.3)] shrink-0 select-none cursor-pointer active:scale-95 transition-all"
                  style={{ padding: 0 }}
                  title="Export Setup PNG"
                >
                  <Camera size={15} style={{ color: "var(--color-accent-primary)" }} />
                </button>
                <button
                  onClick={() => setIsChartMaximized(v => !v)}
                  className="btn-secondary h-8 w-8 flex items-center justify-center rounded-md border-[var(--color-border-default)] hover:border-[rgba(var(--accent-rgb),0.3)] shrink-0 select-none cursor-pointer active:scale-95 transition-all"
                  style={{ padding: 0 }}
                  title={isChartMaximized ? "Exit Fullscreen" : "Maximize Chart"}
                >
                  {isChartMaximized ? <Minimize2 size={15} style={{ color: "var(--color-accent-primary)" }} /> : <Maximize2 size={15} style={{ color: "var(--color-accent-primary)" }} />}
                </button>
                <button
                  onClick={() => setAiPanelOpen(v => !v)}
                  className="btn-secondary h-8 text-[10px] px-3 flex items-center gap-1.5 rounded-md border-[var(--color-border-default)] hover:border-[rgba(var(--accent-rgb),0.3)] shrink-0 select-none cursor-pointer active:scale-95 transition-all"
                >
                  <Bot size={12} style={{ color: "var(--color-accent-primary)" }} />
                  <span>{aiPanelOpen ? "Close AI" : "Open AI"}</span>
                </button>
              </div>
              {/* Mobile three-dot menu */}
              <div className="flex lg:hidden">
                <div className="relative">
                  <button
                    onClick={() => setMobileChartMenuOpen((v) => !v)}
                    className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-[var(--color-bg-hover)] cursor-pointer"
                    aria-label="Chart options"
                    aria-expanded={mobileChartMenuOpen}
                  >
                    <MoreHorizontal size={18} style={{ color: "var(--color-text-tertiary)" }} />
                  </button>
                  {mobileChartMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-1 z-50 min-w-[150px] rounded-lg border shadow-xl overflow-hidden"
                      style={{
                        backgroundColor: "var(--color-bg-elevated, var(--color-bg-secondary))",
                        borderColor: "var(--color-border-subtle)",
                      }}
                    >
                      <button
                        onClick={() => { setMobileChartMenuOpen(false); handleCaptureSnapshot(); }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer hover:bg-[var(--color-bg-hover)]"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        <Camera size={14} /> Export PNG
                      </button>
                      <button
                        onClick={() => { setMobileChartMenuOpen(false); setIsChartMaximized(v => !v); }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer hover:bg-[var(--color-bg-hover)]"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        <Maximize2 size={14} /> {isChartMaximized ? "Exit Fullscreen" : "Fullscreen"}
                      </button>
                      <button
                        onClick={() => { setMobileChartMenuOpen(false); setAiPanelOpen(v => !v); }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer hover:bg-[var(--color-bg-hover)]"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        <Bot size={14} /> {aiPanelOpen ? "Close AI" : "Open AI"}
                      </button>
                      {subscriptionStatus !== "PRO_ACTIVE" && (
                        <button
                          onClick={() => { setMobileChartMenuOpen(false); router.push("/pricing"); }}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer hover:bg-[var(--color-bg-hover)]"
                          style={{ color: "var(--color-accent-primary)" }}
                        >
                          <Zap size={14} /> Upgrade to Pro
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chart canvas */}
          <div className={`flex-1 w-full relative bg-[var(--color-bg-primary)] ${isChartMaximized ? "min-h-0" : "min-h-[250px] lg:min-h-[400px]"}`}>
            <TradingViewChart symbol={selectedSymbol} timeframe={selectedTimeframe} isMaximized={isChartMaximized} />
          </div>

          {/* Indicator strip */}
          {liveIndicators && (
            <div id="indicator-panel" className="h-[28px] min-h-[28px] border-t shrink-0 flex items-center justify-between px-2 xl:px-3 bg-[var(--color-bg-secondary)] border-[var(--color-border-subtle)] text-[10px] font-mono text-[var(--color-text-secondary)] select-none">
              <div className="flex items-center gap-3 xl:gap-4 min-w-0 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[var(--color-text-tertiary)] uppercase font-sans text-[9px]">RSI(14):</span>
                  <span className={`text-[11px] font-bold ${typeof liveIndicators.rsi === "number" && liveIndicators.rsi >= 70 ? "text-[var(--color-loss)]" : typeof liveIndicators.rsi === "number" && liveIndicators.rsi <= 30 ? "text-[var(--color-profit)]" : "text-[var(--color-text-primary)]"}`}>
                    {typeof liveIndicators.rsi === "number" ? liveIndicators.rsi.toFixed(2) : "—"}
                  </span>
                </div>
                <span className="shrink-0 text-[var(--color-border-default)] text-[10px]">|</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[var(--color-text-tertiary)] uppercase font-sans text-[9px]">MACD:</span>
                  <span className="text-[var(--color-text-primary)] text-[11px]">
                    {typeof liveIndicators.macdValue === "number" ? liveIndicators.macdValue.toFixed(2) : "—"} / {typeof liveIndicators.macdSignal === "number" ? liveIndicators.macdSignal.toFixed(2) : "—"}
                  </span>
                </div>
                <span className="shrink-0 text-[var(--color-border-default)] text-[10px]">|</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[var(--color-text-tertiary)] uppercase font-sans text-[9px]">EMA 9/21:</span>
                  {subscriptionStatus === "PRO_ACTIVE" ? (
                    <span className={`text-[11px] font-bold ${liveIndicators.emaCrossover === "BULLISH" ? "text-[var(--color-profit)]" : liveIndicators.emaCrossover === "BEARISH" ? "text-[var(--color-loss)]" : "text-[var(--color-text-primary)]"}`}>
                      {liveIndicators.emaCrossover || "Aligned"}
                    </span>
                  ) : (
                    <span className="text-[var(--color-text-quaternary)] text-[11px] font-bold">PRO</span>
                  )}
                </div>
                <span className="shrink-0 text-[var(--color-border-default)] text-[10px]">|</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[var(--color-text-tertiary)] uppercase font-sans text-[9px]">ATR(14):</span>
                  {subscriptionStatus === "PRO_ACTIVE" ? (
                    <span className="text-[var(--color-text-primary)] text-[11px]">{typeof liveIndicators.atr === "number" ? liveIndicators.atr.toFixed(2) : "—"}</span>
                  ) : (
                    <span className="text-[var(--color-text-quaternary)] text-[11px] font-bold">PRO</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-profit)] animate-pulse" />
                <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-sans">Live</span>
              </div>
            </div>
          )}
        </div>

        {/* ── AI Copilot Panel ───────────────────────────────────────────────── */}
        {aiPanelOpen && (
          <TradCopilotPanel
            symbol={selectedSymbol}
            timeframe={selectedTimeframe}
            priceData={priceData || null}
            liveIndicators={liveIndicators}
            wsStatus={wsStatus}
            isWebSocketSymbol={isWebSocketSymbol}
            analysisData={analysisData}
            analysisError={analysisError}
            isPending={isPending}
            analysisPhase={analysisPhase}
            messages={messages}
            inputText={inputText}
            setInputText={setInputText}
            onSendChat={handleSendMessage}
            onRunAnalysis={(opts) => analyzeMutation.mutate({ symbol: selectedSymbol, timeframe: selectedTimeframe, bypassCache: opts?.bypassCache })}
            onDismissError={() => setAnalysisError(null)}
            onOpenSavedAnalyses={() => setShowSavedAnalyses(true)}
            onOpenChatHistory={() => setShowHistorySidebar(true)}
            onClose={() => setAiPanelOpen(false)}
            subscriptionStatus={subscriptionStatus}
            analysisLimit={analysisLimit}
            analysesCountToday={analysesCountToday}
            isDemoMode={isDemoMode}
            showFollowUps={showFollowUps}
            chatMutationPending={chatMutation.isPending}
            isMobile={isMobile}
            copiedId={copiedId}
            bookmarkedIds={bookmarkedIds}
            expandedMessages={expandedMessages}
            onCopy={handleCopy}
            onToggleExpand={toggleExpand}
            onBookmarkMessage={async (msg, msgId) => {
              if (bookmarkedIds.has(msgId) || !analysisData) return;
              try {
                const res = await fetch("/api/v1/ai/saved-analyses", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    symbol: selectedSymbol,
                    timeframe: selectedTimeframe,
                    bias: analysisData.bias || "RESTORED",
                    confidence: analysisData.confidence || "MEDIUM",
                    support: String(analysisData.support || "N/A"),
                    resistance: String(analysisData.resistance || "N/A"),
                    aiSummary: msg.content.slice(0, 500),
                  }),
                });
                if (res.ok) {
                  setBookmarkedIds(prev => new Set([...prev, msgId]));
                  toast.success("Analysis bookmarked!");
                }
              } catch {
                toast.error("Failed to bookmark analysis");
              }
            }}
            onQuickAction={handleQuickAction}
          />
        )}
      </div>

      {/* Mobile sticky chat composer — above bottom nav */}
      {analysisData && mobileTab === "copilot" && (
        <div className="lg:hidden fixed left-0 right-0 z-40 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]" style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}>
          <div className="p-3">
            {subscriptionStatus !== "PRO_ACTIVE" && analysisLimit !== null && (
              <div className="flex items-center justify-between px-1 pb-1.5 text-[9px] uppercase font-bold tracking-widest text-[var(--color-text-tertiary)] font-mono select-none">
                <span>{isDemoMode ? "Demo" : "Daily"} limit</span>
                <span className={analysesCountToday >= analysisLimit ? "text-[var(--color-loss)]" : "text-[var(--color-warning)]"}>
                  {Math.max(0, analysisLimit - analysesCountToday)} / {analysisLimit} left
                </span>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                ref={chatInputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Ask TradCopilot about this chart..."
                className="flex-grow bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-quaternary)] outline-none focus:border-[rgba(var(--accent-rgb),0.4)] transition-colors"
                disabled={chatMutation.isPending}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || chatMutation.isPending}
                className="btn-no-full-width flex items-center justify-center w-11 h-11 rounded-lg text-[var(--color-bg-deepest)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95 shrink-0"
                style={{ backgroundColor: "var(--color-accent-primary)" }}
                aria-label="Send message"
              >
                {chatMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-[var(--color-bg-deepest)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={16} fill="currentColor" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        isOpen={showHistorySidebar}
        onClose={() => setShowHistorySidebar(false)}
        activeChatId={chatId}
        onSelectSession={(sessionChatId, loadedMessages, symbol, timeframe) => {
          isRestoringChatRef.current = true;
          setChatId(sessionChatId);
          setMessages(loadedMessages);

          let changed = false;
          if (symbol && symbol !== selectedSymbol) {
            setSelectedSymbol(symbol);
            changed = true;
          }
          if (timeframe && timeframe !== selectedTimeframe) {
            setSelectedTimeframe(timeframe as any);
            changed = true;
          }

          if (!changed) {
            isRestoringChatRef.current = false;
          }

          const hasAnalysis = loadedMessages.some((m) => m.role === "assistant");
          if (hasAnalysis) {
            const lastAssistant = [...loadedMessages].reverse().find((m) => m.role === "assistant");
            if (lastAssistant) {
              setAnalysisData({
                _restored: true,
                bias: "RESTORED",
                confidence: "",
                support: "",
                resistance: "",
                coachNarrative: lastAssistant.content,
              });
            } else {
              setAnalysisData({ _restored: true, bias: "RESTORED", confidence: "", support: "", resistance: "" });
            }
            // Mark restored session so the symbol/timeframe change effect does not
            // overwrite it with a fresh analysis after this callback finishes.
            if (symbol && timeframe) {
              restoredAnalysisRef.current = { symbol, timeframe };
            }
          } else {
            setAnalysisData(null);
            restoredAnalysisRef.current = null;
          }
        }}
        onNewChat={() => {
          setChatId(null);
          setMessages([]);
          setAnalysisData(null);
          restoredAnalysisRef.current = null;
          lastAnalyzedSymbolRef.current = null;
          lastAnalyzedTimeframeRef.current = null;
        }}
      />

      {/* Mobile Floating Analyze Button */}
      {!analysisData && !isPending && mobileTab === "chart" && (
        <div className="lg:hidden fixed right-4 z-40" style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
          <button
            onClick={() => analyzeMutation.mutate({ symbol: selectedSymbol, timeframe: selectedTimeframe })}
            className="flex items-center gap-2 px-4 py-3 rounded-full shadow-lg cursor-pointer press-scale"
            style={{
              background: "linear-gradient(135deg, var(--color-accent-primary), var(--accent-bright))",
              color: "var(--background)",
              boxShadow: "0 4px 20px rgba(47, 198, 232, 0.4)",
            }}
          >
            <Sparkles size={16} strokeWidth={2.5} />
            <span className="text-xs font-bold">Analyze</span>
          </button>
        </div>
      )}

      {/* Saved Analyses Panel */}
      <SavedAnalysesPanel
        isOpen={showSavedAnalyses}
        onClose={() => setShowSavedAnalyses(false)}
        currentAnalysis={analysisData}
      />

      {/* Hidden high-res snapshot export template card — only rendered when capturing */}
      {isCapturingSnapshot && (
        <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
          <SnapshotExportCard
            symbol={selectedSymbol}
            timeframe={selectedTimeframe}
            priceData={
              getLatestWebSocketPrice(selectedSymbol) !== null
                ? {
                    symbol: selectedSymbol,
                    price: getLatestWebSocketPrice(selectedSymbol)!,
                    changePercent24h: priceData?.changePercent24h || 0,
                    change24h: priceData?.change24h || 0,
                    high24h: priceData?.high24h || 0,
                    low24h: priceData?.low24h || 0,
                    volume24h: priceData?.volume24h || 0,
                    updatedAt: new Date().toISOString(),
                  }
                : priceData
            }
            liveIndicators={liveIndicators}
            analysisData={analysisData}
          />
        </div>
      )}

      {/* Floating Performance telemetry Dashboard */}
      <PerformanceOverlay />

      {/* YC Instant Demo Conversion Gating Modal */}
      <DemoConversionModal
        isOpen={showDemoConversionModal}
        onClose={() => setShowDemoConversionModal(false)}
        analysesUsed={demoAnalysesCount || 2}
      />
    </div>
    </Profiler>
  );
}

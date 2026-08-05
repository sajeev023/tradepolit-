"use client";

/**
 * useBinanceStream — Centralized Binance WebSocket ticker hook.
 *
 * All components (topbar, watchlist, AI panel) MUST use this hook
 * to receive live prices. Only ONE WebSocket is opened per symbol
 * across the entire application via a shared subscription registry.
 *
 * Supported symbols: BTC/USD, ETH/USD, SOL/USD, EUR/USD, GBP/USD
 * Non-crypto symbols return null — callers fall back to REST polling.
 */

import { useState, useEffect, useRef } from "react";
import type { PriceData } from "@/lib/types";
import { profiler } from "@/lib/performance-profiler";

// ─── Singleton subscription registry ──────────────────────────────────────────
// Maps Binance stream name → { ws, subscribers, lastPrice }
// Prevents duplicate connections when multiple components subscribe to the
// same symbol simultaneously.

interface StreamEntry {
  ws: WebSocket | null;
  subscribers: Set<(data: PriceData) => void>;
  lastPrice: PriceData | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  active: boolean;
  reconnectCount: number;
  statusListeners: Set<(status: "connected" | "reconnecting" | "disconnected" | "error") => void>;
  currentStatus: "connected" | "reconnecting" | "disconnected" | "error";
  // Stale-data watchdog: last tick timestamp + interval handle. Binance
  // sometimes holds the socket open but stops delivering frames (silent
  // stall). Without this guard, the UI keeps showing the last price
  // forever and never falls back to REST polling.
  lastTickAt: number;
  staleWatchdog: ReturnType<typeof setInterval> | null;
}

function setEntryStatus(
  entry: StreamEntry,
  status: "connected" | "reconnecting" | "disconnected" | "error"
) {
  if (entry.currentStatus === status) return;
  entry.currentStatus = status;
  entry.statusListeners.forEach((cb) => cb(status));
}

const registry = new Map<string, StreamEntry>();

const BINANCE_SYMBOL_MAP: Record<string, string> = {
  "BTC/USD": "btcusdt",
  "ETH/USD": "ethusdt",
  "SOL/USD": "solusdt",
  "EUR/USD": "eurusdt",
  "GBP/USD": "gbpusdt",
};

function getStreamName(symbol: string): string | null {
  return BINANCE_SYMBOL_MAP[symbol] ?? null;
}

function openStream(streamName: string) {
  // Defensive guard: WebSocket is only defined in the browser. This function
  // should only ever be called from useEffect (client-only), but the guard
  // prevents a hard crash if it's somehow invoked during SSR or in an
  // environment without WebSocket support.
  if (typeof window === "undefined" || typeof WebSocket === "undefined") return;

  const entry = registry.get(streamName);
  if (!entry || !entry.active) return;
  // Use numeric readyState values (1 = OPEN, 0 = CONNECTING) to be safe from ReferenceError during SSR
  if (entry.ws && (entry.ws.readyState === 1 || entry.ws.readyState === 0)) return;

  let ws: WebSocket;
  try {
    ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${streamName}@ticker`
    );
  } catch (err) {
    console.error(`[useBinanceStream] Failed to open WebSocket for ${streamName}:`, err);
    setEntryStatus(entry, "reconnecting");
    const delay = Math.min(1000 * Math.pow(2, entry.reconnectCount), 10000);
    entry.reconnectCount = entry.reconnectCount + 1;
    if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
    entry.reconnectTimer = setTimeout(() => {
      if (registry.get(streamName)?.active) {
        openStream(streamName);
      }
    }, delay);
    return;
  }

  entry.ws = ws;
  setEntryStatus(entry, "reconnecting");
  const symbol =
    Object.keys(BINANCE_SYMBOL_MAP).find(
      (k) => BINANCE_SYMBOL_MAP[k] === streamName
    ) ?? streamName;

  ws.onopen = () => {
    const current = registry.get(streamName);
    if (!current) return;
    current.reconnectCount = 0;
    current.lastTickAt = Date.now();
    setEntryStatus(current, "connected");

    // Stale-data watchdog: check every 5s whether the feed has gone
    // silent. If no tick in 30s while the socket reports OPEN, the
    // feed is silently stalled — flip to "reconnecting" so consumers
    // (topbar, charts) fall back to REST polling. The watchdog clears
    // on close; the next tick after recovery resets lastTickAt.
    if (current.staleWatchdog) clearInterval(current.staleWatchdog);
    current.staleWatchdog = setInterval(() => {
      const entry = registry.get(streamName);
      if (!entry || !entry.active || !entry.ws || entry.ws.readyState !== 1) return;
      if (entry.currentStatus !== "connected") return;
      const silentForMs = Date.now() - entry.lastTickAt;
      if (silentForMs > 30_000) {
        console.warn(`[useBinanceStream] Stale feed on ${streamName}: silent for ${silentForMs}ms. Falling back to REST polling.`);
        setEntryStatus(entry, "reconnecting");
      }
    }, 5_000);
  };

  ws.onmessage = (event) => {
    const current = registry.get(streamName);
    if (!current || !current.active) return;
    try {
      const data = JSON.parse(event.data);
      if (data?.c) {
        current.reconnectCount = 0;
        // Feed recovered — reset the stale watchdog and flip back to
        // "connected" if the watchdog had demoted us. Consumers will
        // see status change reconnecting → connected and stop REST
        // polling in favor of the live WS feed.
        current.lastTickAt = Date.now();
        if (current.currentStatus === "reconnecting") {
          setEntryStatus(current, "connected");
        }
        const price = parseFloat(data.c);
        const change24h = parseFloat(data.p);
        const changePercent24h = parseFloat(data.P);
        const high24h = parseFloat(data.h);
        const low24h = parseFloat(data.l);
        const volume24h = parseFloat(data.v);
        if (!Number.isFinite(price) || price <= 0) {
          // Drop malformed ticker frames rather than broadcasting NaN
          return;
        }
        const priceData: PriceData = {
          symbol,
          price,
          change24h: Number.isFinite(change24h) ? change24h : 0,
          changePercent24h: Number.isFinite(changePercent24h) ? changePercent24h : 0,
          high24h: Number.isFinite(high24h) ? high24h : price,
          low24h: Number.isFinite(low24h) ? low24h : price,
          volume24h: Number.isFinite(volume24h) ? volume24h : 0,
          updatedAt: new Date().toISOString(),
        };
        if (data?.E) {
          profiler.recordWebSocketTick(symbol, data.E);
        }
        current.lastPrice = priceData;
        current.subscribers.forEach((cb) => cb(priceData));
      }
    } catch {
      // malformed frame — ignore
    }
  };

  ws.onerror = () => {
    // WebSocket error — will reconnect via onclose
  };

  ws.onclose = () => {
    const current = registry.get(streamName);
    if (!current || !current.active) return;

    // Stop the stale watchdog — the close handler already demotes the
    // status, so we don't need the interval firing during reconnect.
    if (current.staleWatchdog) {
      clearInterval(current.staleWatchdog);
      current.staleWatchdog = null;
    }

    setEntryStatus(current, "reconnecting");

    const count = current.reconnectCount;
    // Cap reconnect attempts at 20 to avoid hammering Binance on a persistent
    // outage. Backoff is exponential with a 1s floor and 10s ceiling — the
    // first retry waits 1s (not 0ms) so a refused connection doesn't tight-loop.
    const MAX_RECONNECT = 20;
    if (count >= MAX_RECONNECT) {
      setEntryStatus(current, "error");
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, count), 10000);
    current.reconnectCount = count + 1;

    if (current.reconnectTimer) clearTimeout(current.reconnectTimer);
    current.reconnectTimer = setTimeout(() => {
      if (registry.get(streamName)?.active) {
        openStream(streamName);
      }
    }, delay);
  };
}

function subscribe(
  streamName: string,
  callback: (data: PriceData) => void
): () => void {
  let entry = registry.get(streamName);
  if (!entry) {
    entry = {
      ws: null,
      subscribers: new Set(),
      lastPrice: null,
      reconnectTimer: null,
      active: true,
      reconnectCount: 0,
      statusListeners: new Set(),
      currentStatus: "disconnected",
      lastTickAt: 0,
      staleWatchdog: null,
    };
    registry.set(streamName, entry);
    openStream(streamName);
  } else if (!entry.active) {
    entry.active = true;
    entry.reconnectCount = 0;
    openStream(streamName);
  }

  entry.subscribers.add(callback);

  // Immediately deliver last known price so the UI doesn't flash empty on re-mount
  if (entry.lastPrice) {
    callback(entry.lastPrice);
  }

  return () => {
    const current = registry.get(streamName);
    if (!current) return;
    current.subscribers.delete(callback);
    // Keep WS alive for 10s after last unsubscribe in case the component remounts
    if (current.subscribers.size === 0) {
      if (current.reconnectTimer) clearTimeout(current.reconnectTimer);
      current.reconnectTimer = setTimeout(() => {
        const still = registry.get(streamName);
        if (still && still.subscribers.size === 0) {
          still.active = false;
          if (still.staleWatchdog) {
            clearInterval(still.staleWatchdog);
            still.staleWatchdog = null;
          }
          setEntryStatus(still, "disconnected");
          still.ws?.close();
          still.ws = null;
        }
      }, 10_000);
    }
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns live PriceData from Binance WebSocket for supported crypto symbols.
 * Returns null for non-crypto symbols (Forex, Indices) — components must fall
 * back to REST polling for those.
 *
 * @example
 * const price = useBinanceStream("BTC/USD");
 * const price = useBinanceStream(selectedSymbol);
 */
export function useBinanceStream(symbol: string): PriceData | null {
  const streamName = getStreamName(symbol);
  const [price, setPrice] = useState<PriceData | null>(() => {
    if (typeof window === "undefined" || !streamName) return null;
    return registry.get(streamName)?.lastPrice ?? null;
  });

  // Keep a stable callback ref to avoid re-subscribing on every render
  const callbackRef = useRef<(data: PriceData) => void>(() => {});

  useEffect(() => {
    callbackRef.current = (data: PriceData) => setPrice(data);
  });

  useEffect(() => {
    if (!streamName) {
      setPrice(null);
      return;
    }

    // Reset price on symbol switch so UI doesn't flash the previous symbol's price
    setPrice(registry.get(streamName)?.lastPrice ?? null);

    const stableCallback = (data: PriceData) => callbackRef.current(data);
    const unsubscribe = subscribe(streamName, stableCallback);
    return unsubscribe;
  }, [streamName]);

  return price;
}

/**
 * Subscribes to multiple symbols simultaneously. Returns a map of symbol → PriceData.
 * Used by the watchlist to display live prices for all assets at once.
 *
 * @example
 * const prices = useBinanceMultiStream(["BTC/USD", "ETH/USD", "SOL/USD"]);
 */
export function useBinanceMultiStream(
  symbols: string[]
): Record<string, PriceData | null> {
  const [prices, setPrices] = useState<Record<string, PriceData | null>>(() => {
    const init: Record<string, PriceData | null> = {};
    if (typeof window !== "undefined") {
      for (const sym of symbols) {
        const sn = getStreamName(sym);
        init[sym] = sn ? registry.get(sn)?.lastPrice ?? null : null;
      }
    }
    return init;
  });

  const callbacksRef = useRef<Record<string, (data: PriceData) => void>>({});

  const symbolsKey = symbols.slice().sort().join(",");

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    for (const sym of symbols) {
      const sn = getStreamName(sym);
      if (!sn) continue;

      const cb = (data: PriceData) => {
        setPrices((prev) => ({ ...prev, [sym]: data }));
      };
      callbacksRef.current[sym] = cb;
      unsubscribers.push(subscribe(sn, cb));
    }

    return () => {
      unsubscribers.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  return prices;
}

/**
 * Returns the connection status of the shared WebSocket connection for a given symbol.
 */
export function useBinanceStreamStatus(
  symbol: string
): "connected" | "reconnecting" | "disconnected" | "error" {
  const streamName = getStreamName(symbol);
  const [status, setStatus] = useState<"connected" | "reconnecting" | "disconnected" | "error">(() => {
    // Guard: only run on the client. On the server, registry is empty and WebSocket
    // is undefined, so return a safe default.
    if (typeof window === "undefined" || !streamName) return "disconnected";
    const entry = registry.get(streamName);
    if (!entry) return "disconnected";
    return entry.currentStatus;
  });

  useEffect(() => {
    if (!streamName) {
      setStatus("disconnected");
      return;
    }

    const entry = registry.get(streamName);
    if (!entry) {
      setStatus("disconnected");
      return;
    }

    setStatus(entry.currentStatus);
    const listener = (newStatus: "connected" | "reconnecting" | "disconnected" | "error") => {
      setStatus(newStatus);
    };
    entry.statusListeners.add(listener);
    return () => {
      entry.statusListeners.delete(listener);
    };
  }, [streamName]);

  return status;
}

export function getLatestWebSocketPrice(symbol: string): number | null {
  const streamName = getStreamName(symbol);
  if (!streamName) return null;
  return registry.get(streamName)?.lastPrice?.price ?? null;
}

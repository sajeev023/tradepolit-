"use client";

/**
 * useBinanceStream — Centralized Binance WebSocket ticker hook.
 *
 * All components (topbar, watchlist, AI panel) MUST use this hook
 * to receive live prices. Only ONE WebSocket is opened per symbol
 * across the entire application via a shared subscription registry.
 *
 * Supported symbols: BTC/USD, ETH/USD, SOL/USD
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
    return;
  }

  entry.ws = ws;
  const symbol =
    Object.keys(BINANCE_SYMBOL_MAP).find(
      (k) => BINANCE_SYMBOL_MAP[k] === streamName
    ) ?? streamName;

  ws.onopen = () => {
    const current = registry.get(streamName);
    if (current) current.reconnectCount = 0;
  };

  ws.onmessage = (event) => {
    const current = registry.get(streamName);
    if (!current || !current.active) return;
    try {
      const data = JSON.parse(event.data);
      if (data?.c) {
        current.reconnectCount = 0;
        const price: PriceData = {
          symbol,
          price: parseFloat(data.c),
          change24h: parseFloat(data.p),
          changePercent24h: parseFloat(data.P),
          high24h: parseFloat(data.h),
          low24h: parseFloat(data.l),
          volume24h: parseFloat(data.v),
          updatedAt: new Date().toISOString(),
        };
        if (data?.E) {
          profiler.recordWebSocketTick(symbol, data.E);
        }
        current.lastPrice = price;
        current.subscribers.forEach((cb) => cb(price));
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
    
    const count = current.reconnectCount;
    // Attempt immediate reconnect on first disconnect (0ms delay), then backoff
    const delay = count === 0 ? 0 : Math.min(1000 * Math.pow(2, count - 1), 10000);
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
  }, [symbolsKey]);

  return prices;
}

/**
 * Returns the connection status of the shared WebSocket connection for a given symbol.
 */
export function useBinanceStreamStatus(
  symbol: string
): "connected" | "reconnecting" | "disconnected" {
  const streamName = getStreamName(symbol);
  const [status, setStatus] = useState<"connected" | "reconnecting" | "disconnected">(() => {
    // Guard: only run on the client. On the server, registry is empty and WebSocket
    // is undefined, so return a safe default.
    if (typeof window === "undefined" || !streamName) return "disconnected";
    const entry = registry.get(streamName);
    if (!entry || !entry.active) return "disconnected";
    // Use numeric readyState 1 (OPEN) to be safe from ReferenceError during SSR (WebSocket is not defined on server)
    if (entry.ws?.readyState === 1) return "connected";
    if (entry.reconnectCount > 0) return "reconnecting";
    return "disconnected";
  });

  useEffect(() => {
    if (!streamName) {
      setStatus("disconnected");
      return;
    }

    const updateStatus = () => {
      const entry = registry.get(streamName);
      if (!entry || !entry.active) {
        setStatus("disconnected");
      } else if (entry.ws?.readyState === 1) { // 1 = OPEN
        setStatus("connected");
      } else if (entry.reconnectCount > 0) {
        setStatus("reconnecting");
      } else {
        setStatus("disconnected");
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [streamName]);

  return status;
}

export function getLatestWebSocketPrice(symbol: string): number | null {
  const streamName = getStreamName(symbol);
  if (!streamName) return null;
  return registry.get(streamName)?.lastPrice?.price ?? null;
}

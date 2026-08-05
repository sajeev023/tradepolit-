"use client";

export interface ApiTiming {
  url: string;
  duration: number; // client-side total duration (ms)
  dbDuration?: number; // server-side DB query duration (ms)
  apiDuration?: number; // server-side total API execution (ms)
  timestamp: number;
}

export interface WsTiming {
  symbol: string;
  eventTime: number; // Binance server event time (E)
  receivedTime: number; // Client receive time
  renderLatency: number; // receivedTime - eventTime (ms)
}

export interface PerformanceStats {
  navigationTime: number;
  initialChartLoadTime: number;
  symbolSwitchTime: number;
  timeframeSwitchTime: number;
  widgetInitCount: number;
  widgetDestroyCount: number;
  renderCounts: Record<string, number>;
  renderTimes: Record<string, number>;
  apiTimings: ApiTiming[];
  wsTimings: WsTiming[];
  fps: number;
  memoryUsed: number;
  memoryLimit: number;
}

type Subscriber = (stats: PerformanceStats) => void;

class PerformanceProfiler {
  private stats: PerformanceStats = {
    navigationTime: 0,
    initialChartLoadTime: 0,
    symbolSwitchTime: 0,
    timeframeSwitchTime: 0,
    widgetInitCount: 0,
    widgetDestroyCount: 0,
    renderCounts: {},
    renderTimes: {},
    apiTimings: [],
    wsTimings: [],
    fps: 60,
    memoryUsed: 0,
    memoryLimit: 0,
  };

  private subscribers = new Set<Subscriber>();
  private isInitialized = false;
  private frameCount = 0;
  private lastFpsUpdateTime = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.lastFpsUpdateTime = performance.now();
      this.initInterceptors();
      this.startFpsLoop();
      this.startMemoryTracker();
    }
  }

  public getStats(): PerformanceStats {
    return { ...this.stats };
  }

  public subscribe(sub: Subscriber): () => void {
    this.subscribers.add(sub);
    sub(this.stats);
    return () => {
      this.subscribers.delete(sub);
    };
  }

  private notify() {
    const copy = this.getStats();
    this.subscribers.forEach((sub) => sub(copy));
  }

  // Record custom page-load/navigation timings
  public recordNavigation(ms: number) {
    this.stats.navigationTime = ms;
    this.notify();
  }

  public recordChartLoad(ms: number) {
    this.stats.initialChartLoadTime = ms;
    this.notify();
  }

  public recordSymbolSwitch(ms: number) {
    this.stats.symbolSwitchTime = ms;
    this.notify();
  }

  public recordTimeframeSwitch(ms: number) {
    this.stats.timeframeSwitchTime = ms;
    this.notify();
  }

  public recordWidgetInit() {
    this.stats.widgetInitCount += 1;
    this.notify();
  }

  public recordWidgetDestroy() {
    this.stats.widgetDestroyCount += 1;
    this.notify();
  }

  public recordComponentRender(name: string, ms: number) {
    this.stats.renderCounts[name] = (this.stats.renderCounts[name] || 0) + 1;
    this.stats.renderTimes[name] = ms;
    this.notify();
  }

  // Intercept fetch calls to capture Server-Timing headers
  private initInterceptors() {
    if (this.isInitialized || typeof window === "undefined") return;
    this.isInitialized = true;

    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const start = performance.now();
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      try {
        const response = await originalFetch(input, init);
        const duration = performance.now() - start;

        // Ignore hot/polling or static endpoints from heavy logging
        if (url.includes("/api/v1/")) {
          const serverTimingHeader = response.headers.get("Server-Timing");
          const parsed = this.parseServerTiming(serverTimingHeader || "");

          const timing: ApiTiming = {
            url: url.split("?")[0],
            duration,
            dbDuration: parsed.db,
            apiDuration: parsed.api,
            timestamp: Date.now(),
          };

          this.stats.apiTimings = [timing, ...this.stats.apiTimings].slice(0, 50); // keep last 50
          this.notify();
        }

        return response;
      } catch (err) {
        const duration = performance.now() - start;
        if (url.includes("/api/v1/")) {
          const timing: ApiTiming = {
            url: url.split("?")[0],
            duration,
            timestamp: Date.now(),
          };
          this.stats.apiTimings = [timing, ...this.stats.apiTimings].slice(0, 50);
          this.notify();
        }
        throw err;
      }
    };
  }

  private parseServerTiming(header: string): { db?: number; api?: number } {
    const result: { db?: number; api?: number } = {};
    if (!header) return result;

    const parts = header.split(",");
    for (const part of parts) {
      const match = part.trim().match(/^([^;]+);dur=([\d.]+)/);
      if (match) {
        const name = match[1];
        const dur = parseFloat(match[2]);
        if (name === "db") result.db = dur;
        if (name === "api") result.api = dur;
      }
    }
    return result;
  }

  // Record WebSocket latency from event timestamp (Binance event E)
  public recordWebSocketTick(symbol: string, eventTimeMs: number) {
    const receivedTime = Date.now();
    const renderLatency = Math.max(0, receivedTime - eventTimeMs);

    const timing: WsTiming = {
      symbol,
      eventTime: eventTimeMs,
      receivedTime,
      renderLatency,
    };

    // Calculate a running history and clean out old entries
    this.stats.wsTimings = [timing, ...this.stats.wsTimings].slice(0, 10);
    this.notify();
  }

  // FPS tracker using requestAnimationFrame loop
  private startFpsLoop() {
    const tick = () => {
      this.frameCount += 1;
      const now = performance.now();
      const elapsed = now - this.lastFpsUpdateTime;

      if (elapsed >= 1000) {
        this.stats.fps = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.lastFpsUpdateTime = now;
        this.notify();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Memory utilization tracker
  private startMemoryTracker() {
    const updateMemory = () => {
      const perf = window.performance as any;
      if (perf && perf.memory) {
        this.stats.memoryUsed = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
        this.stats.memoryLimit = Math.round(perf.memory.jsHeapLimit / 1024 / 1024);
        this.notify();
      }
    };
    updateMemory();
    setInterval(updateMemory, 3000);
  }
}

// Export singleton instance
export const profiler = new PerformanceProfiler();

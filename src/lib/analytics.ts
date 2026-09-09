"use client";

/**
 * Product analytics client.
 *
 * V2: events are buffered in-page and flushed in batches to
 * POST /api/v1/analytics/events — the endpoint that actually exists.
 * (The previous implementation POSTed to /api/v1/admin/metrics, an
 * admin-auth GET-only route, so 100% of events were dropped with 405.)
 *
 * Guarantees:
 *  - Never throws, never blocks the UI.
 *  - Batches on an interval and on page hide (best-effort).
 *  - Survives multi-tab usage via a shared anonymousId in localStorage.
 */

const FLUSH_INTERVAL_MS = 5000;
const MAX_BUFFER = 20;
const MAX_PAYLOAD_BYTES = 32 * 1024;

interface QueuedEvent {
  type: string;
  timestamp: string;
  anonymousId: string;
  payload?: Record<string, unknown>;
  pathname?: string;
}

class ProductAnalytics {
  private isDev = process.env.NODE_ENV === "development";
  private buffer: QueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private anonId: string | null = null;

  constructor() {
    if (typeof window === "undefined") return;
    this.anonId = this.getAnonymousId();

    this.flushTimer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);

    // Best-effort flush when the tab is hidden/closed.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void this.flush();
    });
  }

  private log(type: string, data: Record<string, unknown>) {
    if (this.isDev) {
      console.log(`[Analytics] Event tracked: ${type}`, data);
    }
  }

  private enqueue(type: string, payload: Record<string, unknown> = {}, pathname?: string) {
    if (typeof window === "undefined") return;
    const event: QueuedEvent = {
      type,
      timestamp: new Date().toISOString(),
      anonymousId: this.anonId ?? "unknown",
      payload,
      pathname: pathname ?? window.location.pathname,
    };
    this.buffer.push(event);
    if (this.buffer.length >= MAX_BUFFER) void this.flush();
  }

  private async flush() {
    if (typeof window === "undefined" || this.buffer.length === 0) return;
    const events = this.buffer.splice(0, MAX_BUFFER);
    try {
      const body = JSON.stringify({ events });
      if (body.length > MAX_PAYLOAD_BYTES) return;
      fetch("/api/v1/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
        signal: AbortSignal.timeout(3000),
      }).catch(() => {
        /* analytics must never surface errors */
      });
    } catch {
      /* never throw */
    }
  }

  private getAnonymousId(): string {
    if (typeof window === "undefined") return "server";
    let id = localStorage.getItem("TradCopilot_anon_id");
    if (!id) {
      id = "tp_anon_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 8);
      localStorage.setItem("TradCopilot_anon_id", id);
    }
    return id;
  }

  // ------------------------------------------------------------------
  // Public event API — the funnel definition.
  // ------------------------------------------------------------------

  public trackPageView(url: string) {
    this.log("PageView", { url });
    this.enqueue("page_view", { url }, url);
  }

  public trackLandingViewed(metadata?: Record<string, unknown>) {
    this.log("Landing Viewed", metadata ?? {});
    this.enqueue("landing_viewed", metadata ?? {});
  }

  public trackHeroCtaClicked(ctaType: string) {
    this.log("Hero CTA Clicked", { ctaType });
    this.enqueue("hero_cta_clicked", { ctaType });
  }

  public trackInstantDemoStarted() {
    this.log("Instant Demo Started", {});
    this.enqueue("instant_demo_started", {});
  }

  public trackDemoAnalysis(analysisNumber: number, symbol: string) {
    this.log(`Demo Analysis #${analysisNumber}`, { analysisNumber, symbol });
    this.enqueue("demo_analysis", { analysisNumber, symbol });
  }

  public trackSignupModalOpened(reason: string) {
    this.log("Signup Modal Opened", { reason });
    this.enqueue("signup_modal_opened", { reason });
  }

  public trackSignupCompleted() {
    this.log("Signup Completed", {});
    this.enqueue("signup_completed", {});
  }

  public trackLoginCompleted() {
    this.log("Login Completed", {});
    this.enqueue("login_completed", {});
  }

  public trackGoogleOAuthStarted(source?: string) {
    this.log("Google OAuth Started", { source: source ?? "unknown" });
    this.enqueue("google_oauth_started", { source: source ?? "unknown" });
  }

  public trackGoogleOAuthCompleted() {
    this.log("Google OAuth Completed", {});
    this.enqueue("google_oauth_completed", {});
  }

  public trackDashboardLoaded(isDemo: boolean) {
    this.log("Dashboard Loaded", { isDemo });
    this.enqueue("dashboard_loaded", { isDemo });
  }

  public trackFirstAIAnalysis(symbol: string) {
    this.log("First AI Analysis", { symbol });
    this.enqueue("first_ai_analysis", { symbol });
  }

  public trackAnalysisCompleted(symbol: string, timeframe: string, source: "ai" | "fallback" | "cache") {
    this.log("Analysis Completed", { symbol, timeframe, source });
    this.enqueue("analysis_completed", { symbol, timeframe, source });
  }

  public trackThesisCreated(symbol: string) {
    this.log("Thesis Created", { symbol });
    this.enqueue("thesis_created", { symbol });
  }

  public trackThesisOutcomeLogged(result: string) {
    this.log("Thesis Outcome Logged", { result });
    this.enqueue("thesis_outcome_logged", { result });
  }

  public trackJournalEntryCreated() {
    this.log("Journal Entry Created", {});
    this.enqueue("journal_entry_created", {});
  }

  public trackAnalysisShared(symbol: string) {
    this.log("Analysis Shared", { symbol });
    this.enqueue("analysis_shared", { symbol });
  }

  public trackFeatureUsage(feature: string, metadata?: Record<string, unknown>) {
    this.log("FeatureUsage", { feature, ...metadata });
    this.enqueue("feature_usage", { feature, ...metadata });
  }

  public trackConversion(event: string, plan?: string, value?: number) {
    this.log("Conversion", { event, plan, value });
    this.enqueue("conversion", { event, plan, value });
  }

  public trackError(message: string, stack?: string) {
    this.log("ErrorOccurred", { message });
    this.enqueue("error", { message, stack: stack?.slice(0, 300) });
  }

  /** Flush remaining events immediately (e.g. on route change). */
  public async flushNow() {
    await this.flush();
  }
}

export const analytics = new ProductAnalytics();
export default analytics;
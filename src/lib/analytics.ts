"use client";

class ProductAnalytics {
  private isDev = process.env.NODE_ENV === "development";

  public trackPageView(url: string) {
    this.log("PageView", { url });
    this.sendToBackend("page_view", { url });
  }

  public trackLandingViewed(metadata?: Record<string, any>) {
    this.log("Landing Viewed", metadata || {});
    this.sendToBackend("landing_viewed", metadata || {});
  }

  public trackHeroCtaClicked(ctaType: string) {
    this.log("Hero CTA Clicked", { ctaType });
    this.sendToBackend("hero_cta_clicked", { ctaType });
  }

  public trackInstantDemoStarted() {
    this.log("Instant Demo Started", { timestamp: new Date().toISOString() });
    this.sendToBackend("instant_demo_started", {});
  }

  public trackDemoAnalysis(analysisNumber: number, symbol: string) {
    this.log(`Demo Analysis #${analysisNumber}`, { analysisNumber, symbol });
    this.sendToBackend("demo_analysis", { analysisNumber, symbol });
  }

  public trackSignupModalOpened(reason: string) {
    this.log("Signup Modal Opened", { reason });
    this.sendToBackend("signup_modal_opened", { reason });
  }

  public trackGoogleOAuthStarted(source?: string) {
    this.log("Google OAuth Started", { source: source || "unknown" });
    this.sendToBackend("google_oauth_started", { source: source || "unknown" });
  }

  public trackGoogleOAuthCompleted() {
    this.log("Google OAuth Completed", {});
    this.sendToBackend("google_oauth_completed", {});
  }

  public trackDashboardLoaded(isDemo: boolean) {
    this.log("Dashboard Loaded", { isDemo });
    this.sendToBackend("dashboard_loaded", { isDemo });
  }

  public trackFirstAIAnalysis(symbol: string) {
    this.log("First AI Analysis", { symbol });
    this.sendToBackend("first_ai_analysis", { symbol });
  }

  public trackFeatureUsage(feature: string, metadata?: Record<string, any>) {
    this.log("FeatureUsage", { feature, ...metadata });
    this.sendToBackend("feature_usage", { feature, ...metadata });
  }

  public trackConversion(event: string, plan?: string, value?: number) {
    this.log("Conversion", { event, plan, value });
    this.sendToBackend("conversion", { event, plan, value });
  }

  public trackError(message: string, stack?: string) {
    this.log("ErrorOccurred", { message, stack });
    this.sendToBackend("error", { message, stack: stack?.slice(0, 300) });
  }

  private log(type: string, data: Record<string, any>) {
    if (this.isDev) {
      console.log(`[Analytics] Event tracked: ${type}`, data);
    }
  }

  private async sendToBackend(type: string, payload: Record<string, any>) {
    try {
      fetch("/api/v1/admin/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          timestamp: new Date().toISOString(),
          anonymousId: this.getAnonymousId(),
          payload,
        }),
        signal: AbortSignal.timeout(2000),
      }).catch(() => {});
    } catch (_) {}
  }

  private getAnonymousId(): string {
    if (typeof window === "undefined") return "server";
    let id = localStorage.getItem("tradepilot_anon_id");
    if (!id) {
      id = "tp_anon_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("tradepilot_anon_id", id);
    }
    return id;
  }
}

export const analytics = new ProductAnalytics();
export default analytics;


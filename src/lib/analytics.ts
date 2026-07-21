"use client";

interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

class ProductAnalytics {
  private isDev = process.env.NODE_ENV === "development";

  public trackPageView(url: string) {
    this.log("PageView", { url });
    // Connect to backend metrics endpoint
    this.sendToBackend("page_view", { url });
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
      // Send anonymous request to backend admin/metrics endpoint
      fetch("/api/v1/admin/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          timestamp: new Date().toISOString(),
          anonymousId: this.getAnonymousId(),
          payload,
        }),
      }).catch(() => {}); // Omit catching to prevent loops
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

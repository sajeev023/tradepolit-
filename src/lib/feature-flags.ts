"use client";

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  isActive: boolean;
}

class FeatureFlagsManager {
  private cache: Record<string, boolean> = {
    live_ws: false,
    ai_monitoring: true,
    paper_execution: false,
  };
  private lastFetch = 0;
  private ttl = 60 * 1000; // 1 minute caching

  public async isEnabled(key: string): Promise<boolean> {
    if (Date.now() - this.lastFetch > this.ttl) {
      await this.refreshFlags();
    }
    return this.cache[key] ?? false;
  }

  public getCachedValue(key: string): boolean {
    return this.cache[key] ?? false;
  }

  public async refreshFlags(): Promise<void> {
    try {
      const res = await fetch("/api/v1/admin/feature-flags");
      if (res.ok) {
        const body = await res.json();
        if (Array.isArray(body.data)) {
          const updated: Record<string, boolean> = {};
          body.data.forEach((flag: FeatureFlag) => {
            updated[flag.key] = flag.isActive;
          });
          this.cache = updated;
          this.lastFetch = Date.now();
        }
      }
    } catch (err) {
      console.warn("[Feature Flags] Failed to refresh flags. Using in-memory defaults.", err);
    }
  }
}

export const featureFlags = new FeatureFlagsManager();
export default featureFlags;

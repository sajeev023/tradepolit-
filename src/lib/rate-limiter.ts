"use client";

import { toast } from "sonner";

interface RequestQueueItem {
  url: string;
  options?: RequestInit;
  resolve: (value: Response | PromiseLike<Response>) => void;
  reject: (reason?: any) => void;
  retries: number;
}

class ApiRateLimiter {
  private queue: RequestQueueItem[] = [];
  private processing = false;
  private maxRetries = 3;
  private baseDelay = 1000; // 1s base for backoff

  public async fetch(url: string, options?: RequestInit): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // If rate limited (HTTP 429), queue the request for auto-retry
      if (response.status === 429) {
        console.warn(`[Rate Limiter] HTTP 429 received for: ${url}. Queueing for retry.`);
        toast.warning("API Rate limit reached. Queueing request with retry backoff...");
        return new Promise<Response>((resolve, reject) => {
          this.queue.push({ url, options, resolve, reject, retries: 0 });
          this.processQueue();
        });
      }

      return response;
    } catch (err) {
      // Catch network failures and try to queue them if transient
      console.error(`[Rate Limiter] Network error for: ${url}`, err);
      throw err;
    }
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      const delay = Math.pow(2, item.retries) * this.baseDelay + Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay));

      try {
        console.log(`[Rate Limiter] Retrying request: ${item.url} (Attempt ${item.retries + 1}/${this.maxRetries})`);
        const response = await fetch(item.url, item.options);

        if (response.status === 429) {
          if (item.retries < this.maxRetries) {
            item.retries += 1;
            this.queue.push(item); // Re-queue at the end
            toast.warning(`Retrying request dynamically in ${(delay / 1000).toFixed(1)}s...`);
          } else {
            toast.error("API request failed after maximum retries due to rate limit.");
            item.reject(response);
          }
        } else {
          item.resolve(response);
        }
      } catch (err) {
        if (item.retries < this.maxRetries) {
          item.retries += 1;
          this.queue.push(item);
        } else {
          item.reject(err);
        }
      }
    }

    this.processing = false;
  }
}

export const rateLimitedFetch = new ApiRateLimiter();
export default rateLimitedFetch;

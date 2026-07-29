import { NextRequest } from "next/server";
import { getNewsFeed } from "@/lib/news";
import { successResponse } from "@/lib/api-helpers";
import { checkIpRateLimit } from "@/lib/rate-limit";
import { rateLimitedError, dispatchCaughtError } from "@/lib/typed-errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // IP rate limit: 30 / min. News pulls from Finnhub + NewsAPI (paid
    // quotas); a scraper loop burns our quota for real users.
    const rl = checkIpRateLimit(request, "news", 30, 60_000);
    if (!rl.allowed) {
      return rateLimitedError((rl.resetAt - Date.now()), "Too many news requests. Please slow down.");
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const news = await getNewsFeed(symbol, page, limit, request.signal);
    return successResponse(news);
  } catch (error) {
    console.error("News API route error:", error);
    return dispatchCaughtError("Failed to fetch news feed", error);
  }
}

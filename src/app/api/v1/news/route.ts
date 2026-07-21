import { NextRequest } from "next/server";
import { getNewsFeed } from "@/lib/news";
import { successResponse, internalError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const news = await getNewsFeed(symbol, page, limit);
    return successResponse(news);
  } catch (error) {
    console.error("News API route error:", error);
    return internalError("Failed to fetch news feed");
  }
}

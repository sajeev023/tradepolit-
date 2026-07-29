import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { parseChatMessages } from "@/lib/chat-message";

// GET /api/v1/ai/chats/latest
// Returns the most recently updated chat session (< 4 hours old) with full messages.
// Used for session restoration on page load.
export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const chat = await prisma.aIChat.findFirst({
      where: {
        userId: user.id,
        updatedAt: { gte: fourHoursAgo },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!chat) {
      return successResponse(null);
    }

    const messages = parseChatMessages(chat.messages);

    return successResponse({
      id: chat.id,
      title: chat.title,
      symbol: chat.symbol,
      timeframe: chat.timeframe,
      messages,
      updatedAt: chat.updatedAt,
    });
  } catch (err) {
    console.error("Get latest chat error:", err);
    return dispatchCaughtError("Failed to load latest session", err);
  }
}

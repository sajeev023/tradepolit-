import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  successResponse,
  paginatedResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";

const createChatSchema = z.object({
  title: z.string().min(1, "Title is required").default("New Chat Session"),
});

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const [chats, total] = await Promise.all([
      prisma.aIChat.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.aIChat.count({ where: { userId: user.id } }),
    ]);

    // Enrich with preview text, symbol, timeframe, message count
    const sessions = chats.map((chat: any) => {
      const messages = Array.isArray(chat.messages) ? (chat.messages as any[]) : [];
      const firstUserMsg = messages.find((m: any) => m.role === "user");
      const preview = firstUserMsg?.content?.slice(0, 80) ?? chat.title;
      return {
        id: chat.id,
        title: chat.title,
        symbol: (chat as any).symbol ?? null,
        timeframe: (chat as any).timeframe ?? null,
        preview,
        messageCount: messages.length,
        updatedAt: chat.updatedAt,
        createdAt: chat.createdAt,
      };
    });

    return paginatedResponse(sessions, page, limit, total);
  } catch (error) {
    console.error("List AI chats API error:", error);
    return dispatchCaughtError("Failed to list AI chats", error);
  }
}


export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const json = await request.json().catch(() => ({}));
    const validation = createChatSchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const chat = await prisma.aIChat.create({
      data: {
        userId: user.id,
        title: validation.data.title,
        messages: [],
      },
    });

    return successResponse(chat, 201);
  } catch (error) {
    console.error("Create AI chat API error:", error);
    return dispatchCaughtError("Failed to create AI chat", error);
  }
}

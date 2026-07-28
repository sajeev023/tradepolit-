import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  notFoundError,
} from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { resolvePlan } from "@/lib/entitlements";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { id } = await params;

    const chat = await prisma.aIChat.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!chat) {
      return notFoundError("AI Chat");
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { plan: true, subscriptionStatus: true, subscriptionExpiresAt: true },
    });

    let chatMessages = Array.isArray(chat.messages) ? (chat.messages as any[]) : [];
    const plan = resolvePlan(user.id, user.email, userProfile?.plan, userProfile?.subscriptionStatus, userProfile?.subscriptionExpiresAt);
    if (plan !== "PRO") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      chatMessages = chatMessages.filter((m: any) => new Date(m.createdAt) >= sevenDaysAgo);
    }

    return successResponse({
      ...chat,
      messages: chatMessages,
    });
  } catch (error) {
    console.error("Get AI chat API error:", error);
    return dispatchCaughtError("Failed to fetch AI chat", error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { id } = await params;

    const chat = await prisma.aIChat.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!chat) {
      return notFoundError("AI Chat");
    }

    await prisma.aIChat.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Delete AI chat API error:", error);
    return dispatchCaughtError("Failed to delete AI chat", error);
  }
}

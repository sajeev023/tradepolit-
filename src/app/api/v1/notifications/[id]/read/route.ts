import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  notFoundError,
  internalError,
} from "@/lib/api-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { id } = await params;
    const notification = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    });

    if (!notification) {
      return notFoundError("Notification");
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return successResponse(updated);
  } catch (error) {
    console.error("Mark notification read API error:", error);
    return internalError("Failed to mark notification as read");
  }
}

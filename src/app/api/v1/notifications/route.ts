import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  internalError,
} from "@/lib/api-helpers";

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20, // get latest 20 notifications
    });

    return successResponse(notifications);
  } catch (error) {
    console.error("List notifications API error:", error);
    return internalError("Failed to list notifications");
  }
}

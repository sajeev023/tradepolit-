import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  validationError,
} from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";

const toggleUserSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: currentUser, error } = await getAuthenticatedUser();
    if (error || !currentUser) return error ?? unauthorizedError();

    // Enforce Admin Role
    if (currentUser.role !== "ADMIN") {
      return forbiddenError();
    }

    const { id } = await params;

    // Prevent suspending yourself
    if (currentUser.id === id) {
      return validationError({
        issues: [{ path: ["id"], message: "You cannot suspend your own admin account" }],
      } as any);
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return notFoundError("User");
    }

    const json = await request.json();
    const validation = toggleUserSchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        isActive: validation.data.isActive,
      },
    });

    return successResponse(updated);
  } catch (error) {
    console.error("Admin toggle user API error:", error);
    return dispatchCaughtError("Failed to update user status", error);
  }
}

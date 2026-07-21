import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  notFoundError,
  validationError,
  internalError,
} from "@/lib/api-helpers";

const updateAlertSchema = z.object({
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { id } = await params;
    const alert = await prisma.alert.findFirst({
      where: { id, userId: user.id },
    });

    if (!alert) {
      return notFoundError("Alert");
    }

    const json = await request.json();
    const validation = updateAlertSchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: validation.data,
    });

    return successResponse(updated);
  } catch (error) {
    console.error("Update alert API error:", error);
    return internalError("Failed to update alert");
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
    const alert = await prisma.alert.findFirst({
      where: { id, userId: user.id },
    });

    if (!alert) {
      return notFoundError("Alert");
    }

    await prisma.alert.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Delete alert API error:", error);
    return internalError("Failed to delete alert");
  }
}

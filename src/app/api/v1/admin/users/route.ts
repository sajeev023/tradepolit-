import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, forbiddenError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Enforce Admin Role
    if (user.role !== "ADMIN") {
      return forbiddenError();
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    const users = await prisma.user.findMany({
      where: query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" as any } },
              { displayName: { contains: query, mode: "insensitive" as any } },
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
    });

    return successResponse(users);
  } catch (error) {
    console.error("Admin user list API error:", error);
    return dispatchCaughtError("Failed to list users", error);
  }
}

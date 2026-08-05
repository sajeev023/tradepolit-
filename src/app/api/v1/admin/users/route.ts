import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, requireAdmin } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Enforce Admin Role — single source of truth via requireAdmin (M-1).
    const isDemo = user.email?.endsWith("@tradcopilot.local") === true;
    const adminCheck = await requireAdmin(user.id, isDemo);
    if (!adminCheck.ok) return adminCheck.response;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const take = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const skip = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

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
      take,
      skip,
      // Limit returned fields — never expose sensitive columns to the client.
      select: { id: true, email: true, displayName: true, role: true, isActive: true, createdAt: true },
    });

    return successResponse(users);
  } catch (error) {
    console.error("Admin user list API error:", error);
    return dispatchCaughtError("Failed to list users", error);
  }
}

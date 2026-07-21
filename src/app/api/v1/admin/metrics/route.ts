import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, forbiddenError, internalError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Enforce Admin Role
    if (user.role !== "ADMIN") {
      return forbiddenError();
    }

    const totalUsers = await prisma.user.count();

    // Mock realistic dashboard statistics for Founders/Ops
    const signupTrend = [
      { date: "Mon", count: 2 },
      { date: "Tue", count: 4 },
      { date: "Wed", count: 3 },
      { date: "Thu", count: 7 },
      { date: "Fri", count: 5 },
      { date: "Sat", count: 9 },
      { date: "Sun", count: 12 },
    ];

    return successResponse({
      totalUsers,
      dau: Math.max(1, Math.round(totalUsers * 0.4)),
      wau: Math.max(1, Math.round(totalUsers * 0.7)),
      apiErrorRate: "0.04%",
      signupTrend,
    });
  } catch (error) {
    console.error("Admin metrics API error:", error);
    return internalError("Failed to fetch admin stats metrics");
  }
}

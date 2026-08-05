import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, forbiddenError, validationError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { z } from "zod";

const DEFAULT_FLAGS = [
  { key: "live_ws", name: "Live Crypto Websockets", description: "Enable high-speed direct feeds from Binance Websocket streams", isActive: false },
  { key: "ai_monitoring", name: "AI Proactive Monitoring", description: "Allow NVIDIA Llama-3.3-Nemotron to monitor key levels in background", isActive: true },
  { key: "paper_execution", name: "Instant Paper Execution", description: "Permit virtual trade orders to execute directly on chart event triggers", isActive: false },
];

async function requireAdmin() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return { user: null, response: error ?? unauthorizedError() };
  if (user.role !== "ADMIN") return { user: null, response: forbiddenError() };
  return { user, response: null };
}

export async function GET(_request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    let flags = await prisma.featureFlag.findMany({
      orderBy: { name: "asc" },
    });

    if (flags.length === 0) {
      await prisma.featureFlag.createMany({ data: DEFAULT_FLAGS });
      flags = await prisma.featureFlag.findMany({
        orderBy: { name: "asc" },
      });
    }

    return successResponse(flags);
  } catch (error) {
    console.error("Failed to fetch feature flags:", error);
    return dispatchCaughtError("Failed to fetch feature flags", error);
  }
}

const patchSchema = z.object({
  key: z.string().min(1, "Feature flag key is required"),
  isActive: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const json = await request.json();
    const validation = patchSchema.safeParse(json);
    if (!validation.success) return validationError(validation.error);

    const { key, isActive } = validation.data;

    const flag = await prisma.featureFlag.update({
      where: { key },
      data: { isActive },
    });

    return successResponse(flag);
  } catch (error) {
    console.error("Failed to update feature flag:", error);
    return dispatchCaughtError("Failed to update feature flag", error);
  }
}
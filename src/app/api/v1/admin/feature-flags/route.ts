import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, internalError } from "@/lib/api-helpers";

const DEFAULT_FLAGS = [
  { key: "live_ws", name: "Live Crypto Websockets", description: "Enable high-speed direct feeds from Binance Websocket streams", isActive: false },
  { key: "ai_monitoring", name: "AI Proactive Monitoring", description: "Allow NVIDIA Llama-3.3-Nemotron to monitor key levels in background", isActive: true },
  { key: "paper_execution", name: "Instant Paper Execution", description: "Permit virtual trade orders to execute directly on chart event triggers", isActive: false },
];

export async function GET(request: NextRequest) {
  try {
    let flags = await prisma.featureFlag.findMany({
      orderBy: { name: "asc" },
    });

    if (flags.length === 0) {
      // Seed default flags if table is empty
      await prisma.$executeRawUnsafe("SELECT 1"); // Verify connection first
      await prisma.featureFlag.createMany({
        data: DEFAULT_FLAGS,
      });
      flags = await prisma.featureFlag.findMany({
        orderBy: { name: "asc" },
      });
    }

    return successResponse(flags);
  } catch (error) {
    console.error("Failed to fetch feature flags:", error);
    return internalError("Failed to fetch feature flags");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, isActive } = body;
    if (!key) {
      return internalError("Feature flag key is required");
    }

    const flag = await prisma.featureFlag.update({
      where: { key },
      data: { isActive },
    });

    return successResponse(flag);
  } catch (error) {
    console.error("Failed to update feature flag:", error);
    return internalError("Failed to update feature flag");
  }
}

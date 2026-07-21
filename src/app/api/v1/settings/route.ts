import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encryption";
import {
  successResponse,
  unauthorizedError,
  validationError,
  internalError,
} from "@/lib/api-helpers";

const settingsSchema = z.object({
  notifyEmail: z.boolean().optional(),
  notifyInApp: z.boolean().optional(),
  coinmarketcapKey: z.string().optional(),
  twelvedataKey: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // 1. Fetch settings (upsert if not exists)
    const settings = await prisma.setting.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    // 2. Fetch keys
    const apiKeys = await prisma.userApiKey.findMany({
      where: { userId: user.id },
    });

    const cmcKey = apiKeys.find((k: any) => k.provider === "coinmarketcap");
    const tdKey = apiKeys.find((k: any) => k.provider === "twelvedata");

    return successResponse({
      theme: "dark",
      notifyEmail: settings.notifyEmail,
      notifyInApp: settings.notifyInApp,
      hasCmcKey: !!cmcKey,
      hasTdKey: !!tdKey,
      // Mask key for safety if displaying back
      coinmarketcapKey: cmcKey ? "••••••••••••••••" : "",
      twelvedataKey: tdKey ? "••••••••••••••••" : "",
    });
  } catch (error) {
    console.error("Get settings API error:", error);
    return internalError("Failed to fetch settings");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const json = await request.json();
    const validation = settingsSchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { notifyEmail, notifyInApp, coinmarketcapKey, twelvedataKey } = validation.data;

    // Update settings table
    const settings = await prisma.setting.upsert({
      where: { userId: user.id },
      update: {
        theme: "dark",
        ...(notifyEmail !== undefined ? { notifyEmail } : {}),
        ...(notifyInApp !== undefined ? { notifyInApp } : {}),
      },
      create: {
        userId: user.id,
        theme: "dark",
        notifyEmail: notifyEmail !== undefined ? notifyEmail : true,
        notifyInApp: notifyInApp !== undefined ? notifyInApp : true,
      },
    });

    // Update API keys if provided
    if (coinmarketcapKey && coinmarketcapKey !== "••••••••••••••••") {
      const encrypted = encrypt(coinmarketcapKey);
      await prisma.userApiKey.deleteMany({
        where: { userId: user.id, provider: "coinmarketcap" },
      });
      await prisma.userApiKey.create({
        data: {
          userId: user.id,
          provider: "coinmarketcap",
          encryptedKey: encrypted,
        },
      });
    }

    if (twelvedataKey && twelvedataKey !== "••••••••••••••••") {
      const encrypted = encrypt(twelvedataKey);
      await prisma.userApiKey.deleteMany({
        where: { userId: user.id, provider: "twelvedata" },
      });
      await prisma.userApiKey.create({
        data: {
          userId: user.id,
          provider: "twelvedata",
          encryptedKey: encrypted,
        },
      });
    }

    return successResponse({
      theme: "dark",
      notifyEmail: settings.notifyEmail,
      notifyInApp: settings.notifyInApp,
      hasCmcKey: true, // or updated status
    });
  } catch (error) {
    console.error("Update settings API error:", error);
    return internalError("Failed to update settings");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Delete user from Prisma database (this cascade-deletes all trades, api keys, alerts, settings, backtests, and AI chats)
    await prisma.user.delete({
      where: { id: user.id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Delete account API error:", error);
    return internalError("Failed to delete account");
  }
}

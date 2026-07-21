import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  successResponse,
  unauthorizedError,
  notFoundError,
  validationError,
  internalError,
} from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { id } = await params;

    // Verify ownership
    const existingTrade = await prisma.trade.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingTrade) {
      return notFoundError("Trade");
    }

    // Parse multipart form
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return validationError({
        issues: [{ path: ["file"], message: "File is required" }],
      } as any);
    }

    // Basic size and type validation
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (file.size > maxSizeBytes) {
      return validationError({
        issues: [{ path: ["file"], message: "File size exceeds 5MB limit" }],
      } as any);
    }

    if (!allowedTypes.includes(file.type)) {
      return validationError({
        issues: [{ path: ["file"], message: "Only JPEG, PNG, and WebP are allowed" }],
      } as any);
    }

    // Upload to Supabase Storage
    const supabase = await createClient();
    const fileExtension = file.name.split(".").pop() || "png";
    const filePath = `${user.id}/${id}_${Date.now()}.${fileExtension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("screenshots")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return internalError("Failed to upload screenshot to storage");
    }

    // Retrieve public or signed URL
    const { data: urlData } = supabase.storage
      .from("screenshots")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update trade screenshots array
    const updatedScreenshots = [...existingTrade.screenshots, publicUrl];

    const updatedTrade = await prisma.trade.update({
      where: { id },
      data: {
        screenshots: updatedScreenshots,
      },
    });

    return successResponse({
      screenshots: updatedTrade.screenshots,
    });
  } catch (error) {
    console.error("Trade screenshot upload API error:", error);
    return internalError("Failed to upload screenshot");
  }
}

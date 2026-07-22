import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  successResponse,
  unauthorizedError,
  notFoundError,
  validationError,
} from "@/lib/api-helpers";
import { dispatchCaughtError, upstreamError } from "@/lib/typed-errors";

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
      return upstreamError("storage", "Failed to upload screenshot to storage");
    }

    // Generate a signed URL (1-hour expiry) instead of a public URL. The
    // screenshots bucket should NOT be made public — signed URLs prevent
    // enumeration attacks where anyone who guesses a path could view another
    // user's trade screenshot. The 1-hour window matches a typical viewing
    // session; users who reload later can re-upload.
    const { data: signedData, error: signedError } = await supabase.storage
      .from("screenshots")
      .createSignedUrl(filePath, 3600);

    if (signedError || !signedData?.signedUrl) {
      console.error("Supabase signed URL generation error:", signedError);
      return upstreamError("storage", "Failed to generate screenshot URL");
    }

    const screenshotUrl = signedData.signedUrl;

    // Update trade screenshots array
    const updatedScreenshots = [...existingTrade.screenshots, screenshotUrl];

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
    return dispatchCaughtError("Failed to upload screenshot", error);
  }
}

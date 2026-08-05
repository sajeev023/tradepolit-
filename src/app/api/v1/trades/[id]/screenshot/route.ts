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

// Detect image type from magic bytes. Returns null for non-image or
// unrecognized formats. This is the only reliable way to validate an
// upload — the client-supplied MIME type and filename are trivially spoofed.
function detectImageType(buffer: Buffer): { mimeType: string; extension: string } | null {
  if (buffer.length < 4) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mimeType: "image/png", extension: "png" };
  }
  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
}

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

    // Size validation
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      return validationError({
        issues: [{ path: ["file"], message: "File size exceeds 5MB limit" }],
      } as any);
    }

    // Per-trade screenshot cap (prevent unbounded storage growth / DoS).
    const MAX_SCREENSHOTS_PER_TRADE = 10;
    if (existingTrade.screenshots.length >= MAX_SCREENSHOTS_PER_TRADE) {
      return validationError({
        issues: [{ path: ["file"], message: `Maximum ${MAX_SCREENSHOTS_PER_TRADE} screenshots per trade` }],
      } as any);
    }

    // Read the file and validate by MAGIC BYTES — never trust the client
    //-supplied MIME type or filename extension (both trivially spoofed).
    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedType = detectImageType(buffer);
    if (!detectedType) {
      return validationError({
        issues: [{ path: ["file"], message: "Only JPEG, PNG, and WebP images are allowed" }],
      } as any);
    }

    // Upload to Supabase Storage
    const supabase = await createClient();
    const fileExtension = detectedType.extension;
    const filePath = `${user.id}/${id}_${Date.now()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("screenshots")
      .upload(filePath, buffer, {
        contentType: detectedType.mimeType,
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

/**
 * src/lib/site-url.ts
 *
 * Single source of truth for canonical site URLs, sitemap, robots,
 * metadata, and OAuth/Stripe return URLs.
 */

export const CANONICAL_SITE_URL = "https://tradcopilot.com";
export const CANONICAL_DOMAIN = "tradcopilot.com";

const LOCAL_OR_PREVIEW_PATTERNS: RegExp[] = [
  /^https?:\/\/localhost(:\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^https?:\/\/0\.0\.0\.0(:\d+)?$/i,
  /^https?:\/\/\[::1\](:\d+)?$/i,
  /^https?:\/\/.*\.local(:\d+)?$/i,
  /^https?:\/\/.*\.internal(:\d+)?$/i,
  /^https?:\/\/.*\.vercel\.app$/i,
];

/**
 * Returns true if the provided URL matches a localhost, loopback, internal, or preview pattern.
 */
export function isLocalOrPreviewUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const trimmed = url.trim().replace(/\/+$/, "");
  return LOCAL_OR_PREVIEW_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Returns the canonical, fully-qualified base URL for SEO (sitemap.xml, robots.txt, metadataBase).
 *
 * In production or build environments (NODE_ENV === "production" or VERCEL_ENV === "production"),
 * this is GUARANTEED to return "https://tradcopilot.com".
 * Any misconfigured environment variables (such as localhost:3000, 127.0.0.1, or Vercel preview domains)
 * are strictly rejected and sanitized in production to prevent search engine indexing pollution.
 *
 * In local development (NODE_ENV !== "production"), it allows NEXT_PUBLIC_APP_URL
 * for local testing if specified, and defaults to "http://localhost:3000".
 */
export function getSiteUrl(): string {
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  if (isProd) {
    const customUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
    if (customUrl && !isLocalOrPreviewUrl(customUrl)) {
      // Validate proper protocol
      if (customUrl.startsWith("https://")) {
        return customUrl;
      }
      if (customUrl.startsWith("http://")) {
        // Upgrade to https in production
        return customUrl.replace(/^http:\/\//, "https://");
      }
      return `https://${customUrl}`;
    }
    return CANONICAL_SITE_URL;
  }

  // Local development / non-production
  const devUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

  if (devUrl) {
    return devUrl;
  }

  return "http://localhost:3000";
}

/**
 * Always returns the canonical production site URL (https://tradcopilot.com).
 */
export function getCanonicalSiteUrl(): string {
  return CANONICAL_SITE_URL;
}

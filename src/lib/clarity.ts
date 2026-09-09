import Clarity from "@microsoft/clarity";

/**
 * Track a custom event in Microsoft Clarity.
 *
 * @param eventName Name of the custom event to record
 */
export function trackClarityEvent(eventName: string): void {
  if (typeof window === "undefined") return;
  try {
    Clarity.event(eventName);
  } catch (error) {
    console.warn("[Microsoft Clarity] Failed to record event:", error);
  }
}

/**
 * Set a custom key-value tag in Microsoft Clarity session.
 *
 * @param key Tag key name
 * @param value Tag string or array of strings
 */
export function setClarityTag(key: string, value: string | string[]): void {
  if (typeof window === "undefined") return;
  try {
    Clarity.setTag(key, value);
  } catch (error) {
    console.warn("[Microsoft Clarity] Failed to set tag:", error);
  }
}

/**
 * Identify a user in Microsoft Clarity.
 *
 * @param customId Unique identifier for the customer (hashed client-side by Clarity SDK)
 * @param customSessionId Optional custom session ID
 * @param customPageId Optional custom page ID
 * @param friendlyName Optional display name for the customer
 */
export function identifyClarityUser(
  customId: string,
  customSessionId?: string,
  customPageId?: string,
  friendlyName?: string
): void {
  if (typeof window === "undefined") return;
  try {
    Clarity.identify(customId, customSessionId, customPageId, friendlyName);
  } catch (error) {
    console.warn("[Microsoft Clarity] Failed to identify user:", error);
  }
}

/**
 * Grant or deny cookie consent in Microsoft Clarity.
 *
 * @param analyticsGranted Whether analytics storage is granted
 * @param adGranted Whether ad storage is granted
 */
export function setClarityConsent(analyticsGranted = true, adGranted = true): void {
  if (typeof window === "undefined") return;
  try {
    Clarity.consentV2({
      analytics_Storage: analyticsGranted ? "granted" : "denied",
      ad_Storage: adGranted ? "granted" : "denied",
    });
  } catch (error) {
    console.warn("[Microsoft Clarity] Failed to set consent:", error);
  }
}

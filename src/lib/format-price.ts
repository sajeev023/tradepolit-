/**
 * formatPrice — Magnitude-aware price formatter shared across the UI.
 *
 * Rule:
 *   - Prices >= 1000        → 2 decimals (BTC, ETH, major indices)
 *   - Prices >= 1 and < 1000 → 4 decimals (SOL, mid-cap crypto)
 *   - Prices < 1             → 6 decimals (micro-priced assets)
 *
 * Forex pairs (JPY) and commodities (XAU) keep 2 decimals by convention.
 */
export function formatPrice(
  symbol: string,
  price: number
): string {
  if (!Number.isFinite(price)) return "—";

  if (
    symbol.includes("JPY") ||
    symbol.includes("NASDAQ") ||
    symbol.includes("S&P500") ||
    symbol.includes("XAU")
  ) {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const absPrice = Math.abs(price);
  let digits = 4;
  if (absPrice >= 1000) {
    digits = 2;
  } else if (absPrice < 1) {
    digits = 6;
  }

  return price.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

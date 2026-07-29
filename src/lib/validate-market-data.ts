import { isSupportedSymbol } from "./supported-symbols";
import { normalizeTimeframe, timeframeDurationMs } from "./timeframes";

export function validateMarketData(data: any, symbol: string, timeframe: string): string[] {
  const errors: string[] = [];

  // 1. Check symbol format. Accept any symbol in the supported-instrument
  // registry (covers pairs like BTC/USD, bare indices like NASDAQ / NIFTY50,
  // and bare stock tickers like AAPL / SHEL.L / 7203 / RELIANCE), OR a
  // BASE/QUOTE pair. The registry is the source of truth — every bare index
  // ticker is a registry entry, so a separate hardcoded index set would just
  // drift out of sync (it previously listed "FTSE" while the registry has
  // "FTSE100").
  const PAIR_PATTERN = /^[A-Z0-9.\-]+\/[A-Z0-9]+$/;
  const sym = typeof data.symbol === "string" ? data.symbol.toUpperCase() : "";
  const isPair = PAIR_PATTERN.test(sym);
  const isSupported = isSupportedSymbol(sym);
  if (!sym || (!isPair && !isSupported)) {
    errors.push(`Invalid symbol format: ${data.symbol}`);
  }

  // 2. Check current price exists and is reasonable
  if (!data.currentPrice || isNaN(data.currentPrice) || data.currentPrice <= 0) {
    errors.push(`Invalid current price: ${data.currentPrice}`);
  }
  if (data.currentPrice > 1000000) {
    errors.push(`Price suspiciously high: ${data.currentPrice}`);
  }

  // 3. Check OHLCV data
  if (!data.ohlcv || !Array.isArray(data.ohlcv) || data.ohlcv.length < 50) {
    errors.push(`Insufficient OHLCV data: ${data.ohlcv?.length || 0} candles (minimum 50 required)`);
  }

  // 4. Validate each candle
  if (data.ohlcv) {
    data.ohlcv.forEach((candle: any, index: number) => {
      if (!candle.open || !candle.high || !candle.low || !candle.close) {
        errors.push(`Candle ${index} missing OHLC values`);
      }
      if (candle.high < candle.low) {
        errors.push(`Candle ${index}: high (${candle.high}) < low (${candle.low})`);
      }
      if (candle.open < candle.low || candle.open > candle.high) {
        errors.push(`Candle ${index}: open outside high-low range`);
      }
    });
  }

  // 5. Check timeframe against the canonical timeframe union (timeframes.ts).
  // Previously a separate hardcoded list here accepted "30m" — a phantom TF
  // no provider actually maps — so validation passed but market.ts silently
  // fell back to a default. Sharing one source of truth closes that gap.
  if (normalizeTimeframe(timeframe) === null) {
    errors.push(`Invalid timeframe: ${timeframe}`);
  }

  if (errors.length > 0) {
    console.error(`[DATA VALIDATION] FAILED for ${symbol} ${timeframe}:`, errors);
  } else {
    console.log(`[DATA VALIDATION] PASSED for ${symbol} ${timeframe}`);
  }

  return errors;
}

export function validateIndicators(indicators: any): string[] {
  const errors: string[] = [];
  
  // RSI validation
  if (indicators.rsi === undefined || isNaN(indicators.rsi)) {
    errors.push('RSI is missing or NaN');
  } else if (indicators.rsi < 0 || indicators.rsi > 100) {
    errors.push(`RSI out of range: ${indicators.rsi} (should be 0-100)`);
  }
  
  // MACD validation
  if (!indicators.macd || isNaN(indicators.macd.macd) || isNaN(indicators.macd.signal)) {
    errors.push('MACD values are missing or NaN');
  }
  
  // EMA9/EMA21 are supplementary — warn but do NOT block analysis
  if (indicators.ema9 && isNaN(indicators.ema9)) console.warn('[INDICATOR VALIDATION] EMA9 is NaN (non-fatal)');
  if (indicators.ema21 && isNaN(indicators.ema21)) console.warn('[INDICATOR VALIDATION] EMA21 is NaN (non-fatal)');
  
  // ATR validation
  if (!indicators.atr || isNaN(indicators.atr) || indicators.atr <= 0) {
    errors.push('ATR is missing, NaN, or negative');
  }
  
  if (errors.length > 0) {
    console.error('[INDICATOR VALIDATION] FAILED:', errors);
  } else {
    console.log('[INDICATOR VALIDATION] PASSED');
  }
  
  return errors;
}

export function validateLevels(levels: any, currentPrice: number): string[] {
  const errors: string[] = [];
  
  // Support validation
  if (!levels.support || isNaN(levels.support)) {
    errors.push('Support level is missing or NaN');
  } else if (levels.support >= currentPrice) {
    errors.push(`Support (${levels.support}) is above or equal to current price (${currentPrice})`);
  }
  
  // Resistance validation
  if (!levels.resistance || isNaN(levels.resistance)) {
    errors.push('Resistance level is missing or NaN');
  } else if (levels.resistance <= currentPrice) {
    errors.push(`Resistance (${levels.resistance}) is below or equal to current price (${currentPrice})`);
  }
  
  // Cross-validation
  if (levels.support && levels.resistance && levels.support >= levels.resistance) {
    errors.push(`Support (${levels.support}) >= Resistance (${levels.resistance}) — impossible`);
  }
  
  if (errors.length > 0) {
    console.error('[LEVEL VALIDATION] FAILED:', errors);
  } else {
    console.log('[LEVEL VALIDATION] PASSED — Support: $' + levels.support + ' | Resistance: $' + levels.resistance);
  }
  
  return errors;
}

export function isDataFresh(timestamp: number, timeframe: string): boolean {
  const now = Date.now();
  const age = now - timestamp;

  // Max-age must accommodate the candle's full duration PLUS a small grace
  // period for clock skew, request latency, and exchange close-time reporting
  // delay. The previous hardcoded table (4h: 15min) rejected 100% of >=1h
  // candle fetches because a 4h candle is up to 4h old at the time of read.
  // Grace = min(5min, 50% of candle duration) so sub-hour TFs stay tight
  // (1m candle is at most 1m old, 2min-old is stale) while long TFs are
  // accepted. The duration itself comes from the shared timeframes module so
  // this can't drift from the provider interval mappings.
  const duration = timeframeDurationMs(timeframe);
  const grace = Math.min(5 * 60 * 1000, duration * 0.5);
  const max = duration + grace;

  if (age > max) {
    console.warn(`[DATA FRESHNESS] Data is ${age}ms old. Max for ${timeframe} is ${max}ms. Refreshing...`);
    return false;
  }

  return true;
}

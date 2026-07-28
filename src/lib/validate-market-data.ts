import { isSupportedSymbol } from "./supported-symbols";

export function validateMarketData(data: any, symbol: string, timeframe: string): string[] {
  const errors: string[] = [];

  // 1. Check symbol format. Accept any symbol in the supported-instrument
  // registry (covers pairs like BTC/USD, bare indices like NASDAQ, and bare
  // stock tickers like AAPL / SHEL.L / 7203 / RELIANCE), OR a BASE/QUOTE pair,
  // OR a known bare index ticker. The registry is the source of truth.
  const PAIR_PATTERN = /^[A-Z0-9.\-]+\/[A-Z0-9]+$/;
  const KNOWN_BARE_INDICES = new Set(["NASDAQ", "S&P500", "DJI", "NIKKEI", "FTSE", "DAX"]);
  const sym = typeof data.symbol === "string" ? data.symbol.toUpperCase() : "";
  const isPair = PAIR_PATTERN.test(sym);
  const isKnownIndex = KNOWN_BARE_INDICES.has(sym);
  const isSupported = isSupportedSymbol(sym);
  if (!sym || (!isPair && !isKnownIndex && !isSupported)) {
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
  
  // 5. Check timeframe
  const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1W', '1H', '4H', '1D', '30m'];
  const formattedTimeframe = timeframe;
  if (!validTimeframes.some(tf => tf.toLowerCase() === formattedTimeframe.toLowerCase())) {
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
  // accepted.
  const candleDurationMs: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1H': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '4H': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000,
  };
  const duration = candleDurationMs[timeframe] || 60 * 60 * 1000;
  const grace = Math.min(5 * 60 * 1000, duration * 0.5);
  const max = duration + grace;

  if (age > max) {
    console.warn(`[DATA FRESHNESS] Data is ${age}ms old. Max for ${timeframe} is ${max}ms. Refreshing...`);
    return false;
  }

  return true;
}

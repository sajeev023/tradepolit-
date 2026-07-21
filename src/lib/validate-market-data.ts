export function validateMarketData(data: any, symbol: string, timeframe: string): string[] {
  const errors: string[] = [];
  
  // 1. Check symbol format
  if (!data.symbol || !data.symbol.includes('/')) {
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
  
  // EMA validation
  if (!indicators.ema9 || isNaN(indicators.ema9)) errors.push('EMA 9 is missing or NaN');
  if (!indicators.ema21 || isNaN(indicators.ema21)) errors.push('EMA 21 is missing or NaN');
  
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
  
  const maxAge: Record<string, number> = {
    '1m': 60 * 1000,        // 1 minute
    '5m': 2 * 60 * 1000,    // 2 minutes
    '15m': 5 * 60 * 1000,   // 5 minutes
    '30m': 10 * 60 * 1000,  // 10 minutes
    '1h': 10 * 60 * 1000,   // 10 minutes
    '1H': 10 * 60 * 1000,   // 10 minutes
    '4h': 15 * 60 * 1000,   // 15 minutes
    '4H': 15 * 60 * 1000,   // 15 minutes
    '1d': 30 * 60 * 1000,   // 30 minutes
    '1D': 30 * 60 * 1000,   // 30 minutes
    '1w': 60 * 60 * 1000,   // 1 hour
    '1W': 60 * 60 * 1000,   // 1 hour
  };
  
  const max = maxAge[timeframe] || 5 * 60 * 1000;
  
  if (age > max) {
    console.warn(`[DATA FRESHNESS] Data is ${age}ms old. Max for ${timeframe} is ${max}ms. Refreshing...`);
    return false;
  }
  
  return true;
}

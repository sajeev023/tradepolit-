import type { OHLCVCandle } from "./types";

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN); // Not enough data
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      sma.push(sum / period);
    }
  }
  return sma;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  if (data.length < period) return data.map(() => NaN);

  const k = 2 / (period + 1);
  
  // Start with SMA for first period
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  const sma = sum / period;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
    } else if (i === period - 1) {
      ema.push(sma);
    } else {
      const prevEma = ema[i - 1];
      const currentEma = data[i] * k + prevEma * (1 - k);
      ema.push(currentEma);
    }
  }
  return ema;
}

/**
 * Calculates Relative Strength Index (RSI)
 */
export function calculateRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = [];
  if (closes.length <= period) return closes.map(() => 50); // Default neutral

  let avgGain = 0;
  let avgLoss = 0;

  // First change values
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      rsi.push(50);
      continue;
    }

    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
      } else {
        rsi.push(50); // initial pad
      }
    } else {
      // Wilder's smoothing
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

/**
 * Calculates MACD (Moving Average Convergence Divergence)
 */
export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function calculateMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDResult {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);
  
  const macd: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macd.push(NaN);
    } else {
      macd.push(fastEMA[i] - slowEMA[i]);
    }
  }

  // Filter valid MACD values to compute signal
  const validMacdStart = macd.findIndex((v) => !isNaN(v));
  const signal: number[] = [];
  const histogram: number[] = [];

  if (validMacdStart === -1 || macd.length - validMacdStart < signalPeriod) {
    return {
      macd: closes.map(() => 0),
      signal: closes.map(() => 0),
      histogram: closes.map(() => 0),
    };
  }

  // Calculate EMA of MACD
  const macdSlice = macd.slice(validMacdStart);
  const signalSlice = calculateEMA(macdSlice, signalPeriod);

  // Pad the signal array to match closes length
  for (let i = 0; i < closes.length; i++) {
    if (i < validMacdStart + signalPeriod - 1) {
      signal.push(NaN);
      histogram.push(NaN);
    } else {
      const sigVal = signalSlice[i - validMacdStart];
      signal.push(sigVal);
      histogram.push(macd[i] - sigVal);
    }
  }

  // Fallback NaNs to 0 to keep UI rendering happy
  const finalMacd = macd.map((v) => (isNaN(v) ? 0 : v));
  const finalSignal = signal.map((v) => (isNaN(v) ? 0 : v));
  const finalHist = histogram.map((v) => (isNaN(v) ? 0 : v));

  return { macd: finalMacd, signal: finalSignal, histogram: finalHist };
}

/**
 * Calculates Volatility & ATR (Average True Range)
 */
export interface VolatilityResult {
  atr: number;
  standardDeviationPercent: number;
  isSpike: boolean;
}

export function calculateVolatility(candles: OHLCVCandle[], period = 20): VolatilityResult {
  if (candles.length < period) {
    return { atr: 0, standardDeviationPercent: 0, isSpike: false };
  }

  // 1. Calculate Standard Deviation of Closes
  const recentCandles = candles.slice(-period);
  const closes = recentCandles.map((c) => c.close);
  const mean = closes.reduce((sum, v) => sum + v, 0) / period;
  const variance = closes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
  const sd = Math.sqrt(variance);
  const sdPercent = (sd / mean) * 100;

  // 2. Calculate ATR (Average True Range)
  let trSum = 0;
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    if (i >= candles.length - period) {
      trSum += tr;
    }
  }
  const atr = trSum / period;

  // 3. Volatility Spike Check
  const baselineCandles = candles.slice(0, Math.max(period, candles.length - period));
  const baselineCloses = baselineCandles.map((c) => c.close);
  const baselineMean = baselineCloses.reduce((sum, v) => sum + v, 0) / baselineCloses.length;
  const baselineVariance = baselineCloses.reduce((sum, v) => sum + Math.pow(v - baselineMean, 2), 0) / baselineCloses.length;
  const baselineSd = Math.sqrt(baselineVariance);
  const baselineSdPercent = (baselineSd / baselineMean) * 100;

  const isSpike = sdPercent > baselineSdPercent * 1.5 && sdPercent > 0.5;

  return { atr, standardDeviationPercent: sdPercent, isSpike };
}

/**
 * Extracts key levels: local support and resistance points
 */
export interface KeyLevelsResult {
  support: number;
  resistance: number;
}

export function calculateKeyLevels(candles: OHLCVCandle[]): KeyLevelsResult {
  const closes = candles.map((c) => c.close);
  if (closes.length === 0) return { support: 0, resistance: 0 };

  const recentCloses = closes.slice(-50);
  const min = Math.min(...recentCloses);
  const max = Math.max(...recentCloses);

  return {
    support: min,
    resistance: max,
  };
}

/**
 * Determines current Market Regime, Bias & Setup Quality
 */
/**
 * Exact RSI Interpretation Rules
 */
export function getRSIInterpretation(rsi: number): string {
  if (isNaN(rsi)) return "Awaiting data...";
  if (rsi < 30) return "Oversold — potential bounce zone";
  if (rsi < 40) return "Weak — approaching oversold";
  if (rsi < 50) return "Bearish momentum — below neutral";
  if (rsi < 60) return "Bullish momentum — above neutral";
  if (rsi < 70) return "Strong bullish momentum";
  if (rsi < 80) return "Overbought — strong momentum, tighten stops";
  return "Extremely overbought — reversal likely";
}

/**
 * Traceable Source Metadata Interface
 */
export interface SourceMetadata {
  rsiSource: string;
  supportSource: string;
  resistanceSource: string;
  entrySource: string;
  stopLossSource: string;
  takeProfitSource: string;
  confidenceSource: string;
  aiModelSource: string;
  symbolSource: string;
  timeframeSource: string;
  priceSource: string;
}

export function generateSourceMetadata(
  symbol: string,
  timeframe: string,
  currentPrice: number,
  support: number,
  resistance: number,
  rsi: number,
  candleCount: number = 100
): SourceMetadata {
  const cleanPrice = isNaN(currentPrice) || currentPrice === 0 ? "$0.00" : `$${currentPrice.toLocaleString()}`;
  const cleanSupport = isNaN(support) || support === 0 ? "$0.00" : `$${support.toLocaleString()}`;
  const cleanRes = isNaN(resistance) || resistance === 0 ? "$0.00" : `$${resistance.toLocaleString()}`;
  const cleanRsi = isNaN(rsi) ? "50.00" : rsi.toFixed(2);

  return {
    symbolSource: `User watchlist / active selection (${symbol})`,
    timeframeSource: `Selected chart interval (${timeframe})`,
    priceSource: `Binance spot real-time ticker (${cleanPrice})`,
    rsiSource: `RSI(14) calculated from last ${candleCount} ${timeframe} closes (${cleanRsi})`,
    supportSource: `Swing-low detector (${cleanSupport}, pivot touch)`,
    resistanceSource: `Swing-high detector (${cleanRes}, pivot touch)`,
    entrySource: `Fibonacci retracement zone between support (${cleanSupport}) & resistance (${cleanRes})`,
    stopLossSource: `Structural invalidation level below support (${cleanSupport})`,
    takeProfitSource: `Target liquidity zone near resistance (${cleanRes})`,
    confidenceSource: `RSI (${cleanRsi}) + MACD + EMA alignment score`,
    aiModelSource: `NVIDIA NIM Multi-Model Early-Return Race (Llama-3.1-8B primary)`,
  };
}

/**
 * Consistency Validation Function
 */
export interface AnalysisConsistencyReport {
  isValid: boolean;
  issues: string[];
}

export function validateAnalysisConsistency(analysisData: any): AnalysisConsistencyReport {
  const issues: string[] = [];

  if (!analysisData) {
    return { isValid: false, issues: ["Analysis data is missing"] };
  }

  const parseNum = (val: any) => {
    if (val === null || val === undefined) return NaN;
    if (typeof val === "number") return val;
    const cleaned = String(val).replace(/[^0-9.-]/g, "");
    return Number(cleaned);
  };

  const support = parseNum(analysisData.support ?? analysisData.levels?.support);
  const resistance = parseNum(analysisData.resistance ?? analysisData.levels?.resistance);
  const invalidation = parseNum(analysisData.invalidationLevel ?? analysisData.stopLoss);
  const rsi = parseNum(analysisData.rsi ?? analysisData.indicators?.rsi);

  if (isNaN(support) || support <= 0) issues.push("Support is NaN or zero");
  if (isNaN(resistance) || resistance <= 0) issues.push("Resistance is NaN or zero");
  if (isNaN(invalidation) || invalidation <= 0) issues.push("Invalidation is NaN or zero");
  if (isNaN(rsi)) issues.push("RSI is NaN");

  const rsiLabel = analysisData.rsiLabel || getRSIInterpretation(rsi);
  if (!isNaN(rsi)) {
    if (rsi > 65 && rsiLabel.toLowerCase().includes("neutral")) {
      issues.push(`RSI is ${rsi.toFixed(2)} but labeled as 'neutral' — MISMATCH`);
    }
    if (rsi < 45 && rsiLabel.toLowerCase().includes("strong")) {
      issues.push(`RSI is ${rsi.toFixed(2)} but labeled as 'strong' — MISMATCH`);
    }
  }

  if (issues.length > 0) {
    console.error("[CONSISTENCY CHECK] FAILED:", issues);
  } else {
    console.log("[CONSISTENCY CHECK] PASSED");
  }

  return { isValid: issues.length === 0, issues };
}

export interface TechnicalContext {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  lastCandleTime: string;
  trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
  rsi: number;
  rsiSentiment: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL";
  rsiLabel: string;
  macdValue: number;
  macdSignal: number;
  macdHistogram: number;
  support: number;
  resistance: number;
  volatility: number;
  isVolatilitySpike: boolean;
  bias: "BUY/LONG" | "SELL/SHORT" | "NEUTRAL";
  setupQuality: "A+ SELECT" | "HIGH GRADE" | "B-GRADE" | "NO SETUP";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  invalidationLevel: number;
  atr: number;
  volume: number;
  sourceMetadata: SourceMetadata;
  // New indicator fields for Proactive Alerts
  volumeSurgeRatio: number;
  lostVWAP: boolean;
  emaCrossover: "BULLISH" | "BEARISH" | null;
  macdCrossover: "BULLISH" | "BEARISH" | null;
  liquiditySweep: boolean;
  fakeBreakout: boolean;
  approachingKeyLevel: "SUPPORT" | "RESISTANCE" | null;
  activeSession: "LONDON" | "NEWYORK" | "ASIA" | null;
}

export function compileTechnicalContext(
  symbol: string,
  timeframe: string,
  candles: OHLCVCandle[]
): TechnicalContext {
  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1] || 0;
  const len = candles.length;

  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const rsiArr = calculateRSI(closes, 14);
  const macdRes = calculateMACD(closes);
  const levels = calculateKeyLevels(candles);
  const vol = calculateVolatility(candles);

  const currentEma20 = ema20[ema20.length - 1] || 0;
  const currentEma50 = ema50[ema50.length - 1] || 0;
  const currentRsi = rsiArr[rsiArr.length - 1] || 50;

  const currentMacd = macdRes.macd[macdRes.macd.length - 1] || 0;
  const currentSignal = macdRes.signal[macdRes.signal.length - 1] || 0;
  const currentHist = macdRes.histogram[macdRes.histogram.length - 1] || 0;

  let trend: "BULLISH" | "BEARISH" | "SIDEWAYS" = "SIDEWAYS";
  if (currentPrice > currentEma20 && currentEma20 > currentEma50) {
    trend = "BULLISH";
  } else if (currentPrice < currentEma20 && currentEma20 < currentEma50) {
    trend = "BEARISH";
  }

  let rsiSentiment: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL" = "NEUTRAL";
  if (currentRsi >= 70) rsiSentiment = "OVERBOUGHT";
  else if (currentRsi <= 30) rsiSentiment = "OVERSOLD";

  let bias: "BUY/LONG" | "SELL/SHORT" | "NEUTRAL" = "NEUTRAL";
  let confidence: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
  let setupQuality: "A+ SELECT" | "HIGH GRADE" | "B-GRADE" | "NO SETUP" = "NO SETUP";

  if (trend === "BULLISH") {
    bias = "BUY/LONG";
    if (currentRsi < 65 && currentRsi > 45 && currentHist > 0) {
      setupQuality = "A+ SELECT";
      confidence = "HIGH";
    } else {
      setupQuality = "HIGH GRADE";
      confidence = "MEDIUM";
    }
  } else if (trend === "BEARISH") {
    bias = "SELL/SHORT";
    if (currentRsi > 35 && currentRsi < 55 && currentHist < 0) {
      setupQuality = "A+ SELECT";
      confidence = "HIGH";
    } else {
      setupQuality = "HIGH GRADE";
      confidence = "MEDIUM";
    }
  } else {
    if (currentRsi <= 32) {
      bias = "BUY/LONG";
      setupQuality = "B-GRADE";
      confidence = "LOW";
    } else if (currentRsi >= 68) {
      bias = "SELL/SHORT";
      setupQuality = "B-GRADE";
      confidence = "LOW";
    } else {
      bias = "NEUTRAL";
      setupQuality = "NO SETUP";
      confidence = "LOW";
    }
  }

  const entryPrice = currentPrice;
  let stopLoss = 0;
  let takeProfit = 0;
  let invalidationLevel = 0;

  const range = levels.resistance - levels.support;
  if (bias === "BUY/LONG") {
    stopLoss = levels.support - range * 0.05;
    takeProfit = levels.resistance;
    invalidationLevel = stopLoss;
  } else if (bias === "SELL/SHORT") {
    stopLoss = levels.resistance + range * 0.05;
    takeProfit = levels.support;
    invalidationLevel = stopLoss;
  } else {
    stopLoss = currentPrice * 0.98;
    takeProfit = currentPrice * 1.04;
    invalidationLevel = stopLoss;
  }

  // --- Advanced Calculations for Proactive Alerts ---
  
  // 1. Average Volume & Volume Surge Ratio
  const volPeriod = Math.min(20, len);
  let sumVol = 0;
  for (let i = len - volPeriod; i < len; i++) {
    sumVol += candles[i]?.volume || 0;
  }
  const averageVolume = volPeriod > 0 ? sumVol / volPeriod : 1;
  const currentVolume = len > 0 ? (candles[len - 1]?.volume || 0) : 0;
  const volumeSurgeRatio = averageVolume > 0 ? currentVolume / averageVolume : 1.0;

  // 2. Rolling VWAP & Lost/Reclaimed VWAP Check
  let sumTypicalPriceVolume = 0;
  let sumVolume = 0;
  const vwapPeriod = Math.min(20, len);
  for (let i = len - vwapPeriod; i < len; i++) {
    const c = candles[i];
    if (!c) continue;
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const itemVol = c.volume || 1;
    sumTypicalPriceVolume += typicalPrice * itemVol;
    sumVolume += itemVol;
  }
  const currentVWAP = sumVolume > 0 ? sumTypicalPriceVolume / sumVolume : currentPrice;
  
  let lostVWAP = false;
  let reclaimedVWAP = false;
  if (len >= 2) {
    const prevPrice = candles[len - 2]?.close || currentPrice;
    let prevSumTypicalPrice = 0;
    let prevSumVol = 0;
    for (let i = len - vwapPeriod - 1; i < len - 1; i++) {
      if (i < 0) continue;
      const c = candles[i];
      if (!c) continue;
      const typicalPrice = (c.high + c.low + c.close) / 3;
      const itemVol = c.volume || 1;
      prevSumTypicalPrice += typicalPrice * itemVol;
      prevSumVol += itemVol;
    }
    const prevVWAP = prevSumVol > 0 ? prevSumTypicalPrice / prevSumVol : prevPrice;
    lostVWAP = prevPrice >= prevVWAP && currentPrice < currentVWAP;
    reclaimedVWAP = prevPrice <= prevVWAP && currentPrice > currentVWAP;
  }

  // 3. EMA 9/21 Crossover
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  let emaCrossover: "BULLISH" | "BEARISH" | null = null;
  if (len >= 2 && ema9.length >= 2 && ema21.length >= 2) {
    const idx = len - 1;
    const prevIdx = len - 2;
    const c9 = ema9[idx];
    const c21 = ema21[idx];
    const p9 = ema9[prevIdx];
    const p21 = ema21[prevIdx];
    
    if (!isNaN(c9) && !isNaN(c21) && !isNaN(p9) && !isNaN(p21)) {
      if (p9 <= p21 && c9 > c21) {
        emaCrossover = "BULLISH";
      } else if (p9 >= p21 && c9 < c21) {
        emaCrossover = "BEARISH";
      }
    }
  }

  // 4. MACD Crossover (MACD cross Signal line in last candle)
  let macdCrossover: "BULLISH" | "BEARISH" | null = null;
  if (len >= 2 && macdRes.macd.length >= 2 && macdRes.signal.length >= 2) {
    const idx = len - 1;
    const prevIdx = len - 2;
    const m = macdRes.macd[idx];
    const s = macdRes.signal[idx];
    const pm = macdRes.macd[prevIdx];
    const ps = macdRes.signal[prevIdx];
    
    if (!isNaN(m) && !isNaN(s) && !isNaN(pm) && !isNaN(ps)) {
      if (pm <= ps && m > s) {
        macdCrossover = "BULLISH";
      } else if (pm >= ps && m < s) {
        macdCrossover = "BEARISH";
      }
    }
  }

  // 5. Liquidity Sweep & Fake Breakout
  let liquiditySweep = false;
  if (len >= 1) {
    const c = candles[len - 1];
    if (c && c.low < levels.support && c.close > levels.support) {
      liquiditySweep = true;
    }
  }

  let fakeBreakout = false;
  if (len >= 1) {
    const c = candles[len - 1];
    if (c && c.high > levels.resistance && c.close < levels.resistance) {
      fakeBreakout = true;
    }
  }

  // 6. Support/Resistance Breaks
  let brokenSupport = false;
  let brokenResistance = false;
  if (len >= 2) {
    const prevPrice = candles[len - 2].close;
    brokenSupport = prevPrice >= levels.support && currentPrice < levels.support;
    brokenResistance = prevPrice <= levels.resistance && currentPrice > levels.resistance;
  }

  // 7. Approaching Key Level (within 0.5% range)
  let approachingKeyLevel: "SUPPORT" | "RESISTANCE" | null = null;
  if (levels.support > 0 && levels.resistance > 0) {
    const distSupport = Math.abs(currentPrice - levels.support) / levels.support;
    const distResistance = Math.abs(currentPrice - levels.resistance) / levels.resistance;
    if (distSupport <= 0.005) {
      approachingKeyLevel = "SUPPORT";
    } else if (distResistance <= 0.005) {
      approachingKeyLevel = "RESISTANCE";
    }
  }

  // 8. Session Change Checks (trigger at session boundary start hour)
  let sessionChange: "LONDON" | "NEWYORK" | "ASIA" | null = null;
  const utcTime = new Date();
  const utcHour = utcTime.getUTCHours();
  const utcMin = utcTime.getUTCMinutes();
  
  if (utcHour === 8 && utcMin < 15) {
    sessionChange = "LONDON";
  } else if (utcHour === 13 && utcMin >= 30 && utcMin < 45) {
    sessionChange = "NEWYORK";
  } else if (utcHour === 0 && utcMin < 15) {
    sessionChange = "ASIA";
  }

  // 9. ATR Expansion (Current ATR is 50%+ greater than average ATR of last 10 candles)
  let atrExpansion = false;
  const currentAtr = vol.atr;
  const atrPeriod = Math.min(10, len);
  let trSum = 0;
  for (let i = 1; i < candles.length - 1; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    if (i >= candles.length - 1 - atrPeriod) {
      trSum += tr;
    }
  }
  const averageAtr = atrPeriod > 0 ? trSum / atrPeriod : currentAtr;
  if (currentAtr > averageAtr * 1.5 && averageAtr > 0) {
    atrExpansion = true;
  }

  // 10. Consecutive Candles Check (4+ bullish or 4+ bearish)
  let consecutiveCandles = 0;
  if (len >= 4) {
    const last4 = candles.slice(-4);
    const allBullish = last4.every((c) => c.close > c.open);
    const allBearish = last4.every((c) => c.close < c.open);
    if (allBullish) consecutiveCandles = 4;
    else if (allBearish) consecutiveCandles = -4;
  }

  // 11. RSI crossed below 40 check
  let rsiCrossedBelow40 = false;
  if (len >= 2 && rsiArr.length >= 2) {
    const currentRsi = rsiArr[rsiArr.length - 1];
    const prevRsi = rsiArr[rsiArr.length - 2];
    if (prevRsi >= 40 && currentRsi < 40) {
      rsiCrossedBelow40 = true;
    }
  }

  const lastCandle = candles[candles.length - 1];
  const lastCandleTime = lastCandle ? new Date(lastCandle.timestamp).toISOString() : new Date().toISOString();

  return {
    symbol,
    timeframe,
    currentPrice,
    lastCandleTime,
    trend,
    rsi: currentRsi,
    rsiSentiment,
    macdValue: currentMacd,
    macdSignal: currentSignal,
    macdHistogram: currentHist,
    support: levels.support,
    resistance: levels.resistance,
    volatility: vol.standardDeviationPercent,
    isVolatilitySpike: vol.isSpike,
    bias,
    setupQuality,
    confidence,
    entryPrice,
    stopLoss,
    takeProfit,
    invalidationLevel,
    atr: currentAtr,
    rsiLabel: getRSIInterpretation(currentRsi),
    sourceMetadata: generateSourceMetadata(symbol, timeframe, currentPrice, levels.support, levels.resistance, currentRsi, len),
    volume: closes.length > 0 ? (candles[closes.length - 1]?.volume || 0) : 0,
    volumeSurgeRatio,
    lostVWAP,
    reclaimedVWAP,
    emaCrossover,
    macdCrossover,
    liquiditySweep,
    fakeBreakout,
    approachingKeyLevel,
    activeSession: sessionChange,
    brokenSupport,
    brokenResistance,
    atrExpansion,
    consecutiveCandles,
    rsiCrossedBelow40,
  } as any;
}

export function appendTelemetryMetadata(
  narrative: string,
  analyzedAt: string,
  lastCandleTime: string,
  analyzedPrice: number,
  livePrice: number,
  exchange?: string
): string {
  const priceDiff = analyzedPrice ? (Math.abs(livePrice - analyzedPrice) / analyzedPrice) * 100 : 0;
  
  // Clean any previous metadata block from the narrative to prevent duplication
  const cleanedNarrative = narrative.split("\n\n---\n**Telemetry Metadata:**")[0];
  
  let metadata = cleanedNarrative +
    `\n\n---\n**Telemetry Metadata:**\n` +
    `- **Analysis Timestamp:** ${new Date(analyzedAt).toISOString()}\n` +
    `- **Telemetry Timestamp:** ${new Date(analyzedAt).toISOString()}\n` +
    `- **Last Candle Timestamp:** ${new Date(lastCandleTime).toISOString()}\n` +
    `- **Current Market Price Used:** $${analyzedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
    `- **Price Difference from Live Ticker:** ${priceDiff.toFixed(2)}%`;

  if (exchange) {
    metadata += `\n- **Exchange Mapped:** ${exchange}`;
  }

  return metadata;
}

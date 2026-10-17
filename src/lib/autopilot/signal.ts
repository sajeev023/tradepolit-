import { calculateEMA } from "@/lib/indicators";
import type { OHLCVCandle } from "@/lib/types";

/** Candles of history the rules need before they can speak (the 200-candle trend average). */
export const MIN_HISTORY = 200;
const ATR_PERIOD = 14;
const BREAKOUT_LOOKBACK = 55;

export interface Signal {
  enter: boolean;
  atr: number;
  reasons: string[];
}

/** Simple-average ATR over the last `period` true ranges. */
export function averageTrueRange(candles: OHLCVCandle[], period = ATR_PERIOD): number {
  if (candles.length < period + 1) return 0;
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    sum += Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  }
  return sum / period;
}

const noSignal = (atr: number, why: string): Signal => ({ enter: false, atr, reasons: [why] });

/**
 * Long-only trend breakout on CLOSED hourly candles (a Donchian-style rule).
 * Enter only when the larger trend is up (price above the 200-candle EMA and
 * the 50 above the 200) AND price closes above the highest high of the prior
 * 55 candles. Same inputs always give the same answer.
 *
 * This rule set was chosen by testing six variants on four years of real
 * BTC/ETH/SOL candles (see study.test.ts). It is mildly profitable on average
 * in that history, loses in a large minority of 90-day windows, and is not a
 * forecast of anything.
 */
export function evaluateSignal(candles: OHLCVCandle[]): Signal {
  if (candles.length < MIN_HISTORY) return noSignal(0, "Not enough history yet");

  const closes = candles.map((c) => c.close);
  const n = closes.length - 1;
  const ema50 = calculateEMA(closes, 50)[n];
  const ema200 = calculateEMA(closes, 200)[n];
  const atr = averageTrueRange(candles);
  const close = closes[n];

  if (!(close > ema200 && ema50 > ema200)) {
    return noSignal(atr, "No established uptrend (needs price > EMA200 and EMA50 > EMA200)");
  }

  const priorHigh = Math.max(...candles.slice(n - BREAKOUT_LOOKBACK, n).map((c) => c.high));
  if (close > priorHigh) {
    return {
      enter: true,
      atr,
      reasons: [
        `Uptrend: price ${close.toFixed(2)} > EMA200 ${ema200.toFixed(2)}, EMA50 ${ema50.toFixed(2)} above it`,
        `Breakout: close above the prior ${BREAKOUT_LOOKBACK}-candle high ${priorHigh.toFixed(2)}`,
      ],
    };
  }

  return noSignal(atr, `Uptrend, but no close above the prior ${BREAKOUT_LOOKBACK}-candle high ${priorHigh.toFixed(2)}`);
}

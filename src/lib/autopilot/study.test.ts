/**
 * Historical study — the evidence behind what Autopilot tells users.
 *
 * Skipped in normal test runs (it needs the network and takes ~1 minute).
 * Regenerate with:
 *
 *     AUTOPILOT_STUDY=1 npx vitest run src/lib/autopilot/study.test.ts
 *
 * It downloads ~4 years of real Binance hourly candles for the supported
 * pairs, then replays the production engine — the same code the live paper
 * sessions use, with fees and slippage — over hundreds of overlapping
 * 90-day sessions per risk profile. The output (study-results.json) is a
 * distribution of what those rules WOULD have returned. It is a record of
 * the past, not a forecast.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { OHLCVCandle } from "@/lib/types";
import { CANDLE_MS, FEE_RATE, SLIPPAGE_RATE, advance, createInitialState, summarize } from "./engine";
import type { AutopilotConfig, RiskProfile } from "./types";

const PAIRS = { "BTC/USD": "BTCUSDT", "ETH/USD": "ETHUSDT", "SOL/USD": "SOLUSDT" } as const;
const SYMBOLS = Object.keys(PAIRS);
const YEARS = 4;
const SESSION_DAYS = 90;
const STEP_DAYS = 5;
const WARMUP_CANDLES = 300;
const START_BALANCE = 1000;
const OUT = path.join(__dirname, "study-results.json");

async function downloadHistory(pair: string, endMs: number): Promise<OHLCVCandle[]> {
  const out: OHLCVCandle[] = [];
  let t = endMs - YEARS * 365 * 24 * CANDLE_MS;
  while (t < endMs) {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1h&startTime=${t}&limit=1000`);
    if (!res.ok) throw new Error(`Binance ${pair}: HTTP ${res.status}`);
    const rows = (await res.json()) as number[][] | string[][];
    if (!rows.length) break;
    for (const r of rows) {
      const ts = Number(r[0]);
      if (ts + CANDLE_MS <= endMs) out.push({ timestamp: ts, open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5] });
    }
    t = Number(rows[rows.length - 1][0]) + CANDLE_MS;
  }
  return out;
}

const quantile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
};
const pct = (n: number, d: number) => Math.round((n / d) * 1000) / 10;
const round1 = (n: number) => Math.round(n * 10) / 10;

describe.skipIf(!process.env.AUTOPILOT_STUDY)("autopilot historical study", () => {
  it("replays the production engine over rolling 90-day sessions", { timeout: 1_800_000 }, async () => {
    const endMs = Math.floor(Date.now() / CANDLE_MS) * CANDLE_MS;
    const data: Record<string, OHLCVCandle[]> = {};
    for (const [symbol, pair] of Object.entries(PAIRS)) data[symbol] = await downloadHistory(pair, endMs);

    const length = Math.min(...SYMBOLS.map((s) => data[s].length));
    for (const s of SYMBOLS) data[s] = data[s].slice(-length);

    const sessionCandles = SESSION_DAYS * 24;
    const stepCandles = STEP_DAYS * 24;
    const profiles: Record<string, unknown> = {};

    for (const profile of ["CONSERVATIVE", "BALANCED", "AGGRESSIVE"] as RiskProfile[]) {
      const returns: number[] = [];
      let halted = 0;
      let reachedDouble = 0;
      let trades = 0;
      for (let start = WARMUP_CANDLES; start + sessionCandles <= length; start += stepCandles) {
        const candles: Record<string, OHLCVCandle[]> = {};
        for (const s of SYMBOLS) candles[s] = data[s].slice(0, start + sessionCandles);
        const config: AutopilotConfig = {
          startingBalance: START_BALANCE,
          targetBalance: START_BALANCE * 1_000_000,
          horizonDays: SESSION_DAYS,
          riskProfile: profile,
          symbols: SYMBOLS,
          startedAt: data[SYMBOLS[0]][start].timestamp,
        };
        const state = await advance(createInitialState(config), config, candles);
        const summary = summarize(state, config);
        returns.push(summary.returnPct);
        trades += summary.trades;
        if (state.status === "HALTED") halted++;
        if (summary.returnPct >= 100) reachedDouble++;
      }
      profiles[profile] = {
        sessions: returns.length,
        positivePct: pct(returns.filter((r) => r > 0).length, returns.length),
        medianPct: round1(quantile(returns, 0.5)),
        meanPct: round1(returns.reduce((a, b) => a + b, 0) / returns.length),
        p10Pct: round1(quantile(returns, 0.1)),
        p90Pct: round1(quantile(returns, 0.9)),
        worstPct: round1(Math.min(...returns)),
        bestPct: round1(Math.max(...returns)),
        killSwitchPct: pct(halted, returns.length),
        avgTrades: Math.round(trades / returns.length),
        reachedDoublePct: pct(reachedDouble, returns.length),
      };
    }

    const buyHold: number[] = [];
    for (let start = WARMUP_CANDLES; start + sessionCandles <= length; start += stepCandles) {
      const perSymbol = SYMBOLS.map((s) => data[s][start + sessionCandles - 1].close / data[s][start].open - 1);
      buyHold.push((perSymbol.reduce((a, b) => a + b, 0) / perSymbol.length) * 100);
    }

    const results = {
      generatedAt: new Date().toISOString(),
      data: {
        source: "Binance spot 1h candles",
        symbols: SYMBOLS,
        from: new Date(data[SYMBOLS[0]][0].timestamp).toISOString(),
        to: new Date(data[SYMBOLS[0]][length - 1].timestamp + CANDLE_MS).toISOString(),
      },
      method: {
        sessionDays: SESSION_DAYS,
        stepDays: STEP_DAYS,
        startingBalance: START_BALANCE,
        feeRatePerSide: FEE_RATE,
        slippageRate: SLIPPAGE_RATE,
        rules: "Long-only trend breakout: price above EMA200 with EMA50 above EMA200, entry on a close above the prior 55-candle high, 3x ATR stop, 3R target.",
      },
      profiles,
      buyHold: {
        medianPct: round1(quantile(buyHold, 0.5)),
        p10Pct: round1(quantile(buyHold, 0.1)),
        p90Pct: round1(quantile(buyHold, 0.9)),
        positivePct: pct(buyHold.filter((r) => r > 0).length, buyHold.length),
      },
    };

    fs.writeFileSync(OUT, JSON.stringify(results, null, 2) + "\n");
    expect(Object.keys(profiles)).toHaveLength(3);
  });
});

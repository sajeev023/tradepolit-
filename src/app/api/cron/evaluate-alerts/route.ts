import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { MarketDataService } from "@/lib/market-data-service";
import { calculateEMA, calculateRSI, calculateVolatility } from "@/lib/indicators";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { secureBearerMatch } from "@/lib/secure-compare";
import { CRYPTO_SYMBOLS, FOREX_SYMBOLS, INDEX_SYMBOLS, COMMODITY_SYMBOLS } from "@/lib/market-registry";

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get("authorization");
    // Constant-time comparison to avoid timing side-channel (M-3).
    if (!secureBearerMatch(authorization, cronSecret)) {
      return unauthorizedError("Invalid or missing CRON_SECRET");
    }

    // 1. Fetch all active user alerts
    const activeAlerts = await prisma.alert.findMany({
      where: { isActive: true },
    });

    let triggeredCount = 0;

    for (const alert of activeAlerts) {
      try {
        const livePrice = await MarketDataService.getLivePrice(alert.instrument);
        const condition = alert.condition as any;

        let triggered = false;
        let triggerReason = "";

        // Get candles for indicators if required
        const needsCandles = ["RSI", "EMA_CROSS", "TREND_CHANGE"].includes(alert.type);
        const candles = needsCandles ? await MarketDataService.getOHLCV(alert.instrument, "1h", 100) : [];
        const closes = candles.map((c) => c.close);

        if (alert.type === "PRICE") {
          if (condition.operator === "gt" && livePrice.price > condition.value) {
            triggered = true;
            triggerReason = `Price crossed above threshold $${condition.value} (Current: $${livePrice.price.toLocaleString()})`;
          } else if (condition.operator === "lt" && livePrice.price < condition.value) {
            triggered = true;
            triggerReason = `Price crossed below threshold $${condition.value} (Current: $${livePrice.price.toLocaleString()})`;
          }
        } else if (alert.type === "RSI" && candles.length > 14) {
          const rsiValues = calculateRSI(closes, 14);
          const currentRsi = rsiValues[rsiValues.length - 1];
          if (condition.operator === "gt" && currentRsi > condition.value) {
            triggered = true;
            triggerReason = `RSI(14) entered overbought levels above ${condition.value} (Current: ${currentRsi.toFixed(1)})`;
          } else if (condition.operator === "lt" && currentRsi < condition.value) {
            triggered = true;
            triggerReason = `RSI(14) entered oversold levels below ${condition.value} (Current: ${currentRsi.toFixed(1)})`;
          }
        } else if (alert.type === "EMA_CROSS" && candles.length > 50) {
          const ema20 = calculateEMA(closes, 20);
          const ema50 = calculateEMA(closes, 50);
          const current20 = ema20[ema20.length - 1];
          const current50 = ema50[ema50.length - 1];
          const prev20 = ema20[ema20.length - 2];
          const prev50 = ema50[ema50.length - 2];

          if (condition.operator === "crosses_above" && prev20 <= prev50 && current20 > current50) {
            triggered = true;
            triggerReason = `EMA 20 crossed above the EMA 50 (Bullish Crossover)`;
          } else if (condition.operator === "crosses_below" && prev20 >= prev50 && current20 < current50) {
            triggered = true;
            triggerReason = `EMA 20 crossed below the EMA 50 (Bearish Breakdown)`;
          }
        } else if (alert.type === "TREND_CHANGE" && candles.length > 50) {
          const ema50 = calculateEMA(closes, 50);
          const current50 = ema50[ema50.length - 1];
          const currentPrice = livePrice.price;
          const prevPrice = closes[closes.length - 2] || currentPrice;

          if (condition.operator === "crosses_above" && prevPrice <= current50 && currentPrice > current50) {
            triggered = true;
            triggerReason = `Price broke above long-term trendline EMA 50 (Bullish trend flip)`;
          } else if (condition.operator === "crosses_below" && prevPrice >= current50 && currentPrice < current50) {
            triggered = true;
            triggerReason = `Price broke below long-term trendline EMA 50 (Bearish trend flip)`;
          }
        }

        if (triggered) {
          // Atomic: deactivate the alert AND create the notification in a
          // single transaction. If either write fails, both roll back —
          // the alert stays active and will re-fire on the next cron tick,
          // rather than being silently deactivated with no notification.
          await prisma.$transaction([
            prisma.alert.update({
              where: { id: alert.id },
              data: {
                isActive: false,
                triggeredAt: new Date(),
              },
            }),
            prisma.notification.create({
              data: {
                userId: alert.userId,
                type: "ALERT_TRIGGER",
                title: `${alert.instrument} Indicator Cross`,
                body: triggerReason,
              },
            }),
          ]);

          triggeredCount++;
        }
      } catch (err) {
        console.error(`Failed to evaluate alert ${alert.id}:`, err);
      }
    }

    // 2. Proactive system intelligence checks:
    // Fetch standard symbols across all asset classes to check volatility & sharp returns.
    // Driven by the market registry — adding a new market auto-enables monitoring.
    const standardAssets = [...CRYPTO_SYMBOLS, ...FOREX_SYMBOLS, ...INDEX_SYMBOLS, ...COMMODITY_SYMBOLS];

    // Everyone receives proactive system notifications (sharp moves, volatility spikes).
    const users = await prisma.user.findMany({ select: { id: true } });
    const userIds = users.map((u: { id: string }) => u.id);

    // Collect notification payloads during the scan, then batch-insert once.
    // The old per-user `create` inside the symbol loop was O(users × symbols) sequential
    // round-trips — at scale that blows past the cron timeout. A single createMany is one
    // round-trip regardless of user count. The per-symbol spam guard (findFirst in the
    // last hour) is preserved, so we never queue duplicates.
    const notificationsToCreate: { userId: string; type: string; title: string; body: string }[] = [];

    for (const symbol of standardAssets) {
      try {
        const candles = await MarketDataService.getOHLCV(symbol, "1h", 40);
        if (candles.length < 20) continue;

        const vol = calculateVolatility(candles);
        const lastCandle = candles[candles.length - 1];
        const prevCandle = candles[candles.length - 2];
        const returnChange = ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100;

        // Condition A: Sharp move (>2.0% return on crypto, >0.4% return on forex/indices)
        const isCrypto = symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("SOL");
        const sharpThreshold = isCrypto ? 2.0 : 0.4;

        if (Math.abs(returnChange) >= sharpThreshold) {
          // Check if sharp move notification was sent in the last 1 hour to prevent spam
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const recentNotice = await prisma.notification.findFirst({
            where: {
              type: "SHARP_MOVE",
              body: { contains: symbol },
              createdAt: { gte: oneHourAgo },
            },
          });

          if (!recentNotice) {
            const title = `Sharp Move: ${symbol}`;
            const body = `${symbol} experienced a sharp fluctuation of ${returnChange.toFixed(2)}% in the last hour. Price stands at $${lastCandle.close.toLocaleString()}.`;
            for (const userId of userIds) {
              notificationsToCreate.push({ userId, type: "SHARP_MOVE", title, body });
            }
          }
        }

        // Condition B: Volatility Spike
        if (vol.isSpike) {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const recentVolNotice = await prisma.notification.findFirst({
            where: {
              type: "VOLATILITY_SPIKE",
              body: { contains: symbol },
              createdAt: { gte: oneHourAgo },
            },
          });

          if (!recentVolNotice) {
            const title = `Volatility Spike: ${symbol}`;
            const body = `Standard deviation percentage return on ${symbol} has spiked to ${vol.standardDeviationPercent.toFixed(2)}%. High turbulence expected.`;
            for (const userId of userIds) {
              notificationsToCreate.push({ userId, type: "VOLATILITY_SPIKE", title, body });
            }
          }
        }
      } catch (err) {
        console.error(`Proactive check failed for asset ${symbol}:`, err);
      }
    }

    if (notificationsToCreate.length > 0) {
      await prisma.notification.createMany({ data: notificationsToCreate });
    }

    return successResponse({ evaluated: activeAlerts.length, triggered: triggeredCount });
  } catch (error) {
    console.error("Alert evaluation cron error:", error);
    return dispatchCaughtError("Failed to evaluate active alerts", error);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { MarketDataService } from "@/lib/market-data-service";
import { calculateEMA, calculateRSI, calculateVolatility } from "@/lib/indicators";
import { successResponse, internalError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
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
          // Deactivate triggered alert
          await prisma.alert.update({
            where: { id: alert.id },
            data: {
              isActive: false,
              triggeredAt: new Date(),
            },
          });

          // Log database Notification
          await prisma.notification.create({
            data: {
              userId: alert.userId,
              type: "ALERT_TRIGGER",
              title: `${alert.instrument} Indicator Cross`,
              body: triggerReason,
            },
          });

          triggeredCount++;
        }
      } catch (err) {
        console.error(`Failed to evaluate alert ${alert.id}:`, err);
      }
    }

    // 2. Proactive system intelligence checks:
    // Fetch unique watchlist items or standard symbols to check volatility & sharp returns
    const standardAssets = ["BTC/USD", "ETH/USD", "SOL/USD", "EUR/USD", "XAU/USD"];
    
    // Select all user settings to see who gets notifications
    const users = await prisma.user.findMany({ select: { id: true } });

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
            for (const u of users) {
              await prisma.notification.create({
                data: {
                  userId: u.id,
                  type: "SHARP_MOVE",
                  title: `Sharp Move: ${symbol}`,
                  body: `${symbol} experienced a sharp fluctuation of ${returnChange.toFixed(2)}% in the last hour. Price stands at $${lastCandle.close.toLocaleString()}.`,
                },
              });
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
            for (const u of users) {
              await prisma.notification.create({
                data: {
                  userId: u.id,
                  type: "VOLATILITY_SPIKE",
                  title: `Volatility Spike: ${symbol}`,
                  body: `Standard deviation percentage return on ${symbol} has spiked to ${vol.standardDeviationPercent.toFixed(2)}%. High turbulence expected.`,
                },
              });
            }
          }
        }
      } catch (err) {
        console.error(`Proactive check failed for asset ${symbol}:`, err);
      }
    }

    return successResponse({ evaluated: activeAlerts.length, triggered: triggeredCount });
  } catch (error) {
    console.error("Alert evaluation cron error:", error);
    return internalError("Failed to evaluate active alerts");
  }
}

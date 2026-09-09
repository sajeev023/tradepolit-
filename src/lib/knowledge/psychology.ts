import type { KnowledgeEntry } from "./events";

export const psychologyConcepts: KnowledgeEntry[] = [
  {
    id: "trading-psychology-fundamentals",
    title: "Trading Psychology Fundamentals",
    category: "psychology",
    tags: ["psychology", "emotions", "discipline", "fear", "greed", "revenge trading", "overtrading"],
    summary: "The biggest enemy of a trader is not the market — it's the trader themselves. Psychology is 80% of trading success.",
    details: `Trading psychology is the single most important factor determining success or failure in the markets. The market is a psychological mirror — it reflects your fears, greed, and discipline back at you.

THE 4 PRIME EMOTIONS OF TRADING:

1. FEAR: Manifests as cutting winners short, not taking valid entries, moving stops wider than planned, hesitating. The antidote is preparation — a written plan executed mechanically.

2. GREED: Manifests as adding to losing positions, over-leveraging, taking trades outside your plan, refusing to take profits. The antidote is predefined risk limits and profit targets.

3. HOPE: The most dangerous emotion in trading. Hoping a losing trade will come back. Hoping a missed entry will re-appear. Hope keeps you in losing positions. The antidote is predefined invalidation levels.

4. REVENGE: After a loss, the desire to 'get it back' immediately. Leads to doubling down, abandoning the plan, taking higher-risk setups. The antidote is a mandatory cool-down period after losses.

COGNITIVE BIASES IN TRADING:

1. RECENCY BIAS: Placing too much weight on the most recent trade or market event. Win 3 in a row? You're a genius (you're not). Lose 3 in a row? The system is broken (it's not).

2. CONFIRMATION BIAS: Only seeing evidence that supports your position. Ignoring evidence that contradicts it. The most dangerous bias — it makes you hold losing positions.

3. LOSS AVERSION: Losses hurt ~2x more than equivalent gains feel good. This causes traders to cut winners short and let losers run — the exact opposite of what's profitable.

4. GAMBLER'S FALLACY: After a series of losses, believing a win is 'due.' Each trade is an independent event — the market doesn't owe you anything.

5. ANCHORING: Fixating on a specific price (entry price, previous high) rather than current market structure.

THE SOLUTION: A TRADING ROUTINE
1. Pre-market preparation (review HTF structure, key levels, news calendar)
2. Written trade plan (entry, invalidation, target, position size, R:R)
3. Execute the plan mechanically (no deviation, no second-guessing)
4. Post-trade review (what went right, what went wrong, what to improve)
5. Journal everything (emotional state before/after each trade)`,
    lessons: ["Trading is 80% psychology, 20% strategy. The best strategy with bad psychology will lose.", "A written trading plan followed mechanically beats intuition 90% of the time.", "Losses are tuition. The question is: what did you learn?", "If you can't take a small loss, the market will give you a big one.", "Your edge is not in your entry — it's in your risk management and psychology."],
  },
  {
    id: "risk-management-essentials",
    title: "Risk Management Essentials",
    category: "risk_management",
    tags: ["risk management", "position sizing", "stop loss", "R:R", "risk reward", "account management", "drawdown"],
    summary: "The #1 rule of trading: never risk more than 1-2% of your account on a single trade. Capital preservation is the only edge that lasts.",
    details: `Risk management is NOT about how much you make — it's about how much you don't lose. Every professional trader prioritizes risk management over everything else.

CORE POSITION SIZING FORMULA:
Position Size = (Account Size × Risk %) ÷ (Entry Price − Stop Loss Price)

Example: $10,000 account, 1% risk ($100), entry $50, stop $49 ($1 risk per share) → 100 shares.

THE 1% RULE:
- Never risk more than 1% of your account on a single trade
- Professional traders risk 0.5-1%
- Aggressive traders risk up to 2%
- Risking more than 3% is gambling, not trading

R:R (RISK-REWARD RATIO):
- Minimum acceptable R:R is 1:2
- A 40% win rate with 1:3 R:R beats a 70% win rate with 1:1 R:R every time
- Win rate × Average Win / (Loss Rate × Average Loss) must be > 1

MAXIMUM DRAWDOWN RULES:
- Daily loss limit: 3-5% of account. Hit it = stop trading for the day
- Weekly loss limit: 8-10%. Hit it = stop for the week
- Monthly loss limit: 15-20%. Hit it = stop for the month
- These are NON-NEGOTIABLE. The market will be there tomorrow.

POSITION SIZING METHODS:
1. FIXED FRACTIONAL: Risk X% per trade (most common). Simple, effective.
2. KELLY CRITERION: Optimal bet sizing based on edge. Used by professional gamblers. Too aggressive for most traders — use half-Kelly.
3. MARTINGALE: Double after losses. DANGEROUS. Will eventually blow up your account.
4. ANTI-MARTINGALE: Increase after wins, decrease after losses. Less common but safer.

STOP LOSS RULES:
- Always have a stop loss before entering
- Stop loss is based on technical invalidation, not a dollar amount
- Never move your stop to make it wider (only tighter as the trade moves in your favor)
- Trailing stops should be locked in when price reaches 1:1 R:R

CORRELATION RISK:
- If you're long BTC and long ETH, you're not diversified — you're doubling your risk
- True diversification requires uncorrelated assets
- Correlation approaches 1 during crashes (everything sells off together)`,
    lessons: ["Capital preservation is the only edge that lasts — everything else comes and goes.", "Your position size is determined by your stop distance, not by 'how much you want to make.'", "A 50% drawdown requires a 100% gain to recover — drawdowns are exponential, not linear.", "The goal is not to be right — it's to make money when you're right and lose little when you're wrong.", "Risk management is boring. That's exactly why it works."],
  },
  {
    id: "loss-trading-patterns",
    title: "Why Traders Lose Money - Common Patterns",
    category: "psychology",
    tags: ["losses", "blowing up", "mistakes", "overleverage", "no stop", "revenge", "failure patterns"],
    summary: "The 7 most common ways traders blow up their accounts — and how to avoid every one of them.",
    details: `Based on decades of trading data and thousands of broker accounts analyzed, these are the most common failure patterns:

1. NO STOP LOSS (responsible for ~40% of blown accounts): Traders don't set a stop loss because they 'don't want to get stopped out.' The result: a small 2% loss turns into a 20-50% account-killer. Solution: Always set a stop before entry. Always.

2. OVERLEVERAGE (~30% of blown accounts): Using 10x, 20x, 50x+ leverage in crypto or 4x+ in forex. A 2% move against you with 50x leverage = 100% loss. Solution: Max 1-5x leverage, treat leverage as risk multiplier not profit multiplier.

3. REVENGE TRADING AFTER LOSS (~15% of blown accounts): After a loss, immediately enter another trade to 'get it back.' This trade is almost always worse — larger size, no plan, emotional. Solution: Mandatory 30-minute cool-down after any loss.

4. ADDING TO LOSERS: Averaging down into a losing position thinking 'it can't go lower.' It can always go lower. Solution: Never add to a losing position — a loss is a loss.

5. OVERTRADING: Taking too many trades. After trade #X, win rate drops 40%+. Fatigue leads to poor decisions. Solution: Maximum 3-5 trades per day. Stop after 3 consecutive losses.

6. CHASING THE MARKET: Buying after a big green candle, selling after a big red candle. Entering too late, exiting too early. Solution: Wait for pullbacks. If you missed it, you missed it.

7. UNREALISTIC EXPECTATIONS: Expecting to double your account every month. 20% per year is an excellent return for professional fund managers. Solution: Set realistic targets. 20-40% annual return is exceptional.

STATISTICS:
- 80% of retail traders lose money
- The average losing trader blows up in 6-12 months
- The #1 predictor of success: consistent position sizing
- The #2 predictor: keeping a trading journal`,
    lessons: ["No stop loss = no trading career. It's that simple.", "Leverage is a tool to destroy your account faster — use it sparingly.", "If you lose money and immediately want to trade again, you're not 'disciplined' — you're addicted.", "The market doesn't care about your rent payment, your dreams, or your P&L.", "Losing traders have the same strategies as winning traders — the difference is psychology and risk management."],
  },
];

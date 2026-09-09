import type { KnowledgeEntry } from "./events";

export const tradingConcepts: KnowledgeEntry[] = [
  {
    id: "wyckoff-methodology",
    title: "Wyckoff Methodology",
    category: "concept",
    tags: ["wyckoff", "accumulation", "distribution", "spring", "upthrust", "SOS", "SOW", "composite operator"],
    summary: "Wyckoff's three laws: Supply & Demand, Cause & Effect, Effort vs Result. Market moves through accumulation, markup, distribution, and markdown phases.",
    details: `The Wyckoff Method, developed by Richard Wyckoff in the 1930s, is based on three fundamental laws:

LAW 1: SUPPLY AND DEMAND — When demand > supply, prices rise. When supply > demand, prices fall. The direction of least resistance is determined by the imbalance.

LAW 2: CAUSE AND EFFECT — The amount of preparation (cause) in a trading range determines the extent of the move (effect). The horizontal count method: width of accumulation/distribution range projected upward/downward.

LAW 3: EFFORT VS RESULT — Volume should confirm price. If price makes progress on low volume (divergence), the move is suspect. If volume is high but price stalls, distribution is occurring.

PHASES:
ACCUMULATION (Bottoming): Phase A — Selling climax (SC), automatic rally (AR), secondary test (ST). Phase B — Building cause (wide range + narrow range). Phase C — Spring (break below support, immediately reversed). Phase D — Higher highs, stronger volume, SOS (sign of strength). Phase E — Markup begins, LPS (last point of support) is the final entry.

DISTRIBUTION (Topping): Phase A — Buying climax (BC), automatic reaction (AR), secondary test (ST). Phase B — Distribution (supply coming in). Phase C — Upthrust (UT) or UTAD (upthrust after distribution). Phase D — SOW (sign of weakness), lower highs. Phase E — Markdown begins.

KEY EVENTS:
- SPRING: Price breaks below support, quickly reverses back above. A trap for late sellers. Bullish.
- UPTHRUST (UT): Price breaks above resistance, quickly reverses back below. A trap for late buyers. Bearish.
- LPS (Last Point of Support): Final pullback before markup begins. The lowest-risk entry.
- LPSY (Last Point of Supply): Final rally before markdown begins. The best short entry.`,
    lessons: ["Wyckoff is the foundation of all price action trading — it predates and underpins modern concepts.", "The Spring is the single most reliable bullish setup in technical analysis.", "Distribution often takes longer than accumulation — tops are a process, not an event.", "Always wait for Phase D (confirmation) before entering — Phase C events can fail.", "Effort vs Result divergence is the earliest warning sign of a potential reversal."],
  },
  {
    id: "smart-money-concepts",
    title: "Smart Money Concepts (SMC)",
    category: "concept",
    tags: ["SMC", "smart money", "liquidity", "order block", "fair value gap", "FVG", "breaker", "mitigation"],
    summary: "SMC focuses on institutional order flow: liquidity hunting, order blocks, fair value gaps, and breaker blocks.",
    details: `Smart Money Concepts (SMC) is a modern trading methodology that focuses on following institutional order flow. It shares DNA with Wyckoff and ICT.

CORE CONCEPTS:

1. LIQUIDITY (LIQUIDITY SWEEPS): Institutions hunt for liquidity before moving price. Liquidity resides above old highs (stop losses of shorts) and below old lows (stop losses of longs). THIS IS THE MOST RELIABLE CONCEPT: Price almost always sweeps an obvious level before reversing.

2. ORDER BLOCKS (OB): The last candle before a strong move in the opposite direction. Bullish OB = last down candle before an up move. Bearish OB = last up candle before a down move. These are zones where institutions placed large orders.

3. FAIR VALUE GAP (FVG): A three-candle pattern where the wicks of two candles don't overlap, creating an 'inefficiency' or gap. Price tends to return to fill these gaps. Also called an imbalance (IMB).

4. BREAKER BLOCK: When an order block is broken (price moves through it), it becomes resistance/support. Buy-side breaker: A bullish OB that was broken to the downside, now acts as resistance. Sell-side breaker: A bearish OB that was broken to the upside, now acts as support.

5. MARKET STRUCTURE SHIFT (MSS) / CHANGE OF CHARACTER (CHOCH): When price breaks a structure level (higher low in uptrend, lower high in downtrend), indicating a potential trend change.

6. DISPLACEMENT: A powerful move with large candles and high volume that shows institutional commitment.

COMMON MISTAKES:
- Over-identifying order blocks (every candle is not an OB)
- Taking FVG trades that are already filled
- Ignoring higher timeframe context
- Not waiting for confirmation (MSS/CHOCH before entry)`,
    lessons: ["Liquidity sweeps are the single most predictable event in markets — price hunts stops before moving.", "Order blocks are most reliable on higher timeframes (4H, Daily, Weekly).", "Fair Value Gaps get filled ~70% of the time but not immediately.", "Always check higher timeframe structure before trading lower timeframe SMC setups.", "SMC is a framework, not a strategy — it needs to be combined with risk management."],
  },
  {
    id: "ict-concepts",
    title: "ICT (Inner Circle Trader) Concepts",
    category: "concept",
    tags: ["ICT", "inner circle trader", "killzone", "silver bullet", "liquidity", "FVG", "O TE", "PD array"],
    summary: "ICT's trading methodology focuses on specific times (killzones), liquidity concepts, and the 'PD Array' of key price levels.",
    details: `ICT (Inner Circle Trader), developed by Michael Huddleston, is a comprehensive trading methodology focused on institutional order flow and specific time-based trading sessions.

KEY CONCEPTS:

1. KILLZONES (Specific High-Probability Trading Times):
- London Killzone: 2-5 AM EST (high volatility, EUR/GBP pairs)
- New York Killzone: 7-10 AM EST (maximum volatility, USD pairs)
- London Close: 10-11 AM EST
- New York AM Silver Bullet: 7-8 AM EST (the single best hour for day trading)
- Power Hour: 3-4 PM EST (institutional positioning)

2. LQUIDITY CONCEPTS:
- Buy-side Liquidity (BSL): Above old highs, where short stops sit
- Sell-side Liquidity (SSL): Below old lows, where long stops sit
- Equal Highs/Lows: Liquidity at double tops/bottoms

3. THE PD ARRAY (Premium/Discount Array):
- Premium Zone: Above the weekly open — institutions sell into premium
- Discount Zone: Below the weekly open — institutions buy into discount
- This is based on the idea that institutions HODL and distribute, not the opposite

4. JUDAS SWING / ANCHOR CANDLE: A false move that grabs liquidity and reverses sharply. The opposite of the Wyckoff Spring/Upthrust.

5. COOKIE MONSTER / BRACKET CONCEPTS: Order flow patterns showing institutional manipulation before the real move.

6. FIBONACCI KILLZONE: Using specific Fib levels (62%, 70.5%, 79%) for entries during killzones.

CRITICAL: ICT emphasizes TIME over price — the WHEN is more important than the WHERE.`,
    lessons: ["Time-based trading is ICT's unique contribution — killzones have statistically higher probability.", "The New York AM Silver Bullet (7-8 AM EST) is the most reliable intraday setup.", "Premium/Discount framework gives a clear bias: buy in discount, sell in premium.", "Judas Swings are the institutional 'shakeout' — they are traps 90% of the time.", "ICT is controversial but contains useful synthesis of existing concepts (Wyckoff, SMC)."],
  },
  {
    id: "market-structure",
    title: "Market Structure Basics",
    category: "concept",
    tags: ["market structure", "HH", "HL", "LH", "LL", "trend", "swing high", "swing low", "break of structure"],
    summary: "Markets move in swings. Higher Highs + Higher Lows = Uptrend. Lower Highs + Lower Lows = Downtrend.",
    details: `MARKET STRUCTURE is the foundation of all technical analysis. It defines the current trend and key levels.

DEFINITIONS:
- SWING HIGH: A candle with lower highs on both sides (peak)
- SWING LOW: A candle with higher lows on both sides (trough)
- HIGHER HIGH (HH): A swing high that is higher than the previous swing high
- HIGHER LOW (HL): A swing low that is higher than the previous swing low
- LOWER HIGH (LH): A swing high that is lower than the previous swing high
- LOWER LOW (LL): A swing low that is lower than the previous swing low

TREND IDENTIFICATION:
- UPTREND: HH + HL (series of higher highs and higher lows)
- DOWNTREND: LH + LL (series of lower highs and lower lows)
- RANGING / SIDEWAYS: Equal highs and lows, no clear direction

STRUCTURE BREAKS:
- BOS (Break of Structure): In an uptrend, a break below the most recent HL. In a downtrend, a break above the most recent LH. Also called a Change of Character (CHOCH).
- KEY POINT: A BOS doesn't guarantee a trend reversal — it could be a pullback in a larger trend.

MULTI-TIMEFRAME STRUCTURE:
- HTF (Higher Timeframe) trend determines the overall direction
- LTF (Lower Timeframe) structure provides entries in the direction of HTF trend
- Always align LTF trades with HTF trend for higher probability`,
    lessons: ["Market structure is the single most important concept to master — everything else builds on it.", "A break of structure (BOS) is a warning, not a trade signal — wait for confirmation.", "Higher timeframe structure beats lower timeframe structure every time.", "In a strong trend, structure breaks on the LTF are entries, not reversals.", "Structure is subjective — two traders can draw different swing points. Pick a consistent method."],
  },
  {
    id: "candlestick-patterns",
    title: "Candlestick Patterns",
    category: "concept",
    tags: ["candlestick", "candles", "doji", "hammer", "engulfing", "pin bar", "shooting star", "morning star"],
    summary: "Single and multi-candle patterns that reveal institutional activity and potential reversals.",
    details: `Candlesticks originated with Japanese rice traders in the 18th century, developed by Munehisa Homma. Each candle represents O (open), H (high), L (low), C (close).

SINGLE CANDLE PATTERNS:

1. DOJI: Open and close are nearly equal. Indicates indecision. In an uptrend, could signal a reversal. In a downtrend, could signal exhaustion. LONG-LEGGED DOJI = extreme indecision, potential reversal. GRAVESTONE DOJI = rejection at highs. DRAGONFLY DOJI = rejection at lows.

2. HAMMER: Small body at top, long lower wick (2x body length). Bullish reversal after a downtrend. Confirmation needed (next candle closes higher).

3. SHOOTING STAR: Small body at bottom, long upper wick (2x body length). Bearish reversal after an uptrend. Also called a 'hanging man' in a downtrend (same candle, different context).

4. PIN BAR / TAIL: Long wick, small body at the opposite end. Shows strong rejection of a price level. The wick shows where price was REJECTED, not where it wants to go.

5. MARUBOZU: Long body with little to no wicks. Strong momentum. Bullish Marubozu (long green, no upper wick) = buying pressure throughout the candle.

MULTI-CANDLE PATTERNS:

1. ENGULFING: A candle that completely engulfs the previous candle. Bullish engulfing (green engulfs red) after downtrend = strong reversal signal. Bearish engulfing (red engulfs green) after uptrend = strong reversal signal.

2. MORNING STAR: 3-candle reversal pattern. 1) Long bearish candle, 2) Small doji/hammer, 3) Long bullish candle closing above the midpoint of candle 1. Strong bullish reversal.

3. EVENING STAR: Reverse of morning star. 1) Long bullish, 2) Small doji/shooting star, 3) Long bearish closing below midpoint of candle 1. Strong bearish reversal.

4. THREE WHITE SOLDIERS: Three consecutive long bullish candles, each closing near its high. Strong bullish momentum.

5. THREE BLACK CROWS: Three consecutive long bearish candles, each closing near its low. Strong bearish momentum.

CRITICAL RULE: Candlestick patterns are ONLY meaningful at key support/resistance levels. A doji in the middle of a range means nothing. A doji at resistance means everything.`,
    lessons: ["Candlestick patterns mean nothing without context — they MUST be at support/resistance levels.", "The longer the wick, the stronger the rejection. A pin with a wick 3x the body is more significant than 2x.", "Volume confirms candlestick patterns — a bullish engulfing on low volume is suspect.", "Higher timeframe candle patterns (4H, Daily) are significantly more reliable than lower timeframe.", "The strongest signal is a pattern at a key level with volume confirmation."],
  },
  {
    id: "volume-price-analysis",
    title: "Volume Price Analysis (VPA)",
    category: "concept",
    tags: ["volume", "VPA", "Wyckoff", "volume spread", "volume analysis", "accumulation", "distribution"],
    summary: "Volume confirms or contradicts price. Low volume rallies are suspect, high volume sell-offs indicate panic selling (climax).",
    details: `Volume Price Analysis (VPA) is the study of volume to confirm price action. Volume shows the CONVICTION behind a move.

CORE PRINCIPLES:

1. VOLUME CONFIRMS TREND: In an uptrend, volume should be higher on up days and lower on pullbacks. In a downtrend, volume should be higher on down days and lower on rallies.

2. CLIMAX VOLUME: Extremely high volume after a long trend signals exhaustion. Buying climax (after an uptrend) = distribution. Selling climax (after a downtrend) = accumulation.

3. LOW VOLUME PULLBACKS IN UPTREND: Healthy. Shows lack of selling pressure. Buyers are still in control.

4. HIGH VOLUME SELL-OFF IN UPTREND: Distribution. Institutions are selling into strength. Warning sign.

5. LOW VOLUME RALLIES IN DOWNTREND: Dead cat bounces. Lack of buying conviction. Short entries.

6. VOLUME SPREAD ANALYSIS:
- WIDE SPREAD UP + HIGH VOLUME = Strong buying
- NARROW SPREAD UP + HIGH VOLUME = Churning (distribution)
- WIDE SPREAD DOWN + HIGH VOLUME = Strong selling or selling climax
- NARROW SPREAD DOWN + LOW VOLUME = Weak selling, potential support

7. VOLUME DIVERGENCE: Price making new highs on declining volume = weakening trend, potential reversal. The most reliable volume signal.

COMMON MISTAKES:
- Using volume in forex (forex has no centralized volume — tick volume is a proxy)
- Ignoring volume context (a 2x volume spike in a quiet market is different from a 2x spike in active market)
- Over-interpreting single candle volume`,
    lessons: ["Volume divergence (price up, volume down) is the single most reliable leading indicator.", "Selling climaxes are buying opportunities, but wait for the automatic rally and secondary test.", "Low volume breakouts fail ~70% of the time.", "Churning (high volume, narrow range) is distribution — get out.", "Volume in crypto is less reliable due to wash trading — use it as a guide, not a gospel."],
  },
];

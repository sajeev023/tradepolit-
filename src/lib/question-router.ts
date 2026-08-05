export type IntentCategory =
  | "live_market"
  | "historical_market"
  | "trading_psychology"
  | "risk_management"
  | "strategy"
  | "indicator_explanation"
  | "education"
  | "portfolio"
  | "journal_review"
  | "general_chat";

export interface ClassifiedIntent {
  category: IntentCategory;
  confidence: number;
  requiresKnowledge: boolean;
  requiresLiveData: boolean;
  requiresUserContext: boolean;
}

const historicalPatterns = [
  /\b(what happened|explain|tell me about|describe)\b.*\b(in|during|after|before)\b.*\b(19\d{2}|20\d{2})\b/i,
  /\b(19\d{2}|20\d{2})\b.*\b(crash|bubble|rally|bull run|bear market|recession|crisis|collapse)\b/i,
  /\b(what happened|explain|tell me about|describe)\b.*\b(black monday|covid|dot.?com|financial crisis|great recession|pandemic|flash crash|ltcm|asian crisis|taper tantrum)\b/i,
  /\bcompare\b.*\b(19\d{2}|20\d{2})\b.*\b(with|to|vs|and)\b.*\b(19\d{2}|20\d{2})\b/i,
  /\b(historical|history|past|back in|remember|recall)\b.*\b(market|crash|rally|price|btc|bitcoin|eth|stock)\b/i,
];

const liveMarketPatterns = [
  /\b(current|live|now|today|this (week|month|hour|minute))\b.*\b(price|market|btc|eth|chart|setup|trade)\b/i,
  /\b(price|chart|rsi|macd|support|resistance)\b.*\b(now|currently|today|right now)\b/i,
  /\b(should I|can I|is it a good time)\b.*\b(buy|sell|enter|trade|short|long)\b/i,
  /\b(what is|what's) (the |)(price|market|setup|bias|trend)\b.*\b(now|today|currently|right now)\b/i,
];

const psychologyPatterns = [
  /\b(psychology|emotion|fear|greed|revenge|overtrading|discipline|mindset|fomo|addiction)\b/i,
  /\b(why (do|am) I|how do I stop|how to control|help with)\b.*\b(emotion|fear|greed|revenge|overtrading)\b/i,
  /\b(afraid|scared|nervous|anxious|frustrated|angry|euphoric|overconfident)\b.*\b(trade|trading|market|loss|position)\b/i,
  /\b(loss|losses|losing streak|tilt|blowing up)\b.*\b(psychology|emotion|mindset|deal|cope|handle)\b/i,
];

const riskPatterns = [
  /\b(risk|position size|stop loss|take profit|R:R|risk.?reward|drawdown|leverage|margin)\b/i,
  /\b(how much|how many|what size)\b.*\b(risk|position|size|shares|contracts)\b/i,
  /\b(risk management|capital preservation|money management|position sizing)\b/i,
];

const strategyPatterns = [
  /\b(strategy|system|method|approach|style)\b.*\b(trade|trading|entry|exit|scalp|swing|day trade|position trade)\b/i,
  /\b(how (do|should) I trade|how to trade|best strategy|what strategy|trading style)\b/i,
  /\b(scalp|intraday|swing|position trade|day trade)\b.*\b(strategy|approach|method|style)\b/i,
  /\b(wyckoff|smc|ict|smart money|order block|liquidity sweep|fair value gap|breaker|supply and demand)\b/i,
];

const indicatorPatterns = [
  /\b(what is|explain|how does)\b.*\b(rsi|macd|atr|ema|sma|volume|bollinger|fibonacci|ichimoku|vwap|divergence)\b/i,
  /\b(how to (use|read|interpret|calculate)\b.*\b(rsi|macd|atr|ema|indicator)\b)/i,
  /\b(indicator|oscillator|moving average|trend following|momentum|volatility)\b.*\b(explain|mean|work|help)\b/i,
];

const educationPatterns = [
  /\b(teach|learn|explain|understand|what is|how does)\b.*\b(trade|trading|market|stock|crypto|forex|option|future)\b/i,
  /\b(what (does|is|are)|how (does|do|can)|explain|define)\b.*\b(market|order|bid|ask|spread|liquidity|volume|volatility|trend)\b/i,
  /\b(beginner|new to|starting|learning|basics|101|introduction|fundamental)\b.*\b(trade|trading|invest|crypto|forex|stock)\b/i,
];

const portfolioPatterns = [
  /\b(my |my portfolio|my trades|my account|my positions|my pnl|my balance)\b/i,
  /\b(how am I doing|am I profitable|review my|analyze my|check my)\b.*\b(trade|trades|portfolio|account|journal|performance)\b/i,
  /\b(show me|tell me about) (my |)(recent|last|latest|open|closed)\b.*\b(trade|trades|position|journal|entry)\b/i,
];

const journalPatterns = [
  /\b(journal|journal entry|mood|feeling|mental|reflection|note)\b.*\b(trade|trading|session|day)\b/i,
  /\b(emotional|psychology|mindset|behavior)\b.*\b(journal|entry|log|record|pattern)\b/i,
];

function checkPatterns(text: string, patterns: RegExp[]): number {
  let matches = 0;
  for (const p of patterns) {
    if (p.test(text)) matches++;
  }
  return matches;
}

export function classifyIntent(message: string): ClassifiedIntent {
  const text = message.trim();

  const liveScore = checkPatterns(text, liveMarketPatterns);
  const historicalScore = checkPatterns(text, historicalPatterns);
  const psychologyScore = checkPatterns(text, psychologyPatterns);
  const riskScore = checkPatterns(text, riskPatterns);
  const strategyScore = checkPatterns(text, strategyPatterns);
  const indicatorScore = checkPatterns(text, indicatorPatterns);
  const educationScore = checkPatterns(text, educationPatterns);
  const portfolioScore = checkPatterns(text, portfolioPatterns);
  const journalScore = checkPatterns(text, journalPatterns);

  const scores: { category: IntentCategory; score: number }[] = [
    { category: "live_market", score: liveScore },
    { category: "historical_market", score: historicalScore },
    { category: "trading_psychology", score: psychologyScore },
    { category: "risk_management", score: riskScore },
    { category: "strategy", score: strategyScore },
    { category: "indicator_explanation", score: indicatorScore },
    { category: "education", score: educationScore },
    { category: "portfolio", score: portfolioScore },
    { category: "journal_review", score: journalScore },
    { category: "general_chat", score: 0 },
  ];

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  const second = scores[1];

  const confidence = top.score > 0
    ? Math.min(1, (top.score - second.score + 1) / (top.score + 1))
    : 0;

  if (top.score === 0) {
    return {
      category: "general_chat",
      confidence: 1,
      requiresKnowledge: false,
      requiresLiveData: false,
      requiresUserContext: false,
    };
  }

  const requiresKnowledge =
    top.category === "historical_market" ||
    top.category === "trading_psychology" ||
    top.category === "risk_management" ||
    top.category === "strategy" ||
    top.category === "indicator_explanation" ||
    top.category === "education";

  const requiresLiveData = top.category === "live_market";

  const requiresUserContext =
    top.category === "portfolio" ||
    top.category === "journal_review" ||
    top.category === "live_market";

  return {
    category: top.category,
    confidence,
    requiresKnowledge,
    requiresLiveData,
    requiresUserContext,
  };
}

export function getIntentInstruction(category: IntentCategory): string {
  const instructions: Record<IntentCategory, string> = {
    live_market: `You are answering a LIVE MARKET question. Follow these rules:
- Your PRIMARY source is the LIVE TELEMETRY DATA section below. Use the exact values provided.
- Never answer live market questions from model memory.
- Always include current price, trend, RSI interpretation, key levels, and market structure.
- Synthesize indicators into a cohesive narrative — do not list them individually.
- Discuss invalidation and risk for any trade idea.
- Speak in probabilities, never certainties.
- If asked about a specific setup or bias, reference the actual current data.`,

    historical_market: `You are answering a HISTORICAL MARKET question. Follow these rules:
- Use the RETRIEVED KNOWLEDGE section (if present) as your PRIMARY source for dates, prices, and percentages.
- NEVER hallucinate dates, prices, or percentages.
- If the retrieved knowledge does NOT cover the user's question, say: "I don't have verified historical data for that specific event."
- Never invent numbers. Accuracy is more important than sounding confident.
- After presenting the facts, explain: what caused it, what the pattern was, and what lessons traders can learn.
- Connect the historical event to current market dynamics where relevant.`,

    trading_psychology: `You are answering a TRADING PSYCHOLOGY question. Follow these rules:
- Be direct and honest — sugarcoating psychological issues makes them worse.
- Use specific behavioral patterns, not generic advice.
- Reference the user's own data (trades, journal, behavioral flags) when available for personalized coaching.
- Give actionable steps, not just theory.
- The trader needs to feel understood, then challenged. Empathy first, then tough love.`,

    risk_management: `You are answering a RISK MANAGEMENT question. Follow these rules:
- Be precise with numbers and formulas.
- Always frame answers in terms of account preservation.
- If asked for position sizing, use the actual risk parameters from the user's profile.
- Explain WHY the rule exists, not just what the rule is.
- The boring answer is usually the right answer in risk management.`,

    strategy: `You are answering a STRATEGY question. Follow these rules:
- Define the concept clearly in 1-2 sentences.
- Explain WHY it works (institutional logic or statistical edge).
- Give a real example of the concept in action.
- Include the common mistake traders make with it.
- End with a simple rule they can apply immediately.`,

    indicator_explanation: `You are answering an INDICATOR question. Follow these rules:
- Define the indicator in 1-2 sentences.
- Explain what it measures and why that's useful.
- Give the specific calculation only if asked.
- Explain the common misinterpretation.
- Answer in 2-3 sentences unless asked for detail.
- Think: Bloomberg terminal glossary, not a textbook.`,

    education: `You are answering an EDUCATIONAL question. Follow these rules:
- Start with the core concept in one sentence.
- Explain WHY it matters (not just what it is).
- Give a simple example.
- Explain the common mistake beginners make.
- End with one actionable takeaway.
- Keep it concise. The user wants to learn, not to read a textbook.`,

    portfolio: `You are reviewing the user's PORTFOLIO or TRADES. Follow these rules:
- Reference specific trades from the USER TRADING HISTORICAL DATA section.
- Identify patterns (cutting winners short, letting losers run, overconcentration).
- Be direct about what's working and what's not.
- Give 1-2 specific action items to improve.
- Do NOT sugarcoat. A real coach tells the truth.`,

    journal_review: `You are reviewing the user's JOURNAL. Follow these rules:
- Reference specific journal entries and moods.
- Connect emotional patterns to trading outcomes.
- Identify the gap between the user's perception and reality.
- Give actionable coaching based on what the journal reveals.
- If the user's mood is negative, address it directly before discussing charts.`,

    general_chat: `Respond conversationally like a veteran trader. Be direct and concise. If the user asks about a topic that falls into a specific category, address it with the appropriate depth. If they're just chatting, keep it light but professional.`,
  };

  return instructions[category];
}

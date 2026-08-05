export interface ClassificationResult {
  sentiment: "Bullish" | "Bearish" | "Neutral";
  sentimentScore: number; // For backward compatibility (-1.0 to 1.0)
  confidence: number;
  impactScore: "Low" | "Medium" | "High";
  importance: number; // For backward compatibility (1 to 5)
}

const BULLISH_KEYWORDS = [
  "gain", "gains", "rally", "rallies", "rise", "rises", "rising", "upward", "surge", "surges", "bullish", 
  "breakout", "breakouts", "buying", "long", "accumulating", "ath", "high", "highs", "growth", "recovery", 
  "support holds", "positive", "inflow", "inflows", "strength", "boost", "boosts", "jump", "jumps", "pump", "pumps",
  "green", "upgrade", "upgrades", "outperforms", "optimistic"
];

const BEARISH_KEYWORDS = [
  "drop", "drops", "slump", "slumps", "fall", "falls", "falling", "downward", "plunge", "plunges", "bearish", 
  "breakdown", "breakdowns", "selling", "short", "dumping", "low", "lows", "crash", "crashes", "capitulation", 
  "resistance holds", "negative", "outflow", "outflows", "weakness", "risk-off", "correction", "corrections", 
  "decline", "declines", "dump", "dumps", "red", "downgrade", "downgrades", "underperforms", "pessimistic"
];

const HIGH_IMPACT_KEYWORDS = [
  "fed", "fomc", "interest rate", "cpi", "inflation", "crash", "emergency", 
  "bailout", "collapse", "hack", "sec", "etf approval", "halt", "powell", 
  "biden", "trump", "treasury", "lawsuit", "bankruptcy", "intervention", "boj", "ecb", "rates"
];

const HIGH_CREDIBILITY_PUBLISHERS = [
  "bloomberg", "reuters", "wall street journal", "wsj", "financial times", 
  "ft", "marketwatch", "cnbc", "barrons", "investors business daily"
];

export function classifyArticle(
  title: string,
  summary: string,
  publisher: string,
  affectedAssetsCount: number
): ClassificationResult {
  const text = `${title} ${summary}`.toLowerCase();
  const pubLower = publisher.toLowerCase();

  let bullishHits = 0;
  let bearishHits = 0;

  BULLISH_KEYWORDS.forEach((word) => {
    const matches = text.match(new RegExp(`\\b${word}\\b`, 'g'));
    if (matches) bullishHits += matches.length;
  });

  BEARISH_KEYWORDS.forEach((word) => {
    const matches = text.match(new RegExp(`\\b${word}\\b`, 'g'));
    if (matches) bearishHits += matches.length;
  });

  // Calculate Sentiment
  let sentiment: "Bullish" | "Bearish" | "Neutral" = "Neutral";
  let sentimentScore = 0;
  let confidence = 0.5;

  const totalHits = bullishHits + bearishHits;
  if (totalHits > 0) {
    sentimentScore = (bullishHits - bearishHits) / totalHits;
    if (bullishHits > bearishHits) {
      sentiment = "Bullish";
      confidence = 0.5 + 0.5 * (bullishHits / totalHits);
    } else if (bearishHits > bullishHits) {
      sentiment = "Bearish";
      confidence = 0.5 + 0.5 * (bearishHits / totalHits);
    } else {
      sentiment = "Neutral";
      confidence = 0.5;
    }
  } else {
    sentiment = "Neutral";
    confidence = 0.5;
  }

  // Calculate Impact Score
  let score = 0;

  // 1. Affected Assets
  if (affectedAssetsCount >= 3) score += 2;
  else if (affectedAssetsCount >= 1) score += 1;

  // 2. Publisher Credibility
  const isHighCredibility = HIGH_CREDIBILITY_PUBLISHERS.some((credPub) =>
    pubLower.includes(credPub)
  );
  if (isHighCredibility) score += 3;
  else if (pubLower.includes("cryptopanic") || pubLower.includes("yahoo") || pubLower.includes("investing")) score += 2;
  else score += 1;

  // 3. Keywords
  const hasHighImpactKeyword = HIGH_IMPACT_KEYWORDS.some((word) =>
    text.includes(word)
  );
  if (hasHighImpactKeyword) score += 3;

  // Map score to Impact Level
  let impactScore: "Low" | "Medium" | "High" = "Low";
  let importance = 2; // For backward compatibility 1 to 5

  if (score >= 6) {
    impactScore = "High";
    importance = 5;
  } else if (score >= 3) {
    impactScore = "Medium";
    importance = 3;
  } else {
    impactScore = "Low";
    importance = 1;
  }

  return {
    sentiment,
    sentimentScore,
    confidence,
    impactScore,
    importance,
  };
}

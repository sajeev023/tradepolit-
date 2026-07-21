/**
 * src/lib/token-budget.ts
 *
 * Token budget manager for AI queries.
 * Estimates token cost of user queries and warns if they exceed tier limits.
 */

const TOKENS_PER_CHAR = 0.25;
const TOKENS_PER_WORD = 1.3;

const TIER_LIMITS = {
  FREE: { maxInputTokens: 4_000, maxOutputTokens: 350, label: "Free" },
  PRO: { maxInputTokens: 16_000, maxOutputTokens: 2_000, label: "Pro" },
} as const;

export type Tier = keyof typeof TIER_LIMITS;

export interface TokenBudget {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  tierLimit: number;
  tierLabel: string;
  isWithinLimit: boolean;
  warning?: string;
}

export function estimateTokenCost(text: string): number {
  const charEstimate = text.length * TOKENS_PER_CHAR;
  const wordEstimate = text.split(/\s+/).length * TOKENS_PER_WORD;
  return Math.ceil(Math.max(charEstimate, wordEstimate));
}

export function checkTokenBudget(
  userMessage: string,
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  tier: Tier = "FREE"
): TokenBudget {
  const historyText = conversationHistory.map(m => m.content).join(" ");
  const totalInput = `${systemPrompt} ${historyText} ${userMessage}`;
  const estimatedInputTokens = estimateTokenCost(totalInput);

  const tierConfig = TIER_LIMITS[tier];
  const estimatedOutputTokens = tierConfig.maxOutputTokens;

  const isWithinLimit = estimatedInputTokens <= tierConfig.maxInputTokens;

  let warning: string | undefined;
  if (!isWithinLimit) {
    warning = `Your query is estimated at ~${estimatedInputTokens.toLocaleString()} tokens, which exceeds the ${tierConfig.label} tier limit of ${tierConfig.maxInputTokens.toLocaleString()} tokens. Consider simplifying your query or upgrading to Pro.`;
  }

  return {
    estimatedInputTokens,
    estimatedOutputTokens,
    tierLimit: tierConfig.maxInputTokens,
    tierLabel: tierConfig.label,
    isWithinLimit,
    warning,
  };
}

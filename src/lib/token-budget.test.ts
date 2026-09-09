import { describe, it, expect } from "vitest";
import { estimateTokenCost, checkTokenBudget } from "./token-budget";

describe("estimateTokenCost", () => {
  it("returns positive integer for any text", () => {
    expect(estimateTokenCost("hello world")).toBeGreaterThan(0);
    expect(Number.isInteger(estimateTokenCost("hello world"))).toBe(true);
  });

  it("estimates longer text as more tokens", () => {
    const short = estimateTokenCost("short");
    const long = estimateTokenCost("a ".repeat(100));
    expect(long).toBeGreaterThan(short);
  });

  it("handles empty string gracefully", () => {
    expect(estimateTokenCost("")).toBeGreaterThanOrEqual(0);
  });
});

describe("checkTokenBudget", () => {
  it("allows short queries on FREE tier", () => {
    const result = checkTokenBudget("What is BTC doing?", "You are a trading coach.", [], "FREE");
    expect(result.isWithinLimit).toBe(true);
    expect(result.warning).toBeUndefined();
    expect(result.tierLabel).toBe("Free");
  });

  it("warns when query exceeds FREE tier limit", () => {
    const longMessage = "test ".repeat(5000);
    const result = checkTokenBudget(longMessage, "", [], "FREE");
    expect(result.isWithinLimit).toBe(false);
    expect(result.warning).toContain("exceeds");
  });

  it("allows larger queries on PRO tier", () => {
    const longMessage = "test ".repeat(5000);
    const result = checkTokenBudget(longMessage, "", [], "PRO");
    expect(result.isWithinLimit).toBe(true);
  });

  it("accounts for conversation history", () => {
    const history = [
      { role: "user", content: "Tell me about BTC" },
      { role: "assistant", content: "BTC is at support" },
    ];
    const resultFree = checkTokenBudget("Thanks", "", history, "FREE");
    const resultNoHistory = checkTokenBudget("Thanks", "", [], "FREE");
    expect(resultFree.estimatedInputTokens).toBeGreaterThan(resultNoHistory.estimatedInputTokens);
  });

  it("includes system prompt in token estimate", () => {
    const resultEmpty = checkTokenBudget("Hi", "", [], "FREE");
    const resultWithSys = checkTokenBudget("Hi", "You are a very long system prompt that goes on and on ".repeat(50), [], "FREE");
    expect(resultWithSys.estimatedInputTokens).toBeGreaterThan(resultEmpty.estimatedInputTokens);
  });
});

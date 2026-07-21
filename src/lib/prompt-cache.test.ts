import { describe, it, expect } from "vitest";
import { getStaticPromptPreamble, getAnalyzeChartSystemPrompt } from "./prompt-cache";

describe("getStaticPromptPreamble", () => {
  it("returns a non-empty string", () => {
    const preamble = getStaticPromptPreamble();
    expect(preamble.length).toBeGreaterThan(0);
  });

  it("contains hallucination prevention rule (Rule 6)", () => {
    const preamble = getStaticPromptPreamble();
    expect(preamble).toContain("HALLUCINATION PREVENTION");
    expect(preamble).toContain("VERIFICATION NEEDED");
  });

  it("contains confidence tagging rule (Rule 7)", () => {
    const preamble = getStaticPromptPreamble();
    expect(preamble).toContain("CONFIDENCE TAGGING");
    expect(preamble).toContain("[CONFIRMED]");
    expect(preamble).toContain("[ESTIMATED]");
    expect(preamble).toContain("[UNVERIFIED]");
  });

  it("contains no-placeholder rule (Rule 8)", () => {
    const preamble = getStaticPromptPreamble();
    expect(preamble).toContain("NO-PLACEHOLDER");
  });

  it("contains data integrity rules", () => {
    const preamble = getStaticPromptPreamble();
    expect(preamble).toContain("CRITICAL DATA INTEGRITY RULES");
  });
});

describe("getAnalyzeChartSystemPrompt", () => {
  it("returns a non-empty string", () => {
    const prompt = getAnalyzeChartSystemPrompt();
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("includes the static preamble", () => {
    const prompt = getAnalyzeChartSystemPrompt();
    expect(prompt).toContain("CONFIDENCE TAGGING");
    expect(prompt).toContain("HALLUCINATION PREVENTION");
  });

  it("includes persona identity", () => {
    const prompt = getAnalyzeChartSystemPrompt();
    expect(prompt).toContain("30+ year veteran");
  });

  it("requests valid JSON output", () => {
    const prompt = getAnalyzeChartSystemPrompt();
    expect(prompt).toContain("respond ONLY with a valid JSON object");
  });
});

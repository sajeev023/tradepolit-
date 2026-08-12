import { describe, it, expect } from "vitest";
import { parseNarrative, hasStructure } from "./ai-narrative";

describe("parseNarrative", () => {
  it("returns an empty array for empty input", () => {
    expect(parseNarrative("")).toEqual([]);
  });

  it("treats unsectioned text as a single Analysis block", () => {
    const result = parseNarrative("This is a plain analysis with no headings.");
    expect(result).toHaveLength(1);
    expect(result[0].heading).toBe("Analysis");
    expect(result[0].body).toBe("This is a plain analysis with no headings.");
  });

  it("parses ## headings into sections", () => {
    const text = `## Market Structure\n\nPrice is consolidating above VWAP.\n\n## Momentum\n\nRSI diverging bearish.`;
    const result = parseNarrative(text);
    expect(result).toHaveLength(2);
    expect(result[0].heading).toBe("Market Structure");
    expect(result[0].body).toContain("VWAP");
    expect(result[1].heading).toBe("Momentum");
    expect(result[1].body).toContain("RSI");
  });

  it("assigns semantic icons to known headings", () => {
    const text = `## Risk Assessment\n\nTighten stops.\n\n## Bottom Line\n\nStay patient.`;
    const result = parseNarrative(text);
    expect(result[0].icon).toBe("shield-alert");
    expect(result[1].icon).toBe("check-circle");
  });

  it("supports ### headings", () => {
    const text = `### Key Levels\n\nSupport at 60000.`;
    const result = parseNarrative(text);
    expect(result).toHaveLength(1);
    expect(result[0].heading).toBe("Key Levels");
  });

  it("strips trailing whitespace from bodies", () => {
    const text = `## Trade Thesis\n\nLong bias intact.\n\n`;
    const result = parseNarrative(text);
    expect(result[0].body).toBe("Long bias intact.");
  });
});

describe("hasStructure", () => {
  it("returns true when ## headings are present", () => {
    expect(hasStructure("## Foo\n\nbar")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(hasStructure("just some text")).toBe(false);
  });
});

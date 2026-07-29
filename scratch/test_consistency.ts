import { compileTechnicalContext, validateAnalysisConsistency, getRSIInterpretation } from "../src/lib/indicators";

const mockCandles = Array.from({ length: 100 }, (_, i) => ({
  timestamp: Date.now() - (100 - i) * 3600 * 1000,
  open: 2300 + Math.sin(i / 5) * 50,
  high: 2320 + Math.sin(i / 5) * 50,
  low: 2280 + Math.sin(i / 5) * 50,
  close: 2310 + Math.sin(i / 5) * 50 + (i > 80 ? i * 2 : 0), // Push RSI up
  volume: 1000 + Math.random() * 500,
  source: "LIVE" as const,
}));

console.log("=== TESTING TECHNICAL CONTEXT COMPILER ===");
const tech = compileTechnicalContext("ETH/USD", "4h", mockCandles);
console.log("Symbol:", tech.symbol);
console.log("Price:", tech.currentPrice);
console.log("Support:", tech.support);
console.log("Resistance:", tech.resistance);
console.log("Invalidation:", tech.invalidationLevel);
console.log("RSI:", tech.rsi.toFixed(2));
console.log("RSI Label:", tech.rsiLabel);
console.log("RSI Interpretation Check:", getRSIInterpretation(tech.rsi));
console.log("Source Metadata:", tech.sourceMetadata);

console.log("\n=== TESTING CONSISTENCY VALIDATION ===");
const validation = validateAnalysisConsistency(tech);
console.log("Is Valid:", validation.isValid);
console.log("Issues:", validation.issues);

if (validation.isValid) {
  console.log("\n[CONSISTENCY CHECK] PASSED");
} else {
  console.error("\n[CONSISTENCY CHECK] FAILED:", validation.issues);
}

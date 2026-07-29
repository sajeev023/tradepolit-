/**
 * TradCopilot Risk Engine
 * =======================
 * Pure, stateless, mathematically-precise position sizing calculations.
 * Uses decimal.js to eliminate IEEE-754 floating-point errors.
 */
import Decimal from "decimal.js";
import { type AssetClass, type RiskSpec, riskSpecFor, getSupportedSymbol } from "./supported-symbols";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

// `AssetClass` is re-exported here so existing callers that import it from the
// risk engine keep compiling, but the canonical definition lives in the
// registry (supported-symbols.ts) so the union can never diverge.
export type { AssetClass };
export type Direction = "LONG" | "SHORT";
export type CalculationMode = "STANDARD" | "MAX" | "MIN";

export interface RiskEngineParams {
  balance: number;
  riskPercent?: number;
  riskAmount?: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  leverage: number;
  direction: Direction;
  assetClass: AssetClass;
  symbol: string;
  mode?: CalculationMode;
}

export interface RiskEngineResult {
  maxLoss: number;
  positionSizeLeveraged: number;
  positionSize: number;
  positionSizeRounded: number;
  dollarRisk: number;
  marginRequired: number;
  stopDistance: number;
  pipValue: number;
  rewardAmount: number | null;
  rMultiple: number | null;
  standardLots: number | null;
  miniLots: number | null;
  microLots: number | null;
  lotSizeOrQty: string;
  warnings: string[];
  mode: CalculationMode;
}

const DEFAULT_MAX_LEVERAGE: Record<AssetClass, number> = {
  CRYPTO: 100,
  FOREX: 100,
  COMMODITY: 50,
  INDEX: 20,
  STOCK: 5,
};

/**
 * Resolve the asset class for a symbol from the registry. Previously the risk
 * engine kept its own `AssetClass` union (without STOCK) and fell back to
 * CRYPTO for any unknown symbol — which silently misclassified stocks. Now
 * the registry is the source of truth; the `assetClass` field on the params is
 * still accepted for backwards compatibility but the spec-driven path below
 * uses the registry's assetClass when available.
 */
function assetClassFor(symbol: string, fallback: AssetClass): AssetClass {
  return getSupportedSymbol(symbol)?.assetClass ?? fallback;
}

export function getMaxLeverage(symbol: string, requestedLeverage?: number): number {
  const max = DEFAULT_MAX_LEVERAGE[assetClassFor(symbol, "CRYPTO")] ?? 1;
  if (requestedLeverage === undefined || isNaN(requestedLeverage)) return max;
  return Math.min(Math.max(requestedLeverage, 1), max);
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateInputs(params: RiskEngineParams): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!params.balance || params.balance <= 0 || !isFinite(params.balance))
    errors.push({ field: "balance", message: "Account balance must be a positive number" });

  if (!params.entryPrice || params.entryPrice <= 0 || !isFinite(params.entryPrice))
    errors.push({ field: "entryPrice", message: "Entry price must be greater than zero" });

  if (!params.stopLoss || params.stopLoss <= 0 || !isFinite(params.stopLoss))
    errors.push({ field: "stopLoss", message: "Stop loss must be greater than zero" });

  if (params.entryPrice > 0 && params.stopLoss > 0) {
    if (params.direction === "LONG" && params.stopLoss >= params.entryPrice)
      errors.push({ field: "stopLoss", message: "For LONG trades, stop loss must be below entry price" });
    if (params.direction === "SHORT" && params.stopLoss <= params.entryPrice)
      errors.push({ field: "stopLoss", message: "For SHORT trades, stop loss must be above entry price" });
  }

  if (params.takeProfit !== undefined && params.takeProfit !== null) {
    if (params.takeProfit <= 0)
      errors.push({ field: "takeProfit", message: "Take profit must be greater than zero" });
    if (params.direction === "LONG" && params.takeProfit <= params.entryPrice)
      errors.push({ field: "takeProfit", message: "For LONG trades, take profit must be above entry price" });
    if (params.direction === "SHORT" && params.takeProfit >= params.entryPrice)
      errors.push({ field: "takeProfit", message: "For SHORT trades, take profit must be below entry price" });
  }

  if (params.riskPercent !== undefined) {
    if (params.riskPercent < 0.1 || params.riskPercent > 100 || !isFinite(params.riskPercent))
      errors.push({ field: "riskPercent", message: "Risk percent must be between 0.1% and 100%" });
  } else if (params.riskAmount !== undefined) {
    if (params.riskAmount <= 0 || !isFinite(params.riskAmount))
      errors.push({ field: "riskAmount", message: "Risk amount must be a positive number" });
  } else {
    errors.push({ field: "riskPercent", message: "Either riskPercent or riskAmount is required" });
  }

  return errors;
}

export function computePipValue(symbol: string, positionUnits: Decimal, entryPrice: Decimal): Decimal {
  const spec = riskSpecFor(symbol);
  const pip = new Decimal(spec.pipSize);
  if (spec.isJpyQuote) {
    return positionUnits.times(pip).dividedBy(entryPrice);
  }
  return positionUnits.times(pip);
}

function roundDown(value: Decimal, spec: RiskSpec): Decimal {
  const minUnit = new Decimal(spec.minTradable);
  return value.dividedBy(minUnit).floor().times(minUnit);
}

export function calculate(params: RiskEngineParams): RiskEngineResult {
  const {
    balance: rawBalance,
    riskPercent,
    riskAmount,
    entryPrice: rawEntry,
    stopLoss: rawStop,
    takeProfit: rawTp,
    leverage: rawLeverage,
    symbol,
    mode = "STANDARD",
  } = params;

  const warnings: string[] = [];
  const balance  = new Decimal(rawBalance);
  const entry    = new Decimal(rawEntry);
  const stop     = new Decimal(rawStop);
  const spec = riskSpecFor(symbol);
  const assetClass = assetClassFor(symbol, params.assetClass);
  const cappedLeverage = getMaxLeverage(symbol, rawLeverage);
  const leverage = new Decimal(cappedLeverage);
  if (rawLeverage > cappedLeverage) {
    warnings.push(`Leverage capped to ${cappedLeverage}x for ${assetClass} assets`);
  }

  // Dollar risk capital
  let riskCapital: Decimal;
  if (riskPercent !== undefined) {
    riskCapital = balance.times(new Decimal(riskPercent).dividedBy(100));
  } else if (riskAmount !== undefined) {
    riskCapital = new Decimal(riskAmount);
  } else {
    throw new Error("Either riskPercent or riskAmount required");
  }

  if (riskCapital.greaterThan(balance)) {
    warnings.push(`Risk capital capped to account balance ($${balance.toFixed(2)})`);
    riskCapital = balance;
  }

  // Stop distance = |entry ? stop| (always positive)
  const stopDistance = entry.minus(stop).abs();
  if (stopDistance.isZero()) throw new Error("Entry price and stop loss cannot be equal");

  // Position size calculation
  let positionUnits: Decimal;

  if (mode === "MAX") {
    // max_units = (balance ? leverage) / entry_price
    positionUnits = balance.times(leverage).dividedBy(entry);
    riskCapital = positionUnits.times(stopDistance);
    if (spec.isJpyQuote) riskCapital = riskCapital.dividedBy(entry);
  } else if (mode === "MIN") {
    positionUnits = new Decimal(spec.minTradable);
  } else {
    // Standard:
    // Non-JPY: position_units = risk_capital / stop_distance
    // JPY:     position_units = (risk_capital ? entry) / stop_distance
    if (spec.isJpyQuote) {
      positionUnits = riskCapital.times(entry).dividedBy(stopDistance);
    } else {
      positionUnits = riskCapital.dividedBy(stopDistance);
    }
  }

  // Round down to minimum tradable increment
  let finalPosition = roundDown(positionUnits, spec);

  // Actual dollar risk after rounding
  let actualDollarRisk: Decimal;
  if (spec.isJpyQuote) {
    actualDollarRisk = finalPosition.times(stopDistance).dividedBy(entry);
  } else {
    actualDollarRisk = finalPosition.times(stopDistance);
  }

  // Margin = (position ? entry) / leverage
  let finalMargin = finalPosition.times(entry).dividedBy(leverage);

  // Guard: margin must not exceed balance
  if (finalMargin.greaterThan(balance)) {
    warnings.push(`Margin required ($${finalMargin.toFixed(2)}) exceeds account balance ? position capped`);
    const cappedUnits = roundDown(balance.times(leverage).dividedBy(entry), spec);
    finalPosition = cappedUnits;
    finalMargin = finalPosition.times(entry).dividedBy(leverage);
    if (spec.isJpyQuote) {
      actualDollarRisk = finalPosition.times(stopDistance).dividedBy(entry);
    } else {
      actualDollarRisk = finalPosition.times(stopDistance);
    }
  }

  // Pip value
  const pipValue = computePipValue(symbol, finalPosition, entry);

  // Reward & R:R
  let rewardAmount: Decimal | null = null;
  let rMultiple: Decimal | null = null;
  if (rawTp !== undefined && rawTp !== null && rawTp > 0) {
    const tp = new Decimal(rawTp);
    const rewardDistance = tp.minus(entry).abs();
    rewardAmount = spec.isJpyQuote
      ? finalPosition.times(rewardDistance).dividedBy(entry)
      : finalPosition.times(rewardDistance);
    if (!actualDollarRisk.isZero()) {
      rMultiple = rewardAmount.dividedBy(actualDollarRisk);
    }
  }

  // Lot conversions (Forex)
  let standardLots: number | null = null;
  let miniLots: number | null = null;
  let microLots: number | null = null;
  if (assetClass === "FOREX") {
    standardLots = finalPosition.dividedBy(100000).toNumber();
    miniLots     = finalPosition.dividedBy(10000).toNumber();
    microLots    = finalPosition.dividedBy(1000).toNumber();
  }

  const lotSizeOrQty = assetClass === "FOREX" && standardLots !== null
    ? `${new Decimal(standardLots).toFixed(4)} Standard Lots`
    : `${finalPosition.toFixed(5)} ${symbol.split("/")[0]}`;

  const positionSizeLeveraged = finalPosition.times(leverage).toNumber();

  return {
    positionSize:          finalPosition.toNumber(),
    positionSizeRounded:   finalPosition.toNumber(),
    positionSizeLeveraged,
    dollarRisk:            actualDollarRisk.toNumber(),
    maxLoss:               actualDollarRisk.toNumber(),
    marginRequired:        finalMargin.toNumber(),
    stopDistance:          stopDistance.toNumber(),
    pipValue:              pipValue.toNumber(),
    rewardAmount:          rewardAmount?.toNumber() ?? null,
    rMultiple:             rMultiple?.toNumber() ?? null,
    standardLots,
    miniLots,
    microLots,
    lotSizeOrQty,
    warnings,
    mode,
  };
}


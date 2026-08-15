"use client";

import { useState, useCallback } from "react";
import { Calculator, ArrowRight, ShieldCheck, AlertTriangle, Zap, Minimize2, Maximize2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { calculate, validateInputs, type RiskEngineResult, type CalculationMode } from "@/lib/risk-engine";
import { toast } from "sonner";
import { trackClarityEvent } from "@/lib/clarity";
import {
  CRYPTO_SYMBOLS,
  FOREX_SYMBOLS,
  INDEX_SYMBOLS,
  COMMODITY_SYMBOLS,
} from "@/lib/market-registry";

// --- Types ---------------------------------------------------------------------
type AssetClass = "CRYPTO" | "FOREX" | "COMMODITY" | "INDEX";
type Direction  = "LONG" | "SHORT";
type RiskType   = "PERCENT" | "FIXED";

interface FormState {
  balance:    string;
  riskType:   RiskType;
  riskValue:  string;
  direction:  Direction;
  entryPrice: string;
  stopLoss:   string;
  takeProfit: string;
  leverage:   string;
  assetClass: AssetClass;
  symbol:     string;
  mode:       CalculationMode;
}

interface FieldError {
  field: string;
  message: string;
}

// Symbol lists per asset class — sourced from the market registry so new
// markets are picked up automatically in the risk calculator UI.
const SYMBOL_MAP: Record<AssetClass, string[]> = {
  CRYPTO:    CRYPTO_SYMBOLS,
  FOREX:     FOREX_SYMBOLS,
  COMMODITY: COMMODITY_SYMBOLS,
  INDEX:     INDEX_SYMBOLS,
};

const DEFAULT_SYMBOL: Record<AssetClass, string> = {
  CRYPTO:    CRYPTO_SYMBOLS[0] ?? "BTC/USD",
  FOREX:     FOREX_SYMBOLS[0] ?? "EUR/USD",
  COMMODITY: COMMODITY_SYMBOLS[0] ?? "XAU/USD",
  INDEX:     INDEX_SYMBOLS[0] ?? "NASDAQ",
};

// --- Helpers -------------------------------------------------------------------
function fmt(n: number | null, decimals = 2): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtUSD(n: number | null, decimals = 2): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return "$" + fmt(n, decimals);
}

// --- Component -----------------------------------------------------------------
export default function RiskCalculatorPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    balance:    "10000",
    riskType:   "PERCENT",
    riskValue:  "1",
    direction:  "LONG",
    entryPrice: "",
    stopLoss:   "",
    takeProfit: "",
    leverage:   "1",
    assetClass: "CRYPTO",
    symbol:     "BTC/USD",
    mode:       "STANDARD",
  });

  const [results, setResults] = useState<RiskEngineResult | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  // -- Field update ----------------------------------------------------------
  const update = useCallback((key: keyof FormState, val: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      // Auto-set symbol when asset class changes
      if (key === "assetClass") {
        next.symbol = DEFAULT_SYMBOL[val as AssetClass];
      }
      return next;
    });
  }, []);

  // -- Calculate -------------------------------------------------------------
  const handleCalculate = useCallback(() => {
    const balance    = parseFloat(form.balance);
    const riskValue  = parseFloat(form.riskValue);
    const entryPrice = parseFloat(form.entryPrice);
    const stopLoss   = parseFloat(form.stopLoss);
    const takeProfit = form.takeProfit ? parseFloat(form.takeProfit) : undefined;
    const leverage   = Math.max(parseFloat(form.leverage) || 1, 1);

    const params = {
      balance,
      riskPercent:  form.riskType === "PERCENT" ? riskValue : undefined,
      riskAmount:   form.riskType === "FIXED"   ? riskValue : undefined,
      entryPrice,
      stopLoss,
      takeProfit,
      leverage,
      direction:    form.direction,
      assetClass:   form.assetClass,
      symbol:       form.symbol,
      mode:         form.mode,
    };

    // Validate first
    const errors = validateInputs(params as any);
    setFieldErrors(errors);
    if (errors.length > 0) {
      setResults(null);
      return;
    }

    try {
      const result = calculate(params as any);
      setResults(result);
      trackClarityEvent("risk_calculator_calculate");
      if (result.warnings.length > 0) {
        result.warnings.forEach(w => toast.warning(w));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Calculation error";
      setResults(null);
      toast.error(msg);
    }
  }, [form]);

  const getError = (field: string) => fieldErrors.find(e => e.field === field)?.message;

  const isFormReady = () => {
    return (
      form.balance !== "" &&
      form.riskValue !== "" &&
      form.entryPrice !== "" &&
      form.stopLoss !== "" &&
      !isNaN(parseFloat(form.balance)) &&
      !isNaN(parseFloat(form.riskValue)) &&
      !isNaN(parseFloat(form.entryPrice)) &&
      !isNaN(parseFloat(form.stopLoss))
    );
  };

  const handleSendToJournal = () => {
    if (!results) return;
    const params = new URLSearchParams({
      prefill:    "true",
      instrument: form.symbol,
      direction:  form.direction,
      entryPrice: form.entryPrice,
      stopLoss:   form.stopLoss,
      takeProfit: form.takeProfit,
      size:       results.positionSize.toString(),
      leverage:   form.leverage,
    });
    router.push(`/journal?${params.toString()}`);
  };

  // -- Reusable field style --------------------------------------------------
  const inputCls = (field: string) =>
    `w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors ${
      getError(field)
        ? "bg-[var(--color-loss-bg)] border border-[rgba(var(--red-rgb),0.5)]"
        : "bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]"
    }`;

  const selectCls = "w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none";

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          Risk &amp; Position Sizing Calculator
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Institutional-grade math — powered by decimal.js precision arithmetic. Zero floating-point errors.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* -- LEFT: Inputs --------------------------------------------------- */}
        <form
          className="lg:col-span-3 card p-5 space-y-5 animate-fade-in-delay-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (isFormReady()) handleCalculate();
          }}
        >

          {/* -- Mode Selector ---------------------------------------------- */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
              Calculation Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["STANDARD", "MAX", "MIN"] as CalculationMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => update("mode", m)}
                  className="py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  style={{
                    backgroundColor: form.mode === m ? "var(--color-accent-primary)" : "var(--color-bg-tertiary)",
                    color: form.mode === m ? "var(--background)" : "var(--color-text-secondary)",
                    border: `1px solid ${form.mode === m ? "var(--color-accent-primary)" : "var(--color-border-subtle)"}`,
                  }}
                >
                  {m === "STANDARD" && <Calculator size={11} />}
                  {m === "MAX" && <Maximize2 size={11} />}
                  {m === "MIN" && <Minimize2 size={11} />}
                  {m}
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: "var(--color-text-tertiary)" }}>
              {form.mode === "STANDARD" && "Risk-defined position — uses stop distance and risk % to size the trade."}
              {form.mode === "MAX"      && "Maximum position — uses full buying power (balance — leverage) at entry price."}
              {form.mode === "MIN"      && "Minimum position — returns the smallest tradable unit for this instrument."}
            </p>
          </div>

          {/* -- Asset / Symbol --------------------------------------------- */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                Asset Class
              </label>
              <select
                className={selectCls}
                style={{ color: "var(--color-text-primary)" }}
                value={form.assetClass}
                onChange={e => update("assetClass", e.target.value)}
              >
                <option value="CRYPTO">Crypto</option>
                <option value="FOREX">Forex</option>
                <option value="COMMODITY">Commodity (Gold)</option>
                <option value="INDEX">Index (S&P 500)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                Symbol
              </label>
              <select
                className={selectCls}
                style={{ color: "var(--color-text-primary)" }}
                value={form.symbol}
                onChange={e => update("symbol", e.target.value)}
              >
                {SYMBOL_MAP[form.assetClass].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* -- Account / Leverage ----------------------------------------- */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                Account Balance ($)
              </label>
              <input
                type="number" min="0" step="any" placeholder="10000"
                className={inputCls("balance")}
                style={{ color: "var(--color-text-primary)" }}
                value={form.balance}
                onChange={e => update("balance", e.target.value)}
              />
              {getError("balance") && (
                <p className="text-[11px] mt-1 text-[var(--color-loss)] flex items-center gap-1">
                  <AlertTriangle size={10} /> {getError("balance")}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                Leverage
              </label>
              <input
                type="number" min="0" step="1" placeholder="1"
                className={inputCls("leverage")}
                style={{ color: "var(--color-text-primary)" }}
                value={form.leverage}
                onChange={e => update("leverage", e.target.value)}
              />
              <p className="text-[10px] mt-1" style={{ color: "var(--color-text-tertiary)" }}>0 = spot (1×)</p>
            </div>
          </div>

          {/* -- Risk ------------------------------------------------------- */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                Risk Type
              </label>
              <select
                className={selectCls}
                style={{ color: "var(--color-text-primary)" }}
                value={form.riskType}
                onChange={e => update("riskType", e.target.value as RiskType)}
              >
                <option value="PERCENT">Percent (%)</option>
                <option value="FIXED">Fixed ($)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                {form.riskType === "PERCENT" ? "Risk %" : "Risk Amount ($)"}
              </label>
              <input
                type="number" min="0" step="any"
                placeholder={form.riskType === "PERCENT" ? "1" : "100"}
                className={inputCls("riskPercent")}
                style={{ color: "var(--color-text-primary)" }}
                value={form.riskValue}
                onChange={e => update("riskValue", e.target.value)}
              />
              {getError("riskPercent") && (
                <p className="text-[11px] mt-1 text-[var(--color-loss)] flex items-center gap-1">
                  <AlertTriangle size={10} /> {getError("riskPercent")}
                </p>
              )}
              {getError("riskAmount") && (
                <p className="text-[11px] mt-1 text-[var(--color-loss)] flex items-center gap-1">
                  <AlertTriangle size={10} /> {getError("riskAmount")}
                </p>
              )}
            </div>
          </div>

          {/* -- Direction / Entry ------------------------------------------- */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                Direction
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["LONG", "SHORT"] as Direction[]).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => update("direction", d)}
                    className="py-2 rounded-lg text-xs font-bold transition-all"
                    style={{
                      backgroundColor: form.direction === d
                        ? d === "LONG"
                          ? "color-mix(in srgb, var(--color-profit) 18%, transparent)"
                          : "color-mix(in srgb, var(--color-loss) 18%, transparent)"
                        : "var(--color-bg-tertiary)",
                      color: form.direction === d
                        ? d === "LONG" ? "var(--color-profit)" : "var(--color-loss)"
                        : "var(--color-text-secondary)",
                      border: `1px solid ${form.direction === d
                        ? d === "LONG" ? "var(--color-profit)" : "var(--color-loss)"
                        : "var(--color-border-subtle)"}`,
                    }}
                  >
                    {d === "LONG" ? "↑ LONG" : "↓ SHORT"}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                Entry Price
              </label>
              <input
                type="number" min="0" step="any" placeholder="62000"
                className={inputCls("entryPrice")}
                style={{ color: "var(--color-text-primary)" }}
                value={form.entryPrice}
                onChange={e => update("entryPrice", e.target.value)}
              />
              {getError("entryPrice") && (
                <p className="text-[11px] mt-1 text-[var(--color-loss)] flex items-center gap-1">
                  <AlertTriangle size={10} /> {getError("entryPrice")}
                </p>
              )}
            </div>
          </div>

          {/* -- Stop / Take Profit ------------------------------------------ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                Stop Loss
                <span className="ml-1 font-normal text-[10px]">
                  ({form.direction === "LONG" ? "below entry" : "above entry"})
                </span>
              </label>
              <input
                type="number" min="0" step="any"
                placeholder={form.direction === "LONG" ? "61000" : "63000"}
                className={inputCls("stopLoss")}
                style={{ color: "var(--color-text-primary)" }}
                value={form.stopLoss}
                onChange={e => update("stopLoss", e.target.value)}
              />
              {getError("stopLoss") && (
                <p className="text-[11px] mt-1 text-[var(--color-loss)] flex items-center gap-1">
                  <AlertTriangle size={10} /> {getError("stopLoss")}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                Take Profit <span className="font-normal">(optional)</span>
              </label>
              <input
                type="number" min="0" step="any"
                placeholder={form.direction === "LONG" ? "65000" : "59000"}
                className={inputCls("takeProfit")}
                style={{ color: "var(--color-text-primary)" }}
                value={form.takeProfit}
                onChange={e => update("takeProfit", e.target.value)}
              />
              {getError("takeProfit") && (
                <p className="text-[11px] mt-1 text-[var(--color-loss)] flex items-center gap-1">
                  <AlertTriangle size={10} /> {getError("takeProfit")}
                </p>
              )}
            </div>
          </div>

          {/* -- Calculate Button -------------------------------------------- */}
          <button
            type="submit"
            disabled={!isFormReady()}
            className="w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isFormReady() ? "var(--color-accent-primary)" : "var(--color-bg-tertiary)",
              color: isFormReady() ? "var(--background)" : "var(--color-text-tertiary)",
            }}
          >
            <Zap size={15} />
            Calculate Position Size
          </button>

          {fieldErrors.length > 0 && (
            <div
              className="rounded-lg p-3"
              style={{ border: "1px solid color-mix(in srgb, var(--color-loss) 30%, transparent)", backgroundColor: "var(--color-loss-bg)" }}
            >
              <p className="text-xs font-semibold text-[var(--color-loss)] mb-1 flex items-center gap-1.5">
                <AlertTriangle size={12} /> Fix the following errors:
              </p>
              <ul className="space-y-0.5">
                {fieldErrors.map((e, i) => (
                  <li key={i} className="text-[11px] text-[var(--color-loss)] opacity-80">— {e.message}</li>
                ))}
              </ul>
            </div>
          )}
        </form>

        {/* -- RIGHT: Results ------------------------------------------------- */}
        <div className="lg:col-span-2 flex flex-col gap-4 animate-fade-in-delay-2">
          <div className="card p-5 flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-text-tertiary)" }}>
                Sizing Results
              </h2>

              {!results ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Calculator size={36} style={{ color: "var(--color-text-tertiary)" }} className="mb-2 animate-pulse" />
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                    Ready to calculate
                  </p>
                  <p className="text-xs mt-1 max-w-[180px]" style={{ color: "var(--color-text-tertiary)" }}>
                    Fill all fields and press Calculate.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Warnings */}
                  {results.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 space-y-1">
                      {results.warnings.map((w, i) => (
                        <p key={i} className="text-[11px] text-[var(--color-warning)] flex items-start gap-1.5">
                          <AlertTriangle size={10} className="mt-0.5 shrink-0" /> {w}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Primary result */}
                  <div className="bg-[var(--color-bg-tertiary)] p-4 rounded-lg border border-[var(--color-border-subtle)]">
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                      Position Size ({results.mode})
                    </p>
                    <p className="text-3xl font-extrabold font-mono text-[var(--color-accent-primary)] tabular-nums">
                      {results.standardLots !== null
                        ? fmt(results.standardLots, 4)
                        : fmt(results.positionSize, 5)}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                      {results.lotSizeOrQty}
                    </p>
                  </div>

                  {/* Metrics grid */}
                  <div className="space-y-2.5 text-sm font-medium border-t border-[var(--color-border-subtle)] pt-3">
                    {[
                      { label: "Dollar Risk",       val: fmtUSD(results.dollarRisk),    cls: "text-[var(--color-loss)]" },
                      { label: "Stop Distance",      val: fmt(results.stopDistance, 5),  cls: "" },
                      { label: "Pip Value / Tick",   val: fmtUSD(results.pipValue, 4),   cls: "text-[var(--color-accent-primary)]" },
                      { label: "Margin Required",    val: fmtUSD(results.marginRequired), cls: "" },
                    ].map(({ label, val, cls }) => (
                      <div key={label} className="flex justify-between">
                        <span style={{ color: "var(--color-text-tertiary)" }}>{label}</span>
                        <span className={`font-mono ${cls}`}>{val}</span>
                      </div>
                    ))}

                    {/* Forex lot breakdown */}
                    {results.standardLots !== null && (
                      <>
                        <div className="border-t border-[var(--color-border-subtle)] pt-2 mt-2">
                          <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>Forex Lot Breakdown</p>
                        </div>
                        {[
                          { label: "Standard Lots (100k)", val: fmt(results.standardLots, 4) },
                          { label: "Mini Lots (10k)",      val: fmt(results.miniLots, 4) },
                          { label: "Micro Lots (1k)",      val: fmt(results.microLots, 4) },
                        ].map(({ label, val }) => (
                          <div key={label} className="flex justify-between">
                            <span style={{ color: "var(--color-text-tertiary)" }}>{label}</span>
                            <span className="font-mono">{val}</span>
                          </div>
                        ))}
                      </>
                    )}

                    {/* R:R */}
                    <div className="flex justify-between">
                      <span style={{ color: "var(--color-text-tertiary)" }}>R:R Ratio</span>
                      <span className="font-mono text-[var(--color-accent-primary)]">
                        {results.rMultiple ? `${fmt(results.rMultiple, 2)}:1` : "—"}
                      </span>
                    </div>
                    {results.rewardAmount !== null && (
                      <div className="flex justify-between">
                        <span style={{ color: "var(--color-text-tertiary)" }}>Potential Profit</span>
                        <span className="font-mono text-[var(--color-profit)]">{fmtUSD(results.rewardAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {results && (
              <button
                onClick={handleSendToJournal}
                className="w-full mt-6 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                style={{ backgroundColor: "var(--color-accent-primary-muted)", color: "var(--color-accent-primary)" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--color-accent-primary)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--color-accent-primary-muted)")}
              >
                Log Sized Setup in Journal <ArrowRight size={14} />
              </button>
            )}
          </div>

          <div className="card p-4 flex items-center gap-3">
            <ShieldCheck size={20} className="text-[var(--color-accent-primary)] shrink-0" />
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-tertiary)" }}>
              Calculations use decimal.js precision arithmetic. Always verify contract specifications on your broker terminal before executing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

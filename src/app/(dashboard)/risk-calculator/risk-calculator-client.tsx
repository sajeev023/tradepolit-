"use client";

import { useState, useCallback } from "react";
import { Calculator, ArrowRight, ShieldCheck, AlertTriangle, Zap, Minimize2, Maximize2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { calculate, validateInputs, type RiskEngineResult, type CalculationMode } from "@/lib/risk-engine";
import { toast } from "sonner";
import { trackClarityEvent } from "@/lib/clarity";
import { Chip, Label, Stat } from "@/components/fd/primitives";
import { TradeLadder } from "@/components/tools/trade-ladder";
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

  const entryNum = parseFloat(form.entryPrice);
  const stopNum = parseFloat(form.stopLoss);
  const tpNum = form.takeProfit ? parseFloat(form.takeProfit) : undefined;
  const ladderReady = Number.isFinite(entryNum) && entryNum > 0 && Number.isFinite(stopNum) && stopNum > 0 && entryNum !== stopNum;

  const control = (field: string) =>
    `h-11 w-full px-3 font-mono text-[14px] text-[var(--color-text-primary)] ${getError(field) ? "!border-[rgba(var(--red-rgb),0.6)] !bg-[var(--color-loss-bg)]" : ""}`;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 lg:gap-8">
      <header>
        <Label>Position sizing</Label>
        <h1 className="mt-2 text-[var(--color-text-primary)]">
          Size the trade <em className="text-[var(--accent)]">before</em> you take it.
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--color-text-tertiary)]">
          Risk-defined position sizing with decimal.js precision. Calculated in your browser — set your stop first, then let the math pick the size.
        </p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">
        {/* ── Inputs: three stations ─────────────────────────────────────────── */}
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (isFormReady()) handleCalculate();
          }}
        >
          <Station n="01" title="Market">
            <Field label="Calculation mode" hint={
              form.mode === "STANDARD" ? "Risk-defined — stop distance and risk % size the trade."
              : form.mode === "MAX" ? "Maximum — full buying power (balance × leverage) at entry."
              : "Minimum — the smallest tradable unit for this instrument."
            }>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl border p-1" style={{ background: "var(--panel-2)", borderColor: "var(--hairline)" }}>
                {(["STANDARD", "MAX", "MIN"] as CalculationMode[]).map((m) => {
                  const on = form.mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => update("mode", m)}
                      aria-pressed={on}
                      className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg font-mono text-[11px] font-medium uppercase tracking-[0.08em] transition-colors"
                      style={{ background: on ? "var(--accent)" : "transparent", color: on ? "var(--on-accent)" : "var(--color-text-tertiary)" }}
                    >
                      {m === "STANDARD" && <Calculator size={12} />}
                      {m === "MAX" && <Maximize2 size={12} />}
                      {m === "MIN" && <Minimize2 size={12} />}
                      {m}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Asset class">
                <select className="h-11 w-full px-3 text-[14px] text-[var(--color-text-primary)]" value={form.assetClass} onChange={(e) => update("assetClass", e.target.value)}>
                  <option value="CRYPTO">Crypto</option>
                  <option value="FOREX">Forex</option>
                  <option value="COMMODITY">Commodity (Gold)</option>
                  <option value="INDEX">Index (S&amp;P 500)</option>
                </select>
              </Field>
              <Field label="Symbol">
                <select className="h-11 w-full px-3 font-mono text-[14px] text-[var(--color-text-primary)]" value={form.symbol} onChange={(e) => update("symbol", e.target.value)}>
                  {SYMBOL_MAP[form.assetClass].map((sym) => <option key={sym} value={sym}>{sym}</option>)}
                </select>
              </Field>
            </div>
          </Station>

          <Station n="02" title="Risk">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Account balance ($)" error={getError("balance")}>
                <input type="number" min="0" step="any" placeholder="10000" className={control("balance")} value={form.balance} onChange={(e) => update("balance", e.target.value)} />
              </Field>
              <Field label="Leverage" hint="0 = spot (1×)" error={getError("leverage")}>
                <input type="number" min="0" step="1" placeholder="1" className={control("leverage")} value={form.leverage} onChange={(e) => update("leverage", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4">
              <Field label="Risk type">
                <select className="h-11 w-full px-3 text-[14px] text-[var(--color-text-primary)]" value={form.riskType} onChange={(e) => update("riskType", e.target.value as RiskType)}>
                  <option value="PERCENT">Percent (%)</option>
                  <option value="FIXED">Fixed ($)</option>
                </select>
              </Field>
              <Field label={form.riskType === "PERCENT" ? "Risk per trade (%)" : "Risk amount ($)"} error={getError("riskPercent") || getError("riskAmount")}>
                <input type="number" min="0" step="any" placeholder={form.riskType === "PERCENT" ? "1" : "100"} className={control("riskPercent")} value={form.riskValue} onChange={(e) => update("riskValue", e.target.value)} />
              </Field>
            </div>
          </Station>

          <Station n="03" title="Levels">
            <Field label="Direction">
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border p-1" style={{ background: "var(--panel-2)", borderColor: "var(--hairline)" }}>
                {(["LONG", "SHORT"] as Direction[]).map((d) => {
                  const on = form.direction === d;
                  const tone = d === "LONG" ? "var(--color-profit)" : "var(--color-loss)";
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => update("direction", d)}
                      aria-pressed={on}
                      className="h-9 cursor-pointer rounded-lg font-mono text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors"
                      style={{ background: on ? `color-mix(in srgb, ${tone} 16%, transparent)` : "transparent", color: on ? tone : "var(--color-text-tertiary)", boxShadow: on ? `inset 0 0 0 1px ${tone}` : "none" }}
                    >
                      {d === "LONG" ? "↑ Long" : "↓ Short"}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Entry" error={getError("entryPrice")}>
                <input type="number" min="0" step="any" placeholder="62000" className={control("entryPrice")} value={form.entryPrice} onChange={(e) => update("entryPrice", e.target.value)} />
              </Field>
              <Field label="Stop loss" hint={form.direction === "LONG" ? "Below entry" : "Above entry"} error={getError("stopLoss")}>
                <input type="number" min="0" step="any" placeholder={form.direction === "LONG" ? "61000" : "63000"} className={control("stopLoss")} value={form.stopLoss} onChange={(e) => update("stopLoss", e.target.value)} />
              </Field>
              <Field label="Take profit" hint="Optional" error={getError("takeProfit")}>
                <input type="number" min="0" step="any" placeholder={form.direction === "LONG" ? "65000" : "59000"} className={control("takeProfit")} value={form.takeProfit} onChange={(e) => update("takeProfit", e.target.value)} />
              </Field>
            </div>
          </Station>

          {fieldErrors.length > 0 && (
            <div role="alert" className="rounded-xl border p-3.5" style={{ borderColor: "rgba(var(--red-rgb),0.3)", background: "var(--color-loss-bg)" }}>
              <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-loss)]"><AlertTriangle size={13} /> Fix the following:</p>
              <ul className="space-y-0.5">
                {fieldErrors.map((e, i) => <li key={i} className="text-[12px] text-[var(--color-loss)] opacity-80">— {e.message}</li>)}
              </ul>
            </div>
          )}

          <button type="submit" disabled={!isFormReady()} className="btn-primary btn-lg btn-block !h-12 text-[14px] disabled:!shadow-none">
            <Zap size={15} /> Calculate position size
          </button>
        </form>

        {/* ── Readout ────────────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--spacing-topbar)+var(--spacing-demo-banner)+1.5rem)]">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "var(--hairline)" }}>
              <Label>Readout</Label>
              {results && <Chip tone="signal" dot>{results.mode}</Chip>}
            </div>

            <div className="p-5">
              {ladderReady ? (
                <TradeLadder
                  direction={form.direction}
                  entry={entryNum}
                  stop={stopNum}
                  target={tpNum !== undefined && Number.isFinite(tpNum) && tpNum > 0 ? tpNum : undefined}
                  riskLabel={results ? fmtUSD(results.dollarRisk) : undefined}
                  rewardLabel={results && results.rewardAmount !== null ? fmtUSD(results.rewardAmount) : undefined}
                />
              ) : (
                <div className="flex h-[150px] flex-col items-start justify-center gap-2">
                  <Calculator size={20} style={{ color: "var(--color-text-quaternary)" }} />
                  <p className="text-[13px] leading-relaxed text-[var(--color-text-tertiary)]">Enter your entry and stop and the trade draws itself here, to scale.</p>
                </div>
              )}

              {results && (
                <div className="mt-5 space-y-5 border-t pt-5" style={{ borderColor: "var(--hairline)" }}>
                  {results.warnings.length > 0 && (
                    <div className="space-y-1 rounded-lg border p-3" style={{ borderColor: "rgba(var(--amber-rgb),0.3)", background: "var(--color-warning-bg)" }}>
                      {results.warnings.map((w, i) => (
                        <p key={i} className="flex items-start gap-1.5 text-[11.5px] text-[var(--color-warning)]"><AlertTriangle size={11} className="mt-0.5 shrink-0" /> {w}</p>
                      ))}
                    </div>
                  )}

                  <Stat
                    size="lg"
                    tone="signal"
                    label="Position size"
                    value={results.standardLots !== null ? fmt(results.standardLots, 4) : fmt(results.positionSize, 5)}
                    note={results.lotSizeOrQty}
                  />

                  <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
                    <Stat label="Dollar risk" value={fmtUSD(results.dollarRisk)} tone="loss" />
                    <Stat label="R : R" value={results.rMultiple ? `${fmt(results.rMultiple, 2)} : 1` : "—"} />
                    <Stat label="Stop distance" value={fmt(results.stopDistance, 5)} />
                    <Stat label="Margin required" value={fmtUSD(results.marginRequired)} />
                    <Stat label="Pip value / tick" value={fmtUSD(results.pipValue, 4)} />
                    {results.rewardAmount !== null && <Stat label="Potential profit" value={fmtUSD(results.rewardAmount)} tone="gain" />}
                  </dl>

                  {results.standardLots !== null && (
                    <div className="grid grid-cols-3 gap-3 rounded-lg border p-3" style={{ borderColor: "var(--hairline)", background: "var(--panel-2)" }}>
                      <Stat label="Standard" value={fmt(results.standardLots, 3)} />
                      <Stat label="Mini" value={fmt(results.miniLots, 3)} />
                      <Stat label="Micro" value={fmt(results.microLots, 3)} />
                    </div>
                  )}

                  <button onClick={handleSendToJournal} className="btn-secondary btn-block">
                    Log sized setup in journal <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </section>

          <p className="flex items-start gap-2.5 px-1 text-[11.5px] leading-relaxed text-[var(--color-text-quaternary)]">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
            Verify contract specifications on your broker terminal before executing. Educational tool — not financial advice.
          </p>
        </aside>
      </div>
    </div>
  );
}

/* ── Local layout helpers ─────────────────────────────────────────────────── */

function Station({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <header className="flex items-center gap-3 border-b px-5 py-3" style={{ borderColor: "var(--hairline)" }}>
        <span className="font-mono text-[11px] tracking-[0.14em]" style={{ color: "var(--accent)" }}>{n}</span>
        <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
      </header>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <Label className="mb-2 block">{label}</Label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-[var(--color-loss)]"><AlertTriangle size={11} /> {error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[11.5px] text-[var(--color-text-quaternary)]">{hint}</p>
      ) : null}
    </label>
  );
}

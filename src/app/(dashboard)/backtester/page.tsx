"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Play, XCircle, RefreshCw, Info, Plus } from "lucide-react";
import { Chip, Label, Skeleton, Stat } from "@/components/fd/primitives";
import { CRYPTO_SYMBOLS, FOREX_SYMBOLS, COMMODITY_SYMBOLS } from "@/lib/market-registry";
import { EquityCurveChart } from "@/components/ui/equity-curve-chart";
import { FormInput } from "@/components/ui/form-input";
import { toast } from "sonner";

/* ─── Shared results view (real runs + the labelled demo) ─── */
interface ResultMetrics {
  totalTrades?: number;
  winRate?: number;
  lossRate?: number;
  netProfit?: number;
  profitFactor?: number;
  maxDrawdown?: number;
}

function ResultsView({ title, badge, metrics, equity, trades }: { title: string; badge: React.ReactNode; metrics: ResultMetrics; equity: any[]; trades: any[] }) {
  const net = metrics.netProfit || 0;
  return (
    <div>
      <header className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "var(--hairline)" }}>
        <div className="min-w-0">
          <Label>Historical backtest</Label>
          <h2 className="mt-1 truncate text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">{badge}</div>
      </header>

      <div className="space-y-6 p-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-3">
            <Stat size="lg" label="Net return" value={`${net >= 0 ? "+" : "-"}$${Math.abs(net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} tone={net >= 0 ? "gain" : "loss"} />
          </div>
          <Stat label="Total trades" value={String(metrics.totalTrades || 0)} />
          <Stat label="Win rate" value={`${((metrics.winRate || 0) * 100).toFixed(1)}%`} tone="gain" />
          <Stat label="Loss rate" value={`${((metrics.lossRate || 0) * 100).toFixed(1)}%`} tone="loss" />
          <Stat label="Profit factor" value={(metrics.profitFactor || 0).toFixed(2)} />
          <Stat label="Max drawdown" value={`${(Math.abs(metrics.maxDrawdown || 0) * 100).toFixed(2)}%`} tone="loss" />
        </div>

        {equity.length > 0 && (
          <div>
            <Label className="mb-2 block">Equity path</Label>
            <EquityCurveChart data={equity} dataKey="equity" height={190} color={net >= 0 ? "var(--green)" : "var(--red)"} />
          </div>
        )}

        {trades.length > 0 && (
          <div>
            <Label className="mb-2 block">Simulated trades ({trades.length})</Label>
            <ul className="custom-scrollbar max-h-[260px] overflow-y-auto rounded-lg border" style={{ borderColor: "var(--hairline)", background: "var(--panel-2)" }} data-lenis-prevent>
              {trades.map((t: any, idx: number) => (
                <li key={idx} className="flex items-center justify-between gap-3 border-b px-3.5 py-2.5 last:border-b-0" style={{ borderColor: "var(--hairline)" }}>
                  <span className="flex min-w-0 items-center gap-3">
                    <Chip tone={t.direction === "SHORT" ? "loss" : "gain"}>{t.direction || "LONG"}</Chip>
                    <span className="truncate font-mono text-[11.5px] text-[var(--color-text-tertiary)]">{t.entryDate} → {t.exitDate}</span>
                  </span>
                  <span className="font-mono text-[13px] tabular-nums" style={{ color: t.pnlPercent >= 0 ? "var(--color-profit)" : "var(--color-loss)" }}>
                    {t.pnlPercent >= 0 ? "+" : ""}{t.pnlPercent.toFixed(2)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Demo Backtest Result (pre-seeded sample data, clearly labelled) ─── */
function BacktestDemoResult() {
  const demoMetrics = { totalTrades: 47, winRate: 0.617, lossRate: 0.383, netProfit: 2347.82, profitFactor: 1.84, maxDrawdown: -0.124 };
  const demoEquityCurve = [
    { date: "Jan", equity: 10000 }, { date: "Feb", equity: 10230 }, { date: "Mar", equity: 10150 }, { date: "Apr", equity: 10480 },
    { date: "May", equity: 10610 }, { date: "Jun", equity: 10890 }, { date: "Jul", equity: 11240 }, { date: "Aug", equity: 11520 },
    { date: "Sep", equity: 11810 }, { date: "Oct", equity: 11640 }, { date: "Nov", equity: 12080 }, { date: "Dec", equity: 12347.82 },
  ];
  const demoTrades = [
    { direction: "LONG", entryDate: "2025-01-12", exitDate: "2025-01-18", pnlPercent: 3.21 },
    { direction: "SHORT", entryDate: "2025-01-22", exitDate: "2025-01-25", pnlPercent: -1.84 },
    { direction: "LONG", entryDate: "2025-02-05", exitDate: "2025-02-14", pnlPercent: 5.42 },
    { direction: "LONG", entryDate: "2025-03-01", exitDate: "2025-03-08", pnlPercent: 2.18 },
    { direction: "SHORT", entryDate: "2025-03-15", exitDate: "2025-03-20", pnlPercent: 4.73 },
    { direction: "LONG", entryDate: "2025-04-02", exitDate: "2025-04-11", pnlPercent: -0.92 },
    { direction: "SHORT", entryDate: "2025-04-20", exitDate: "2025-04-28", pnlPercent: 6.15 },
    { direction: "LONG", entryDate: "2025-05-10", exitDate: "2025-05-19", pnlPercent: 1.56 },
  ];
  return (
    <ResultsView
      title="EMA Crossover Trend on BTC/USD"
      badge={<><Chip tone="warn">Sample data</Chip><Chip tone="gain" dot>Complete</Chip></>}
      metrics={demoMetrics}
      equity={demoEquityCurve}
      trades={demoTrades}
    />
  );
}

export default function BacktesterPage() {
  const queryClient = useQueryClient();
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState("BTC/USD");
  const [activeBacktestId, setActiveBacktestId] = useState<string | null>(null);
  // Demo result is gated by an explicit boolean rather than overloading
  // activeBacktestId="demo" — that overload made the demo branch unreachable,
  // because the backtest query resolves activeBacktest=undefined for "demo",
  // re-triggering the empty-state guard below.
  const [demoMode, setDemoMode] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1d");
  const [startBalance, setStartBalance] = useState<number>(10000);

  // Helper to format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const getSixMonthsAgo = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d;
  };

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setDateFrom(formatDate(getSixMonthsAgo()));
    setDateTo(formatDate(new Date()));
  }, []);

  // Strategy form settings
  const [isCreatingStrategy, setIsCreatingStrategy] = useState(false);
  const [newStratName, setNewStratName] = useState("");
  const [newStratDesc, setNewStratDesc] = useState("");
  const [entryIndA, setEntryIndA] = useState("EMA20");
  const [entryOp, setEntryOp] = useState("CROSSES_ABOVE");
  const [entryIndB, setEntryIndB] = useState("EMA50");
  const [exitIndA, setExitIndA] = useState("EMA20");
  const [exitOp, setExitOp] = useState("CROSSES_BELOW");
  const [exitIndB, setExitIndB] = useState("EMA50");

  // 1. Fetch user's strategies
  const { data: strategies, isLoading: stratLoading } = useQuery<any[]>({
    queryKey: ["strategies"],
    queryFn: async () => {
      const res = await fetch("/api/v1/strategies");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load strategies");
      return body.data;
    },
  });

  // 2. Fetch active backtest result (polls every 3s if status is RUNNING/PENDING)
  const { data: activeBacktest, isFetching: isPollingBacktest } = useQuery<any>({
    queryKey: ["backtest", activeBacktestId],
    queryFn: async () => {
      if (!activeBacktestId) return null;
      const res = await fetch(`/api/v1/backtests/${activeBacktestId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to poll backtest");
      return body.data;
    },
    enabled: !!activeBacktestId,
    refetchInterval: (query) => {
      const state = query.state.data;
      if (state && (state.status === "PENDING" || state.status === "RUNNING")) {
        return 2000;
      }
      return false;
    },
  });

  // 3. Create Strategy mutation
  const createStrategyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStratName,
          description: newStratDesc,
          rulesConfig: {
            entry: { indicatorA: entryIndA, operator: entryOp, indicatorB: entryIndB },
            exit: { indicatorA: exitIndA, operator: exitOp, indicatorB: exitIndB },
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create strategy");
      return body.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      setSelectedStrategyId(data.id);
      setIsCreatingStrategy(false);
      setNewStratName("");
      setNewStratDesc("");
      toast.success("Strategy created successfully");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // 4. Run Backtest mutation
  const runBacktestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/backtests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId: selectedStrategyId,
          instrument: selectedAsset,
          timeframe: selectedTimeframe,
          startBalance: Number(startBalance),
          dateFrom,
          dateTo,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to start backtest");
      return body.data;
    },
    onSuccess: (data) => {
      setDemoMode(false);
      setActiveBacktestId(data.id);
      toast.info("Backtest job submitted. Simulating trades...");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const handleCreateStrategy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStratName.trim()) return;
    createStrategyMutation.mutate();
  };

  const handleRunBacktest = () => {
    if (!selectedStrategyId) {
      toast.error("Please select or create a strategy first");
      return;
    }
    runBacktestMutation.mutate();
  };

  const results = activeBacktest?.resultsJson || {};
  const metrics = results.metrics || {};
  const trades = results.trades || [];
  const equityCurve = results.equityCurve || [];

  const OPERATORS = [
    { v: "CROSSES_ABOVE", l: "crosses above" },
    { v: "CROSSES_BELOW", l: "crosses below" },
    { v: "GREATER_THAN", l: "is greater than" },
    { v: "LESS_THAN", l: "is less than" },
  ];
  const INDS = [
    { v: "EMA20", l: "EMA 20" },
    { v: "EMA50", l: "EMA 50" },
    { v: "PRICE", l: "Price" },
  ];
  const inline = "h-9 rounded-lg px-2.5 font-mono text-[12.5px] text-[var(--color-text-primary)]";
  const isRunning = activeBacktest?.status === "PENDING" || activeBacktest?.status === "RUNNING";

  const renderRule = ({ verb, tone, a, op, b, setA, setOp, setB }: { verb: string; tone: string; a: string; op: string; b: string; setA: (v: string) => void; setOp: (v: string) => void; setB: (v: string) => void }) => (
    <div>
      <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: tone }}>{verb} when</p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={a} onChange={(e) => setA(e.target.value)} className={inline}>{INDS.map((i) => <option key={i.v} value={i.v}>{i.l}</option>)}</select>
        <select value={op} onChange={(e) => setOp(e.target.value)} className={inline}>{OPERATORS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
        <select value={b} onChange={(e) => setB(e.target.value)} className={inline}>{INDS.map((i) => <option key={i.v} value={i.v}>{i.l}</option>)}</select>
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 lg:gap-8">
      <header>
        <Label>Backtester</Label>
        <h1 className="mt-2 text-[var(--color-text-primary)]">
          Test the rule <em className="text-[var(--accent)]">before</em> you trust it.
        </h1>
        <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-[var(--color-text-tertiary)]">
          Run crossover rules against historical OHLCV candles and see what they would have done.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-6">
        {/* ── Setup ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <section className="card">
            <header className="flex items-center gap-3 border-b px-5 py-3" style={{ borderColor: "var(--hairline)" }}>
              <span className="font-mono text-[11px] tracking-[0.14em]" style={{ color: "var(--accent)" }}>01</span>
              <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">{isCreatingStrategy ? "New ruleset" : "Strategy"}</h2>
            </header>

            {isCreatingStrategy ? (
              <form onSubmit={handleCreateStrategy} className="space-y-5 p-5">
                <div>
                  <Label className="mb-2 block">Name</Label>
                  <FormInput value={newStratName} onChange={(e) => setNewStratName(e.target.value)} placeholder="EMA Crossover Trend" />
                </div>
                <div>
                  <Label className="mb-2 block">Description</Label>
                  <textarea value={newStratDesc} onChange={(e) => setNewStratDesc(e.target.value)} className="min-h-[64px] w-full px-3 py-2 text-[13px] text-[var(--color-text-primary)]" placeholder="What is this rule trying to catch?" />
                </div>
                {renderRule({ verb: "Buy", tone: "var(--color-profit)", a: entryIndA, op: entryOp, b: entryIndB, setA: setEntryIndA, setOp: setEntryOp, setB: setEntryIndB })}
                {renderRule({ verb: "Sell", tone: "var(--color-loss)", a: exitIndA, op: exitOp, b: exitIndB, setA: setExitIndA, setOp: setExitOp, setB: setExitIndB })}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={createStrategyMutation.isPending} className="btn-primary flex-1">Save ruleset</button>
                  <button type="button" onClick={() => setIsCreatingStrategy(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="space-y-5 p-5">
                <div>
                  <Label className="mb-2 block">Ruleset</Label>
                  {stratLoading ? (
                    <Skeleton className="h-11 w-full" />
                  ) : strategies && strategies.length > 0 ? (
                    <select value={selectedStrategyId} onChange={(e) => setSelectedStrategyId(e.target.value)} className="h-11 w-full px-3 text-[14px] text-[var(--color-text-primary)]">
                      <option value="">Choose a strategy…</option>
                      {strategies.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </select>
                  ) : (
                    <p className="text-[13px] text-[var(--color-text-tertiary)]">No rulesets yet — define your first one.</p>
                  )}
                  <button onClick={() => setIsCreatingStrategy(true)} className="mt-2.5 flex cursor-pointer items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--accent)] transition-opacity hover:opacity-70">
                    <Plus size={12} /> Define a crossover ruleset
                  </button>
                </div>
              </div>
            )}
          </section>

          {!isCreatingStrategy && (
            <section className="card">
              <header className="flex items-center gap-3 border-b px-5 py-3" style={{ borderColor: "var(--hairline)" }}>
                <span className="font-mono text-[11px] tracking-[0.14em]" style={{ color: "var(--accent)" }}>02</span>
                <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">Market & range</h2>
              </header>
              <div className="space-y-5 p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">Asset</Label>
                    <select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value)} className="h-11 w-full px-3 font-mono text-[13px] text-[var(--color-text-primary)]">
                      {[...CRYPTO_SYMBOLS, ...FOREX_SYMBOLS, ...COMMODITY_SYMBOLS].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="mb-2 block">Timeframe</Label>
                    <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)} className="h-11 w-full px-3 font-mono text-[13px] text-[var(--color-text-primary)]">
                      <option value="15m">15m</option>
                      <option value="1h">1h</option>
                      <option value="4h">4h</option>
                      <option value="1d">1d</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Starting balance ($)</Label>
                  <FormInput type="number" value={startBalance} onChange={(e) => setStartBalance(Number(e.target.value))} placeholder="10000" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">From</Label>
                    <FormInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-2 block">To</Label>
                    <FormInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </div>
                <button onClick={handleRunBacktest} disabled={runBacktestMutation.isPending || isPollingBacktest} className="btn-primary btn-lg btn-block !h-12">
                  {runBacktestMutation.isPending || isRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />} Run historical backtest
                </button>
              </div>
            </section>
          )}

          <p className="flex items-start gap-2.5 px-1 text-[11.5px] leading-relaxed text-[var(--color-text-quaternary)]">
            <Info size={15} className="mt-0.5 shrink-0" style={{ color: "var(--color-warning)" }} />
            Results assume zero transaction costs, perfect fills and no slippage. Simulated past performance does not predict future results.
          </p>
        </div>

        {/* ── Results ───────────────────────────────────────────────────────── */}
        <section className="card min-h-[420px] min-w-0">
          {demoMode ? (
            <BacktestDemoResult />
          ) : !activeBacktestId || !activeBacktest ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
              <FlaskConical size={30} style={{ color: "var(--color-text-quaternary)" }} />
              <h3 className="mt-4 font-serif text-[26px] leading-none tracking-[-0.01em] text-[var(--color-text-primary)]">No results yet</h3>
              <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-[var(--color-text-tertiary)]">Pick a ruleset on the left and run it to see how it would have performed.</p>
              <button onClick={() => setDemoMode(true)} className="btn-secondary btn-sm mt-5">Preview with sample data</button>
            </div>
          ) : isRunning ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
              <RefreshCw className="animate-spin" size={24} style={{ color: "var(--accent)" }} />
              <h3 className="mt-4 text-[15px] font-semibold text-[var(--color-text-primary)]">Backtest is running</h3>
              <p className="mt-1 text-[13px] text-[var(--color-text-tertiary)]">Ingesting candles and computing signals…</p>
            </div>
          ) : activeBacktest?.status === "FAILED" ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
              <XCircle size={30} className="text-[var(--color-loss)]" />
              <h3 className="mt-4 text-[15px] font-semibold text-[var(--color-text-primary)]">Backtest failed</h3>
              <p className="mt-1 max-w-[280px] text-[13px] text-[var(--color-loss)]">{results.error || "Historical quote rates depleted from upstream integrations."}</p>
            </div>
          ) : (
            <ResultsView
              title={`${activeBacktest.strategy?.name || "Deleted strategy"} on ${activeBacktest.instrument}`}
              badge={<Chip tone="gain" dot>Complete</Chip>}
              metrics={metrics}
              equity={equityCurve}
              trades={trades}
            />
          )}
        </section>
      </div>
    </div>
  );
}

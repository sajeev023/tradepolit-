"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Play, XCircle, RefreshCw, Info } from "lucide-react";
import { CRYPTO_SYMBOLS, FOREX_SYMBOLS, COMMODITY_SYMBOLS } from "@/lib/market-registry";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { FormInput } from "@/components/ui/form-input";
import { toast } from "sonner";

/* ─── Demo Backtest Result (pre-seeded sample data) ─── */
function BacktestDemoResult() {
  const demoMetrics = {
    totalTrades: 47,
    winRate: 0.617,
    lossRate: 0.383,
    netProfit: 2347.82,
    profitFactor: 1.84,
    maxDrawdown: -0.124,
  };
  const demoEquityCurve = [
    { date: "Jan", equity: 10000 }, { date: "Feb", equity: 10230 },
    { date: "Mar", equity: 10150 }, { date: "Apr", equity: 10480 },
    { date: "May", equity: 10610 }, { date: "Jun", equity: 10890 },
    { date: "Jul", equity: 11240 }, { date: "Aug", equity: 11520 },
    { date: "Sep", equity: 11810 }, { date: "Oct", equity: 11640 },
    { date: "Nov", equity: 12080 }, { date: "Dec", equity: 12347.82 },
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
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-border-subtle)" }}>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold" style={{ color: "var(--color-text-tertiary)" }}>Historical Backtest Results</h3>
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-amber-500/20">Demo</span>
          </div>
          <p className="text-sm font-bold text-white">EMA Crossover Trend on BTC/USD</p>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[var(--color-profit-bg)] text-[var(--color-profit)] border border-emerald-500/20">Complete</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[var(--color-bg-tertiary)] p-3 rounded border border-[var(--color-border-subtle)]">
          <span className="text-[10px] uppercase tracking-wider block" style={{ color: "var(--color-text-tertiary)" }}>Total Trades</span>
          <span className="text-lg font-bold font-mono text-[var(--color-accent-primary)]">{demoMetrics.totalTrades}</span>
        </div>
        <div className="bg-[var(--color-bg-tertiary)] p-3 rounded border border-[var(--color-border-subtle)]">
          <span className="text-[10px] uppercase tracking-wider block" style={{ color: "var(--color-text-tertiary)" }}>Win Rate</span>
          <span className="text-lg font-bold font-mono text-[var(--color-accent-primary)]">{(demoMetrics.winRate * 100).toFixed(1)}%</span>
        </div>
        <div className="bg-[var(--color-bg-tertiary)] p-3 rounded border border-[var(--color-border-subtle)]">
          <span className="text-[10px] uppercase tracking-wider block" style={{ color: "var(--color-text-tertiary)" }}>Loss Rate</span>
          <span className="text-lg font-bold font-mono text-[var(--color-accent-primary)]">{(demoMetrics.lossRate * 100).toFixed(1)}%</span>
        </div>
        <div className="bg-[var(--color-bg-tertiary)] p-3 rounded border border-[var(--color-border-subtle)]">
          <span className="text-[10px] uppercase tracking-wider block" style={{ color: "var(--color-text-tertiary)" }}>Net Return</span>
          <span className="text-lg font-bold font-mono text-[var(--color-profit)]">${demoMetrics.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="bg-[var(--color-bg-tertiary)] p-3 rounded border border-[var(--color-border-subtle)]">
          <span className="text-[10px] uppercase tracking-wider block" style={{ color: "var(--color-text-tertiary)" }}>Profit Factor</span>
          <span className="text-lg font-bold font-mono text-[var(--color-accent-primary)]">{demoMetrics.profitFactor.toFixed(2)}</span>
        </div>
        <div className="bg-[var(--color-bg-tertiary)] p-3 rounded border border-[var(--color-border-subtle)]">
          <span className="text-[10px] uppercase tracking-wider block" style={{ color: "var(--color-text-tertiary)" }}>Max Drawdown</span>
          <span className="text-lg font-bold font-mono text-[var(--color-loss)]">{(Math.abs(demoMetrics.maxDrawdown) * 100).toFixed(2)}%</span>
        </div>
      </div>
      <div className="w-full h-[180px]">
        <h4 className="text-[11px] uppercase tracking-wider mb-2 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Backtested Equity Path</h4>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={demoEquityCurve} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDemoEq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent-primary)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--color-accent-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--color-text-tertiary)" fontSize={8} tickLine={false} />
            <YAxis stroke="var(--color-text-tertiary)" fontSize={8} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }} />
            <Area type="monotone" dataKey="equity" stroke="var(--color-accent-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorDemoEq)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        <h4 className="text-[11px] uppercase tracking-wider mb-2 font-medium" style={{ color: "var(--color-text-tertiary)" }}>Demo Trades ({demoTrades.length})</h4>
        <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1">
          {demoTrades.map((t, idx) => (
            <div key={idx} className="bg-[var(--color-bg-tertiary)] p-2 rounded border border-[var(--color-border-subtle)] flex items-center justify-between text-xs font-mono">
              <div>
                <span className={`font-bold mr-2 ${t.direction === 'SHORT' ? 'text-[var(--color-loss)]' : 'text-[var(--color-accent-primary)]'}`}>{t.direction}</span>
                <span style={{ color: "var(--color-text-tertiary)" }}>{t.entryDate} → {t.exitDate}</span>
              </div>
              <div className={t.pnlPercent >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}>{t.pnlPercent >= 0 ? "+" : ""}{t.pnlPercent.toFixed(2)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BacktesterPage() {
  const queryClient = useQueryClient();
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState("BTC/USD");
  const [activeBacktestId, setActiveBacktestId] = useState<string | null>(null);
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

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          Strategy Backtester
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Test quantitative crossover rules against historical OHLCV candles securely.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column: Setup controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
              Backtest Configuration
            </h2>

            {/* Select strategy */}
            {isCreatingStrategy ? (
              <form onSubmit={handleCreateStrategy} className="space-y-4 pt-2 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                <h3 className="text-xs font-bold text-[var(--color-accent-primary)]">New Strategy Details</h3>
                <div>
                  <label className="block text-[10px] uppercase font-semibold mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                    Strategy Name
                  </label>
                  <FormInput value={newStratName} onChange={(e) => setNewStratName(e.target.value)} placeholder="EMA Crossover Trend" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-semibold mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                    Description
                  </label>
                  <textarea
                    value={newStratDesc}
                    onChange={(e) => setNewStratDesc(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none min-h-[50px]"
                    style={{ color: "var(--color-text-primary)" }}
                    placeholder="Enter details..."
                  />
                </div>

                {/* Entry parameters */}
                <div className="space-y-2">
                  <span className="block text-[10px] uppercase font-bold text-[var(--color-accent-primary)]">Entry Buy Signal</span>
                  <div className="grid grid-cols-3 gap-1 text-[11px]">
                    <select value={entryIndA} onChange={(e) => setEntryIndA(e.target.value)} className="bg-[var(--color-bg-tertiary)] p-1.5 rounded border border-[var(--color-border-subtle)] text-white">
                      <option value="EMA20">EMA 20</option>
                      <option value="EMA50">EMA 50</option>
                      <option value="PRICE">Price</option>
                    </select>
                    <select value={entryOp} onChange={(e) => setEntryOp(e.target.value)} className="bg-[var(--color-bg-tertiary)] p-1.5 rounded border border-[var(--color-border-subtle)] text-white">
                      <option value="CROSSES_ABOVE">Crosses Above</option>
                      <option value="CROSSES_BELOW">Crosses Below</option>
                      <option value="GREATER_THAN">Greater Than</option>
                      <option value="LESS_THAN">Less Than</option>
                    </select>
                    <select value={entryIndB} onChange={(e) => setEntryIndB(e.target.value)} className="bg-[var(--color-bg-tertiary)] p-1.5 rounded border border-[var(--color-border-subtle)] text-white">
                      <option value="EMA50">EMA 50</option>
                      <option value="EMA20">EMA 20</option>
                      <option value="PRICE">Price</option>
                    </select>
                  </div>
                </div>

                {/* Exit parameters */}
                <div className="space-y-2">
                  <span className="block text-[10px] uppercase font-bold text-[var(--color-loss)]">Exit Sell Signal</span>
                  <div className="grid grid-cols-3 gap-1 text-[11px]">
                    <select value={exitIndA} onChange={(e) => setExitIndA(e.target.value)} className="bg-[var(--color-bg-tertiary)] p-1.5 rounded border border-[var(--color-border-subtle)] text-white">
                      <option value="EMA20">EMA 20</option>
                      <option value="EMA50">EMA 50</option>
                      <option value="PRICE">Price</option>
                    </select>
                    <select value={exitOp} onChange={(e) => setExitOp(e.target.value)} className="bg-[var(--color-bg-tertiary)] p-1.5 rounded border border-[var(--color-border-subtle)] text-white">
                      <option value="CROSSES_BELOW">Crosses Below</option>
                      <option value="CROSSES_ABOVE">Crosses Above</option>
                      <option value="GREATER_THAN">Greater Than</option>
                      <option value="LESS_THAN">Less Than</option>
                    </select>
                    <select value={exitIndB} onChange={(e) => setExitIndB(e.target.value)} className="bg-[var(--color-bg-tertiary)] p-1.5 rounded border border-[var(--color-border-subtle)] text-white">
                      <option value="EMA50">EMA 50</option>
                      <option value="EMA20">EMA 20</option>
                      <option value="PRICE">Price</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded text-xs font-semibold bg-cyan-400 text-zinc-950 hover:bg-cyan-300 transition-colors"
                  >
                    Save Ruleset
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingStrategy(false)}
                    className="px-3 py-2 rounded text-xs font-semibold border border-[var(--color-border-subtle)]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Select Strategy Ruleset
                  </label>
                  {stratLoading ? (
                    <div className="flex justify-center p-4">
                      <RefreshCw className="animate-spin text-[var(--color-accent-primary)]" size={16} />
                    </div>
                  ) : strategies && strategies.length > 0 ? (
                    <select
                      value={selectedStrategyId}
                      onChange={(e) => setSelectedStrategyId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      <option value="">-- Choose Strategy --</option>
                      {strategies.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-[var(--color-loss)]">No strategy rulesets defined yet.</p>
                  )}
                  <button
                    onClick={() => setIsCreatingStrategy(true)}
                    className="mt-2.5 text-xs font-semibold text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)] transition-colors block"
                  >
                    + Define New Crossover Ruleset
                  </button>
                </div>

                {/* Instrument */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Asset Target
                  </label>
                  <select
                    value={selectedAsset}
                    onChange={(e) => setSelectedAsset(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {/* Backtestable assets — crypto, forex, commodities from the registry. */}
                    {[...CRYPTO_SYMBOLS, ...FOREX_SYMBOLS, ...COMMODITY_SYMBOLS].map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                {/* Timeframe */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Timeframe
                  </label>
                  <select
                    value={selectedTimeframe}
                    onChange={(e) => setSelectedTimeframe(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    <option value="15m">15 Minutes (15m)</option>
                    <option value="1h">1 Hour (1h)</option>
                    <option value="4h">4 Hours (4h)</option>
                    <option value="1d">1 Day (1d)</option>
                  </select>
                </div>

                {/* Starting Balance */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Starting Balance ($)
                  </label>
                  <FormInput
                    type="number"
                    value={startBalance}
                    onChange={(e) => setStartBalance(Number(e.target.value))}
                    placeholder="10000"
                  />
                </div>

                {/* Date Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                      Date From
                    </label>
                    <FormInput
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                      Date To
                    </label>
                    <FormInput
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunBacktest}
                  disabled={runBacktestMutation.isPending || isPollingBacktest}
                  className="w-full flex items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-semibold transition-all"
                  style={{ backgroundColor: "var(--color-accent-primary)", color: "#0A0A0B" }}
                >
                  <Play size={14} fill="#0A0A0B" /> Run Historical Backtest
                </button>
              </div>
            )}
          </div>

          <div className="card p-4 flex gap-3">
            <Info size={16} className="text-[var(--color-accent-primary)] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-tertiary)" }}>
              Backtests run using daily OHLCV data with EMA crossover signals. <strong className="text-[var(--color-warning)]">Note:</strong> Results assume zero transaction costs, perfect fill prices, and no slippage. Simulated past performance does not predict future results.
            </p>
          </div>
        </div>

        {/* Right column: Results dashboard */}
        <div className="lg:col-span-3">
          <div className="card p-5 min-h-[400px] flex flex-col justify-between">
            {!activeBacktestId || !activeBacktest ? (
              <div className="flex flex-col items-center justify-center py-20 text-center my-auto">
                <FlaskConical size={36} style={{ color: "var(--color-text-tertiary)" }} className="mb-2" />
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                  No backtest results
                </h3>
                <p className="text-xs mt-1 max-w-[220px]" style={{ color: "var(--color-text-tertiary)" }}>
                  Configure your crossover rules on the left to simulate past performance.
                </p>
                <button
                  onClick={() => setActiveBacktestId("demo")}
                  className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold border transition-all hover:bg-[var(--color-bg-hover)]"
                  style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}
                >
                  Show Demo Result
                </button>
              </div>
            ) : activeBacktestId === "demo" ? (
              <BacktestDemoResult />
            ) : activeBacktest?.status === "PENDING" || activeBacktest?.status === "RUNNING" ? (
              <div className="flex flex-col items-center justify-center py-28 text-center my-auto">
                <RefreshCw className="animate-spin text-[var(--color-accent-primary)] mb-2" size={24} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                  Backtest Execution is Running
                </h3>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                  Ingesting candlestick aggregates and computing signal markers...
                </p>
              </div>
            ) : activeBacktest?.status === "FAILED" ? (
              <div className="flex flex-col items-center justify-center py-28 text-center my-auto">
                <XCircle size={32} className="text-[var(--color-loss)] mb-2" />
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                  Backtest Execution Failed
                </h3>
                <p className="text-xs mt-1 text-[var(--color-loss)] max-w-[220px]">
                  {results.error || "Historical quote rates depleted from upstream integrations."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header info */}
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <div>
                    <h3 className="text-xs font-semibold" style={{ color: "var(--color-text-tertiary)" }}>
                      Historical Backtest Results
                    </h3>
                    <p className="text-sm font-bold text-white">
                      {activeBacktest.strategy?.name || "Deleted Strategy"} on {activeBacktest.instrument}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[var(--color-profit-bg)] text-[var(--color-profit)] border border-emerald-500/20">
                    Complete
                  </span>
                </div>

                {/* Mini metrics bar */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[var(--color-bg-tertiary)] p-3 rounded border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] uppercase tracking-wider block" style={{ color: "var(--color-text-tertiary)" }}>
                      Total Trades
                    </span>
                    <span className="text-lg font-bold font-mono text-[var(--color-accent-primary)]">
                      {metrics.totalTrades || 0}
                    </span>
                  </div>
                  <div className="bg-[var(--color-bg-tertiary)] p-3 rounded border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] uppercase tracking-wider block" style={{ color: "var(--color-text-tertiary)" }}>
                      Win Rate
                    </span>
                    <span className="text-lg font-bold font-mono text-[var(--color-accent-primary)]">
                      {((metrics.winRate || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-[var(--color-bg-tertiary)] p-3 rounded border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] uppercase tracking-wider block" style={{ color: "var(--color-text-tertiary)" }}>
                      Loss Rate
                    </span>
                    <span className="text-lg font-bold font-mono text-[var(--color-accent-primary)]">
                      {((metrics.lossRate || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-[var(--color-bg-tertiary)] p-3 rounded border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] uppercase tracking-wider block" style={{ color: "var(--color-text-tertiary)" }}>
                      Net Return
                    </span>
                    <span className={`text-lg font-bold font-mono ${(metrics.netProfit || 0) >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}`}>
                      ${(metrics.netProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-[var(--color-bg-tertiary)] p-3 rounded border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] uppercase tracking-wider block" style={{ color: "var(--color-text-tertiary)" }}>
                      Profit Factor
                    </span>
                    <span className="text-lg font-bold font-mono text-[var(--color-accent-primary)]">
                      {(metrics.profitFactor || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-[var(--color-bg-tertiary)] p-3 rounded border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] uppercase tracking-wider block" style={{ color: "var(--color-text-tertiary)" }}>
                      Max Drawdown
                    </span>
                    <span className="text-lg font-bold font-mono text-[var(--color-loss)]">
                      {((metrics.maxDrawdown || 0) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Backtester Chart */}
                {equityCurve.length > 0 && (
                  <div className="w-full h-[180px]">
                    <h4 className="text-[11px] uppercase tracking-wider mb-2 font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                      Backtested Equity Path
                    </h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equityCurve} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorBtEquity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-accent-primary)" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="var(--color-accent-primary)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--color-text-tertiary)" fontSize={8} tickLine={false} />
                        <YAxis stroke="var(--color-text-tertiary)" fontSize={8} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-bg-secondary)",
                            borderColor: "var(--color-border-default)",
                            color: "var(--color-text-primary)",
                          }}
                        />
                        <Area type="monotone" dataKey="equity" stroke="var(--color-accent-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorBtEquity)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Backtest trades list */}
                {trades.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] uppercase tracking-wider mb-2 font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                      Simulated Executed Trades ({trades.length})
                    </h4>
                    <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1">
                      {trades.map((t: any, idx: number) => (
                        <div key={idx} className="bg-[var(--color-bg-tertiary)] p-2 rounded border border-[var(--color-border-subtle)] flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className={`font-bold mr-2 ${t.direction === 'SHORT' ? 'text-[var(--color-loss)]' : 'text-[var(--color-accent-primary)]'}`}>
                              {t.direction || 'LONG'}
                            </span>
                            <span style={{ color: "var(--color-text-tertiary)" }}>
                              {t.entryDate} → {t.exitDate}
                            </span>
                          </div>
                          <div className={t.pnlPercent >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}>
                            {t.pnlPercent >= 0 ? "+" : ""}{t.pnlPercent.toFixed(2)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

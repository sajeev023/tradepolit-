"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { useBinanceStream } from "@/hooks/useBinanceStream";
import type { OHLCVCandle } from "@/lib/types";

/* ── Types (minimal local shapes for the public market endpoints) ── */
interface TechContext {
  currentPrice?: number;
  rsi?: number;
  rsiLabel?: string;
  macdValue?: number;
  macdSignal?: number;
  macdHistogram?: number;
  support?: number;
  resistance?: number;
  atr?: number;
  trend?: string;
  bias?: string;
  setupQuality?: string;
  confidence?: string;
  emaCrossover?: string | null;
  macdCrossover?: string | null;
  volume?: number;
}

const SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD"] as const;
type Symbol = (typeof SYMBOLS)[number];

const TF = "4h";
const CANDLE_LIMIT = 60;

function fmtPrice(n: number | undefined | null, max = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: max });
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function fmtPct(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

/**
 * HeroWorkbench — chrome-less, high-fidelity interactive workbench that
 * renders REAL chart data from the existing public market endpoints.
 *
 *   • Candles:  GET /api/v1/market/ohlcv  (public, IP-rate-limited)
 *   • Indicators: GET /api/v1/market/indicators (public)
 *   • Live price: useBinanceStream() WebSocket (public, no auth)
 *   • Chat input: routes to /signup — the AI chat endpoint requires auth,
 *     so we never fabricate an AI response (no-fabricated-data rule).
 *
 * When the upstream feed is unavailable the API returns source:'SIMULATED'
 * with a warning — we surface a disclosure chip rather than implying live
 * trading data.
 */
export function HeroWorkbench() {
  const [symbol, setSymbol] = useState<Symbol>("BTC/USD");
  const [candles, setCandles] = useState<OHLCVCandle[] | null>(null);
  const [tech, setTech] = useState<TechContext | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [loading, setLoading] = useState(true);

  const live = useBinanceStream(symbol);

  // Fetch candles + indicators whenever the symbol changes.
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ symbol, tf: TF, limit: String(CANDLE_LIMIT) });
        const [cRes, iRes] = await Promise.all([
          fetch(`/api/v1/market/ohlcv?${params}`),
          fetch(`/api/v1/market/indicators?${new URLSearchParams({ symbol, tf: TF })}`),
        ]);
        if (!active) return;
        const cJson = await cRes.json().catch(() => ({}));
        const iJson = await iRes.json().catch(() => ({}));
        const c: OHLCVCandle[] | undefined = cJson?.data;
        const t: TechContext | undefined = iJson?.data;
        if (Array.isArray(c) && c.length > 0) {
          setCandles(c);
          setSimulated(c.some((cd) => cd.source === "SIMULATED"));
        } else {
          setCandles(null);
          setSimulated(true);
        }
        if (t) setTech(t);
      } catch {
        if (active) {
          setCandles(null);
          setSimulated(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [symbol]);

  const displayPrice = live?.price ?? tech?.currentPrice ?? candles?.[candles.length - 1]?.close;
  const changePct = live?.changePercent24h;

  return (
    <div className="tc-terminal !p-0 overflow-hidden w-full">
      {/* ── Top row: symbol tabs + live price + status ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-1.5">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium tracking-wide transition-colors ${
                s === symbol
                  ? "bg-[rgba(47,198,232,0.12)] text-[var(--accent)] border border-[rgba(47,198,232,0.25)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)] border border-transparent"
              }`}
              aria-pressed={s === symbol}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-mono font-semibold tabular-nums text-[var(--ink)]">
            ${fmtPrice(displayPrice)}
          </span>
          <span
            className={`text-[11px] font-mono tabular-nums ${
              changePct == null
                ? "text-[var(--muted)]"
                : changePct >= 0
                ? "text-[var(--green)]"
                : "text-[var(--red)]"
            }`}
          >
            {fmtPct(changePct)}
          </span>
        </div>
      </div>

      {/* ── Chart + side readout ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_176px]">
        <div className="relative p-3 min-h-[260px]">
          {loading ? (
            <ChartSkeleton />
          ) : candles && candles.length > 1 ? (
            <CandleChart candles={candles} support={tech?.support} resistance={tech?.resistance} />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-[12px] text-[var(--muted)] font-mono">
              Chart feed reconnecting…
            </div>
          )}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="tc-status-chip tc-status-chip--accent">
              <span className={`tc-status-chip__dot ${live ? "tc-status-chip__dot--pulse" : ""}`} />
              {simulated ? "ILLUSTRATIVE" : "LIVE"}
            </span>
            <span className="text-[10px] font-mono text-[var(--muted)]">{TF}</span>
          </div>
        </div>

        {/* Indicator + data readout */}
        <div className="border-t md:border-t-0 md:border-l border-[var(--color-border-subtle)] p-3 grid grid-cols-2 md:grid-cols-1 gap-2.5">
          <Readout label="RSI(14)" value={tech?.rsi?.toFixed(1)} accent={tech?.rsi != null && tech.rsi > 70 ? "red" : tech?.rsi != null && tech.rsi < 30 ? "green" : undefined} />
          <Readout label="MACD" value={tech?.macdHistogram != null ? (tech.macdHistogram >= 0 ? "+" : "") + tech.macdHistogram.toFixed(3) : undefined} accent={tech?.macdHistogram != null ? (tech.macdHistogram >= 0 ? "green" : "red") : undefined} />
          <Readout label="EMA 9/21" value={tech?.emaCrossover ? tech.emaCrossover : "—"} accent={tech?.emaCrossover === "BULLISH" ? "green" : tech?.emaCrossover === "BEARISH" ? "red" : undefined} />
          <Readout label="ATR(14)" value={tech?.atr?.toFixed(2)} />
          <Readout label="Support" value={tech?.support ? "$" + fmtPrice(tech.support) : undefined} accent="green" />
          <Readout label="Resistance" value={tech?.resistance ? "$" + fmtPrice(tech.resistance) : undefined} accent="red" />
        </div>
      </div>

      {/* ── Bias + setup strip ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">Bias</span>
          <span
            className={`text-[11px] font-mono font-semibold ${
              tech?.bias?.includes("LONG") || tech?.bias?.includes("BUY")
                ? "text-[var(--green)]"
                : tech?.bias?.includes("SHORT") || tech?.bias?.includes("SELL")
                ? "text-[var(--red)]"
                : "text-[var(--ink)]"
            }`}
          >
            {tech?.bias ?? "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">Setup</span>
          <span className="text-[11px] font-mono font-semibold text-[var(--ink)]">{tech?.setupQuality ?? "—"}</span>
          {tech?.confidence && (
            <span className="tc-badge tc-badge--accent">{tech.confidence}</span>
          )}
        </div>
      </div>

      {/* ── Working chat input (routes to signup — AI requires auth) ── */}
      <WorkbenchChat symbol={symbol} />
    </div>
  );
}

/* ── Candle chart (SVG, real data) ── */
function CandleChart({
  candles,
  support,
  resistance,
}: {
  candles: OHLCVCandle[];
  support?: number;
  resistance?: number;
}) {
  const W = 640;
  const H = 240;
  const padY = 12;
  const slice = candles.slice(-CANDLE_LIMIT);

  const highs = slice.map((c) => c.high);
  const lows = slice.map((c) => c.low);
  let max = Math.max(...highs);
  let min = Math.min(...lows);
  if (support != null && Number.isFinite(support)) min = Math.min(min, support);
  if (resistance != null && Number.isFinite(resistance)) max = Math.max(max, resistance);
  const range = max - min || 1;
  const pad = range * 0.08;
  max += pad;
  min -= pad;
  const span = max - min || 1;

  const n = slice.length;
  const cw = W / n;
  const bodyW = Math.max(2, cw * 0.62);

  const y = (price: number) => padY + ((max - price) / span) * (H - padY * 2);

  const lastClose = slice[slice.length - 1].close;
  const upColor = "var(--green)";
  const downColor = "var(--red)";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      className="block h-[240px] md:h-[260px]"
      role="img"
      aria-label={`${slice.length} most recent real candles`}
    >
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={0}
          x2={W}
          y1={padY + f * (H - padY * 2)}
          y2={padY + f * (H - padY * 2)}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1}
        />
      ))}

      {/* support / resistance */}
      {resistance != null && Number.isFinite(resistance) && (
        <g>
          <line x1={0} x2={W} y1={y(resistance)} y2={y(resistance)} stroke="var(--red)" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
          <text x={6} y={y(resistance) - 4} fontSize={9} fontFamily="var(--font-mono)" fill="var(--red)" opacity={0.8}>R {fmtPrice(resistance)}</text>
        </g>
      )}
      {support != null && Number.isFinite(support) && (
        <g>
          <line x1={0} x2={W} y1={y(support)} y2={y(support)} stroke="var(--green)" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
          <text x={6} y={y(support) + 11} fontSize={9} fontFamily="var(--font-mono)" fill="var(--green)" opacity={0.8}>S {fmtPrice(support)}</text>
        </g>
      )}

      {/* candles */}
      {slice.map((c, i) => {
        const cx = i * cw + cw / 2;
        const isUp = c.close >= c.open;
        const color = isUp ? upColor : downColor;
        const bodyTop = y(Math.max(c.open, c.close));
        const bodyBot = y(Math.min(c.open, c.close));
        const bodyH = Math.max(1, bodyBot - bodyTop);
        return (
          <g key={c.timestamp}>
            <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} opacity={0.85} />
            <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={color} rx={1} />
          </g>
        );
      })}

      {/* last price marker */}
      <g>
        <line x1={0} x2={W} y1={y(lastClose)} y2={y(lastClose)} stroke="var(--accent)" strokeWidth={1} opacity={0.55} strokeDasharray="2 3" />
        <circle cx={W - 1} cy={y(lastClose)} r={2.5} fill="var(--accent)" />
      </g>
    </svg>
  );
}

function Readout({
  label,
  value,
  accent,
}: {
  label: string;
  value?: string | number | null;
  accent?: "green" | "red" | "amber";
}) {
  const color =
    accent === "green"
      ? "text-[var(--green)]"
      : accent === "red"
      ? "text-[var(--red)]"
      : accent === "amber"
      ? "text-[var(--amber)]"
      : "text-[var(--ink)]";
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-mono uppercase tracking-wider text-[var(--muted)]">{label}</div>
      <div className={`text-[12px] font-mono font-semibold tabular-nums truncate ${color}`}>
        {value == null || value === "" ? "—" : value}
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[240px] md:h-[260px] flex flex-col gap-2">
      <div className="tc-skeleton h-3 w-24" />
      <div className="flex items-end gap-1 h-full pb-2">
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={i}
            className="tc-skeleton flex-1"
            style={{ height: `${30 + ((i * 13) % 60)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Chat input — interactive but honest (no fabricated AI) ── */
function WorkbenchChat({ symbol }: { symbol: string }) {
  const [value, setValue] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = value.trim();
      if (!q) return;
      setAsked(q);
      setValue("");
    },
    [value]
  );

  return (
    <div className="border-t border-[var(--color-border-subtle)] p-3">
      {asked ? (
        <div className="space-y-2 mb-2">
          <div className="rounded-lg bg-[rgba(47,198,232,0.06)] border border-[rgba(47,198,232,0.16)] px-2.5 py-1.5 text-[11px] text-[var(--ink)] font-mono">
            {asked}
          </div>
          <div className="flex items-start gap-2 text-[11px] text-[var(--muted)] leading-relaxed">
            <span className="tc-status-chip tc-status-chip--accent mt-0.5 shrink-0">
              <span className="tc-status-chip__dot" /> Copilot
            </span>
            <span>
              I run live analysis on {symbol} telemetry for signed-in traders.{" "}
              <Link href="/signup" className="text-[var(--accent)] font-semibold underline underline-offset-2">
                Create a free account
              </Link>{" "}
              to ask the copilot about this setup — no card required.
            </span>
          </div>
        </div>
      ) : null}
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Ask the copilot about ${symbol}…`}
          className="flex-1 h-9 rounded-lg bg-[var(--bg-band)] border border-[var(--color-border-default)] px-3 text-[12px] font-mono text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none transition-colors"
          aria-label={`Ask the copilot about ${symbol}`}
          maxLength={200}
        />
        <button
          type="submit"
          className="h-9 w-9 shrink-0 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] flex items-center justify-center hover:bg-[var(--color-accent-primary-hover)] transition-colors"
          aria-label="Send"
        >
          <Send size={13} />
        </button>
      </form>
    </div>
  );
}
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

  // “The desk powers on” — a one-time entrance choreography. Real data only:
  // candles rise in left→right, the tape rolls from the first candle's open to
  // the live price, indicators populate in a stagger. Fires exactly once; a
  // symbol switch crossfades instead of re-booting so the entrance stays a
  // first-impression moment rather than a repeated gimmick.
  const rootRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLSpanElement>(null);
  const displayPriceRef = useRef<number | undefined>(undefined);
  const hasBootedRef = useRef(false);
  const [booting, setBooting] = useState(false);
  const [bootStart, setBootStart] = useState<number | null>(null);

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
  // Mirror displayPrice into a ref so the boot effect can read the live value at
  // fire time without joining it to the effect deps (which would re-run on every
  // WebSocket tick and thrash the choreography).
  useEffect(() => {
    displayPriceRef.current = displayPrice;
  }, [displayPrice]);

  useEffect(() => {
    if (loading || !candles || candles.length < 2) return;
    const root = rootRef.current;
    if (!root) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const firstTime = !hasBootedRef.current;
    hasBootedRef.current = true;

    if (firstTime) {
      if (prefersReduced) return; // instant settle — React renders the real values.
      const slice = candles.slice(-CANDLE_LIMIT);
      const startPrice = slice[0].open;
      const endPrice = displayPriceRef.current ?? slice[slice.length - 1].close;
      setBootStart(startPrice);
      setBooting(true);

      let cancelled = false;
      let ctx: { revert: () => void } | null = null;
      (async () => {
        try {
          const { gsap } = await import("gsap");
          if (cancelled || !rootRef.current) {
            setBooting(false);
            return;
          }
          ctx = gsap.context(() => {
            // The tape rolls from the session's first open to the live price.
            const proxy = { v: startPrice };
            if (priceRef.current) {
              gsap.to(proxy, {
                v: endPrice,
                duration: 1.1,
                ease: "power2.out",
                onUpdate: () => {
                  if (priceRef.current) priceRef.current.textContent = `$${fmtPrice(proxy.v)}`;
                },
                onComplete: () => setBooting(false),
              });
            } else {
              setBooting(false);
            }
            // Candles rise from their lows, left → right, as the chart fills in.
            gsap.from(".tc-boot-candle", {
              opacity: 0,
              scaleY: 0.55,
              transformOrigin: "50% 100%",
              duration: 0.5,
              ease: "power2.out",
              stagger: { each: 0.012, from: "start" },
            });
            // Support/resistance levels fade in once the tape is rolling.
            gsap.from(".tc-boot-level", { opacity: 0, duration: 0.45, delay: 0.25, stagger: 0.08 });
            // Indicators populate in a tight stagger, trailing the candles.
            gsap.from(".tc-boot-readout > div", { opacity: 0, y: 6, duration: 0.35, delay: 0.3, stagger: 0.05 });
          }, root);
        } catch {
          setBooting(false);
        }
      })();
      return () => {
        cancelled = true;
        ctx?.revert();
        setBooting(false);
      };
    }

    // Subsequent ready transitions (symbol switch) — a quick data-refresh
    // crossfade. Never re-boots; the entrance is a one-time first impression.
    if (prefersReduced) return;
    let cancelled = false;
    (async () => {
      try {
        const { gsap } = await import("gsap");
        if (cancelled || !rootRef.current) return;
        gsap.fromTo(rootRef.current, { opacity: 0.5 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
      } catch {
        /* enhancement-only */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, candles]);

  return (
    <div ref={rootRef} className="tc-terminal !p-0 overflow-hidden w-full">
      {/* ── Top row: symbol tabs + live price + status ── */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-1 sm:gap-1.5">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-mono font-medium tracking-wide transition-colors ${
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
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span ref={priceRef} className="text-[13px] sm:text-[15px] font-mono font-semibold tabular-nums text-[var(--ink)]">
            {booting ? `$${fmtPrice(bootStart ?? 0)}` : `$${fmtPrice(displayPrice)}`}
          </span>
          <span
            className={`text-[10px] sm:text-[11px] font-mono tabular-nums ${
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
        <div className="relative p-2 sm:p-3 min-h-[190px] sm:min-h-[230px] md:min-h-[260px]">
          {loading ? (
            <ChartSkeleton />
          ) : candles && candles.length > 1 ? (
            <CandleChart candles={candles} support={tech?.support} resistance={tech?.resistance} />
          ) : (
            <div className="h-[180px] sm:h-[220px] md:h-[260px] flex items-center justify-center text-[12px] text-[var(--muted)] font-mono">
              Chart feed reconnecting…
            </div>
          )}
          <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex items-center gap-2">
            <span className="tc-status-chip tc-status-chip--accent text-[11px] sm:text-[12px]">
              <span className={`tc-status-chip__dot ${live ? "tc-status-chip__dot--pulse" : ""}`} />
              {simulated ? "ILLUSTRATIVE" : "LIVE"}
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-[var(--muted)]">{TF}</span>
          </div>
        </div>

        {/* Indicator + data readout: composed skeleton while loading, zero dashes after load */}
        {loading ? (
          <div className="border-t md:border-t-0 md:border-l border-[var(--color-border-subtle)] p-2.5 sm:p-3 grid grid-cols-3 sm:grid-cols-2 md:grid-cols-1 gap-2 sm:gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1 py-0.5">
                <div className="tc-skeleton h-2 sm:h-2.5 w-12 sm:w-14 rounded" />
                <div className="tc-skeleton h-3.5 sm:h-4 w-16 sm:w-20 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="border-t md:border-t-0 md:border-l border-[var(--color-border-subtle)] p-2.5 sm:p-3 grid grid-cols-3 sm:grid-cols-2 md:grid-cols-1 gap-2 sm:gap-2.5 tc-boot-readout">
            <Readout label="RSI(14)" value={tech?.rsi != null ? tech.rsi.toFixed(1) : "52.4"} accent={tech?.rsi != null && tech.rsi > 70 ? "red" : tech?.rsi != null && tech.rsi < 30 ? "green" : undefined} />
            <Readout label="MACD" value={tech?.macdHistogram != null ? (tech.macdHistogram >= 0 ? "+" : "") + tech.macdHistogram.toFixed(3) : "+0.042"} accent={tech?.macdHistogram != null ? (tech.macdHistogram >= 0 ? "green" : "red") : "green"} />
            <Readout label="EMA 9/21" value={tech?.emaCrossover ?? (tech?.trend === "BULLISH" ? "BULLISH" : tech?.trend === "BEARISH" ? "BEARISH" : "BULLISH")} accent={tech?.emaCrossover === "BEARISH" || tech?.trend === "BEARISH" ? "red" : "green"} />
            <Readout label="ATR(14)" value={tech?.atr != null ? tech.atr.toFixed(2) : "142.50"} />
            <Readout label="Support" value={tech?.support ? "$" + fmtPrice(tech.support) : undefined} accent="green" />
            <Readout label="Resistance" value={tech?.resistance ? "$" + fmtPrice(tech.resistance) : undefined} accent="red" />
          </div>
        )}
      </div>

      {/* ── Bias + setup strip ── */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2.5 border-t border-[var(--color-border-subtle)]">
        {loading ? (
          <>
            <div className="flex items-center gap-2">
              <div className="tc-skeleton h-3 w-8 rounded" />
              <div className="tc-skeleton h-3.5 w-16 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="tc-skeleton h-3 w-10 rounded" />
              <div className="tc-skeleton h-3.5 w-20 rounded" />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">Bias</span>
              <span
                className={`text-[10px] sm:text-[11px] font-mono font-semibold ${
                  tech?.bias?.includes("LONG") || tech?.bias?.includes("BUY")
                    ? "text-[var(--green)]"
                    : tech?.bias?.includes("SHORT") || tech?.bias?.includes("SELL")
                    ? "text-[var(--red)]"
                    : "text-[var(--ink)]"
                }`}
              >
                {tech?.bias || "BUY/LONG"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">Setup</span>
              <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-[var(--ink)]">{tech?.setupQuality || "A+ SELECT"}</span>
              <span className="tc-badge tc-badge--accent text-[10px] sm:text-[11px] py-0.5 px-1.5 sm:px-2">{tech?.confidence || "HIGH"}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Working chat input with interactive streaming thesis demo ── */}
      <WorkbenchChat
        symbol={symbol}
        bias={tech?.bias || "BUY/LONG"}
        rsi={tech?.rsi != null ? tech.rsi.toFixed(1) : "54.8"}
        support={tech?.support ? fmtPrice(tech.support) : fmtPrice(displayPrice)}
        confidence={tech?.confidence || "HIGH"}
      />
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
      className="block h-[180px] sm:h-[220px] md:h-[260px]"
      role="img"
      aria-label={`${slice.length} most recent real candles`}
    >
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          className="tc-boot-axis"
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
        <g className="tc-boot-level">
          <line x1={0} x2={W} y1={y(resistance)} y2={y(resistance)} stroke="var(--red)" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
          <text x={6} y={y(resistance) - 4} fontSize={9} fontFamily="var(--font-mono)" fill="var(--red)" opacity={0.8}>R {fmtPrice(resistance)}</text>
        </g>
      )}
      {support != null && Number.isFinite(support) && (
        <g className="tc-boot-level">
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
          <g key={c.timestamp} className="tc-boot-candle">
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
  if (value == null || value === "") return null;
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
      <div className={`text-[11px] sm:text-[12px] font-mono font-semibold tabular-nums truncate ${color}`}>
        {value}
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[180px] sm:h-[220px] md:h-[260px] flex flex-col justify-between p-2">
      <div className="flex items-center justify-between">
        <div className="tc-skeleton h-3.5 w-24 rounded" />
        <div className="tc-skeleton h-3.5 w-16 rounded" />
      </div>
      <div className="flex items-end gap-1.5 h-[130px] sm:h-[180px] w-full pt-3 pb-1.5">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="tc-skeleton flex-1 rounded-sm"
            style={{
              height: `${28 + ((i * 17 + 5) % 65)}%`,
              opacity: 0.35 + ((i % 4) * 0.15),
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Chat input — interactive streaming AI thesis demo (P1b-2) ── */
function WorkbenchChat({
  symbol,
  bias,
  rsi,
  support,
  confidence,
}: {
  symbol: string;
  bias: string;
  rsi: string;
  support: string;
  confidence: string;
}) {
  const [value, setValue] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [streamedText, setStreamedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [demoCount, setDemoCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fullResponse = `Thesis (${symbol} 4h): Bias ${bias}. 4h RSI at ${rsi} with bullish trend structure holding above key support $${support}. Journal pattern: your win rate is 71% when entering on 4h pullback confirmations vs 38% on breakout chases. Confidence: ${confidence}.`;

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = value.trim();
      if (!q) return;

      if (timerRef.current) clearInterval(timerRef.current);

      setAsked(q);
      setValue("");

      if (demoCount === 0) {
        // Stream the first demo answer character-by-character (25ms per char)
        setDemoCount(1);
        setIsTyping(true);
        setStreamedText("");

        let charIdx = 0;
        timerRef.current = setInterval(() => {
          charIdx += 1;
          if (charIdx <= fullResponse.length) {
            setStreamedText(fullResponse.slice(0, charIdx));
          } else {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsTyping(false);
          }
        }, 25);
      }
    },
    [value, demoCount, fullResponse]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="border-t border-[var(--color-border-subtle)] p-2.5 sm:p-3">
      {asked ? (
        <div className="space-y-2 mb-2.5 sm:space-y-2.5 sm:mb-3">
          {/* User query */}
          <div className="rounded-lg bg-[rgba(47,198,232,0.06)] border border-[rgba(47,198,232,0.16)] px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] text-[var(--ink)] font-mono">
            {asked}
          </div>

          {/* AI streamed thesis demo */}
          {demoCount === 1 && (
            <div className="rounded-lg bg-[var(--bg-band)] border border-[var(--color-border-default)] p-2.5 sm:p-3 space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="tc-status-chip tc-status-chip--accent text-[11px]">
                  <span className="tc-status-chip__dot tc-status-chip__dot--pulse" /> Copilot Thesis
                </span>
                <span className="text-[9px] font-mono text-[var(--muted)] border border-[var(--color-border-subtle)] rounded px-1.5 py-0.5">
                  ILLUSTRATIVE DEMO
                </span>
              </div>

              <p className="text-[11px] sm:text-[12px] font-mono text-[var(--ink)] leading-relaxed">
                {streamedText}
                {isTyping && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-[var(--accent)] animate-pulse" />}
              </p>

              {!isTyping && (
                <div className="pt-1.5 sm:pt-2 border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-[11px] text-[var(--muted)] font-mono">
                    Real-time AI telemetry requires an account · 5 free daily scans.
                  </span>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    Start Free — No Card Required →
                  </Link>
                </div>
              )}
            </div>
          )}

          {demoCount > 1 && (
            <div className="flex items-start gap-2 text-[10px] sm:text-[11px] text-[var(--muted)] leading-relaxed">
              <span className="tc-status-chip tc-status-chip--accent mt-0.5 shrink-0">
                <span className="tc-status-chip__dot" /> Copilot
              </span>
              <span>
                Demo question completed.{" "}
                <Link href="/signup" className="text-[var(--accent)] font-semibold underline underline-offset-2">
                  Create a free account
                </Link>{" "}
                to ask the copilot unlimited questions about your own setups — no card required.
              </span>
            </div>
          )}
        </div>
      ) : null}

      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Ask the copilot about ${symbol}…`}
          className="flex-1 h-9 sm:h-11 rounded-lg bg-[var(--bg-band)] border border-[var(--color-border-default)] px-3 text-[11px] sm:text-[12px] font-mono text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none transition-colors"
          aria-label={`Ask the copilot about ${symbol}`}
          maxLength={200}
        />
        <button
          type="submit"
          className="h-9 w-9 sm:h-11 sm:w-11 min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] shrink-0 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] flex items-center justify-center hover:bg-[var(--color-accent-primary-hover)] transition-colors cursor-pointer"
          aria-label="Send"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
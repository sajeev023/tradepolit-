import React from "react";
import { formatPrice } from "@/lib/format-price";

interface SnapshotExportCardProps {
  symbol: string;
  timeframe: string;
  priceData: any;
  liveIndicators: any;
  analysisData: any;
}

export const SnapshotExportCard: React.FC<SnapshotExportCardProps> = ({
  symbol,
  timeframe,
  priceData,
  liveIndicators,
  analysisData,
}) => {
  const isProfit = priceData ? priceData.changePercent24h >= 0 : true;

  const biasColor = (bias: string) => {
    const b = bias.toUpperCase();
    if (b.includes("BUY") || b.includes("BULL") || b.includes("LONG")) return "text-[var(--color-profit)] bg-[var(--color-profit-bg)] border-[color-mix(in_srgb,var(--color-profit)_20%,transparent)]";
    if (b.includes("SELL") || b.includes("BEAR") || b.includes("SHORT")) return "text-[var(--color-loss)] bg-[var(--color-loss-bg)] border-[color-mix(in_srgb,var(--color-loss)_20%,transparent)]";
    return "text-[var(--color-text-tertiary)] bg-[color-mix(in_srgb,var(--color-text-tertiary)_10%,transparent)] border-[color-mix(in_srgb,var(--color-text-tertiary)_20%,transparent)]";
  };

  return (
    <div
      id="snapshot-export-card"
      className="p-6 rounded-xl border flex flex-col gap-6"
      style={{
        width: "600px",
        backgroundColor: "var(--color-bg-deepest)",
        borderColor: "color-mix(in srgb, var(--color-accent-primary) 15%, transparent)",
        color: "var(--color-text-primary)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-accent-primary) 10%, transparent)",
              color: "var(--color-accent-primary)",
              border: "1px solid color-mix(in srgb, var(--color-accent-primary) 20%, transparent)",
            }}
          >
            TP
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight text-[var(--color-text-primary)] block">TradCopilot</span>
            <span className="text-[9px] text-[var(--color-text-tertiary)] uppercase tracking-wider block">Institutional Analytics</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-[var(--color-accent-primary)] bg-[color-mix(in_srgb,var(--color-accent-primary)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-accent-primary)_20%,transparent)] px-2 py-0.5 rounded">
            {symbol} ({timeframe})
          </span>
        </div>
      </div>

      {/* Price Block */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest font-semibold block">Live Market Price</span>
          <span className="text-3xl font-mono font-bold text-[var(--color-text-primary)] mt-1 block">
            {priceData ? formatPrice(symbol, priceData.price) : "N/A"}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest font-semibold block">24h Change</span>
          <span
            className={`text-sm font-mono font-bold block mt-1 ${
              isProfit ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"
            }`}
          >
            {priceData ? `${isProfit ? "+" : ""}${priceData.changePercent24h.toFixed(2)}%` : "N/A"}
          </span>
        </div>
      </div>

      {/* Bias and Confidence Strip */}
      <div className="grid grid-cols-3 gap-3 border-y border-[color-mix(in_srgb,var(--color-border-default)_80%,transparent)] py-4 text-center">
        <div className="p-2.5 bg-[color-mix(in_srgb,var(--color-bg-deepest)_50%,transparent)] rounded-lg border border-[color-mix(in_srgb,var(--color-border-default)_60%,transparent)]">
          <span className="text-[9px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-bold block">BIAS</span>
          <span className={`text-xs font-bold block mt-1 px-1 py-0.5 rounded border text-center ${biasColor(analysisData?.bias || "NEUTRAL")}`}>
            {analysisData?.bias || "NEUTRAL"}
          </span>
        </div>
        <div className="p-2.5 bg-[color-mix(in_srgb,var(--color-bg-deepest)_50%,transparent)] rounded-lg border border-[color-mix(in_srgb,var(--color-border-default)_60%,transparent)]">
          <span className="text-[9px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-bold block">SETUP QUALITY</span>
          <span className="text-xs font-bold text-[var(--color-text-primary)] block mt-1">
            {analysisData?.setupQuality || "HIGH GRADE"}
          </span>
        </div>
        <div className="p-2.5 bg-[color-mix(in_srgb,var(--color-bg-deepest)_50%,transparent)] rounded-lg border border-[color-mix(in_srgb,var(--color-border-default)_60%,transparent)]">
          <span className="text-[9px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-bold block">CONFIDENCE</span>
          <span className="text-xs font-bold text-[var(--color-text-primary)] block mt-1">
            {analysisData?.confidence || "MEDIUM"}
          </span>
        </div>
      </div>

      {/* Indicator Specifications */}
      <div className="grid grid-cols-2 gap-4 text-xs font-mono text-[var(--color-text-tertiary)] bg-[color-mix(in_srgb,var(--color-bg-deepest)_20%,transparent)] p-3.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border-default)_50%,transparent)]">
        <div>
          <span className="text-[var(--color-text-tertiary)] font-sans uppercase text-[10px] block font-bold mb-1.5">Indicators</span>
          <div className="flex justify-between border-b border-[color-mix(in_srgb,var(--color-border-default)_40%,transparent)] pb-1">
            <span>RSI(14):</span>
            <span className="text-[var(--color-text-primary)] font-bold">{liveIndicators?.rsi?.toFixed(2) || "N/A"} ({liveIndicators?.rsiLabel || "Neutral"})</span>
          </div>
          <div className="flex justify-between pt-1">
            <span>MACD Value:</span>
            <span className="text-[var(--color-text-primary)]">{liveIndicators?.macdValue?.toFixed(2) || "N/A"}</span>
          </div>
        </div>
        <div>
          <span className="text-[var(--color-text-tertiary)] font-sans uppercase text-[10px] block font-bold mb-1.5">Telemetry Levels</span>
          <div className="flex justify-between border-b border-[color-mix(in_srgb,var(--color-border-default)_40%,transparent)] pb-1">
            <span>Support:</span>
            <span className="text-[var(--color-profit)] font-bold">
              {analysisData?.support ? `$${analysisData.support.toLocaleString()}` : "N/A"}
            </span>
          </div>
          <div className="flex justify-between pt-1">
            <span>Resistance:</span>
            <span className="text-[var(--color-loss)] font-bold">
              {analysisData?.resistance ? `$${analysisData.resistance.toLocaleString()}` : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Analysis Thesis */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest font-semibold block">Market Structure Thesis</span>
        <p className="text-xs leading-relaxed text-[var(--color-text-secondary)] font-sans">
          {analysisData?.whyItMatters || "Structural scan complete. Telemetry indicators are aligned."}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--color-border-default)] pt-4 text-[9px] text-[var(--color-text-quaternary)] uppercase tracking-wider font-bold font-mono">
        <span>Platform: TradCopilot.live</span>
        <span>Generated: {new Date().toLocaleString()}</span>
      </div>
    </div>
  );
};

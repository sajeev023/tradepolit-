import React from "react";

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
    if (b.includes("BUY") || b.includes("BULL") || b.includes("LONG")) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (b.includes("SELL") || b.includes("BEAR") || b.includes("SHORT")) return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
  };

  return (
    <div
      id="snapshot-export-card"
      className="p-6 rounded-xl border flex flex-col gap-6"
      style={{
        width: "600px",
        backgroundColor: "#0A0A0B",
        borderColor: "rgba(30, 212, 168, 0.15)",
        color: "#E4E4E7",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs"
            style={{
              backgroundColor: "rgba(30, 212, 168, 0.1)",
              color: "#1ED4A8",
              border: "1px solid rgba(30, 212, 168, 0.2)",
            }}
          >
            TP
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight text-white block">TradePilot</span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">Institutional Analytics</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
            {symbol} ({timeframe})
          </span>
        </div>
      </div>

      {/* Price Block */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block">Live Market Price</span>
          <span className="text-3xl font-mono font-bold text-white mt-1 block">
            {priceData ? `$${priceData.price.toLocaleString(undefined, { minimumFractionDigits: symbol.includes("JPY") || symbol.includes("USD") && !symbol.includes("/") ? 2 : 2 })}` : "N/A"}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block">24h Change</span>
          <span
            className={`text-sm font-mono font-bold block mt-1 ${
              isProfit ? "text-emerald-400" : "text-rose-500"
            }`}
          >
            {priceData ? `${isProfit ? "+" : ""}${priceData.changePercent24h.toFixed(2)}%` : "N/A"}
          </span>
        </div>
      </div>

      {/* Bias and Confidence Strip */}
      <div className="grid grid-cols-3 gap-3 border-y border-zinc-800/80 py-4 text-center">
        <div className="p-2.5 bg-zinc-900/50 rounded-lg border border-zinc-800/60">
          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block">BIAS</span>
          <span className={`text-xs font-bold block mt-1 px-1 py-0.5 rounded border text-center ${biasColor(analysisData?.bias || "NEUTRAL")}`}>
            {analysisData?.bias || "NEUTRAL"}
          </span>
        </div>
        <div className="p-2.5 bg-zinc-900/50 rounded-lg border border-zinc-800/60">
          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block">SETUP QUALITY</span>
          <span className="text-xs font-bold text-white block mt-1">
            {analysisData?.setupQuality || "HIGH GRADE"}
          </span>
        </div>
        <div className="p-2.5 bg-zinc-900/50 rounded-lg border border-zinc-800/60">
          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block">CONFIDENCE</span>
          <span className="text-xs font-bold text-white block mt-1">
            {analysisData?.confidence || "MEDIUM"}
          </span>
        </div>
      </div>

      {/* Indicator Specifications */}
      <div className="grid grid-cols-2 gap-4 text-xs font-mono text-zinc-400 bg-zinc-900/20 p-3.5 rounded-lg border border-zinc-800/50">
        <div>
          <span className="text-zinc-500 font-sans uppercase text-[10px] block font-bold mb-1.5">Indicators</span>
          <div className="flex justify-between border-b border-zinc-800/40 pb-1">
            <span>RSI(14):</span>
            <span className="text-white font-bold">{liveIndicators?.rsi?.toFixed(2) || "N/A"} ({liveIndicators?.rsiLabel || "Neutral"})</span>
          </div>
          <div className="flex justify-between pt-1">
            <span>MACD Value:</span>
            <span className="text-white">{liveIndicators?.macdValue?.toFixed(2) || "N/A"}</span>
          </div>
        </div>
        <div>
          <span className="text-zinc-500 font-sans uppercase text-[10px] block font-bold mb-1.5">Telemetry Levels</span>
          <div className="flex justify-between border-b border-zinc-800/40 pb-1">
            <span>Support:</span>
            <span className="text-emerald-400 font-bold">
              {analysisData?.support ? `$${analysisData.support.toLocaleString()}` : "N/A"}
            </span>
          </div>
          <div className="flex justify-between pt-1">
            <span>Resistance:</span>
            <span className="text-rose-400 font-bold">
              {analysisData?.resistance ? `$${analysisData.resistance.toLocaleString()}` : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Analysis Thesis */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block">Market Structure Thesis</span>
        <p className="text-xs leading-relaxed text-zinc-300 font-sans">
          {analysisData?.whyItMatters || "Structural scan complete. Telemetry indicators are aligned."}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-zinc-800 pt-4 text-[9px] text-zinc-600 uppercase tracking-wider font-bold font-mono">
        <span>Platform: tradepilot.live</span>
        <span>Generated: {new Date().toLocaleString()}</span>
      </div>
    </div>
  );
};

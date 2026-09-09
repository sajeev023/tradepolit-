"use client";

import { useEffect, useRef, useState } from "react";
import { profiler, PerformanceStats } from "@/lib/performance-profiler";
import { Activity, X, Cpu, Database, Network } from "lucide-react";

export function PerformanceOverlay() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const statsRef = useRef<PerformanceStats | null>(null);

  useEffect(() => {
    // Write profiler updates to a ref instead of state. The overlay is rendered
    // inside the profiled tree, so a synchronous setStats here would cause a
    // render → Profiler onRender → setStats infinite loop. We mirror the ref
    // into React state on a fixed interval so the HUD stays live without
    // feeding back into the profiler.
    const unsubscribe = profiler.subscribe((updatedStats) => {
      statsRef.current = updatedStats;
    });

    // Initial mirror so the overlay appears immediately.
    statsRef.current = profiler.getStats();
    setStats(statsRef.current);

    const id = setInterval(() => {
      if (statsRef.current) {
        setStats(statsRef.current);
      }
    }, 1000);

    return () => {
      clearInterval(id);
      unsubscribe();
    };
  }, []);

  if (!stats) return null;

  const renderColor = (val: number, good: number, bad: number) => {
    if (val <= good) return "text-[var(--color-profit)]";
    if (val <= bad) return "text-[var(--color-warning)]";
    return "text-[var(--color-loss)]";
  };

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return "text-[var(--color-profit)]";
    if (fps >= 40) return "text-[var(--color-warning)]";
    return "text-[var(--color-loss)] font-bold animate-pulse";
  };

  return (
    <div className="fixed bottom-16 left-4 z-50 select-none font-mono text-[10px] tracking-tight">
      {/* Floating Trigger Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-lg cursor-pointer backdrop-blur-md transition-all duration-300 hover:scale-105"
          style={{
            backgroundColor: "rgba(10, 10, 11, 0.8)",
            borderColor: "var(--color-border-subtle)",
            color: "var(--color-accent-primary)",
            boxShadow: "0 0 15px rgba(20, 184, 166, 0.15)",
          }}
        >
          <Activity size={12} className="animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-[9px]">Telemetry HUD</span>
          <span className={`font-semibold ${getFpsColor(stats.fps)}`}>{stats.fps} FPS</span>
        </button>
      )}

      {/* Main Stats Panel */}
      {isOpen && (
        <div
          className="w-[280px] sm:w-[320px] rounded-xl border shadow-2xl p-4 flex flex-col gap-3 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{
            backgroundColor: "rgba(10, 10, 11, 0.92)",
            borderColor: "rgba(20, 184, 166, 0.2)",
            color: "var(--color-text-secondary)",
            maxHeight: "450px",
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-2 border-zinc-800">
            <div className="flex items-center gap-1.5 text-[var(--color-text-primary)] font-bold text-xs">
              <Cpu size={14} className="text-[var(--color-accent-primary)]" />
              <span>Performance Telemetry</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-xs ${getFpsColor(stats.fps)}`}>{stats.fps} FPS</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Section 1: Interaction Latencies */}
          <div className="flex flex-col gap-1">
            <p className="text-[var(--color-text-primary)] font-semibold border-b border-zinc-900 pb-0.5 text-[9px] uppercase tracking-wider">Interaction Latencies</p>
            <div className="flex justify-between items-center py-0.5">
              <span>Nav transition:</span>
              <span className={renderColor(stats.navigationTime, 300, 600)}>
                {stats.navigationTime ? `${stats.navigationTime.toFixed(0)}ms` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span>Initial chart load:</span>
              <span className={renderColor(stats.initialChartLoadTime, 1500, 2500)}>
                {stats.initialChartLoadTime ? `${stats.initialChartLoadTime.toFixed(0)}ms` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span>Symbol switch:</span>
              <span className={renderColor(stats.symbolSwitchTime, 300, 800)}>
                {stats.symbolSwitchTime ? `${stats.symbolSwitchTime.toFixed(0)}ms` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span>Timeframe switch:</span>
              <span className={renderColor(stats.timeframeSwitchTime, 200, 500)}>
                {stats.timeframeSwitchTime ? `${stats.timeframeSwitchTime.toFixed(0)}ms` : "N/A"}
              </span>
            </div>
          </div>

          {/* Section 2: React Renders & Component State */}
          <div className="flex flex-col gap-1">
            <p className="text-[var(--color-text-primary)] font-semibold border-b border-zinc-900 pb-0.5 text-[9px] uppercase tracking-wider">React Component Cycles</p>
            <div className="flex justify-between items-center py-0.5">
              <span>ChartsPage renders:</span>
              <span className="text-[var(--color-text-primary)] font-bold">{stats.renderCounts["ChartsPage"] || 0}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span>TradingViewChart renders:</span>
              <span className="text-[var(--color-text-primary)] font-bold">{stats.renderCounts["TradingViewChart"] || 0}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span>TV Widget Inits / Destroys:</span>
              <span className="text-[var(--color-accent-primary)] font-bold">
                {stats.widgetInitCount} / {stats.widgetDestroyCount}
              </span>
            </div>
            {stats.wsTimings.length > 0 && (
              <div className="flex justify-between items-center py-0.5">
                <span>WS tick render latency:</span>
                <span className={renderColor(stats.wsTimings[0].renderLatency, 100, 250)}>
                  {stats.wsTimings[0].renderLatency.toFixed(0)}ms
                </span>
              </div>
            )}
          </div>

          {/* Section 3: API Waterfall & Prisma DB timings */}
          <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto">
            <p className="text-[var(--color-text-primary)] font-semibold border-b border-zinc-900 pb-0.5 text-[9px] uppercase tracking-wider">API & DB Timings (Waterfall)</p>
            {stats.apiTimings.length === 0 ? (
              <span className="text-zinc-500 italic py-1">No API calls intercepted yet</span>
            ) : (
              <div className="flex flex-col gap-1.5 mt-1">
                {stats.apiTimings.slice(0, 4).map((api, idx) => (
                  <div key={idx} className="bg-zinc-900/60 rounded p-1.5 border border-zinc-800/40">
                    <div className="flex justify-between items-center text-[var(--color-text-primary)] text-[9px] mb-1 font-semibold">
                      <span className="truncate max-w-[170px]">{api.url}</span>
                      <span>{api.duration.toFixed(0)}ms</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[8px] text-zinc-400">
                      {api.dbDuration !== undefined && (
                        <span className="flex items-center gap-1">
                          <Database size={8} className="text-[var(--color-accent-primary)]" />
                          DB: {api.dbDuration.toFixed(0)}ms
                        </span>
                      )}
                      {api.apiDuration !== undefined && (
                        <span className="flex items-center gap-1">
                          <Network size={8} className="text-amber-400" />
                          API execution: {api.apiDuration.toFixed(0)}ms
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer: Memory Heap Info */}
          {stats.memoryLimit > 0 && (
            <div className="flex justify-between items-center border-t border-zinc-800 pt-2 text-[9px] text-zinc-400">
              <span>Memory JS Heap:</span>
              <span>
                {stats.memoryUsed}MB / {stats.memoryLimit}MB
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { MarketHeader, type MarketHeaderProps } from "./MarketHeader";

export interface DecisionDeskShellProps {
  header?: MarketHeaderProps;
  chart?: React.ReactNode;
  sidebar?: React.ReactNode;
  evidence?: React.ReactNode;
  risk?: React.ReactNode;
  whatChanged?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /** Which panel is active on mobile. */
  mobileTab?: "watchlist" | "chart" | "copilot";
  className?: string;
}

export function DecisionDeskShell({
  header,
  chart,
  sidebar,
  evidence,
  risk,
  whatChanged,
  actions,
  children,
  className = "",
}: DecisionDeskShellProps) {
  return (
    <div className={`flex flex-col gap-3 lg:gap-4 h-full ${className}`}>
      {header && <MarketHeader {...header} />}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 overflow-hidden">
        {/* Left: watchlist / market selector */}
        {sidebar && (
          <aside className="hidden lg:flex lg:col-span-2 flex-col overflow-y-auto custom-scrollbar">
            {sidebar}
          </aside>
        )}

        {/* Center: chart + evidence + risk */}
        <div className="lg:col-span-7 flex flex-col gap-3 lg:gap-4 min-h-0 overflow-y-auto custom-scrollbar">
          {chart && <div className="min-h-[280px] lg:min-h-[420px] flex-1">{chart}</div>}
          {whatChanged}
          {evidence}
          {risk}
          {children}
        </div>

        {/* Right: decision brief / actions */}
        <div className="lg:col-span-3 flex flex-col gap-3 lg:gap-4 min-h-0 overflow-y-auto custom-scrollbar">
          {actions}
        </div>
      </div>
    </div>
  );
}

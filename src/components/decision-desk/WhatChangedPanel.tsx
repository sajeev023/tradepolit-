"use client";

import React from "react";
import { WhatChangedComparison, type StateSnapshot } from "@/components/theses/WhatChangedComparison";

export interface WhatChangedPanelProps {
  thenState?: StateSnapshot;
  nowState?: StateSnapshot;
  symbol?: string;
  className?: string;
}

export function WhatChangedPanel({ thenState, nowState, symbol, className = "" }: WhatChangedPanelProps) {
  if (!thenState || !nowState) return null;
  return (
    <div className={className}>
      <WhatChangedComparison thenState={thenState} nowState={nowState} symbol={symbol} />
    </div>
  );
}

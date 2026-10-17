import { summarize } from "./engine";
import { RISK_PROFILES } from "./goal";
import type { SessionRow } from "./service";

/** Shape sent to the browser: bounded lists, marks applied, nothing the UI would have to recompute. */
export function presentSession(row: SessionRow, warning?: string) {
  const { state, config } = row;
  return {
    id: row.id,
    name: row.name,
    status: state.status,
    haltedReason: state.haltedReason ?? null,
    entriesBlockedForDay: state.entriesBlockedForDay,
    config,
    risk: RISK_PROFILES[config.riskProfile],
    summary: summarize(state, config),
    cash: state.cash,
    positions: state.positions.map((p) => {
      const mark = state.marks[p.symbol] ?? p.entryPrice;
      return { ...p, mark, unrealisedPnl: (mark - p.entryPrice) * p.qty - p.entryFee };
    }),
    pending: state.pending,
    closed: state.closed.slice(-50).reverse(),
    events: state.events.slice(-100).reverse(),
    equityCurve: state.equityCurve,
    createdAt: row.createdAt,
    warning: warning ?? null,
  };
}

export type PresentedSession = ReturnType<typeof presentSession>;

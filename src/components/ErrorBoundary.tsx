"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  /**
   * When true, the fallback uses a compact layout that fits inside a
   * dashboard panel (sidebar/topbar remain visible). When false (default),
   * the fallback takes over the full viewport — appropriate for root-level
   * boundaries that wrap the entire app.
   */
  inline?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[React Runtime Error Boundary]:", error, errorInfo);
  }

  // "Try Again" — clears the boundary and lets React attempt to re-render
  // the children. If the error was transient (e.g. a stale ref, a one-off
  // race), this recovers without a full page reload. If the error throws
  // again, the boundary re-catches it.
  private handleTryAgain = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const { inline } = this.props;
      const containerClass = inline
        ? "flex flex-col items-center justify-center text-[var(--color-text-primary)] px-4 py-12 font-sans select-none relative overflow-hidden min-h-[60vh]"
        : "min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg-deepest)] text-[var(--color-text-primary)] px-4 font-sans select-none relative overflow-hidden";

      return (
        <div className={containerClass}>
          <div className="text-center space-y-6 max-w-md relative z-10 animate-fade-in">
            {/* Warning Icon */}
            <div
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg"
              style={{ border: "1px solid rgba(var(--red-rgb), 0.2)", background: "rgba(var(--red-rgb), 0.06)" }}
            >
              <AlertTriangle size={28} className="text-[var(--color-loss)] animate-pulse" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                {inline ? "Chart Workstation Interrupted" : "Workstation Interrupted"}
              </h1>
              <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed max-w-[320px] mx-auto">
                An unexpected runtime crash occurred. Our diagnostics engine has captured the trace.
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 bg-[var(--color-bg-deepest)]/40 border border-[var(--color-border-subtle)] rounded-lg text-left overflow-x-auto max-h-36">
                  <pre className="text-[10px] font-mono text-[var(--color-text-tertiary)] leading-normal whitespace-pre-wrap select-text">
                    {this.state.error.stack || this.state.error.message}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleTryAgain}
                className="btn-primary h-10 px-5 text-xs font-semibold gap-2 cursor-pointer shadow-lg shadow-[rgba(var(--accent-rgb),0.1)] flex items-center"
              >
                <RotateCcw size={13} />
                <span>Try Again</span>
              </button>
              <button
                onClick={this.handleReload}
                className="btn-secondary h-10 px-5 text-xs font-semibold gap-2 cursor-pointer flex items-center border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]"
              >
                <RefreshCw size={13} />
                <span>Reload Page</span>
              </button>
              <Link
                href="/charts"
                className="btn-secondary h-10 px-5 text-xs font-semibold gap-2 cursor-pointer flex items-center border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]"
              >
                <Home size={13} />
                <span>Reset to Safety</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
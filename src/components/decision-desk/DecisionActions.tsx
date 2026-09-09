"use client";

import React from "react";
import { BookmarkCheck, Loader2 } from "lucide-react";

export interface DecisionActionsProps {
  directional: boolean;
  isSaving?: boolean;
  isSaved?: boolean;
  onCommit: () => void;
  className?: string;
}

export function DecisionActions({ directional, isSaving, isSaved, onCommit, className = "" }: DecisionActionsProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        onClick={onCommit}
        disabled={isSaving || isSaved || !directional}
        title={!directional ? "Bias is NEUTRAL — a thesis requires a LONG or SHORT read" : undefined}
        className={`
          w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 border cursor-pointer select-none
          ${
            isSaved
              ? "bg-[rgba(45,212,168,0.12)] text-[var(--color-profit)] border-[rgba(45,212,168,0.30)]"
              : directional
                ? "bg-[var(--color-accent-primary)] text-[#05070B] border-transparent hover:opacity-95 shadow-[0_4px_16px_rgba(47,198,232,0.25)]"
                : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-quaternary)] border-[var(--color-border-subtle)] cursor-not-allowed"
          }
        `}
      >
        {isSaving ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Committing Decision...</span>
          </>
        ) : isSaved ? (
          <>
            <BookmarkCheck size={14} />
            <span>Decision Recorded · Monitored</span>
          </>
        ) : directional ? (
          <>
            <BookmarkCheck size={14} />
            <span>Commit Decision</span>
          </>
        ) : (
          <span>No Thesis — NEUTRAL Read</span>
        )}
      </button>
    </div>
  );
}

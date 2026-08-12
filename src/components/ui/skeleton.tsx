"use client";

/**
 * Reusable skeleton primitives. The `.skeleton` class in globals.css provides
 * the shimmer animation; these components standardize common skeleton layouts.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonText({ width = "w-24", className = "" }: { width?: string; className?: string }) {
  return <div className={`skeleton h-3 ${width} rounded ${className}`} />;
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton h-16 w-full rounded-lg ${className}`} />;
}

/** A KPI card skeleton — icon + label + value + sub */
export function KPICardSkeleton() {
  return (
    <div className="card p-5 flex flex-col justify-between min-h-[130px]">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="skeleton w-7 h-7 rounded-lg" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
        <div className="skeleton h-8 w-32 rounded mb-2" />
      </div>
      <div className="skeleton h-3 w-40 rounded" />
    </div>
  );
}

/** A chart-area skeleton */
export function ChartCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`card p-5 lg:col-span-2 min-h-[380px] flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-3 w-48 rounded" />
      </div>
      <div className="flex-1 flex items-end gap-1 px-4 pb-4">
        {[40, 55, 45, 65, 50, 70, 60, 75, 65, 80, 70, 85].map((h, i) => (
          <div key={i} className="flex-1 skeleton rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/** An AI analysis skeleton — mimics the thinking state intelligence cards */
export function AnalysisCardSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton h-3.5 w-24 rounded-md" />
          <div className="skeleton h-16 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

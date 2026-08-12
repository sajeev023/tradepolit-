"use client";

import { useMemo } from "react";

/**
 * Sparkline — a tiny GPU-friendly inline-SVG price line + gradient area.
 * No recharts, no animation loop: it just renders the points it's given.
 * Used by the hero terminal live chart (fed from a WS tick ring buffer)
 * and the AI pipeline market-data node.
 */
interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fillId?: string;
  strokeWidth?: number;
  className?: string;
  showHeadDot?: boolean;
}

export function Sparkline({
  points,
  width = 240,
  height = 64,
  stroke = "var(--color-accent-primary)",
  fillId = "spark-fill",
  strokeWidth = 1.75,
  className = "",
  showHeadDot = true,
}: SparklineProps) {
  const { linePath, areaPath, head } = useMemo(() => {
    if (!points || points.length < 2) {
      return { linePath: "", areaPath: "", head: null };
    }
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const stepX = width / (points.length - 1);
    const pad = 3;
    const usableH = height - pad * 2;

    const coords = points.map((p, i) => {
      const x = i * stepX;
      const y = pad + usableH * (1 - (p - min) / range);
      return [x, y] as const;
    });

    // Smooth Catmull-Rom → bezier path for a premium curve.
    let d = `M ${coords[0][0]},${coords[0][1]}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const [x0, y0] = coords[i];
      const [x1, y1] = coords[i + 1];
      const cx = (x0 + x1) / 2;
      d += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`;
    }
    const last = coords[coords.length - 1];
    const first = coords[0];
    const area = `${d} L ${last[0]},${height} L ${first[0]},${height} Z`;
    return { linePath: d, areaPath: area, head: last };
  }, [points, width, height]);

  if (!linePath) {
    return (
      <div
        className={className}
        style={{ width, height }}
        aria-hidden="true"
      />
    );
  }

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(6,182,212,0.28)" />
          <stop offset="100%" stopColor="rgba(6,182,212,0)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${fillId})`} />
      <path
        d={linePath}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showHeadDot && head && (
        <>
          <circle cx={head[0]} cy={head[1]} r="5" fill="rgba(6,182,212,0.18)">
            <animate attributeName="r" values="3;7;3" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx={head[0]} cy={head[1]} r="2.5" fill={stroke} />
        </>
      )}
    </svg>
  );
}
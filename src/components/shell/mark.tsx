/**
 * TradePilot mark — a vector arrowhead cut by a horizon line. The lime wedge
 * is the "pilot" heading; the hairline is the horizon / price baseline.
 */
export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="31" height="31" rx="8" fill="var(--panel-2)" stroke="var(--color-border-strong)" />
      <path d="M7 21.5h18" stroke="var(--color-text-quaternary)" strokeWidth="1" strokeLinecap="round" />
      <path d="M9.5 19 16 7l6.5 12L16 15.6 9.5 19Z" fill="var(--accent)" />
    </svg>
  );
}

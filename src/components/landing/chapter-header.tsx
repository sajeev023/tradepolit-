import { type ReactNode } from "react";

/* ChapterHeader — the consistent 3-line section lockup that binds the
   8 chapters into one narrative. align defaults to left (editorial
   rhythm); a few sections pass "center" for deliberate contrast. */
export function ChapterHeader({
  chapter,
  eyebrow,
  title,
  subtitle,
  align = "left",
  className = "",
}: {
  chapter: string;
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div className={`chapter-lockup ${centered ? "items-center text-center" : "items-start text-left"} ${className}`}>
      <span className="chapter-chip">
        <span className="ping-dot" /> {chapter} · {eyebrow}
      </span>
      <h2 className="tp-display text-[var(--color-text-primary)]">{title}</h2>
      {subtitle && (
        <p className={`text-[14px] text-[var(--color-text-tertiary)] leading-relaxed ${centered ? "max-w-md mx-auto" : "max-w-lg"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
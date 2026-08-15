import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

type LegalLayoutProps = {
  title: string;
  updated: string;
  icon: ReactNode;
  children: ReactNode;
};

/**
 * Shared shell for all TradCopilot legal pages.
 * Renders the Back-to-Home link, page header, last-updated line, and a
 * space-y-6 body block. Uses only semantic design tokens — no raw palette.
 */
export default function LegalLayout({ title, updated, icon, children }: LegalLayoutProps) {
  return (
    <div
      className="min-h-screen py-16 px-6 max-w-3xl mx-auto flex flex-col justify-between"
      style={{ backgroundColor: "var(--color-bg-primary)" }}
    >
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold mb-8 transition-colors"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <ArrowLeft size={14} />
          <span className="hover:text-[var(--color-text-primary)] transition-colors">Back to Home</span>
        </Link>

        <div className="flex items-center gap-2 mb-6" style={{ color: "var(--color-accent-primary)" }}>
          {icon}
          <h1 className="tp-display-sm">{title}</h1>
        </div>

        <p
          className="text-xs mb-8"
          style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}
        >
          Last updated: {updated}
        </p>

        <div
          className="space-y-6 text-sm leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {children}
        </div>
      </div>

      <footer
        className="mt-16 pt-8 border-t text-[11px] text-center"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-text-tertiary)",
        }}
      >
        © 2026 TradCopilot. Educational and analytical services only.
      </footer>
    </div>
  );
}

/**
 * A numbered/named legal section: an h2 heading followed by body content
 * (paragraphs, lists, etc.).
 */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2
        className="text-base font-semibold mb-2"
        style={{ color: "var(--color-text-primary)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Styled paragraph for legal body copy. Inherits color from the surrounding
 * space-y-6 block (var(--color-text-secondary)).
 */
export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

/**
 * Inline strong emphasis. Uses the primary text token so bold spans read as
 * headings-within-prose rather than raw asterisk markdown.
 */
export function Strong({ children }: { children: ReactNode }) {
  return (
    <strong className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
      {children}
    </strong>
  );
}

/**
 * Helper to build per-page Metadata for legal routes.
 */
export function legalMetadata(title: string, description: string): Metadata {
  return { title, description };
}
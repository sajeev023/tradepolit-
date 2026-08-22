"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, ArrowRight } from "lucide-react";
import { MobileMenu } from "./mobile-menu";

const defaultLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export interface NavItem {
  label: string;
  href: string;
}

interface SlimNavProps {
  items?: NavItem[];
}

export function SlimNav({ items }: SlimNavProps = {}) {
  const navLinks = items || defaultLinks;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        zIndex: "var(--z-nav-top)",
        backgroundColor: scrolled ? "color-mix(in srgb, var(--background) 82%, transparent)" : "transparent",
      }}
      className={`fixed top-0 inset-x-0 transition-colors duration-300 ${
        scrolled
          ? "border-b border-[var(--color-border-subtle)] backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="h-[60px] flex items-center justify-between px-4 sm:px-6 lg:px-10 max-w-[1200px] mx-auto w-full select-none">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="TradCopilot Home">
          <div
            className="flex items-center justify-center rounded-md w-7 h-7"
            style={{ background: "linear-gradient(135deg, var(--accent-bright), var(--accent))" }}
          >
            <TrendingUp size={14} color="#05070B" strokeWidth={2.5} />
          </div>
          <span className="hidden min-[380px]:inline text-[14px] sm:text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
            TradCopilot
          </span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 h-8 inline-flex items-center rounded-md text-[13px] font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--color-bg-hover)] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/login"
            className="h-8 px-3.5 inline-flex items-center rounded-md text-[13px] font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="group h-8 px-3.5 inline-flex items-center gap-1.5 rounded-md text-[12px] font-semibold text-[var(--bg-primary)] transition-transform active:scale-[0.98]"
            style={{ background: "var(--accent)" }}
          >
            Start Free
            <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile CTA + menu */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/signup"
            className="h-8 px-3 inline-flex items-center rounded-md text-[12px] font-semibold text-[var(--bg-primary)]"
            style={{ background: "var(--accent)" }}
          >
            Start Free
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
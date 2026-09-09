"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Globe, ChevronDown, Check } from "lucide-react";
import {
  type SupportedLocale,
  SUPPORTED_LOCALE_KEYS,
  LOCALE_CONFIGS,
  NON_DEFAULT_LOCALE_KEYS,
  localePath,
} from "@/lib/i18n/config";

function setLocaleCookie(locale: string) {
  if (typeof document !== "undefined") {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;SameSite=Lax`;
  }
}

interface LanguageSwitcherProps {
  /** Optional visual variant: 'nav' for header, 'footer' for footer */
  variant?: "nav" | "footer";
  /** Compact representation */
  compact?: boolean;
}

export function LanguageSwitcher({
  variant = "nav",
  compact = false,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "/";
  const router = useRouter();

  // Detect current locale from pathname
  let currentLocale: SupportedLocale = "en";
  for (const loc of NON_DEFAULT_LOCALE_KEYS) {
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      currentLocale = loc;
      break;
    }
  }

  // Get base path without locale prefix
  let basePath = pathname;
  if (currentLocale !== "en") {
    basePath = pathname.slice(`/${currentLocale}`.length) || "/";
  }

  // Close dropdown on outside click or escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (targetLocale: SupportedLocale) => {
    setIsOpen(false);
    if (targetLocale === currentLocale) return;

    // Persist user preference via module-level helper
    setLocaleCookie(targetLocale);

    const targetPath = localePath(targetLocale, basePath);
    router.push(targetPath);
  };

  const currentConfig = LOCALE_CONFIGS[currentLocale];

  if (variant === "footer") {
    return (
      <div className="relative inline-block" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded border border-[var(--color-border-subtle)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--muted)] transition-colors bg-[var(--bg-primary)]"
          aria-expanded={isOpen}
          aria-label="Select language"
        >
          <Globe size={12} className="opacity-80" />
          <span>{currentConfig.nativeName}</span>
          <ChevronDown size={11} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div
            className="absolute bottom-full mb-1 left-0 z-50 min-w-[140px] py-1 bg-[var(--bg-primary)] border border-[var(--color-border-subtle)] rounded-md shadow-xl text-[12px]"
            role="menu"
          >
            {SUPPORTED_LOCALE_KEYS.map((loc) => {
              const config = LOCALE_CONFIGS[loc];
              const isSelected = loc === currentLocale;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
                    isSelected
                      ? "text-[var(--accent)] font-medium bg-[var(--color-bg-hover)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--color-bg-hover)]"
                  }`}
                  role="menuitem"
                >
                  <span>{config.nativeName}</span>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-2 sm:px-2.5 inline-flex items-center gap-1.5 rounded-md text-[12px] font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--color-bg-hover)] transition-colors"
        aria-expanded={isOpen}
        aria-label="Select language"
      >
        <Globe size={13} className="opacity-80" />
        {!compact && <span className="hidden sm:inline">{currentConfig.nativeName}</span>}
        <ChevronDown size={11} className={`transition-transform duration-200 opacity-60 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[140px] py-1 bg-[var(--bg-primary)] border border-[var(--color-border-subtle)] rounded-md shadow-xl text-[12px]"
          role="menu"
        >
          {SUPPORTED_LOCALE_KEYS.map((loc) => {
            const config = LOCALE_CONFIGS[loc];
            const isSelected = loc === currentLocale;
            return (
              <button
                key={loc}
                type="button"
                onClick={() => handleSelect(loc)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
                  isSelected
                    ? "text-[var(--accent)] font-medium bg-[var(--color-bg-hover)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--color-bg-hover)]"
                }`}
                role="menuitem"
              >
                <span>{config.nativeName}</span>
                {isSelected && <Check size={12} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

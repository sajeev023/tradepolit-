/**
 * src/lib/i18n/get-dictionary.ts
 *
 * Lazy dictionary loader for locale content. Each dictionary is loaded
 * dynamically to avoid bundling all languages on every page.
 */

import type { SupportedLocale } from "./config";
import type { Dictionary } from "./dictionaries/en";

const dictionaries: Record<SupportedLocale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((m) => m.dictionary),
  "pt-br": () => import("./dictionaries/pt-br").then((m) => m.dictionary),
  es: () => import("./dictionaries/es").then((m) => m.dictionary),
};

/**
 * Returns the content dictionary for the given locale.
 * Falls back to English if the locale is not found.
 */
export async function getDictionary(locale: SupportedLocale): Promise<Dictionary> {
  const loader = dictionaries[locale] ?? dictionaries.en;
  return loader();
}

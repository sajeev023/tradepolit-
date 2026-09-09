import { describe, it, expect } from "vitest";
import { buildMetadata, websiteJsonLd, articleJsonLd, SITE_URL } from "@/lib/seo";
import sitemap from "@/app/sitemap";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALE_KEYS,
  NON_DEFAULT_LOCALE_KEYS,
  parseLocale,
  localePath,
} from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

describe("International SEO — Config & Helpers", () => {
  it("defines default locale as English", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("supports Tier 1 locales: en, pt-br, and es", () => {
    expect(SUPPORTED_LOCALE_KEYS).toContain("en");
    expect(SUPPORTED_LOCALE_KEYS).toContain("pt-br");
    expect(SUPPORTED_LOCALE_KEYS).toContain("es");
    expect(NON_DEFAULT_LOCALE_KEYS).toEqual(["pt-br", "es"]);
  });

  it("parses valid locales and rejects unsupported ones", () => {
    expect(parseLocale("pt-br")).toBe("pt-br");
    expect(parseLocale("PT-BR")).toBe("pt-br");
    expect(parseLocale("es")).toBe("es");
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("de")).toBeUndefined();
    expect(parseLocale("unknown")).toBeUndefined();
    expect(parseLocale(undefined)).toBeUndefined();
  });

  it("generates correct locale paths", () => {
    expect(localePath("en", "/ai-chart-analysis")).toBe("/ai-chart-analysis");
    expect(localePath("en", "/")).toBe("/");
    expect(localePath("pt-br", "/ai-chart-analysis")).toBe("/pt-br/ai-chart-analysis");
    expect(localePath("pt-br", "/")).toBe("/pt-br");
    expect(localePath("es", "/forex-market-analysis")).toBe("/es/forex-market-analysis");
    expect(localePath("es", "/")).toBe("/es");
  });
});

describe("International SEO — Dictionaries", () => {
  it("loads English dictionary with complete structure", async () => {
    const dict = await getDictionary("en");
    expect(dict.common.siteName).toBe("TradCopilot");
    expect(dict.home.h1).toBeDefined();
    expect(dict.aiTradingCopilot.faqs.length).toBeGreaterThan(0);
    expect(dict.guides.entries.length).toBe(5);
  });

  it("loads Portuguese dictionary with localized content and native terminology", async () => {
    const dict = await getDictionary("pt-br");
    expect(dict.common.siteName).toBe("TradCopilot");
    expect(dict.common.startFree).toContain("Conta Gratuita");
    expect(dict.home.meta.description).toContain("cripto");
    expect(dict.guides.entries.length).toBe(5);
    expect(dict.guides.entries[0].tag).toBe("GESTÃO DE RISCO");
  });

  it("loads Spanish dictionary with localized content", async () => {
    const dict = await getDictionary("es");
    expect(dict.common.siteName).toBe("TradCopilot");
    expect(dict.common.startFree).toContain("Cuenta Gratuita");
    expect(dict.home.meta.description).toContain("cripto");
    expect(dict.guides.entries.length).toBe(5);
    expect(dict.guides.entries[0].tag).toBe("GESTIÓN DE RIESGO");
  });
});

describe("International SEO — Metadata & hreflang", () => {
  it("builds metadata with correct canonical and hreflang for localizable pages", () => {
    const meta = buildMetadata({
      title: "Análise Gráfica com IA",
      description: "Análise gráfica em tempo real",
      path: "/ai-chart-analysis",
      locale: "pt-br",
    });

    expect(meta.alternates?.canonical).toBe("/pt-br/ai-chart-analysis");
    expect(meta.openGraph?.locale).toBe("pt_BR");

    const languages = meta.alternates?.languages as Record<string, string>;
    expect(languages).toBeDefined();
    expect(languages["en"]).toBe(`${SITE_URL}/ai-chart-analysis`);
    expect(languages["pt-BR"]).toBe(`${SITE_URL}/pt-br/ai-chart-analysis`);
    expect(languages["es"]).toBe(`${SITE_URL}/es/ai-chart-analysis`);
    expect(languages["x-default"]).toBe(`${SITE_URL}/ai-chart-analysis`);
  });

  it("builds root English page metadata with canonical at root and hreflang", () => {
    const meta = buildMetadata({
      title: "AI Chart Analysis",
      description: "Real-time chart analysis",
      path: "/ai-chart-analysis",
      locale: "en",
    });

    expect(meta.alternates?.canonical).toBe("/ai-chart-analysis");
    expect(meta.openGraph?.locale).toBe("en_US");

    const languages = meta.alternates?.languages as Record<string, string>;
    expect(languages["en"]).toBe(`${SITE_URL}/ai-chart-analysis`);
    expect(languages["pt-BR"]).toBe(`${SITE_URL}/pt-br/ai-chart-analysis`);
    expect(languages["es"]).toBe(`${SITE_URL}/es/ai-chart-analysis`);
    expect(languages["x-default"]).toBe(`${SITE_URL}/ai-chart-analysis`);
  });

  it("does NOT emit hreflang for non-localizable legal pages", () => {
    const meta = buildMetadata({
      title: "Terms of Service",
      description: "Legal terms",
      path: "/terms",
      locale: "en",
    });

    expect(meta.alternates?.canonical).toBe("/terms");
    expect(meta.alternates?.languages).toBeUndefined();
  });
});

describe("International SEO — JSON-LD Schemas", () => {
  it("emits correct inLanguage for websiteJsonLd per locale", () => {
    const enWeb = websiteJsonLd("en");
    expect(enWeb.inLanguage).toBe("en");

    const ptWeb = websiteJsonLd("pt-br");
    expect(ptWeb.inLanguage).toBe("pt-BR");

    const esWeb = websiteJsonLd("es");
    expect(esWeb.inLanguage).toBe("es");
  });

  it("emits correct inLanguage and path for articleJsonLd per locale", () => {
    const article = articleJsonLd({
      headline: "Guia de Dimensionamento de Posição",
      description: "Cálculos matemáticos de risco",
      path: "/guides/position-sizing-guide",
      datePublished: "2026-08-22T00:00:00.000Z",
      locale: "pt-br",
    });

    expect(article.inLanguage).toBe("pt-BR");
    expect(article.url).toBe(`${SITE_URL}/pt-br/guides/position-sizing-guide`);
  });
});

describe("International SEO — Sitemap Integration", () => {
  it("includes localized versions for all localizable pages in sitemap", () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    try {
      const entries = sitemap();
      const urls = entries.map((e) => e.url);

      // Checks that English root is present
      expect(urls).toContain("https://tradcopilot.com/");
      expect(urls).toContain("https://tradcopilot.com/ai-chart-analysis");

    // Checks that Portuguese variants are present
    expect(urls).toContain("https://tradcopilot.com/pt-br");
    expect(urls).toContain("https://tradcopilot.com/pt-br/ai-chart-analysis");
    expect(urls).toContain("https://tradcopilot.com/pt-br/crypto-market-analysis");
    expect(urls).toContain("https://tradcopilot.com/pt-br/forex-market-analysis");
    expect(urls).toContain("https://tradcopilot.com/pt-br/guides");

    // Checks that Spanish variants are present
    expect(urls).toContain("https://tradcopilot.com/es");
    expect(urls).toContain("https://tradcopilot.com/es/ai-chart-analysis");
    expect(urls).toContain("https://tradcopilot.com/es/crypto-market-analysis");
    expect(urls).toContain("https://tradcopilot.com/es/forex-market-analysis");
    expect(urls).toContain("https://tradcopilot.com/es/guides");

    // Legal pages must remain English-only
    expect(urls).not.toContain("https://tradcopilot.com/pt-br/terms");
    expect(urls).not.toContain("https://tradcopilot.com/es/privacy");
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    }
  });
});

/**
 * Single source of truth for public FAQ content.
 *
 * Every answer is grounded in the codebase (see src/lib/indicators.ts,
 * src/lib/ai.ts, src/lib/entitlements.ts, src/lib/market-registry.ts,
 * vercel.json) — no invented statistics, capabilities, or cadences.
 *
 * Consumers:
 *  - src/components/landing/faq-accordion.tsx  → the first five (home page #faq)
 *  - src/app/faq/page.tsx                      → full list + matching FAQPage JSON-LD
 */

import type { FaqItem } from "@/lib/seo";

export const FAQS: FaqItem[] = [
  {
    question: "How does TradCopilot analyze market data?",
    answer:
      "TradCopilot computes technical indicators directly from live candlestick data — real-time Binance feeds for BTC, ETH, and SOL, and TwelveData for forex pairs, gold, and indices. It evaluates RSI(14), MACD(12,26,9), EMA alignment (9/21/50), ATR volatility, rolling VWAP, and support/resistance from recent swing highs and lows, then an AI layer turns those readings into a structured setup with bias, setup quality, confidence, and entry, stop, and target ideas.",
  },
  {
    question: "How does the behavioral discipline engine work?",
    answer:
      "The terminal compares what you are doing now against your last 20 logged trades and your declared risk rules. It flags revenge-style re-entries (opening a new position less than 30 minutes after a losing trade closes) and overtrading days (more than five trades in one day), and surfaces a risk alert before you deploy capital. It warns — it never blocks anything, because TradCopilot is read-only.",
  },
  {
    question: "Do I need to connect my broker or share exchange keys?",
    answer:
      "No. TradCopilot is strictly read-only: it does not connect to your brokerage or exchange accounts, does not custody funds, and cannot execute orders. The only keys you can optionally add are market-data API keys (such as TwelveData), and those are encrypted at rest with AES-256-GCM.",
  },
  {
    question: "Which markets and instruments are supported?",
    answer:
      "Nine instruments today: BTC/USD, ETH/USD, SOL/USD, EUR/USD, GBP/USD, USD/JPY, gold (XAU/USD), NASDAQ, and S&P 500. Crypto prices stream in real time from Binance; forex, gold, and indices are served through TwelveData. You can keep using your existing broker or charting platform alongside it.",
  },
  {
    question: "How does the 7-day Pro trial and cancellation work?",
    answer:
      "You can start on the Free tier with no credit card required. Pro subscriptions include a 7-day trial, and you can pause or cancel at any time from your account settings in one click.",
  },
  {
    question: "What is an AI trading copilot?",
    answer:
      "An AI trading copilot is software that uses AI models to help you analyze markets and improve your own decisions — not to trade for you. In TradCopilot's case, deterministic code computes the indicators from live candles first, then large language models (raced across Groq, Google Gemini, NVIDIA, and OpenAI providers) explain the setup in plain language, check it against your journal history, and hand back a structured analysis that is validated for internal consistency before you ever see it.",
  },
  {
    question: "How much does TradCopilot cost?",
    answer:
      "The Free plan costs $0 forever and includes 5 AI chart analyses per day, 3 alerts per day, the trade journal, watchlists, and saved analyses. Pro Terminal is $7.49 per month and adds unlimited analyses and alerts, the performance analytics dashboard, weekly AI reports, and behavioral event logging.",
  },
  {
    question: "Can I try TradCopilot without creating an account?",
    answer:
      "Yes. A 15-minute demo session gives you 2 AI chart analyses and 1 alert with no signup and no card — enough to see a full analysis workflow end to end before you create a free account.",
  },
  {
    question: "How is this different from asking ChatGPT about a chart?",
    answer:
      "General-purpose chatbots guess from whatever you paste. TradCopilot computes RSI, MACD, EMA, ATR, and VWAP from real OHLCV candles server-side before any model writes a word, keeps persistent memory of your trades and journal across sessions, validates every analysis for internal consistency (stop-loss side vs bias, minimum reward-to-risk), tags data points as confirmed, estimated, or unverified, and appends telemetry showing exactly which price and timestamp the analysis used. When live data is unavailable it says so instead of inventing numbers.",
  },
  {
    question: "Does TradCopilot execute trades or give financial advice?",
    answer:
      "No on both counts. There is no order placement anywhere in the product — it is an analytical workstation only, and its output is educational information, not investment advice. TradCopilot is not registered as an investment advisor or broker-dealer with the SEC, SEBI, or any other regulator; trading involves substantial risk of loss. See our full disclaimer for details.",
  },
  {
    question: "What kinds of alerts can I set, and how often are they checked?",
    answer:
      "You can create alerts on price levels, RSI thresholds, EMA crossovers, and trend change versus the 50 EMA. Alerts are evaluated on a daily schedule and fire an in-app notification when triggered. Separately, the system proactively broadcasts sharp-move (2%+ hourly crypto moves) and volatility-spike notifications as they happen.",
  },
  {
    question: "Is my trading data private?",
    answer:
      "Your trades, journal entries, and chat history are stored to power your own memory and analytics and are never sold or traded. Authentication runs on Supabase, billing on Stripe, and AI requests are processed by the configured model providers (Groq, Google Gemini, NVIDIA, OpenAI). You can delete your account and all associated data yourself from Settings at any time.",
  },
  {
    question: "Can I use TradCopilot alongside TradingView or my broker platform?",
    answer:
      "Yes — that is the intended workflow. Charts inside TradCopilot are powered by the embedded TradingView widget, so you keep the charts you know while TradCopilot adds computed indicator readouts, structured AI setups, journaling, and behavioral guardrails around them. You can also export any analysis as a high-resolution PNG snapshot.",
  },
];

/** The subset rendered in the home page's FAQ accordion (and its FAQPage schema). */
export const HOME_FAQS: FaqItem[] = FAQS.slice(0, 5);

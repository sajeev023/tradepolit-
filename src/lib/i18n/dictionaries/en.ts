/**
 * src/lib/i18n/dictionaries/en.ts
 *
 * English content dictionary — the canonical source from which all other
 * locale dictionaries derive their structure. Content extracted from existing
 * hardcoded page copy throughout the codebase.
 *
 * Structure contract:
 *  - Every key in Dictionary must be present in all locale dictionaries.
 *  - Product terminology (TradCopilot, RSI, MACD, EMA, ATR, VWAP) is
 *    preserved verbatim across all locales.
 */

// ---------------------------------------------------------------------------
// Dictionary type — exported for type-safe dictionaries in other locales
// ---------------------------------------------------------------------------

export interface PageMeta {
  title: string;
  description: string;
  keywords: string[];
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface GuideEntry {
  name: string;
  summary: string;
  tag: string;
}

export interface Dictionary {
  /** Global / shared strings */
  common: {
    siteName: string;
    siteTagline: string;
    startFree: string;
    startFreeNoCard: string;
    seePricing: string;
    comparePlans: string;
    readDisclaimer: string;
    learnMore: string;
    readFullFaq: string;
    viewFeatures: string;
    backToHome: string;
    /** Disclaimer text shown on SEO pages */
    disclaimerShort: string;
    /** Nav labels */
    nav: {
      howItWorks: string;
      pricing: string;
      faq: string;
      features: string;
      guides: string;
    };
    /** Footer column headers */
    footer: {
      product: string;
      guidesAndCompare: string;
      legalAndTrust: string;
      copyright: string;
      readOnlyDisclaimer: string;
    };
  };

  /** Homepage */
  home: {
    meta: PageMeta;
    h1: string;
    h1Italic: string;
    subtitle: string;
    faqHeading: string;
    faqSubheading: string;
  };

  /** /ai-trading-copilot */
  aiTradingCopilot: {
    meta: PageMeta;
    eyebrow: string;
    h1: string;
    h1Italic: string;
    intro: string;
    definitionHeading: string;
    definitionBody: string;
    limitsHeading: string;
    faqHeading: string;
    faqs: FaqEntry[];
  };

  /** /ai-chart-analysis */
  aiChartAnalysis: {
    meta: PageMeta;
    eyebrow: string;
    h1: string;
    intro: string;
    instrumentLayerHeading: string;
    judgmentLayerHeading: string;
    pipelineHeading: string;
    coverageHeading: string;
    responsibleHeading: string;
    faqHeading: string;
    ctaHeading: string;
    ctaBody: string;
  };

  /** /crypto-market-analysis */
  cryptoMarketAnalysis: {
    meta: PageMeta;
    eyebrow: string;
    h1: string;
    h1Italic: string;
    intro: string;
    liveDataHeading: string;
    analysisHeading: string;
    sentimentHeading: string;
    safetyHeading: string;
    faqHeading: string;
    faqs: FaqEntry[];
    ctaHeading: string;
  };

  /** /forex-market-analysis */
  forexMarketAnalysis: {
    meta: PageMeta;
    eyebrow: string;
    h1: string;
    h1Italic: string;
    intro: string;
    coverageHeading: string;
    analysisHeading: string;
    riskMathHeading: string;
    safetyHeading: string;
    faqHeading: string;
    faqs: FaqEntry[];
    ctaHeading: string;
  };

  /** /trading-journal */
  tradingJournal: {
    meta: PageMeta;
    h1: string;
    intro: string;
  };

  /** /risk-management */
  riskManagement: {
    meta: PageMeta;
    h1: string;
    intro: string;
  };

  /** /trading-alerts */
  tradingAlerts: {
    meta: PageMeta;
    h1: string;
    intro: string;
  };

  /** /features */
  features: {
    meta: PageMeta;
    h1: string;
  };

  /** /pricing */
  pricing: {
    meta: PageMeta;
    h1: string;
    subtitle: string;
  };

  /** /faq */
  faq: {
    meta: PageMeta;
    h1: string;
    h1Italic: string;
    subtitle: string;
    faqs: FaqEntry[];
  };

  /** /guides */
  guides: {
    meta: PageMeta;
    h1: string;
    h1Italic: string;
    subtitle: string;
    entries: GuideEntry[];
    ctaHeading: string;
    ctaBody: string;
  };
}

// ---------------------------------------------------------------------------
// English dictionary
// ---------------------------------------------------------------------------

export const dictionary: Dictionary = {
  common: {
    siteName: "TradCopilot",
    siteTagline: "AI Trading Copilot for Crypto & Forex Analysis",
    startFree: "Start Free Account",
    startFreeNoCard: "Start free — no card required",
    seePricing: "See Pricing",
    comparePlans: "Compare plans",
    readDisclaimer: "Read Disclaimer",
    learnMore: "Learn More",
    readFullFaq: "Read the full FAQ",
    viewFeatures: "See How It Works",
    backToHome: "Back to Home",
    disclaimerShort:
      "Educational analysis only — not financial advice. Trading involves substantial risk of loss.",
    nav: {
      howItWorks: "How it works",
      pricing: "Pricing",
      faq: "FAQ",
      features: "Features",
      guides: "Guides",
    },
    footer: {
      product: "Product",
      guidesAndCompare: "Guides & Compare",
      legalAndTrust: "Legal & Trust",
      copyright: "© {year} TradCopilot Inc. All rights reserved.",
      readOnlyDisclaimer:
        "Read-only analytical terminal. Not financial advice.",
    },
  },

  home: {
    meta: {
      title:
        "TradCopilot | AI Trading Copilot for Crypto & Forex Analysis",
      description:
        "Read-only AI trading copilot for crypto & forex day traders: live chart analysis with RSI, MACD, EMA & ATR, automated session journaling, behavioral guardrails, and risk tools. Free plan included.",
      keywords: [
        "AI trading copilot",
        "AI trading assistant",
        "crypto chart analysis tool",
        "forex market analysis",
        "trading discipline",
      ],
    },
    h1: "Execute your trading plan with",
    h1Italic: "institutional discipline.",
    subtitle:
      "Real-time chart telemetry, persistent session trade journaling, and automated risk guardrails in one focused workspace.",
    faqHeading: "Frequently asked questions about the terminal",
    faqSubheading: "05 / QUESTIONS",
  },

  aiTradingCopilot: {
    meta: {
      title:
        "What Is an AI Trading Copilot? Definition, Capabilities & Limits",
      description:
        "An AI trading copilot is software that uses AI to help you analyze markets and improve your own decisions — not to trade for you. How the category works, what it can and cannot do, and how TradCopilot implements it.",
      keywords: [
        "what is an ai trading copilot",
        "ai trading copilot",
        "ai trading assistant",
        "ai market analysis tool",
        "ai chart analysis",
      ],
    },
    eyebrow: "CATEGORY GUIDE",
    h1: "What is an",
    h1Italic: "AI trading copilot?",
    intro:
      "An AI trading copilot is software that uses AI models to help you analyze markets and improve your own trading decisions — not to trade for you. It reads charts and market data, explains setups in plain language, keeps memory of your past sessions, and coaches discipline, while you keep full control of every order.",
    definitionHeading: "The category, precisely",
    definitionBody:
      'The word "copilot" is doing real work here. Aviation copilots don\'t replace pilots — they monitor instruments, cross-check decisions, and speak up before mistakes become accidents.',
    limitsHeading: "What an AI trading copilot cannot do",
    faqHeading: "Common questions about AI trading copilots",
    faqs: [
      {
        question: "Does an AI trading copilot execute trades?",
        answer:
          "A copilot, by definition, should not. It analyzes, explains, journals, and warns while you keep full control of execution. TradCopilot in particular has no order placement anywhere in the product, holds no funds, and never connects to a brokerage or exchange account.",
      },
      {
        question:
          "How is an AI trading copilot different from a trading bot?",
        answer:
          "A bot automates decisions and places orders on your behalf. A copilot does the opposite: it improves the quality of your decisions — objective indicator readings, structured setup analysis, behavioral warnings — but the human stays the executor.",
      },
      {
        question: "Can an AI trading copilot predict where price will go?",
        answer:
          "No honest one will claim that. Markets are uncertain, and any system promising guaranteed predictions should be treated as a red flag.",
      },
    ],
  },

  aiChartAnalysis: {
    meta: {
      title: "AI Chart Analysis for Crypto & Forex — How It Works",
      description:
        "AI chart analysis that computes RSI, MACD, EMA, VWAP and support/resistance from live candles first, then explains the setup through a multi-model AI race.",
      keywords: [
        "ai chart analysis",
        "ai technical analysis",
        "crypto chart analysis tool",
        "automated support and resistance",
      ],
    },
    eyebrow: "How the engine works",
    h1: "AI chart analysis, grounded in real candlestick data",
    intro:
      "AI chart analysis is the use of machine-learning models to interpret price charts — reading momentum, trend structure, volatility, and key levels, then explaining what they imply in plain language.",
    instrumentLayerHeading: "What the analysis engine computes",
    judgmentLayerHeading: "From indicators to a structured setup",
    pipelineHeading: "How the multi-model pipeline works",
    coverageHeading: "Timeframes and markets",
    responsibleHeading: "Reading an analysis responsibly",
    faqHeading: "Frequently asked questions",
    ctaHeading: "See it on a live chart",
    ctaBody:
      "Run an analysis on BTC, EUR/USD, or any of the nine instruments and inspect the telemetry yourself — exact price, exact timestamp, every tag visible.",
  },

  cryptoMarketAnalysis: {
    meta: {
      title:
        "AI Crypto Market Analysis — Live BTC, ETH & SOL Chart Analysis",
      description:
        "How TradCopilot analyzes crypto markets: real-time Binance candle data for BTC, ETH and SOL, RSI/MACD/EMA/ATR/VWAP computed server-side, funding rates, Fear & Greed, and sharp-move alerts.",
      keywords: [
        "crypto market analysis",
        "ai crypto trading analysis",
        "btc chart analysis tool",
        "ethereum technical analysis",
        "crypto ai assistant",
      ],
    },
    eyebrow: "MARKETS · CRYPTO",
    h1: "AI crypto market analysis on",
    h1Italic: "live candles.",
    intro:
      "Crypto never closes, so your analysis shouldn't run on stale snapshots. TradCopilot computes its full technical read from real-time BTC, ETH, and SOL candle streams — then explains the setup in plain language, journals the session, and guards your risk rules around the clock.",
    liveDataHeading: "Real-time feeds, not screenshots",
    analysisHeading: "From indicators to a written setup",
    sentimentHeading: "Sentiment layers built for this market",
    safetyHeading: "Read-only, by design",
    faqHeading: "Crypto analysis questions",
    faqs: [
      {
        question: "Which crypto instruments does TradCopilot analyze?",
        answer:
          "BTC/USD, ETH/USD, and SOL/USD today. Prices stream in real time from public Binance WebSocket feeds, and every analysis states the exact price and timestamp it used.",
      },
      {
        question: "Does TradCopilot need my exchange API keys?",
        answer:
          "No. Crypto candles come from public market-data streams that require no authentication. TradCopilot never connects to your exchange account, cannot place orders, and holds no funds.",
      },
      {
        question: "How fast are the AI analyses?",
        answer:
          "Multiple AI providers run in parallel and the first valid structured response wins, so a typical analysis returns within seconds.",
      },
    ],
    ctaHeading: "Analyze BTC on live data in under a minute",
  },

  forexMarketAnalysis: {
    meta: {
      title:
        "AI Forex Market Analysis — EUR/USD, GBP/USD & USD/JPY Setups",
      description:
        "How TradCopilot analyzes forex: TwelveData candles for major pairs, gold and indices, session-aware analysis, lot-precise position sizing, and AI setups explained in plain language.",
      keywords: [
        "forex market analysis",
        "ai forex trading analysis",
        "eurusd analysis tool",
        "forex technical analysis ai",
        "forex position sizing",
      ],
    },
    eyebrow: "MARKETS · FOREX",
    h1: "AI forex market analysis,",
    h1Italic: "session by session.",
    intro:
      "Forex moves on sessions, not just candles. TradCopilot computes the full technical read for the majors from live candle data, knows whether Asia, London, or New York is in play, sizes your positions to the lot — and explains every setup in language you can act on or discard.",
    coverageHeading: "Majors, gold, and indices on one workspace",
    analysisHeading: "Structured setups, not vague commentary",
    riskMathHeading: "Lot-precise position sizing",
    safetyHeading: "No broker connections. Ever.",
    faqHeading: "Forex analysis questions",
    faqs: [
      {
        question: "Which forex instruments does TradCopilot analyze?",
        answer:
          "EUR/USD, GBP/USD, and USD/JPY today, plus gold (XAU/USD), NASDAQ, and S&P 500 — served through TwelveData market data.",
      },
      {
        question: "Does TradCopilot connect to my forex broker?",
        answer:
          "No. TradCopilot is strictly read-only: it never connects to a brokerage, cannot place orders, and holds no funds.",
      },
      {
        question: "Can it calculate position size in lots?",
        answer:
          "Yes. The risk calculator outputs standard, mini, and micro lot sizes from your balance, risk percentage, entry, and stop.",
      },
    ],
    ctaHeading: "Run one analysis on EUR/USD right now",
  },

  tradingJournal: {
    meta: {
      title:
        "AI Trading Journal — Automated Session Logging & Behavioral Memory",
      description:
        "An automated trade journal that logs entries, exits, emotions, and mistakes. Feeds your last 20 trades into AI context to detect revenge trading and overtrading.",
      keywords: [
        "ai trading journal",
        "automated trade journal",
        "trading psychology tool",
        "revenge trading detector",
        "crypto trade journal",
        "forex trade logger",
      ],
    },
    h1: "AI Trading Journal",
    intro:
      "An automated trade journal that logs entries, exits, emotions, and mistakes — then feeds your history into every future analysis.",
  },

  riskManagement: {
    meta: {
      title:
        "Risk Management Tools — Position Sizing & Behavioral Guardrails",
      description:
        "A leverage-aware position size calculator with forex lot outputs, plus behavioral warnings for revenge trading and overtrading. Read-only — it warns, never blocks.",
      keywords: [
        "position size calculator",
        "trading risk management",
        "revenge trading",
        "overtrading",
        "risk reward ratio",
      ],
    },
    h1: "Risk Management & Behavioral Guardrails",
    intro:
      "Position sizing, behavioral warnings, and risk tools for disciplined trading.",
  },

  tradingAlerts: {
    meta: {
      title:
        "Trading Alerts — Price Levels, RSI Extremes & Trend Crossover Triggers",
      description:
        "Set technical alerts on crypto and forex pairs: price thresholds, RSI overbought/oversold levels, EMA crossovers, and volatility spike notifications.",
      keywords: [
        "trading alerts",
        "crypto price alerts",
        "forex technical alerts",
        "rsi alert bot",
        "ema crossover alerts",
      ],
    },
    h1: "Trading Alerts",
    intro:
      "Price levels, RSI extremes, EMA crossovers, and volatility notifications for crypto and forex.",
  },

  features: {
    meta: {
      title: "Features — Complete AI Trading Terminal Capabilities",
      description:
        "Complete capabilities of TradCopilot: AI chart analysis, trading journal, behavioral guardrails, position sizing, backtesting, alerts, market pulse, and news.",
      keywords: [
        "ai trading features",
        "trading terminal features",
        "crypto trading tool",
      ],
    },
    h1: "All Features",
  },

  pricing: {
    meta: {
      title: "Pricing — Free Plan & $7.49/mo Pro Terminal",
      description:
        "Start free with 5 AI analyses per day, no card required. Upgrade to Pro at $7.49/month for unlimited analyses and alerts, performance analytics, and weekly reports.",
      keywords: [
        "tradcopilot pricing",
        "ai trading tool cost",
        "crypto analysis tool pricing",
      ],
    },
    h1: "Choose Your Plan",
    subtitle: "Start free. Upgrade when you need more. Cancel anytime.",
  },

  faq: {
    meta: {
      title:
        "Frequently Asked Questions — TradCopilot Terminal & Architecture FAQ",
      description:
        "Comprehensive answers regarding TradCopilot's AI chart analysis, indicator math, session journaling, risk guardrails, pricing, and read-only security model.",
      keywords: [
        "tradcopilot faq",
        "ai trading questions",
        "how ai trading copilot works",
      ],
    },
    h1: "Frequently Asked",
    h1Italic: "Questions.",
    subtitle:
      "Clear, transparent answers about how TradCopilot works, our multi-model AI race, indicator calculations, security, and billing.",
    faqs: [
      {
        question: "How does TradCopilot analyze market data?",
        answer:
          "TradCopilot computes technical indicators directly from live candlestick data — real-time Binance feeds for BTC, ETH, and SOL, and TwelveData for forex pairs, gold, and indices.",
      },
      {
        question: "Do I need to connect my broker or share exchange keys?",
        answer:
          "No. TradCopilot is strictly read-only: it does not connect to your brokerage or exchange accounts, does not custody funds, and cannot execute orders.",
      },
      {
        question: "How much does TradCopilot cost?",
        answer:
          "The Free plan costs $0 forever and includes 5 AI chart analyses per day. Pro Terminal is $7.49 per month with unlimited analyses and alerts.",
      },
      {
        question: "Does TradCopilot execute trades or give financial advice?",
        answer:
          "No on both counts. There is no order placement anywhere in the product — it is an analytical workstation only, and its output is educational information, not investment advice.",
      },
    ],
  },

  guides: {
    meta: {
      title:
        "Trading Guides — Position Sizing, Discipline, Support & Resistance",
      description:
        "Practical, math-first trading guides for crypto and forex day traders: position sizing formulas, trading discipline systems, support and resistance mapping, technical indicators, and multi-timeframe analysis.",
      keywords: [
        "trading guides",
        "crypto and forex education",
        "position sizing",
        "trading discipline",
        "technical analysis guides",
      ],
    },
    h1: "Trading guides that respect",
    h1Italic: "the math.",
    subtitle:
      "Short, practical, and grounded in the same calculations TradCopilot runs on live candles. Educational content only — not financial advice.",
    entries: [
      {
        name: "The Complete Guide to Position Sizing",
        summary:
          "Fixed-fractional risk math, stop-distance arithmetic, leverage exposure, and forex standard/mini/micro lot conversion — with worked examples for both BTC/USD and EUR/USD.",
        tag: "RISK MANAGEMENT",
      },
      {
        name: "A Practical System for Trading Discipline",
        summary:
          "Why discipline fails under drawdown, how to build a written rule set you can actually follow, and how journaling plus pre-trade guardrails turn intentions into habits.",
        tag: "PSYCHOLOGY",
      },
      {
        name: "Support & Resistance That Holds Up",
        summary:
          "How to map levels objectively from swing highs and lows instead of eyeballing them — the same swing-based method TradCopilot computes automatically on live candles.",
        tag: "MARKET STRUCTURE",
      },
      {
        name: "RSI, MACD, EMA, ATR & VWAP Explained",
        summary:
          "What each indicator measures, how it is calculated, where it misleads, and how they fit together in one structured read of a chart.",
        tag: "INDICATORS",
      },
      {
        name: "Multi-Timeframe Analysis, Step by Step",
        summary:
          "How to align a higher-timeframe bias with lower-timeframe entries, which timeframe pairs work for day trading, and the mistakes that make MTF analysis contradict itself.",
        tag: "WORKFLOW",
      },
    ],
    ctaHeading: "Practice every concept on live charts",
    ctaBody:
      "TradCopilot computes these same indicators from real-time crypto and forex data — then journals the session and guards your risk rules. Free plan included.",
  },
};

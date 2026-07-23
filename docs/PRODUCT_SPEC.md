# TradCopilot MVP — Product Specification

## Core Value Proposition
TradCopilot is a "second brain" decision-support system for retail crypto and forex day/swing traders. The application does **not** manage capital, connect to execution brokerages, or direct money movement. Instead, it aggregates live market telemetry, computes statistical analytics, tracks performance logs, evaluates price thresholds, backtests indicator crossover rules, and runs RAG-grounded AI behavioral coaching.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 15 (Vercel)                     │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────┐ │
│  │  App Router UI │  │ API Routes    │  │ Vercel Cron Jobs │ │
│  │  (RSC + Client)│  │ (REST, Zod)   │  │ (alerts, aggreg.)│ │
│  └───────┬───────┘  └──────┬────────┘  └─────────┬─────────┘ │
└──────────┼──────────────────┼─────────────────────┼──────────┘
           │                  │                     │
           │        ┌─────────▼─────────┐           │
           │        │   Prisma ORM      │◄──────────┘
           │        └─────────┬─────────┘
           │                  │
┌──────────▼──────────────────▼─────────────────────────────────┐
│                     Supabase                                  │
│  ┌────────────┐ ┌────────────────┐ ┌───────────────────────┐  │
│  │ Postgres   │ │ Auth (GoTrue)  │ │ Storage (screenshots) │  │
│  │ + RLS      │ │                │ │                       │  │
│  └────────────┘ └────────────────┘ └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Upstream Cache TTL Intervals
To enforce rate limits and avoid provider rate depletion, all incoming REST telemetry is cached:
- **Price Data:** 5 seconds (Binance spot, TwelveData fallback).
- **Historical OHLCV:** 1 hour (Binance Spot, TwelveData).
- **News Stories:** 30 minutes (CryptoPanic feed).
- **Fear & Greed Index:** 6 hours.

### Symmetric API Key Encryption
User-supplied settings keys (e.g. TwelveData or CoinMarketCap) are AES-256-GCM encrypted at rest using a 32-byte server-held key (`ENCRYPTION_KEY`), preventing database compromises from leaking credentials.

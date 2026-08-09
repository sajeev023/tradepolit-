# TradCopilot MVP

A production-grade decision-support system for retail day and swing traders. Built using Next.js 16, Prisma 7, Supabase Auth/Storage, and multi-provider AI (Groq → NVIDIA → Gemini fallback).

---

## 🚀 Quick Start Setup

### 1. Configure Environment Variables
Copy `.env.example` to `.env.local` and configure your credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL="https://mockproject.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="mock-key"
DATABASE_URL="file:./dev.db" # local SQLite default
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Prisma client
```bash
npx prisma generate
```

### 4. Run Dev Server
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000) to inspect.

---

## 🛠️ Adding a New Instrument Reference

To expand the list of tradeable instruments:
1. Open [src/lib/market-registry.ts](src/lib/market-registry.ts).
2. Append the target symbol (e.g. `ETH/USD`) to `CRYPTO_SYMBOLS` or `FOREX_SYMBOLS`.
3. Configure baseline mock values inside the `BASELINE_PRICES` and `VOLATILITIES` maps to ensure simulated random walks function correctly offline.
4. Update the front-end asset options array inside [src/app/(dashboard)/journal/page.tsx](src/app/(dashboard)/journal/page.tsx).

---

## 🗄️ Cache TTL Parameters
- **Binance Prices:** 5s
- **OHLCV Candles:** 1h
- **News Headlines:** 30m
- **Fear & Greed Sentiment:** 6h

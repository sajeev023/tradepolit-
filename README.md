# TradCopilot

> TradCopilot is an AI-powered market analysis and trading research platform designed to help users analyze crypto and forex markets, understand technical setups, manage risk, and make more informed trading decisions.

---

## Product

- [Homepage](https://tradcopilot.com/): Overview of TradCopilot and its core capabilities.
- [Pricing](https://tradcopilot.com/pricing): Free and Pro plan information.
- [Changelog](https://tradcopilot.com/changelog): Product updates and improvements.

---

## Core Capabilities

- **AI-Powered Market Analysis**: Multi-model intelligence engine (Groq, NVIDIA NIM, Gemini fallback).
- **Technical Chart Analysis**: Real-time TradingView charting with public OHLCV candle streams.
- **Market Structure & Trend Analysis**: Key support/resistance levels, RSI, MACD, and EMA indicator validation.
- **Risk Analysis & Expectancy**: Mathematical risk expectancy calculator and position sizing validator.
- **Trading Setup Evaluation**: Structured thesis generation (Bias, Entry, Stop, Take-Profit).
- **Trading Journal & Behavioral Insights**: Session memory tracking revenge trading, rapid re-entries, and sizing spikes.
- **Market Alerts & Market Pulse**: Sub-20s alert evaluation cadence on key structural breaks.

---

## Markets

TradCopilot focuses on crypto and forex market analysis (BTC, ETH, SOL, EUR/USD, GBP/USD, and major pairs).

---

## 🚀 Developer Quick Start

### 1. Configure Environment Variables
Copy `.env.example` to `.env.local` and configure your credentials:
```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Prisma Client
```bash
npx prisma generate
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Run Tests & Type Checks
```bash
npm test
npm run typecheck
npm run lint
```

---

## ⚠️ Important

TradCopilot is an informational and analytical tool. Its AI-generated analysis should not be treated as guaranteed financial advice or guaranteed trading signals.

---

## Legal

- [Disclaimer](https://tradcopilot.com/disclaimer): Risk and informational-use disclaimer.
- [Terms of Service](https://tradcopilot.com/terms): Terms of service.
- [Privacy Policy](https://tradcopilot.com/privacy): Privacy policy.
- [Refund Policy](https://tradcopilot.com/refund): Refund policy.
- [Acceptable Use](https://tradcopilot.com/acceptable-use): Acceptable use policy.
- [Cookie Policy](https://tradcopilot.com/cookies): Cookie policy.

// In-memory mock database for TradCopilot when real Postgres is offline
import { MOCK_USER } from "./supabase/mock";
import { CRYPTO_SYMBOLS } from "./market-registry";

let backtestIdCounter = 0;

function getStandardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

class MemoryDb {
  users: any[] = [MOCK_USER];
  userProfiles: any[] = [];
  conversationMemory: any[] = [];
  trades: any[] = [];
  journalEntries: any[] = [];
  behavioralEvents: any[] = [];
  watchlists: any[] = [{ id: "wl-1", name: "My Watchlist", instruments: CRYPTO_SYMBOLS.slice(0, 2), userId: MOCK_USER.id }];
  alerts: any[] = [];
  notifications: any[] = [];
  performance: any | null = null;
  marketCache: Map<string, { data: any; expiresAt: Date }> = new Map();
  strategies: any[] = [];
  backtests: any[] = [];
  aiChats: any[] = [];
  settings: any[] = [{
    id: "set-1",
    userId: MOCK_USER.id,
    theme: "dark",
    notifyEmail: true,
    notifyInApp: true,
    alertPrefsJson: {},
  }];
  userApiKeys: any[] = [];
  news: any[] = [];

  constructor() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    this.strategies = [
      {
        id: "strat-1",
        userId: MOCK_USER.id,
        name: "EMA Crossover Trend",
        description: "Enters LONG when EMA 20 crosses above EMA 50, exits when EMA 20 crosses below EMA 50.",
        rulesConfig: {
          entry: { indicatorA: "EMA20", operator: "CROSSES_ABOVE", indicatorB: "EMA50" },
          exit: { indicatorA: "EMA20", operator: "CROSSES_BELOW", indicatorB: "EMA50" },
        },
        isActive: true,
        createdAt: new Date(now - 10 * oneDay),
        updatedAt: new Date(now - 10 * oneDay),
      }
    ];

    this.trades = [
      {
        id: "t1",
        userId: MOCK_USER.id,
        instrument: "BTC/USD",
        assetClass: "CRYPTO",
        direction: "LONG",
        entryPrice: 67200.0,
        exitPrice: 69100.0,
        size: 0.25,
        leverage: 1,
        stopLoss: 66500.0,
        takeProfit: 71000.0,
        pnl: (69100.0 - 67200.0) * 0.25,
        rMultiple: (69100.0 - 67200.0) / (67200.0 - 66500.0),
        status: "CLOSED",
        openedAt: new Date(now - 3 * oneDay),
        closedAt: new Date(now - 3 * oneDay + 4 * 3600 * 1000),
        emotionTag: "DISCIPLINED",
        mistakeTags: [],
        lessonsLearned: "Followed the entry setup perfectly.",
        notes: "Support level bounce on 4H chart.",
        screenshots: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "t2",
        userId: MOCK_USER.id,
        instrument: "ETH/USD",
        assetClass: "CRYPTO",
        direction: "SHORT",
        entryPrice: 3550.0,
        exitPrice: 3480.0,
        size: 2.0,
        leverage: 3,
        stopLoss: 3600.0,
        takeProfit: 3400.0,
        pnl: (3550.0 - 3480.0) * 2.0 * 3,
        rMultiple: (3550.0 - 3480.0) / (3600.0 - 3550.0),
        status: "CLOSED",
        openedAt: new Date(now - 2 * oneDay),
        closedAt: new Date(now - 2 * oneDay + 2 * 3600 * 1000),
        emotionTag: "CONFIDENT",
        mistakeTags: [],
        lessonsLearned: "Nice quick intraday breakout trade.",
        notes: "Double top resistance test.",
        screenshots: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "t3",
        userId: MOCK_USER.id,
        instrument: "EUR/USD",
        assetClass: "FOREX",
        direction: "LONG",
        entryPrice: 1.0850,
        exitPrice: 1.0810,
        size: 100000,
        leverage: 1,
        stopLoss: 1.0830,
        takeProfit: 1.0900,
        pnl: (1.0810 - 1.0850) * 100000,
        rMultiple: (1.0810 - 1.0850) / (1.0850 - 1.0830),
        status: "CLOSED",
        openedAt: new Date(now - oneDay),
        closedAt: new Date(now - oneDay + 6 * 3600 * 1000),
        emotionTag: "FOMO",
        mistakeTags: ["FOMO Entry"],
        lessonsLearned: "Entered late, did not wait for structural confirmation.",
        notes: "Chasing breakout.",
        screenshots: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    this.recomputePerformance();
  }

  recomputePerformance() {
    const closed = this.trades.filter((t) => t.status === "CLOSED" && t.closedAt);

    if (closed.length === 0) {
      this.performance = {
        userId: MOCK_USER.id,
        equityCurve: [],
        metricsJson: {
          totalTrades: 0,
          winRate: 0,
          profitFactor: 0,
          expectancy: 0,
          averageRR: 0,
          averageWin: 0,
          averageLoss: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          bestAsset: null,
          worstAsset: null,
          longestWinStreak: 0,
          longestLoseStreak: 0,
          averageTradeDuration: 0,
          totalPnL: 0,
        },
        computedAt: new Date(),
      };
      return;
    }

    let runningPnL = 0;
    const equityCurve = closed
      .sort((a, b) => {
        const ad = a.closedAt instanceof Date ? a.closedAt : new Date(a.closedAt);
        const bd = b.closedAt instanceof Date ? b.closedAt : new Date(b.closedAt);
        return ad.getTime() - bd.getTime();
      })
      .map((t) => {
        runningPnL += Number(t.pnl || 0);
        const td = t.closedAt instanceof Date ? t.closedAt : new Date(t.closedAt);
        return {
          date: td.toLocaleDateString(),
          pnl: runningPnL,
        };
      });

    const wins = closed.filter((t) => Number(t.pnl || 0) > 0);
    const losses = closed.filter((t) => Number(t.pnl || 0) <= 0);

    const grossProfit = wins.reduce((acc, t) => acc + Number(t.pnl || 0), 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + Number(t.pnl || 0), 0));

    const totalPnL = runningPnL;
    const winRate = wins.length / closed.length;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit;

    // Real expectations calculations
    const expectancy = totalPnL / closed.length;
    const averageWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const averageLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const averageRR = closed.reduce((acc, t) => acc + Number(t.rMultiple || 0), 0) / closed.length;

    // Streaks
    let currentWinStreak = 0;
    let currentLoseStreak = 0;
    let longestWinStreak = 0;
    let longestLoseStreak = 0;

    const sortedTrades = [...closed].sort((a, b) => {
      const ad = a.closedAt instanceof Date ? a.closedAt : new Date(a.closedAt);
      const bd = b.closedAt instanceof Date ? b.closedAt : new Date(b.closedAt);
      return ad.getTime() - bd.getTime();
    });
    for (const t of sortedTrades) {
      if (Number(t.pnl || 0) > 0) {
        currentWinStreak++;
        currentLoseStreak = 0;
        if (currentWinStreak > longestWinStreak) longestWinStreak = currentWinStreak;
      } else {
        currentLoseStreak++;
        currentWinStreak = 0;
        if (currentLoseStreak > longestLoseStreak) longestLoseStreak = currentLoseStreak;
      }
    }

    // Asset performance mapping
    const assetPnL: Record<string, number> = {};
    for (const t of closed) {
      assetPnL[t.instrument] = (assetPnL[t.instrument] || 0) + Number(t.pnl || 0);
    }
    let bestAsset: string | null = null;
    let worstAsset: string | null = null;
    let maxPnL = -Infinity;
    let minPnL = Infinity;
    for (const [asset, pnl] of Object.entries(assetPnL)) {
      if (pnl > maxPnL) {
        maxPnL = pnl;
        bestAsset = asset;
      }
      if (pnl < minPnL) {
        minPnL = pnl;
        worstAsset = asset;
      }
    }

    // Drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let running = 0;
    for (const t of sortedTrades) {
      running += Number(t.pnl || 0);
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Sharpe Ratio
    const pnlList = sortedTrades.map((t) => Number(t.pnl || 0));
    const sd = getStandardDeviation(pnlList);
    const sharpeRatio = sd > 0 ? expectancy / sd : 0;

    // Average duration (seconds)
    const totalDuration = closed.reduce((acc, t) => {
      const od = t.openedAt instanceof Date ? t.openedAt : new Date(t.openedAt);
      const cd = t.closedAt instanceof Date ? t.closedAt : new Date(t.closedAt);
      return acc + (cd.getTime() - od.getTime());
    }, 0);
    const averageTradeDuration = (totalDuration / closed.length) / 1000;

    this.performance = {
      userId: MOCK_USER.id,
      equityCurve,
      metricsJson: {
        totalTrades: closed.length,
        winRate,
        profitFactor,
        expectancy,
        averageRR,
        averageWin,
        averageLoss,
        maxDrawdown,
        sharpeRatio,
        bestAsset,
        worstAsset,
        longestWinStreak,
        longestLoseStreak,
        averageTradeDuration,
        totalPnL,
      },
      computedAt: new Date(),
    };
  }
}

export const memoryDb = new MemoryDb();

export const prismaMock = {
  user: {
    findUnique: async ({ where }: any) => {
      return memoryDb.users.find((u) => u.id === where.id || u.email === where.email) || null;
    },
    create: async ({ data }: any) => {
      const user = { ...data, createdAt: new Date(), updatedAt: new Date(), isActive: true, role: data.role || "USER" };
      memoryDb.users.push(user);
      return user;
    },
    update: async ({ where, data }: any) => {
      const idx = memoryDb.users.findIndex((u) => u.id === where.id);
      if (idx === -1) throw new Error("User not found");
      const updated = { ...memoryDb.users[idx], ...data, updatedAt: new Date() };
      memoryDb.users[idx] = updated;
      return updated;
    },
    upsert: async ({ where, update, create }: any) => {
      const idx = memoryDb.users.findIndex((u) => u.id === where.id || u.email === where.email);
      if (idx === -1) {
        const user = { id: where.id || `u_${Date.now()}`, ...create, createdAt: new Date(), updatedAt: new Date(), isActive: true, role: create.role || "USER" };
        memoryDb.users.push(user);
        return user;
      }
      const updated = { ...memoryDb.users[idx], ...update, updatedAt: new Date() };
      memoryDb.users[idx] = updated;
      return updated;
    },
    findMany: async ({ where }: any) => {
      let list = memoryDb.users;
      if (where?.OR) {
        list = list.filter((u) =>
          where.OR.some((cond: any) => {
            if (cond.email?.contains) {
              return u.email.toLowerCase().includes(cond.email.contains.toLowerCase());
            }
            if (cond.displayName?.contains) {
              return (u.displayName || "").toLowerCase().includes(cond.displayName.contains.toLowerCase());
            }
            return false;
          })
        );
      }
      return list;
    },
    count: async () => {
      return memoryDb.users.length;
    },
  },
  trade: {
    findMany: async ({ where, skip = 0, take = 20 }: any) => {
      let list = memoryDb.trades.filter((t) => t.userId === where.userId);
      if (where.status) {
        list = list.filter((t) => t.status === where.status);
      }
      if (where.instrument && where.instrument.contains) {
        const query = where.instrument.contains.toLowerCase();
        list = list.filter((t) => t.instrument.toLowerCase().includes(query));
      }
      return list.slice(skip, skip + take);
    },
    count: async ({ where }: any) => {
      let list = memoryDb.trades.filter((t) => t.userId === where.userId);
      if (where.status) {
        list = list.filter((t) => t.status === where.status);
      }
      return list.length;
    },
    findFirst: async ({ where }: any) => {
      return memoryDb.trades.find((t) => t.id === where.id && t.userId === where.userId) || null;
    },
    create: async ({ data }: any) => {
      const trade = {
        id: `t_${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryDb.trades.push(trade);
      memoryDb.recomputePerformance();
      return trade;
    },
    createMany: async ({ data }: any) => {
      const items = (Array.isArray(data) ? data : [data]).map((item: any) => ({
        id: `t_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        ...item,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      memoryDb.trades.push(...items);
      memoryDb.recomputePerformance();
      return { count: items.length };
    },
    update: async ({ where, data }: any) => {
      const idx = memoryDb.trades.findIndex((t) => t.id === where.id);
      if (idx === -1) throw new Error("Trade not found");
      const updated = {
        ...memoryDb.trades[idx],
        ...data,
        updatedAt: new Date(),
      };
      memoryDb.trades[idx] = updated;
      memoryDb.recomputePerformance();
      return updated;
    },
    delete: async ({ where }: any) => {
      const idx = memoryDb.trades.findIndex((t) => t.id === where.id);
      if (idx !== -1) {
        memoryDb.trades.splice(idx, 1);
        memoryDb.recomputePerformance();
      }
      return { id: where.id };
    },
  },
  performance: {
    findUnique: async ({ where }: any) => {
      if (memoryDb.performance?.userId === where.userId) {
        return memoryDb.performance;
      }
      return null;
    },
    upsert: async () => {
      memoryDb.recomputePerformance();
      return memoryDb.performance;
    },
  },
  watchlist: {
    findMany: async ({ where }: any) => {
      return memoryDb.watchlists.filter((w) => w.userId === where.userId);
    },
    findFirst: async ({ where }: any) => {
      return memoryDb.watchlists.find((w) => w.userId === where.userId) || null;
    },
    create: async ({ data }: any) => {
      const wl = { id: `wl-${Date.now()}`, ...data, createdAt: new Date() };
      memoryDb.watchlists.push(wl);
      return wl;
    },
    update: async ({ where, data }: any) => {
      const idx = memoryDb.watchlists.findIndex((w) => w.id === where.id);
      if (idx === -1) throw new Error("Watchlist not found");
      const updated = { ...memoryDb.watchlists[idx], ...data };
      memoryDb.watchlists[idx] = updated;
      return updated;
    },
    delete: async ({ where }: any) => {
      const idx = memoryDb.watchlists.findIndex((w) => w.id === where.id);
      if (idx !== -1) {
        memoryDb.watchlists.splice(idx, 1);
      }
      return { id: where.id };
    },
  },
  strategy: {
    findMany: async ({ where, orderBy }: any) => {
      let list = memoryDb.strategies.filter((s) => s.userId === where.userId);
      if (orderBy && orderBy.createdAt === "desc") {
        list = [...list].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      return list;
    },
    findFirst: async ({ where }: any) => {
      return memoryDb.strategies.find((s) => s.id === where.id && s.userId === where.userId) || null;
    },
    create: async ({ data }: any) => {
      const strategy = {
        id: `strat_${Date.now()}`,
        ...data,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryDb.strategies.push(strategy);
      return strategy;
    },
    update: async ({ where, data }: any) => {
      const idx = memoryDb.strategies.findIndex((s) => s.id === where.id);
      if (idx === -1) throw new Error("Strategy not found");
      const updated = {
        ...memoryDb.strategies[idx],
        ...data,
        updatedAt: new Date(),
      };
      memoryDb.strategies[idx] = updated;
      return updated;
    },
    delete: async ({ where }: any) => {
      const idx = memoryDb.strategies.findIndex((s) => s.id === where.id);
      if (idx !== -1) {
        memoryDb.strategies.splice(idx, 1);
      }
      return { id: where.id };
    },
  },
  backtest: {
    findUnique: async ({ where, include }: any) => {
      const bt = memoryDb.backtests.find((b) => b.id === where.id);
      if (!bt) return null;
      if (include && include.strategy) {
        const strategy = memoryDb.strategies.find((s) => s.id === bt.strategyId);
        return { ...bt, strategy };
      }
      return bt;
    },
    findFirst: async ({ where, include }: any) => {
      const bt = memoryDb.backtests.find((b) => b.id === where.id && b.userId === where.userId);
      if (!bt) return null;
      if (include && include.strategy) {
        const strategy = memoryDb.strategies.find((s) => s.id === bt.strategyId);
        return { ...bt, strategy };
      }
      return bt;
    },
    create: async ({ data }: any) => {
      // Use a monotonic counter + random suffix to avoid id collisions when many
      // backtests are created in rapid succession during parallel test runs.
      const counter = ++backtestIdCounter;
      const suffix = Math.random().toString(36).slice(2, 8);
      const bt = {
        id: `bt_${Date.now()}_${counter}_${suffix}`,
        ...data,
        status: data.status || "PENDING",
        createdAt: new Date(),
      };
      memoryDb.backtests.push(bt);
      return bt;
    },
    update: async ({ where, data }: any) => {
      const idx = memoryDb.backtests.findIndex((b) => b.id === where.id);
      if (idx === -1) throw new Error("Backtest not found");
      const updated = {
        ...memoryDb.backtests[idx],
        ...data,
      };
      memoryDb.backtests[idx] = updated;
      return updated;
    },
  },
  marketCache: {
    findUnique: async ({ where }: any) => {
      const cached = memoryDb.marketCache.get(where.cacheKey);
      if (!cached) return null;
      return {
        cacheKey: where.cacheKey,
        data: cached.data,
        expiresAt: cached.expiresAt,
      };
    },
    upsert: async ({ where, create }: any) => {
      memoryDb.marketCache.set(where.cacheKey, {
        data: create.data,
        expiresAt: create.expiresAt,
      });
      return { cacheKey: where.cacheKey };
    },
    delete: async ({ where }: any) => {
      memoryDb.marketCache.delete(where.cacheKey);
      return { cacheKey: where.cacheKey };
    },
  },
  aIChat: {
    findMany: async ({ where, skip = 0, take = 10 }: any) => {
      return memoryDb.aiChats.filter((c) => c.userId === where.userId).slice(skip, skip + take);
    },
    count: async ({ where }: any) => {
      return memoryDb.aiChats.filter((c) => c.userId === where.userId).length;
    },
    findFirst: async ({ where }: any) => {
      return memoryDb.aiChats.find((c) => c.id === where.id && c.userId === where.userId) || null;
    },
    create: async ({ data }: any) => {
      const chat = {
        id: `chat_${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryDb.aiChats.push(chat);
      return chat;
    },
    update: async ({ where, data }: any) => {
      const idx = memoryDb.aiChats.findIndex((c) => c.id === where.id);
      if (idx === -1) throw new Error("Chat not found");
      const updated = {
        ...memoryDb.aiChats[idx],
        ...data,
        updatedAt: new Date(),
      };
      memoryDb.aiChats[idx] = updated;
      return updated;
    },
    delete: async ({ where }: any) => {
      const idx = memoryDb.aiChats.findIndex((c) => c.id === where.id);
      if (idx !== -1) {
        memoryDb.aiChats.splice(idx, 1);
      }
      return { id: where.id };
    },
  },
  alert: {
    findMany: async ({ where }: any) => {
      return memoryDb.alerts.filter((a) => a.userId === where.userId);
    },
    findFirst: async ({ where }: any) => {
      return memoryDb.alerts.find((a) => a.id === where.id && a.userId === where.userId) || null;
    },
    create: async ({ data }: any) => {
      const alert = {
        id: `alert_${Date.now()}`,
        ...data,
        createdAt: new Date(),
      };
      memoryDb.alerts.push(alert);
      return alert;
    },
    update: async ({ where, data }: any) => {
      const idx = memoryDb.alerts.findIndex((a) => a.id === where.id);
      if (idx === -1) throw new Error("Alert not found");
      const updated = {
        ...memoryDb.alerts[idx],
        ...data,
      };
      memoryDb.alerts[idx] = updated;
      return updated;
    },
    delete: async ({ where }: any) => {
      const idx = memoryDb.alerts.findIndex((a) => a.id === where.id);
      if (idx !== -1) {
        memoryDb.alerts.splice(idx, 1);
      }
      return { id: where.id };
    },
  },
  notification: {
    findMany: async ({ where }: any) => {
      return memoryDb.notifications.filter((n) => n.userId === where.userId);
    },
    findFirst: async ({ where }: any) => {
      return memoryDb.notifications.find((n) => n.id === where.id && n.userId === where.userId) || null;
    },
    create: async ({ data }: any) => {
      const notif = {
        id: `notif_${Date.now()}`,
        ...data,
        createdAt: new Date(),
        isRead: data.isRead || false,
      };
      memoryDb.notifications.push(notif);
      return notif;
    },
    update: async ({ where, data }: any) => {
      const idx = memoryDb.notifications.findIndex((n) => n.id === where.id);
      if (idx === -1) throw new Error("Notification not found");
      const updated = {
        ...memoryDb.notifications[idx],
        ...data,
      };
      memoryDb.notifications[idx] = updated;
      return updated;
    },
  },
  setting: {
    upsert: async ({ where, update, create }: any) => {
      const idx = memoryDb.settings.findIndex((s) => s.userId === where.userId);
      if (idx === -1) {
        const item = { id: `set_${Date.now()}`, userId: where.userId, ...create };
        memoryDb.settings.push(item);
        return item;
      }
      const updated = { ...memoryDb.settings[idx], ...update };
      memoryDb.settings[idx] = updated;
      return updated;
    },
  },
  userApiKey: {
    findMany: async ({ where }: any) => {
      return memoryDb.userApiKeys.filter((k) => k.userId === where.userId);
    },
    create: async ({ data }: any) => {
      const key = { id: `key_${Date.now()}`, ...data, createdAt: new Date() };
      memoryDb.userApiKeys.push(key);
      return key;
    },
    deleteMany: async ({ where }: any) => {
      const lenBefore = memoryDb.userApiKeys.length;
      memoryDb.userApiKeys = memoryDb.userApiKeys.filter(
        (k) => !(k.userId === where.userId && k.provider === where.provider)
      );
      return { count: lenBefore - memoryDb.userApiKeys.length };
    },
  },
  news: {
    findMany: async ({ where, take = 5 }: any) => {
      let list = memoryDb.news;
      if (where?.OR) {
        list = list.filter((n) =>
          where.OR.some((cond: any) => {
            if (cond.headline?.contains) {
              return n.headline.toLowerCase().includes(cond.headline.contains.toLowerCase());
            }
            if (cond.summary?.contains) {
              return n.summary.toLowerCase().includes(cond.summary.contains.toLowerCase());
            }
            return false;
          })
        );
      }
      return list.slice(0, take);
    },
  },
  userProfile: {
    findUnique: async ({ where }: any) => {
      return memoryDb.userProfiles.find((p) => p.userId === where.userId) || null;
    },
    findUniqueOrThrow: async ({ where }: any) => {
      const p = memoryDb.userProfiles.find((p) => p.userId === where.userId);
      if (!p) throw new Error("UserProfile not found");
      return p;
    },
    upsert: async ({ where, update, create }: any) => {
      const idx = memoryDb.userProfiles.findIndex((p) => p.userId === where.userId);
      if (idx === -1) {
        const profile = { id: `p_${Date.now()}`, ...create, updatedAt: new Date() };
        memoryDb.userProfiles.push(profile);
        return profile;
      }
      const updated = { ...memoryDb.userProfiles[idx], ...update, updatedAt: new Date() };
      memoryDb.userProfiles[idx] = updated;
      return updated;
    },
    update: async ({ where, data }: any) => {
      const idx = memoryDb.userProfiles.findIndex((p) => p.userId === where.userId);
      if (idx === -1) throw new Error("UserProfile not found");
      const updated = { ...memoryDb.userProfiles[idx], ...data, updatedAt: new Date() };
      memoryDb.userProfiles[idx] = updated;
      return updated;
    },
  },
  conversationMemory: {
    findFirst: async ({ where }: any) => {
      return memoryDb.conversationMemory.find((m) => m.userId === where.userId && (where.role ? m.role === where.role : true) && (where.chatId ? m.chatId === where.chatId : true)) || null;
    },
    findMany: async ({ where }: any) => {
      return memoryDb.conversationMemory.filter((m) => m.userId === where.userId);
    },
    create: async ({ data }: any) => {
      const item = { id: `m_${Date.now()}`, ...data, createdAt: new Date() };
      memoryDb.conversationMemory.push(item);
      return item;
    },
    createMany: async ({ data }: any) => {
      const items = (Array.isArray(data) ? data : [data]).map((item: any) => ({
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        ...item,
        createdAt: new Date(),
      }));
      memoryDb.conversationMemory.push(...items);
      return { count: items.length };
    },
    update: async ({ where, data }: any) => {
      const idx = memoryDb.conversationMemory.findIndex((m) => m.id === where.id);
      if (idx === -1) throw new Error("Memory not found");
      const updated = { ...memoryDb.conversationMemory[idx], ...data };
      memoryDb.conversationMemory[idx] = updated;
      return updated;
    },
  },
  behavioralEvent: {
    findMany: async ({ where }: any) => {
      return memoryDb.behavioralEvents.filter((e) => e.userId === where.userId);
    },
    findFirst: async ({ where }: any) => {
      return memoryDb.behavioralEvents.find((e) => e.userId === where.userId && (where.eventType ? e.eventType === where.eventType : true)) || null;
    },
    create: async ({ data }: any) => {
      const item = { id: `be_${Date.now()}`, ...data, createdAt: new Date() };
      memoryDb.behavioralEvents.push(item);
      return item;
    },
    createMany: async ({ data }: any) => {
      const items = (Array.isArray(data) ? data : [data]).map((item: any) => ({
        id: `be_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        ...item,
        createdAt: new Date(),
      }));
      memoryDb.behavioralEvents.push(...items);
      return { count: items.length };
    },
  },
  journalEntry: {
    findMany: async ({ where, orderBy, take = 20 }: any) => {
      let list = memoryDb.journalEntries.filter((j: any) => j.userId === where.userId);
      if (orderBy?.createdAt === "desc") {
        list = [...list].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return list.slice(0, take);
    },
    count: async ({ where }: any) => {
      return memoryDb.journalEntries.filter((j: any) => j.userId === where.userId).length;
    },
    findFirst: async ({ where }: any) => {
      return memoryDb.journalEntries.find((j: any) => j.id === where.id && j.userId === where.userId) || null;
    },
    create: async ({ data }: any) => {
      const entry = {
        id: `j_${Date.now()}`,
        ...data,
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date(),
      };
      memoryDb.journalEntries.push(entry);
      return entry;
    },
    createMany: async ({ data }: any) => {
      const items = (Array.isArray(data) ? data : [data]).map((item: any) => ({
        id: `j_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        ...item,
        createdAt: item.createdAt || new Date(),
        updatedAt: new Date(),
      }));
      memoryDb.journalEntries.push(...items);
      return { count: items.length };
    },
    update: async ({ where, data }: any) => {
      const idx = memoryDb.journalEntries.findIndex((j: any) => j.id === where.id);
      if (idx === -1) throw new Error("JournalEntry not found");
      const updated = { ...memoryDb.journalEntries[idx], ...data, updatedAt: new Date() };
      memoryDb.journalEntries[idx] = updated;
      return updated;
    },
    delete: async ({ where }: any) => {
      const idx = memoryDb.journalEntries.findIndex((j: any) => j.id === where.id);
      if (idx !== -1) memoryDb.journalEntries.splice(idx, 1);
      return { id: where.id };
    },
  },
  featureFlag: {
    findMany: async () => {
      return [...(memoryDb as any).featureFlags || []];
    },
    findFirst: async ({ where }: any) => {
      return ((memoryDb as any).featureFlags || []).find((f: any) => f.key === where.key) || null;
    },
    create: async ({ data }: any) => {
      const flag = { id: `ff_${Date.now()}`, ...data, updatedAt: new Date() };
      if (!(memoryDb as any).featureFlags) (memoryDb as any).featureFlags = [];
      (memoryDb as any).featureFlags.push(flag);
      return flag;
    },
    createMany: async ({ data }: any) => {
      const items = (Array.isArray(data) ? data : [data]).map((item: any) => ({
        id: `ff_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        ...item,
        updatedAt: new Date(),
      }));
      if (!(memoryDb as any).featureFlags) (memoryDb as any).featureFlags = [];
      (memoryDb as any).featureFlags.push(...items);
      return { count: items.length };
    },
    update: async ({ where, data }: any) => {
      const flags = (memoryDb as any).featureFlags || [];
      const idx = flags.findIndex((f: any) => f.key === where.key);
      if (idx === -1) throw new Error("FeatureFlag not found");
      flags[idx] = { ...flags[idx], ...data, updatedAt: new Date() };
      return flags[idx];
    },
  },
};


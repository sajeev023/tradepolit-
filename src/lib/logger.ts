/**
 * src/lib/logger.ts
 *
 * Structured JSON logging with request trace IDs.
 *
 * Replaces ad-hoc console.log/error calls in API routes with a uniform
 * shape that Vercel Log Drains (or any aggregator) can parse and query:
 *
 *   { ts, level, route, traceId, msg, ...fields }
 *
 * traceId: generated per-request (crypto random, 12 hex chars) and
 * propagated through the request lifecycle. Correlates a user-visible
 * error with the exact log trail that produced it.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function minLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug")).toLowerCase();
  return (env in LEVEL_ORDER ? env : "info") as LogLevel;
}

export function newTraceId(): string {
  return globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 12) ?? `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`;
}

function emit(level: LogLevel, route: string, traceId: string, msg: string, fields?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel()]) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    route,
    traceId,
    msg,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Request-scoped logger. Create at the top of a route handler. */
export class Logger {
  constructor(
    private readonly route: string,
    private readonly traceId: string = newTraceId()
  ) {}

  child(route: string): Logger {
    return new Logger(`${this.route}:${route}`, this.traceId);
  }

  debug(msg: string, fields?: Record<string, unknown>) { emit("debug", this.route, this.traceId, msg, fields); }
  info(msg: string, fields?: Record<string, unknown>) { emit("info", this.route, this.traceId, msg, fields); }
  warn(msg: string, fields?: Record<string, unknown>) { emit("warn", this.route, this.traceId, msg, fields); }
  error(msg: string, fields?: Record<string, unknown>) { emit("error", this.route, this.traceId, msg, fields); }

  /** Wrap a promise; logs duration + outcome; never swallows errors. */
  async timed<T>(label: string, fn: () => Promise<T>, fields?: Record<string, unknown>): Promise<T> {
    const t0 = Date.now();
    try {
      const result = await fn();
      this.debug(`${label} ok`, { ...fields, ms: Date.now() - t0 });
      return result;
    } catch (err) {
      this.error(`${label} failed`, {
        ...fields,
        ms: Date.now() - t0,
        err: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

/** Convenience for one-off structured logs outside a Logger instance. */
export function log(level: LogLevel, route: string, msg: string, fields?: Record<string, unknown>) {
  emit(level, route, "-", msg, fields);
}
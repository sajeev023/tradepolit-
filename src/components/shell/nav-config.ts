import {
  Gauge,
  CandlestickChart,
  Eye,
  Newspaper,
  Target,
  BookOpen,
  Calculator,
  FlaskConical,
  Bell,
  Sparkles,
  BarChart3,
  Activity,
  type LucideIcon,
} from "lucide-react";

export interface NavEntry {
  label: string;
  /** Short label used under the rail icon (â‰¤ 7 chars). */
  short: string;
  href: string;
  icon: LucideIcon;
  /** Page title shown in the horizon bar. */
  title: string;
}

export interface NavGroup {
  id: string;
  entries: NavEntry[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "now",
    entries: [
      { label: "Cockpit", short: "Cockpit", href: "/dashboard", icon: Gauge, title: "Cockpit" },
      { label: "Markets", short: "Markets", href: "/charts", icon: CandlestickChart, title: "Markets" },
      { label: "Watchlist", short: "Watch", href: "/watchlist", icon: Eye, title: "Watchlist" },
      { label: "News", short: "News", href: "/news", icon: Newspaper, title: "News" },
      { label: "Market Pulse", short: "Pulse", href: "/market-pulse", icon: Activity, title: "Market pulse" },
    ],
  },
  {
    id: "process",
    entries: [
      { label: "Theses", short: "Theses", href: "/theses", icon: Target, title: "Theses" },
      { label: "Journal", short: "Journal", href: "/journal", icon: BookOpen, title: "Journal" },
      { label: "Risk Calculator", short: "Risk", href: "/risk-calculator", icon: Calculator, title: "Risk" },
      { label: "Backtester", short: "Test", href: "/backtester", icon: FlaskConical, title: "Backtester" },
      { label: "Alerts", short: "Alerts", href: "/alerts", icon: Bell, title: "Alerts" },
    ],
  },
  {
    id: "mind",
    entries: [
      { label: "Your Patterns", short: "Patterns", href: "/patterns", icon: Sparkles, title: "Patterns" },
      { label: "Analytics", short: "Stats", href: "/analytics", icon: BarChart3, title: "Analytics" },
    ],
  },
];

export const ALL_NAV = NAV_GROUPS.flatMap((g) => g.entries);

export function titleForPath(pathname: string): string {
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/admin")) return "Admin";
  return ALL_NAV.find((n) => pathname.startsWith(n.href))?.title ?? "TradePilot";
}


"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, ChevronRight, RefreshCw, Clock, Globe, ExternalLink } from "lucide-react";
import { Chip, EmptyState, Label, Skeleton } from "@/components/fd/primitives";
import type { NewsStory } from "@/lib/news";
import { SYMBOLS } from "@/lib/market-registry";

// News filter tabs — driven by the market registry so new markets appear
// automatically. "ALL" is prepended for the unfiltered view.
const FILTER_ASSETS = ["ALL", ...SYMBOLS];

export default function NewsPage() {
  const [selectedAsset, setSelectedAsset] = useState("ALL");
  const [page, setPage] = useState(1);
  const [stories, setStories] = useState<NewsStory[]>([]);
  const [countdown, setCountdown] = useState(60);

  const [renderTime, setRenderTime] = useState(0);
  useEffect(() => {
    setRenderTime(Date.now());
    const id = setInterval(() => setRenderTime(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  // Fetch news
  const { data: fetchedData, isLoading, refetch, isFetching, error } = useQuery<NewsStory[]>({
    queryKey: ["news", selectedAsset, page],
    queryFn: async () => {
      let url = `/api/v1/news?page=${page}&limit=12`;
      if (selectedAsset !== "ALL") {
        url += `&symbol=${encodeURIComponent(selectedAsset)}`;
      }
      const res = await fetch(url);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load news");
      return body.data;
    },
    refetchOnWindowFocus: false,
  });

  // Handle appending/clearing
  useEffect(() => {
    if (!fetchedData) return;

    if (page === 1) {
      setStories(fetchedData);
    } else {
      setStories((prev) => {
        const combined = [...prev, ...fetchedData];
        const seen = new Set();
        return combined.filter((s) => {
          if (seen.has(s.url)) return false;
          seen.add(s.url);
          return true;
        });
      });
    }
  }, [fetchedData, page]);

  // Reset when asset changes
  const handleAssetChange = (asset: string) => {
    setSelectedAsset(asset);
    setPage(1);
    setStories([]);
    setCountdown(60);
  };

  // 60-second auto refresh (only for page 1)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (page === 1) {
            refetch();
          }
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [page, refetch]);

  const handleManualRefresh = () => {
    if (page === 1) {
      refetch();
    } else {
      setPage(1);
      setStories([]);
    }
    setCountdown(60);
  };

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  const sentimentChip = (label: string = "Neutral", confidence: number = 0.5) => {
    const pct = (confidence * 100).toFixed(0);
    if (label === "Bullish") return <Chip tone="gain">▲ Bullish {pct}%</Chip>;
    if (label === "Bearish") return <Chip tone="loss">▼ Bearish {pct}%</Chip>;
    return <Chip>Neutral</Chip>;
  };

  const impactChip = (impact: string = "Low") => {
    if (impact === "High") return <Chip tone="warn" dot>High impact</Chip>;
    if (impact === "Medium") return <Chip tone="signal">Medium impact</Chip>;
    return <Chip>Low impact</Chip>;
  };

  const formatPublishTime = (dateStr: string, now: number) => {
    try {
      const date = new Date(dateStr);
      if (!now) return date.toLocaleDateString([], { month: "short", day: "numeric" });
      const diffMins = Math.floor((now - date.getTime()) / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch (_) {
      return "Recently";
    }
  };

  const renderMeta = (story: NewsStory) => (
    <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--color-text-tertiary)]">
      <span className="flex min-w-0 items-center gap-1.5">
        {story.sourceLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.sourceLogo} alt={story.publisher} className="h-3.5 w-3.5 rounded-sm object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <Globe size={11} className="text-[var(--color-text-quaternary)]" />
        )}
        <span className="truncate font-mono uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">{story.publisher}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 font-mono"><Clock size={10} />{formatPublishTime(story.publishedAt, renderTime)}</span>
    </div>
  );

  const renderTags = (story: NewsStory) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {sentimentChip(story.sentimentLabel, story.sentimentConfidence)}
      {impactChip(story.impactScore)}
      {story.isCached && <Chip>Offline DB</Chip>}
      {story.affectedAssets.map((asset) => (
        <button key={asset} onClick={() => handleAssetChange(asset)} className="cursor-pointer rounded px-1.5 py-[3px] font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--accent)]" style={{ boxShadow: "inset 0 0 0 1px var(--hairline)" }}>
          {asset}
        </button>
      ))}
    </div>
  );

  const [lead, ...rest] = stories;

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 lg:gap-8">
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="flex items-center gap-2"><span className="live-dot" style={{ width: 5, height: 5 }} /><Label>Live wire · refreshes in {countdown}s</Label></p>
          <h1 className="mt-2 text-[var(--color-text-primary)]">
            The wire, <em className="text-[var(--accent)]">in context.</em>
          </h1>
          <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-[var(--color-text-tertiary)]">
            Aggregated headlines mapped to the markets on your charts, with sentiment and impact.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {page > 1 && <Label>Page {page}</Label>}
          <button onClick={handleManualRefresh} disabled={isLoading || isFetching} className="btn-secondary">
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} /> Sync wire
          </button>
        </div>
      </header>

      <div role="tablist" aria-label="Market filter" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {FILTER_ASSETS.map((asset) => {
          const on = selectedAsset === asset;
          return (
            <button
              key={asset}
              role="tab"
              aria-selected={on}
              onClick={() => handleAssetChange(asset)}
              className="h-8 shrink-0 cursor-pointer rounded-lg px-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] transition-colors"
              style={{ background: on ? "var(--accent)" : "transparent", color: on ? "var(--on-accent)" : "var(--color-text-tertiary)", boxShadow: on ? "none" : "inset 0 0 0 1px var(--hairline)" }}
            >
              {asset === "ALL" ? "All wire" : asset}
            </button>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4" style={{ borderColor: "rgba(var(--red-rgb),0.3)", background: "var(--color-loss-bg)" }}>
          <p className="text-[13px] text-[var(--color-loss)]">Unable to load market news. Please try again shortly.</p>
          <button onClick={() => refetch()} className="btn-secondary btn-sm">Retry</button>
        </div>
      )}

      {isLoading && stories.length === 0 ? (
        <div className="space-y-4">
          <Skeleton className="h-[300px] w-full" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[110px] w-full" />)}
        </div>
      ) : stories.length === 0 ? (
        <div className="card p-8 sm:p-12">
          <EmptyState
            icon={<Newspaper size={18} />}
            title="Nothing on the wire"
            body={`No news available for ${selectedAsset === "ALL" ? "any market" : selectedAsset} from verified providers right now.`}
            action={<button onClick={() => refetch()} className="btn-secondary btn-sm">Retry</button>}
          />
        </div>
      ) : (
        <div className="space-y-4 lg:space-y-5">
          {lead && (
            <article className="card overflow-hidden md:grid md:grid-cols-[1.1fr_1fr]">
              {lead.image && (
                <div className="relative h-52 overflow-hidden md:h-auto" style={{ background: "var(--panel-2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lead.image} alt={lead.title} loading="lazy" className="h-full w-full object-cover opacity-90 transition-transform duration-500 hover:scale-[1.03]" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                </div>
              )}
              <div className={`flex flex-col justify-between gap-5 p-5 sm:p-7 ${lead.image ? "" : "md:col-span-2"}`}>
                <div>
                  {renderMeta(lead)}
                  <h2 className="mt-4 font-serif text-[28px] leading-[1.08] tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[34px]">{lead.title}</h2>
                  <p className="mt-3 line-clamp-4 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{lead.summary}</p>
                </div>
                <div className="space-y-4">
                  {renderTags(lead)}
                  <a href={lead.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--accent)] transition-opacity hover:opacity-70">
                    Read the story <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </article>
          )}

          <ul className="card divide-y divide-[var(--hairline)]">
            {rest.map((story) => (
              <li key={story.id}>
                <article className="grid gap-4 p-5 transition-colors hover:bg-[var(--color-bg-hover)] sm:grid-cols-[1fr_auto] sm:p-6">
                  <div className="min-w-0 space-y-3">
                    {renderMeta(story)}
                    <a href={story.url} target="_blank" rel="noreferrer" className="group block">
                      <h2 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--accent)]">{story.title}</h2>
                      <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[var(--color-text-tertiary)]">{story.summary}</p>
                    </a>
                    {renderTags(story)}
                  </div>
                  {story.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={story.image} alt="" loading="lazy" className="hidden h-24 w-36 rounded-lg object-cover opacity-85 sm:block" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  )}
                </article>
              </li>
            ))}
          </ul>

          <div className="flex justify-center pb-6 pt-2">
            <button onClick={handleLoadMore} disabled={isLoading || isFetching} className="btn-secondary btn-lg">
              {isFetching ? <><RefreshCw size={13} className="animate-spin" /> Loading…</> : <>Load next segment <ChevronRight size={13} /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

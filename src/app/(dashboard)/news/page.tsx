"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Newspaper, 
  ChevronRight, 
  Flame, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  Globe, 
  ExternalLink,
  Layers
} from "lucide-react";
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

  const getSentimentBadge = (label: string = "Neutral", confidence: number = 0.5) => {
    const pct = (confidence * 100).toFixed(0);
    if (label === "Bullish") {
      return (
        <span className="badge badge-success">
          <TrendingUp size={10} /> Bullish ({pct}%)
        </span>
      );
    }
    if (label === "Bearish") {
      return (
        <span className="badge badge-danger">
          <TrendingDown size={10} /> Bearish ({pct}%)
        </span>
      );
    }
    return (
      <span className="badge badge-neutral">
        <Minus size={10} /> Neutral
      </span>
    );
  };

  const getImpactBadge = (impact: string = "Low") => {
    if (impact === "High") {
      return (
        <span className="badge badge-warning animate-pulse">
          <Flame size={10} /> High Impact
        </span>
      );
    }
    if (impact === "Medium") {
      return (
        <span className="badge badge-info">
          Medium Impact
        </span>
      );
    }
    return (
      <span className="badge badge-neutral">
        Low Impact
      </span>
    );
  };

  const formatPublishTime = (dateStr: string, now: number) => {
    try {
      const date = new Date(dateStr);
      if (!now) return date.toLocaleDateString([], { month: "short", day: "numeric" });
      const diffMs = now - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch (_) {
      return "Recently";
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto p-4 md:p-6">
      {/* Bloomberg Terminal Style Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-[var(--color-border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="live-dot live-dot--green" />
            <span className="text-[10px] uppercase font-bold tracking-widest pos">Live Wire Feed</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1" style={{ color: "var(--color-text-primary)" }}>
            Market Intelligence Terminal
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
            Aggregated institutional wire feed matching exact charts telemetry. Auto-updates in <span className="font-mono pos font-semibold">{countdown}s</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {page > 1 && (
            <span className="text-xs text-[var(--color-text-tertiary)] mr-2 font-mono">
              Page {page}
            </span>
          )}
          <button
            onClick={handleManualRefresh}
            disabled={isLoading || isFetching}
            className="btn-secondary text-xs flex items-center gap-2 px-4 py-2 border rounded-lg transition-all"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-subtle)",
              color: "var(--color-text-secondary)"
            }}
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin text-[var(--color-profit)]" : ""} />
            Sync Wire
          </button>
        </div>
      </div>

      {/* Asset filter tags */}
      <div className="flex flex-wrap gap-2 items-center">
        {FILTER_ASSETS.map((asset) => (
          <button
            key={asset}
            onClick={() => handleAssetChange(asset)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border"
            style={{
              backgroundColor: selectedAsset === asset ? "var(--color-accent-primary-muted)" : "var(--color-bg-secondary)",
              borderColor: selectedAsset === asset ? "var(--color-accent-primary)" : "var(--color-border-subtle)",
              color: selectedAsset === asset ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
            }}
            onMouseEnter={(e) => {
              if (selectedAsset !== asset) e.currentTarget.style.borderColor = "var(--color-border-default)";
            }}
            onMouseLeave={(e) => {
              if (selectedAsset !== asset) e.currentTarget.style.borderColor = "var(--color-border-subtle)";
            }}
          >
            {asset === "ALL" ? "All Wire" : asset}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="card p-6 text-center flex flex-col items-center justify-center rounded-xl" style={{ borderColor: "rgba(255, 107, 107, 0.22)", backgroundColor: "var(--color-loss-bg)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--color-loss)" }}>Unable to load market news</p>
          <p className="text-xs mt-1 text-[var(--color-text-tertiary)]">Please try again shortly.</p>
          <button
            onClick={() => refetch()}
            className="btn-secondary btn-sm mt-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletal state */}
      {isLoading && stories.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 border border-[var(--color-border-subtle)] rounded-xl animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 bg-[var(--color-bg-tertiary)] rounded" />
                <div className="h-4 w-12 bg-[var(--color-bg-tertiary)] rounded" />
              </div>
              <div className="h-10 bg-[var(--color-bg-tertiary)] rounded w-full" />
              <div className="h-16 bg-[var(--color-bg-tertiary)] rounded w-full" />
              <div className="h-4 bg-[var(--color-bg-tertiary)] rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : stories.length === 0 ? (
        /* Empty State */
        <div className="card py-20 text-center flex flex-col items-center justify-center rounded-xl border border-[var(--color-border-subtle)]">
          <Newspaper size={40} className="text-[var(--color-text-quaternary)] mb-3" />
          <p className="text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
            Unable to load market news. Please try again shortly.
          </p>
          <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: "var(--color-text-tertiary)" }}>
            No news available for {selectedAsset === "ALL" ? "any asset" : selectedAsset} from verified providers.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-1.5 bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)] text-xs font-bold rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        /* News Feed Grid */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <div 
                key={story.id} 
                className="card border rounded-xl overflow-hidden flex flex-col justify-between hover:border-[var(--color-border-default)] transition-all bg-[var(--color-bg-secondary)]"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                {/* News Image Header */}
                {story.image && (
                  <div className="h-40 w-full relative overflow-hidden bg-[var(--color-bg-deepest)] border-b border-[var(--color-border-subtle)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={story.image}
                      alt={story.title}
                      loading="lazy"
                      className="w-full h-full object-cover opacity-85 hover:opacity-100 hover:scale-105 transition-all duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Source and Time */}
                    <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)]">
                      <div className="flex items-center gap-1.5">
                        {story.sourceLogo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={story.sourceLogo}
                            alt={story.publisher} 
                            className="w-3.5 h-3.5 rounded-sm object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <Globe size={11} className="text-[var(--color-text-quaternary)]" />
                        )}
                        <span className="font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                          {story.publisher}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock size={10} />
                        {formatPublishTime(story.publishedAt, renderTime)}
                      </span>
                    </div>

                    {/* Headline */}
                    <h2 className="text-sm font-bold leading-snug mt-3 line-clamp-2 group-hover:text-[var(--color-accent-primary)] transition-colors" style={{ color: "var(--color-text-primary)" }}>
                      {story.title}
                    </h2>

                    {/* Summary */}
                    <p className="text-xs mt-2 line-clamp-3 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                      {story.summary}
                    </p>
                  </div>

                  {/* Badges & Actions footer */}
                  <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {getSentimentBadge(story.sentimentLabel, story.sentimentConfidence)}
                      {getImpactBadge(story.impactScore)}
                      {story.isCached && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-bg-deepest)] text-[var(--color-text-quaternary)] border border-[var(--color-border-subtle)]">
                          Offline DB
                        </span>
                      )}
                    </div>

                    <a
                      href={story.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold inline-flex items-center gap-1 text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)] transition-colors"
                    >
                      Read <ExternalLink size={10} />
                    </a>
                  </div>

                  {/* Affected asset tags (strict isolated tags) */}
                  {story.affectedAssets.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1.5">
                      <span className="text-[9px] text-[var(--color-text-tertiary)] flex items-center gap-0.5">
                        <Layers size={9} /> Mapped:
                      </span>
                      {story.affectedAssets.map((asset) => (
                        <button
                          key={asset}
                          onClick={() => handleAssetChange(asset)}
                          className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-[var(--color-bg-deepest)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] rounded transition-colors"
                        >
                          {asset}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Load More Pagination Trigger */}
          <div className="flex justify-center pt-8 pb-12">
            <button
              onClick={handleLoadMore}
              disabled={isLoading || isFetching}
              className="px-6 py-2.5 rounded-lg text-xs font-bold border hover:bg-[var(--color-bg-tertiary)] transition-all flex items-center gap-2"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                borderColor: "var(--color-border-subtle)",
                color: "var(--color-text-secondary)"
              }}
            >
              {isFetching ? (
                <>
                  <RefreshCw size={12} className="animate-spin text-[var(--color-profit)]" />
                  Loading wire segment...
                </>
              ) : (
                <>
                  Load Next segment
                  <ChevronRight size={12} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, memo, Profiler } from "react";
import { profiler } from "@/lib/performance-profiler";
import {
  X,
  Clock,
  Search,
  Trash2,
  MessageSquare,
  PlusCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface ChatSession {
  id: string;
  title: string;
  symbol: string | null;
  timeframe: string | null;
  preview: string;
  messageCount: number;
  updatedAt: string;
  createdAt: string;
}

interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  isAlert?: boolean;
  isStreaming?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeChatId: string | null;
  onSelectSession: (chatId: string, messages: ChatMessage[], symbol?: string | null, timeframe?: string | null) => void;
  onNewChat: () => void;
}

function ShimmerRow() {
  return (
    <div className="p-3.5 rounded-xl border border-[var(--color-border-subtle)] animate-pulse space-y-2">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 bg-[var(--color-bg-tertiary)] rounded" />
        <div className="h-3 w-12 bg-[var(--color-bg-tertiary)] rounded" />
      </div>
      <div className="h-3 w-full bg-[var(--color-bg-tertiary)] rounded" />
      <div className="h-3 w-3/4 bg-[var(--color-bg-tertiary)] rounded" />
    </div>
  );
}

export const ChatHistorySidebar = memo(function ChatHistorySidebar({ isOpen, onClose, activeChatId, onSelectSession, onNewChat }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/ai/chats");
      const body = await res.json();
      if (res.ok && body.data) {
        setSessions(body.data);
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchSessions();
  }, [isOpen, fetchSessions]);

  const handleSelectSession = async (session: ChatSession) => {
    try {
      const res = await fetch(`/api/v1/ai/chats/${session.id}`);
      const body = await res.json();
      if (res.ok && body.data) {
        const messages = Array.isArray(body.data.messages) ? body.data.messages : [];
        onSelectSession(session.id, messages as ChatMessage[], body.data.symbol, body.data.timeframe);
        onClose();
      }
    } catch (err) {
      toast.error("Failed to load conversation");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/v1/ai/chats/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
        toast.success("Conversation deleted");
        if (activeChatId === id) onNewChat();
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const filtered = sessions.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.symbol?.toLowerCase().includes(q) ?? false) ||
      s.preview.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q)
    );
  });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = diffMs / (1000 * 60 * 60);
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${Math.floor(diffH)}h ago`;
    if (diffH < 48) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <Profiler id="ChatHistorySidebar" onRender={(id, phase, actualDuration) => profiler.recordComponentRender(id, actualDuration)}>
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          width: "min(420px, 100vw)",
          backgroundColor: "var(--color-bg-secondary)",
          borderLeft: "1px solid var(--color-border-subtle)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 shrink-0 border-b border-[var(--color-border-subtle)]"
          style={{ height: "56px" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <Clock size={14} className="text-teal-400" />
            </div>
            <span className="text-sm font-bold text-[var(--color-text-primary)]">
              Chat History
            </span>
            {sessions.length > 0 && (
              <span className="text-[10px] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] px-1.5 py-0.5 rounded-full text-[var(--color-text-tertiary)] font-mono">
                {sessions.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-4 py-3 shrink-0 border-b border-[var(--color-border-subtle)]">
          <button
            onClick={() => { onNewChat(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 text-teal-400 text-xs font-semibold transition-all cursor-pointer"
          >
            <PlusCircle size={14} />
            New Chat Session
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 shrink-0 border-b border-[var(--color-border-subtle)]">
          <div className="relative flex items-center">
            <Search size={12} className="absolute left-3 text-[var(--color-text-quaternary)] pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by symbol or topic..."
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-quaternary)] outline-none focus:border-teal-500/40 transition-colors"
            />
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-1.5">
          {loading ? (
            <div className="space-y-1.5">
              {[1, 2, 3, 4, 5].map(i => <ShimmerRow key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-tertiary)] border border-dashed border-[var(--color-border-default)] flex items-center justify-center mb-4">
                <MessageSquare size={18} className="text-[var(--color-text-quaternary)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
                {search ? "No matches found" : "No conversations yet"}
              </p>
              <p className="text-xs text-[var(--color-text-quaternary)] max-w-[200px]">
                {search ? "Try a different symbol or keyword" : "Analyze a chart to start your first AI session"}
              </p>
            </div>
          ) : (
            filtered.map(session => {
              const isActive = session.id === activeChatId;
              const isConfirmDelete = confirmDeleteId === session.id;
              const isDeleting = deletingId === session.id;

              return (
                <div
                  key={session.id}
                  className={`group relative rounded-xl border transition-all duration-150 overflow-hidden ${
                    isActive
                      ? "border-teal-500/25 bg-teal-500/5"
                      : "border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-hover)]"
                  }`}
                >
                  <button
                    onClick={() => handleSelectSession(session)}
                    className="w-full text-left p-3.5 cursor-pointer"
                  >
                    {/* Top row: date + symbol */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-[var(--color-text-tertiary)] font-mono">
                        {formatDate(session.updatedAt)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {session.symbol && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] flex items-center gap-1">
                            <TrendingUp size={8} />
                            {session.symbol}
                          </span>
                        )}
                        {session.timeframe && (
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]">
                            {session.timeframe}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Preview text */}
                    <p className="text-xs leading-relaxed text-[var(--color-text-secondary)] line-clamp-2">
                      {session.preview}
                    </p>

                    {/* Message count */}
                    <div className="flex items-center gap-1 mt-1.5">
                      <MessageSquare size={9} className="text-[var(--color-text-quaternary)]" />
                      <span className="text-[9px] text-[var(--color-text-quaternary)] font-mono">
                        {session.messageCount} messages
                      </span>
                      {isActive && (
                        <span className="ml-auto text-[9px] text-teal-400 font-semibold">ACTIVE</span>
                      )}
                    </div>
                  </button>

                  {/* Delete button */}
                  {!isConfirmDelete ? (
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDeleteId(session.id); }}
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--color-text-quaternary)] hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Delete conversation"
                    >
                      <Trash2 size={11} />
                    </button>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm rounded-xl px-3">
                      <span className="text-[11px] text-[var(--color-text-secondary)] font-medium mr-1">Delete?</span>
                      <button
                        onClick={() => handleDelete(session.id)}
                        disabled={isDeleting}
                        className="px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-semibold hover:bg-rose-500/25 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isDeleting ? "..." : "Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] text-[11px] font-semibold hover:bg-[var(--color-bg-hover)] transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 shrink-0 text-center border-t border-[var(--color-border-subtle)]"
        >
          <p className="text-[10px] text-[var(--color-text-tertiary)]">
            Conversations auto-saved · Last 50 shown
          </p>
        </div>
      </div>
    </>
    </Profiler>
  );
});

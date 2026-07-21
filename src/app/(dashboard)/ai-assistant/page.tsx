"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Send, User, Trash2, Plus, MessageSquare, Loader2, Sparkles, Copy, Check, X } from "lucide-react";
import { toast } from "sonner";
import { LockedFeatureBanner } from "@/components/LockedFeatureBanner";
import { useIsDemoUser } from "@/hooks/useIsDemoUser";

const SUGGESTED_PROMPTS = [
  "Analyze my most recent losing trade.",
  "What is my biggest behavioral mistake?",
  "How can I improve my risk management?",
  "Review my win rate consistency."
];

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export default function AIAssistantPage() {
  const { isDemo } = useIsDemoUser();
  const queryClient = useQueryClient();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 0. Fetch trade count to gate empty state
  const { data: performanceResponse } = useQuery({
    queryKey: ["dashboard-performance"],
    queryFn: async () => {
      const res = await fetch("/api/v1/performance");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed");
      return body.data;
    },
  });
  const tradeCount = performanceResponse?.metrics?.totalTrades || 0;

  // 1. Fetch past chat sessions list
  const { data: chatsResponse, isLoading: listLoading } = useQuery({
    queryKey: ["ai-chats"],
    queryFn: async () => {
      const res = await fetch("/api/v1/ai/chats?limit=50");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load chats");
      return body.data;
    },
  });

  const chatSessions = chatsResponse || [];

  // 2. Fetch active chat details (includes messages list)
  const { data: activeChat } = useQuery({
    queryKey: ["ai-chat", activeChatId],
    queryFn: async () => {
      if (!activeChatId) return null;
      const res = await fetch(`/api/v1/ai/chats/${activeChatId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load chat details");
      return body.data;
    },
    enabled: !!activeChatId,
  });

  const messages: Message[] = useMemo(
    () => activeChat?.messages || [],
    [activeChat?.messages],
  );

  // Auto-scroll to bottom of message thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3. Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeChatId || undefined,
          message: messageText,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to send message");
      return body.data;
    },
    onSuccess: (data) => {
      setInputText("");
      // Force activeChatId to the resolved session ID if it was a new chat
      if (!activeChatId) {
        setActiveChatId(data.chat.id);
        queryClient.invalidateQueries({ queryKey: ["ai-chats"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["ai-chat", activeChatId] });
      }
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // 4. Delete session mutation
  const deleteChatMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/ai/chats/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to delete chat");
      return body.data;
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["ai-chats"] });
      if (activeChatId === deletedId) {
        setActiveChatId(null);
      }
      toast.success("Conversation deleted");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sendMutation.isPending) return;
    sendMutation.mutate(inputText.trim());
  };

  const handlePrompt = (prompt: string) => {
    setInputText(prompt);
  };

  const handleCopy = async (content: string, idx: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleStartNewChat = () => {
    setActiveChatId(null);
    setInputText("");
  };
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] gap-6 items-stretch relative">
      {isDemo && (
        <LockedFeatureBanner
          feature="chatHistory"
          title="AI Coach Chat History"
          description="Preview mode: Chat history is not saved. Create a free account to persist your AI Coach conversations."
        />
      )}

      {/* Mobile Sidebar backdrop */}
      {showMobileSidebar && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Chats List Sidebar */}
      <div
        className={`${
          showMobileSidebar ? "fixed inset-y-0 left-0 z-60 w-64 flex" : "hidden"
        } md:flex md:relative md:w-64 shrink-0 card flex-col justify-between overflow-hidden h-full`}
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          borderColor: "var(--color-border-subtle)"
        }}
      >
        <div className="p-4 border-b flex flex-col gap-3" style={{ borderColor: "var(--color-border-subtle)" }}>
          <div className="flex items-center justify-between md:hidden">
            <span className="text-xs font-bold text-[var(--color-text-primary)]">Conversations</span>
            <button onClick={() => setShowMobileSidebar(false)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <button
            onClick={isDemo ? undefined : () => { handleStartNewChat(); setShowMobileSidebar(false); }}
            disabled={isDemo}
            className="btn-primary w-full text-xs"
            style={{ opacity: isDemo ? 0.5 : 1, cursor: isDemo ? "not-allowed" : "pointer" }}
          >
            <Plus size={14} /> {isDemo ? "Create Free Account for Chat History" : "New Conversation"}
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {listLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-teal-400" size={18} />
            </div>
          ) : chatSessions.length === 0 ? (
            <div className="text-[11px] text-center py-10" style={{ color: "var(--color-text-tertiary)" }}>
              No past conversations.
            </div>
          ) : (
            chatSessions.map((session: any) => {
              const isActive = session.id === activeChatId;
              return (
                <div
                  key={session.id}
                  onClick={() => { setActiveChatId(session.id); setShowMobileSidebar(false); }}
                  className="flex items-center justify-between p-2 rounded-lg cursor-pointer group text-xs transition-colors"
                  style={{
                    backgroundColor: isActive ? "var(--color-bg-hover)" : "transparent",
                    color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div className="flex items-center gap-2 overflow-hidden w-full">
                    <MessageSquare size={12} className="shrink-0" />
                    <span className="truncate">{session.title}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this conversation?")) deleteChatMutation.mutate(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-950/20 text-rose-400 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Conversation Panel */}
      <div className="flex-1 card flex flex-col justify-between overflow-hidden h-full">
        {/* Banner header */}
        <div className="px-5 py-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--color-border-subtle)" }}>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white mr-1 min-h-[36px] min-w-[36px] flex items-center justify-center border border-zinc-800"
              aria-label="Toggle Conversations"
            >
              <MessageSquare size={14} />
            </button>
            <Bot size={16} className="text-teal-400" />
            <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
              AI Trading Discipline Coach
            </span>
          </div>
          <span className="badge badge-info text-[9px]">
            Active RAG-grounding
          </span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0E0E10]/40">
          {/* Static warning banner */}
          <div className="p-3 rounded-lg flex items-center gap-3 border border-teal-500/10 bg-teal-500/5 max-w-2xl mx-auto">
            <Sparkles size={16} className="text-teal-400 shrink-0" />
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              Every response is grounded in your journal logs and performance stats. Responses are purely for educational reviews, not financial advice.
            </p>
          </div>

          {messages.length === 0 && !sendMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-14 text-center max-w-md mx-auto">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: "var(--color-accent-primary-muted)" }}
              >
                <Bot size={22} style={{ color: "var(--color-accent-primary)" }} />
              </div>
              {tradeCount < 5 ? (
                <>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                    Log {5 - tradeCount} more trade{5 - tradeCount !== 1 ? 's' : ''} to unlock AI coaching
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-tertiary)" }}>
                    The AI Coach needs at least 5 closed trades to analyze your behavioral patterns and provide personalized feedback.
                  </p>
                  <div className="mt-4 px-4 py-2 rounded-lg border border-teal-500/20 bg-teal-500/5">
                    <p className="text-[11px] text-teal-400 font-medium">{tradeCount}/5 trades logged</p>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                    Start your behavioral review
                  </h3>
                  <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--color-text-tertiary)" }}>
                    Ask me about your patterns, or pick a suggested question:
                  </p>
                  <div className="flex flex-col gap-2 w-full max-w-sm">
                    {SUGGESTED_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePrompt(prompt)}
                        className="text-left text-xs px-3 py-2.5 rounded-lg border transition-colors"
                        style={{
                          borderColor: "var(--color-border-subtle)",
                          color: "var(--color-text-secondary)",
                          backgroundColor: "var(--color-bg-tertiary)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-accent-primary)";
                          e.currentTarget.style.color = "var(--color-accent-primary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-border-subtle)";
                          e.currentTarget.style.color = "var(--color-text-secondary)";
                        }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const isAI = msg.role === "assistant";
                return (
                  <div key={index} className={`flex gap-3 max-w-3xl ${isAI ? "" : "ml-auto flex-row-reverse"}`}>
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: isAI ? "var(--color-accent-primary-muted)" : "var(--color-bg-hover)",
                        borderColor: isAI ? "var(--color-accent-primary-muted)" : "var(--color-border-subtle)",
                      }}
                    >
                      {isAI ? (
                        <Bot size={16} style={{ color: "var(--color-accent-primary)" }} />
                      ) : (
                        <User size={16} style={{ color: "var(--color-text-secondary)" }} />
                      )}
                    </div>

                    {/* Speech bubble */}
                    <div
                      className={`p-3.5 rounded-xl text-sm leading-relaxed flex-1 ${
                        isAI
                          ? "bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]"
                          : "bg-teal-950/20 border border-teal-500/20 text-teal-100"
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.content}</div>
                      {isAI && (
                        <button
                          onClick={() => handleCopy(msg.content, index)}
                          className="mt-2 flex items-center gap-1 text-[10px] transition-colors"
                          style={{ color: copiedIdx === index ? "var(--color-accent-primary)" : "var(--color-text-tertiary)" }}
                        >
                          {copiedIdx === index ? <Check size={11} /> : <Copy size={11} />}
                          {copiedIdx === index ? "Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loader during pending mutation */}
              {sendMutation.isPending && (
                <div className="flex gap-3 max-w-2xl">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: "var(--color-accent-primary-muted)",
                      borderColor: "var(--color-accent-primary-muted)",
                    }}
                  >
                    <Bot size={16} style={{ color: "var(--color-accent-primary)" }} />
                  </div>
                  <div className="p-3 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-subtle)] flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-teal-400" />
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>AI Coach is reviewing your data...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t bg-[var(--color-bg-secondary)]" style={{ borderColor: "var(--color-border-subtle)" }}>
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={isDemo ? undefined : (e) => setInputText(e.target.value)}
              placeholder={isDemo ? "Create a free account to chat with the AI Coach" : "Ask the coach: 'Why did I lose on my EUR/USD trade?'"}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] transition-colors focus:border-teal-500/40"
              disabled={sendMutation.isPending || isDemo}
              style={{ opacity: isDemo ? 0.5 : 1, cursor: isDemo ? "not-allowed" : "text" }}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sendMutation.isPending || isDemo}
              className="btn-primary px-4"
              style={{ opacity: isDemo ? 0.5 : 1, cursor: isDemo ? "not-allowed" : "pointer" }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

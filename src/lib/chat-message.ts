/**
 * Shared shape and parser for AI chat messages persisted in the `AIChat.messages`
 * JSON column. The column is untyped `Json` at the Prisma boundary, so every read
 * site must narrow it through {@link parseChatMessages} rather than casting to
 * `any[]` — the latter silently let malformed/legacy rows inject untyped data
 * into responses and the prompt builder.
 *
 * Centralized here so the chat route, the session-list route, the latest-session
 * route, and the single-session route all share one definition of "a chat
 * message" (single source of truth — no duplicated ad-hoc shapes per route).
 */

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
};

/**
 * Narrow an arbitrary JSON value into a list of well-formed chat messages.
 * Drops any element that is not an object with a string `content` and a `role`,
 * so corrupt or legacy rows can never reach the model or the client as-is.
 */
export function parseChatMessages(json: unknown): ChatMessage[] {
  if (!Array.isArray(json)) return [];
  return json.filter((m): m is ChatMessage =>
    m != null &&
    typeof m === "object" &&
    "role" in m &&
    "content" in m &&
    typeof (m as { content: unknown }).content === "string"
  );
}
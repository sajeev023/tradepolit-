export interface SessionMemory {
  symbol: string;
  timeframe: string;
  lastIntent?: string;
  previousResponses: string[];
  discussionTopics: string[];
}

const sessionStore = new Map<string, SessionMemory>();

export function getSession(userId: string): SessionMemory {
  if (!sessionStore.has(userId)) {
    sessionStore.set(userId, {
      symbol: "BTC/USD",
      timeframe: "4h",
      previousResponses: [],
      discussionTopics: [],
    });
  }
  return sessionStore.get(userId)!;
}

export function updateSession(
  userId: string,
  updates: Partial<SessionMemory>
): SessionMemory {
  const session = getSession(userId);
  Object.assign(session, updates);
  return session;
}

export function addResponse(userId: string, response: string): void {
  const session = getSession(userId);
  session.previousResponses.push(response);
  if (session.previousResponses.length > 10) {
    session.previousResponses.shift();
  }
}

export function addTopic(userId: string, topic: string): void {
  const session = getSession(userId);
  if (!session.discussionTopics.includes(topic)) {
    session.discussionTopics.push(topic);
    if (session.discussionTopics.length > 10) {
      session.discussionTopics.shift();
    }
  }
}

export function formatSessionContext(userId: string): string {
  const session = getSession(userId);
  const parts: string[] = [];

  parts.push(`Current Discussion: ${session.symbol} on ${session.timeframe}`);

  if (session.lastIntent) {
    parts.push(`Previous Question Type: ${session.lastIntent}`);
  }

  if (session.discussionTopics.length > 0) {
    parts.push(
      `Topics Discussed: ${session.discussionTopics.slice(-3).join(", ")}`
    );
  }

  return parts.join(" | ");
}

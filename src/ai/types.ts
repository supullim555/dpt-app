// See src/ai/README.md before touching anything in this folder.

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  text: string;
};

/** What the client sends to api/chat.ts. */
export type ChatRequest = {
  /** Prior turns, oldest first, most recent last. Kept short server-side (see api/chat.ts). */
  history: ChatMessage[];
  /** The new thing the user just said. */
  message: string;
};

/** What api/chat.ts sends back. Exactly one of these shapes, never both. */
export type ChatResponse = { reply: string } | { error: string };

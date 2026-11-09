// See src/features/ai/README.md before touching anything in this folder.

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  text: string;
};

/** What the client sends to api/chat.ts. */
export type ChatRequest = {
  /** Prior turns, oldest first, most recent last. Kept short server-side (see api/chat.ts). */
  history: ChatMessage[];
  /** What the player just wrote. */
  message: string;
  /** The only mode left (v0.91): someone in the hospital answers. */
  mode: 'persona';
  /** For mode 'persona': who answers, by floor and map letter (src/features/visit/requests.ts). The server, not the
   * client, decides what that person is told. */
  persona: string;
};

/** What api/chat.ts sends back. Exactly one of these shapes, never both. */
export type ChatResponse = { reply: string } | { error: string };

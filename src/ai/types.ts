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
  /** The new thing the user just said. Required for mode 'chat', ignored for 'summarize'
   * (there, `history` itself is the whole conversation being summarized). */
  message?: string;
  /** 'chat' (default, omit this field) replies to `message` in character. 'summarize' instead
   * asks for a short, non-interpretive recap of `history` — see systemPrompt.ts's
   * SUMMARY_SYSTEM_PROMPT and memory.ts's recordAiSummary, the save-to-메모 feature this
   * exists for. */
  mode?: 'chat' | 'summarize';
};

/** What api/chat.ts sends back. Exactly one of these shapes, never both. */
export type ChatResponse = { reply: string } | { error: string };

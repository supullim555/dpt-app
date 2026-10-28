// See src/features/ai/README.md before touching anything in this folder.
import { AI_CHAT_ENDPOINT, AI_CHAT_UI_ENABLED } from './config';
import type { ChatMessage, ChatRequest, ChatResponse } from './types';
import { postJson } from '@/core/lib/http';

// Generous: a Gemini reply normally takes a few seconds, a summary of a long chat a bit more.
const RELAY_TIMEOUT_MS = 45_000;

/**
 * What a future screen would call. Talks to the server relay (api/chat.ts), never to Google
 * directly — see the README for why. Throws immediately if the client switch is off, so this
 * can be imported and even wired into a screen ahead of time without any risk of it firing.
 */
export async function sendChatMessage(history: ChatMessage[], message: string): Promise<string> {
  return callRelay({ history, message });
}

/**
 * Asks for a short, non-interpretive recap of a conversation — what AiChatScreen's "정리해서
 * 저장" button calls before handing the result to memory.ts's recordAiSummary. Uses the same
 * relay and the same on/off gate as sendChatMessage (AI_CHAT_UI_ENABLED); no separate switch,
 * since summarizing a conversation that already went to Gemini doesn't cross any new boundary.
 */
export async function summarizeChat(history: ChatMessage[]): Promise<string> {
  return callRelay({ history, mode: 'summarize' });
}

async function callRelay(body: ChatRequest): Promise<string> {
  if (!AI_CHAT_UI_ENABLED) {
    throw new Error('AI chat is not enabled (src/features/ai/config.ts: AI_CHAT_UI_ENABLED is false).');
  }

  // Timeout so a stalled relay surfaces as the screen's normal "지금은 답을 받을 수 없어요"
  // notice instead of leaving it on "듣고 있어요…" forever.
  const { ok, status, data } = await postJson<ChatResponse>(AI_CHAT_ENDPOINT, body, { timeoutMs: RELAY_TIMEOUT_MS });
  if (!data) throw new Error(`Chat relay returned a non-JSON response (HTTP ${status}).`);
  if (!ok || 'error' in data) {
    throw new Error('error' in data ? data.error : `Chat relay HTTP ${status}`);
  }
  return data.reply;
}

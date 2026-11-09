// See src/features/ai/README.md before touching anything in this folder.
import { AI_CHAT_ENDPOINT, AI_CHAT_UI_ENABLED } from './config';
import type { ChatMessage, ChatRequest, ChatResponse } from './types';
import { postJson } from '@/core/lib/http';

// Generous: a Gemini reply normally takes a few seconds.
const RELAY_TIMEOUT_MS = 45_000;

/**
 * 병문안: an answer from someone in the hospital to what the player wrote (src/features/visit/requests.ts). Who they
 * are and how they speak is set on the server; only their id, the conversation so far and the new message are sent.
 */
export async function sendPersonaMessage(persona: string, history: ChatMessage[], message: string): Promise<string> {
  return callRelay({ history, message, mode: 'persona', persona });
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

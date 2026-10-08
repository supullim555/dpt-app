// See src/ai/README.md before touching anything in this folder.
import { AI_CHAT_ENDPOINT, AI_CHAT_UI_ENABLED } from './config';
import type { ChatMessage, ChatRequest, ChatResponse } from './types';

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
    throw new Error('AI chat is not enabled (src/ai/config.ts: AI_CHAT_UI_ENABLED is false).');
  }

  const res = await fetch(AI_CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let json: ChatResponse;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Chat relay returned a non-JSON response (HTTP ${res.status}).`);
  }
  if (!res.ok || 'error' in json) {
    throw new Error('error' in json ? json.error : `Chat relay HTTP ${res.status}`);
  }
  return json.reply;
}

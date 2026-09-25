// See src/ai/README.md before touching anything in this folder.
import { AI_CHAT_ENDPOINT, AI_CHAT_UI_ENABLED } from './config';
import type { ChatMessage, ChatRequest, ChatResponse } from './types';

/**
 * What a future screen would call. Talks to the server relay (api/chat.ts), never to Google
 * directly — see the README for why. Throws immediately if the client switch is off, so this
 * can be imported and even wired into a screen ahead of time without any risk of it firing.
 */
export async function sendChatMessage(history: ChatMessage[], message: string): Promise<string> {
  if (!AI_CHAT_UI_ENABLED) {
    throw new Error('AI chat is not enabled (src/ai/config.ts: AI_CHAT_UI_ENABLED is false).');
  }

  const body: ChatRequest = { history, message };
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

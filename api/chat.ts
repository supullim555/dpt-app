// Vercel serverless function: POST /api/chat. See src/ai/README.md before touching this.
//
// The only place this feature's real Gemini API key would ever live — never ship it to the
// client (src/ai/chatClient.ts calls this endpoint, not Google, for exactly that reason).
//
// Requires BOTH to be set as this Vercel PROJECT's environment variables (dashboard, or
// `vercel env add <name>`):
//   - AI_CHAT_ENABLED = "true"
//   - GEMINI_API_KEY  = <a real key> — a separate variable from the one in .env.local, which
//     is a local-machine build-time file this function never reads.
// Without both, every request gets a 503 and nothing is called or billed. On the client side,
// this is additionally gated behind the user's own AI on/off choice (src/ai/preference.ts,
// asked once at launch in IntroGate) — two independent switches, same as AI_CHAT_UI_ENABLED
// vs. this server switch: a user deciding to turn AI on, and this deployment having a key
// configured at all, are separate facts.

import { SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT } from '../src/ai/systemPrompt';

export const config = { runtime: 'edge' };

type ChatMessage = { role: 'user' | 'assistant'; text: string };
type ChatRequest = { history?: ChatMessage[]; message?: string; mode?: 'chat' | 'summarize' };

// Keep in sync with src/ai/config.ts's AI_CHAT_MODEL. gemini-2.5-flash (tried first) returned
// HTTP 404 "no longer available to new users" for this project's key — Google's own error
// pointed to this one instead. Verified with one real generateContent call on 2026-10-08:
// HTTP 200, system_instruction honored (reply matched systemPrompt.ts's tone and didn't
// diagnose or advise), reply text at candidates[0].content.parts[0].text as expected. Re-check
// against the live catalogue (GET v1beta/models) before assuming this is still current later.
const MODEL = 'gemini-3.8-flash';
const MAX_HISTORY_TURNS = 20;
const MAX_MESSAGE_LENGTH = 2000;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  if (process.env.AI_CHAT_ENABLED !== 'true') {
    return json({ error: 'AI chat is not enabled.' }, 503);
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json({ error: 'Server is missing GEMINI_API_KEY.' }, 503);

  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const history = (body.history ?? []).slice(-MAX_HISTORY_TURNS);
  const toContent = (m: ChatMessage) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] });

  let systemPrompt: string;
  let contents: ReturnType<typeof toContent>[];

  if (body.mode === 'summarize') {
    // No new message — the whole point is to recap `history` itself. Needs at least one real
    // user turn, otherwise there's nothing to summarize (the chat's opening line is local UI
    // framing never sent as history in the first place — see AiChatScreen).
    if (!history.some((m) => m.role === 'user')) {
      return json({ error: 'Nothing to summarize yet.' }, 400);
    }
    systemPrompt = SUMMARY_SYSTEM_PROMPT;
    contents = history.map(toContent);
  } else {
    const message = body.message?.trim();
    if (!message) return json({ error: 'message is required.' }, 400);
    if (message.length > MAX_MESSAGE_LENGTH) return json({ error: 'message is too long.' }, 400);
    systemPrompt = SYSTEM_PROMPT;
    contents = [...history.map(toContent), { role: 'user', parts: [{ text: message }] }];
  }

  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      // system_instruction is a top-level sibling of contents in the v1beta REST API, not a
      // leading content part — confirmed against the current API, not assumed.
      body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents }),
    });
  } catch {
    return json({ error: 'Could not reach Gemini.' }, 502);
  }
  if (!res.ok) return json({ error: `Gemini HTTP ${res.status}` }, 502);

  const data = await res.json();
  const candidate = data?.candidates?.[0];

  // A safety block surfaces as a candidate with no content and a finishReason like "SAFETY" —
  // distinguished from a plain malformed response so the client can show something sensible
  // ("그 이야기는 여기서 다루기 어려워요" rather than a generic error) instead of the same message
  // for every failure. See the TODO this used to carry: this is the decision that resolves it.
  if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'PROHIBITED_CONTENT') {
    return json({ error: 'blocked' }, 200);
  }

  const reply = candidate?.content?.parts?.[0]?.text;
  if (typeof reply !== 'string') return json({ error: 'No reply text in the Gemini response.' }, 502);

  return json({ reply }, 200);
}

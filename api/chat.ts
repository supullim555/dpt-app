// Vercel serverless function: POST /api/chat. See src/features/ai/README.md before touching this.
//
// The only place this feature's real Gemini API key would ever live — never ship it to the
// client (src/features/ai/chatClient.ts calls this endpoint, not Google, for exactly that reason).
//
// Requires BOTH to be set as this Vercel PROJECT's environment variables (dashboard, or
// `vercel env add <name>`):
//   - AI_CHAT_ENABLED = "true"
//   - GEMINI_API_KEY  = <a real key> — a separate variable from the one in .env.local, which
//     is a local-machine build-time file this function never reads.
// Without both, every request gets a 503 and nothing is called or billed. On the client side,
// this is additionally gated behind the user's own AI on/off choice (src/features/ai/preference.ts,
// asked once at launch in IntroGate) — two independent switches, same as AI_CHAT_UI_ENABLED
// vs. this server switch: a user deciding to turn AI on, and this deployment having a key
// configured at all, are separate facts.

import { personaPrompt, REQUESTS } from '../src/features/visit/requests';

export const config = { runtime: 'edge' };

type ChatMessage = { role: 'user' | 'assistant'; text: string };
// v0.91: only the hospital's people answer here. The earlier app's free chat and summaries are gone with it, so
// this key can't be used as a general chatbot: who answers, and how, is always one of REQUESTS, set here.
type ChatRequest = { history?: ChatMessage[]; message?: string; mode?: 'persona'; persona?: string };

// Keep in sync with src/features/ai/config.ts's AI_CHAT_MODEL. Re-check against the live catalogue
// (GET v1beta/models) before assuming it's still current.
const MODEL = 'gemini-3.8-flash';
// A conversation with one person is short (the client keeps the last 12 turns); a longer one is cut here.
const MAX_HISTORY_TURNS = 12;
const MAX_HISTORY_TEXT = 600;
const MAX_MESSAGE_LENGTH = 1000;

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

  const who = REQUESTS.find((r) => r.who === body.persona);
  if (body.mode !== 'persona' || !who) return json({ error: 'Unknown persona.' }, 400);
  const message = body.message?.trim();
  if (!message) return json({ error: 'message is required.' }, 400);
  if (message.length > MAX_MESSAGE_LENGTH) return json({ error: 'message is too long.' }, 400);
  const history = (Array.isArray(body.history) ? body.history : [])
    .slice(-MAX_HISTORY_TURNS)
    .filter((m) => m && typeof m.text === 'string')
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text.slice(0, MAX_HISTORY_TEXT) }] }));
  const systemPrompt = personaPrompt(who);
  const contents = [...history, { role: 'user', parts: [{ text: message }] }];

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

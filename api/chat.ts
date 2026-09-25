// Vercel serverless function: POST /api/chat. See src/ai/README.md before touching this.
//
// The only place this feature's real Gemini API key would ever live — never ship it to the
// client (src/ai/chatClient.ts calls this endpoint, not Google, for exactly that reason).
//
// INERT until BOTH are set as this Vercel PROJECT's environment variables (dashboard, or
// `vercel env add <name>`) — neither has been set:
//   - AI_CHAT_ENABLED = "true"
//   - GEMINI_API_KEY  = <a real key> — a separate variable from the one in .env.local, which
//     is a local-machine build-time file this function never reads.
// Until both exist, every request gets a 503 and nothing is called or billed.

export const config = { runtime: 'edge' };

type ChatMessage = { role: 'user' | 'assistant'; text: string };
type ChatRequest = { history?: ChatMessage[]; message?: string };

// Keep in sync with src/ai/config.ts's AI_CHAT_MODEL. Re-check against the current Gemini
// model catalogue before enabling — unlike scripts/lib/gemini.js's image model, this one has
// never actually been called.
const MODEL = 'gemini-2.5-flash';
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
  const message = body.message?.trim();
  if (!message) return json({ error: 'message is required.' }, 400);
  if (message.length > MAX_MESSAGE_LENGTH) return json({ error: 'message is too long.' }, 400);

  // TODO before enabling for real:
  //  - Import and send SYSTEM_PROMPT (src/ai/systemPrompt.ts) — it isn't wired in below, this
  //    only assembles the turn history, on purpose (the prompt is a draft, not a decision).
  //  - Decide how the system prompt is actually delivered (a `system_instruction` field vs. a
  //    leading content part — check the current Gemini API docs, this repo's other Gemini
  //    calls in scripts/lib/gemini.js are for image generation and don't cover this).
  //  - Decide what a Gemini safety block should look like to the user (right now it just
  //    surfaces as a generic 502, which is not necessarily the right thing to show someone
  //    mid-conversation).
  const history = (body.history ?? []).slice(-MAX_HISTORY_TURNS);
  const contents = [
    ...history.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents }),
  });
  if (!res.ok) return json({ error: `Gemini HTTP ${res.status}` }, 502);

  const data = await res.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof reply !== 'string') return json({ error: 'No reply text in the Gemini response.' }, 502);

  return json({ reply }, 200);
}

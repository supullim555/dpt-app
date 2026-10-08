// See src/ai/README.md before touching anything in this folder.

/**
 * The client-side switch for the free-chat feature (§25, 2026-10-08). True means the screen and
 * its entry point exist in this build — it does NOT by itself mean any given user's messages
 * reach Gemini. Two more gates sit below this: api/chat.ts's own server-side switch
 * (AI_CHAT_ENABLED + GEMINI_API_KEY, a Vercel env var), and the per-user on/off choice made once
 * at launch in IntroGate (src/ai/preference.ts) — AiChatScreen only calls sendChatMessage when
 * that choice is 'on'. Three independent gates on purpose: shipping the code, this deployment
 * being able to spend money on Gemini at all, and one specific user wanting it, are three
 * different facts and each fails closed on its own.
 */
export const AI_CHAT_UI_ENABLED = true;

// Relative works from the web build (same origin as api/chat.ts). A native build has no
// implicit origin, so this would need to become an absolute URL (e.g.
// 'https://dpt-app-green.vercel.app/api/chat') before this is ever called from a native app —
// unhandled for now since no native build is planned yet.
export const AI_CHAT_ENDPOINT = '/api/chat';

// Keep this in sync with api/chat.ts's own MODEL constant — verified there with a real call
// on 2026-10-08 (gemini-2.5-flash turned out to be unavailable for this project's key; this
// is what Google's own error pointed to instead). Re-check both against the current Gemini
// model catalogue if this ever starts erroring — availability drifts over time.
export const AI_CHAT_MODEL = 'gemini-3.8-flash';

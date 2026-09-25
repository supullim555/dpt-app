// See src/ai/README.md before touching anything in this folder.

/**
 * The client-side switch for a future autonomous-conversation feature. Stays false — flipping
 * only this does nothing useful by itself, since api/chat.ts has its own separate switch that
 * also has to be turned on server-side. Two independent switches on purpose: enabling the UI
 * and enabling the thing that can read user text and spend money should each be a deliberate,
 * separately-reviewed step, not one accidental env var.
 */
export const AI_CHAT_UI_ENABLED = false;

// Relative works from the web build (same origin as api/chat.ts). A native build has no
// implicit origin, so this would need to become an absolute URL (e.g.
// 'https://dpt-app-green.vercel.app/api/chat') before this is ever called from a native app —
// unhandled for now since no native build is planned yet.
export const AI_CHAT_ENDPOINT = '/api/chat';

// Keep this in sync with api/chat.ts's own MODEL constant. Re-check both against the current
// Gemini model catalogue before ever enabling — model names and availability drift over time,
// and this one hasn't been verified against a live call the way scripts/lib/gemini.js's
// image model has.
export const AI_CHAT_MODEL = 'gemini-2.5-flash';

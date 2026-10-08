# AI chat scaffold — active (§25, 2026-10-08)

Prepared ahead of time per the user's 2026-09-23 request ("나중에 Gemini API 사용해서 자율적으로
대화하게 만들 수도 있으니까 그것도 고려해줘, 그 때 사용할 수 있게 세팅을 미리 전부다 만들어놔줘"),
then turned on per the 2026-10-08 request ("좀 더 진짜 상담하듯이 만들고 그걸 위해서 AI를 사용할
때는 제미나이 API를 사용해줘"). Now wired into a real screen: `AiChatScreen`, reached from a card
at the top of the "이야기" tab, shown only when the user has turned AI on.

## What's actually true now

1. `AI_CHAT_UI_ENABLED` in `config.ts` is `true` — the screen exists in this build.
2. `AI_CHAT_ENABLED=true` and a real `GEMINI_API_KEY` are set as this Vercel project's
   environment variables (dashboard, or `vercel env add <name>`) — separate from `.env.local`,
   which only exists on this machine and which Vercel functions never read.
3. §1 and §8's tension with a live model (noted below, and in `systemPrompt.ts`) was resolved by
   explicit user decision, not by this code: §1 was corrected to allow reflection without
   diagnosis (2026-10-01), and §8's "아무도 읽지 않아요" is disclosed as not applying to this one
   screen, directly in IntroGate's ai-choice step — the user sees that before ever turning AI on.
4. `AiChatScreen` calls `sendChatMessage` — gated per-message on the user's stored AI choice
   (`src/ai/preference.ts`), same gate the removed local-model version used.

Still true: a key embedded in the client bundle is never a secret, so `api/chat.ts` remains the
only place the real key lives — see "Why a server relay" below, unchanged.

## Layout

| File | What it is |
| :---- | :---- |
| `config.ts` | The client-side switch (`AI_CHAT_UI_ENABLED`, on) and the model name to use |
| `types.ts` | Shared request/response shapes |
| `chatClient.ts` | What `AiChatScreen` calls — refuses to run if the client switch is ever turned back off |
| `preference.ts` | Per-user AI on/off choice, asked once in IntroGate, read before every message is sent |
| `systemPrompt.ts` | The system prompt actually sent as `system_instruction` on every call |
| `../../screens/AiChatScreen.tsx` | The free-chat screen itself |
| `../../api/chat.ts` | The Vercel serverless relay holding the real API key — its own separate switch, refuses (503) unless explicitly enabled server-side |

## Why a server relay instead of calling Gemini straight from the app

The app ships as a static bundle to a browser (and, later, possibly a native build). Any key
embedded in that bundle is readable by anyone who opens dev tools — it cannot be a secret. The
relay in `api/chat.ts` is a Vercel serverless function; it is the only place the real
`GEMINI_API_KEY` would ever live. This mirrors why `scripts/lib/gemini.js`'s key never ships in
the app either — that one just never had to cross this boundary because it only runs on a
developer's machine at build time, not in the deployed app.

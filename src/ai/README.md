# AI chat scaffold — inert, not turned on

Prepared ahead of time per the user's 2026-09-23 request ("나중에 Gemini API 사용해서 자율적으로
대화하게 만들 수도 있으니까 그것도 고려해줘, 그 때 사용할 수 있게 세팅을 미리 전부다 만들어놔줘").
**Nothing here has been called.** No network request has been made, no API key has been added to
any deployment, and no screen in the app imports any of this yet.

## What "on" would require (none of this has been done)

1. `AI_CHAT_UI_ENABLED` in `config.ts` flipped to `true`.
2. `AI_CHAT_ENABLED=true` set in the **Vercel project's** environment variables (dashboard, or
   `vercel env add AI_CHAT_ENABLED`) — separate from anything in `.env.local`, which only exists
   on this machine and which Vercel functions never read.
3. `GEMINI_API_KEY` set there too, as its own Vercel env var (not reused from `.env.local`).
4. A decision on `심리지원_프로그램_계획서.md` §10 Q5 and the note in `systemPrompt.ts` — turning
   this on is a product/theory decision (§1's "해석하거나 답을 돌려주지 않는다" and §8's "이 기기
   에만 저장되고 아무도 읽지 않아요" both stop being simply true once a live model reads and
   replies to what the user writes), not just a technical switch.
5. Some UI that actually calls `sendChatMessage` — none exists yet.

## Layout

| File | What it is |
| :---- | :---- |
| `config.ts` | The client-side switch (`AI_CHAT_UI_ENABLED`, off) and the model name to use |
| `types.ts` | Shared request/response shapes |
| `chatClient.ts` | What a future screen would call — refuses to run while the switch is off |
| `systemPrompt.ts` | A draft system prompt, marked not-final |
| `../../api/chat.ts` | The Vercel serverless relay that would hold the real API key — its own separate switch, refuses (503) unless explicitly enabled server-side |

## Why a server relay instead of calling Gemini straight from the app

The app ships as a static bundle to a browser (and, later, possibly a native build). Any key
embedded in that bundle is readable by anyone who opens dev tools — it cannot be a secret. The
relay in `api/chat.ts` is a Vercel serverless function; it is the only place the real
`GEMINI_API_KEY` would ever live. This mirrors why `scripts/lib/gemini.js`'s key never ships in
the app either — that one just never had to cross this boundary because it only runs on a
developer's machine at build time, not in the deployed app.

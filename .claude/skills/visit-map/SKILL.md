---
name: visit-map
description: Orientation for the 병문안 game (C:\Users\user\Documents\DPT\app, src/features/visit) — where every part of the game lives, the saved state, the dev hooks, how loading is built, and the shell habits that waste time here. Read this first whenever a task touches the game (a bug, a feature, a screen, the 3D hospital, the story flow, settings, assets) instead of re-exploring the codebase, even for a "small" change.
---

# 병문안: where things are

The whole app is one game, `src/features/visit/` (App.tsx renders `VisitScreen`). Dialogue is human-written in
`script.ts`: never rewrite the story's lines unless asked. Plan and history: `docs/계획서.md`; art log:
`docs/병문안_모티브와_아트_구상.md`; map design: `docs/병원_지도.md`. Ship rules are in `CLAUDE.md` (see the visit-ship
skill).

## Files

| File | What it owns |
| --- | --- |
| `VisitScreen.tsx` | The story's phases (`notice → title → opening → door → walk → arrive → greet → tell → reply → emotion → ack → give/gift/memory → bye → staff → outside`, then `ending → notebook → fairy/descent`), the saved `VisitState`, `resume()`, the settings rows, the bedside panel (`below`). `fresh()` starts a new story keeping fontScale/sound/graphics. |
| `Hospital.tsx` | Walking UI on top of the 3D view: HUD (goal box, 사전·설정·지도 menu, minimap), panels (`map/lift/stairs/leave/tomorrow/settings/dictionary`, all covering the whole game), talks (`focused`), remembered places (`memory`), tutorial lessons, keyboard. |
| `hospitalScene.ts` | three.js scene, draw-on-demand. `preloadHospital()`, `createHospitalScene()`, `SOLIDS` (box furniture), shaders. three.js only via `threeKit.ts` (one async chunk). |
| `hospitalArt.ts` / `hospitalSheets.ts` | Sprite/tile rects on the 14 sheets in `public/hospital/sheets.webp`; `prefetchSheets()`/`loadSheets()` (decoded once per visit). `hospitalSheets.ts` is generated: don't edit. |
| `hospitalMap.ts` | Floor grids, key cells, goals, tutorial steps (`tutorialAfter`). |
| `places.ts` / `requests.ts` | Remembered places (floor 0) and the doctor's requests (one per day 1-6: river, rehab, beach, market, yard, night). |
| `progress.ts` / `girlDays.ts` | Clues, endings (`bad, letter, withGirl, normal, happy`), the girl's look per day. |
| `CardScene.tsx`, `Credits.tsx`, `Notebook.tsx`, `Dictionary.tsx`, `BreatheTogether.tsx`, `EmotionPicker.tsx`, `Opening.tsx` | Full-screen scenes and overlays. The memory CardScene is drawn over the room (Hospital stays mounted). |
| `sound.ts`, `cutscenes.ts` | Web Audio/`<audio>` sound; film URLs (`public/cutscenes/*.mp4?v=hash`). |
| `src/assets/visitUi.ts` | Comic/opening/card image barrels (`VISIT_MEMORY_COMICS`: panel i goes with `CLUE_TEXT[clue].lines[2 + i]`). |

Key cells (`hospitalMap.ts`): ENTRANCE `{floor 1, x0 y4 dir1}`, GUIDE_FRONT (5,5), SHOP_FRONT (10,2), LIFT_FRONT (4,2),
STAIRS_FRONT (6,2), floor 4: ROOM_ENTRY (7,6) (stand at (7,5) facing south, step in → her scene), GIRL_FRONT (7,8),
DOCTOR_FRONT (12,8), OUTSIDE_ROOM (7,4). Dir: 0 north, 1 east, 2 south, 3 west.

## Saved state and dev hooks

- localStorage key `dpt.visit.state` (prefix `dpt.` from `src/core/storage.ts`). Useful fields: `noticeSeen, openingSeen,
  tutorial:'done', run, startDate ('' → title says 이야기 시작; set → 이어하기), visited, done, told, ending, clues, gifts,
  fontScale (1 or 1.2), sound, graphics ('low'|'normal'|'high'), afterHappy`. Missing fields fall back to defaults.
- `?dev=1`: a dev bar (다음 날 · 7일 뒤 · 엔딩), `(시험)` jumps in the map panel, and `window.__visitJump({floor,x,y,dir})`,
  `window.__visitRemember(requestDay)` (floor 0 = the remembered place).
- Tap-through: the element with `aria-label="대화 넘기기"`. Menu buttons have aria-labels `사전`, `설정`, `지도`.

## Loading (keep it this way)

- First screen loads one bundle (`index-*.js`, ~0.8 MB). three.js + examples live in the `threeKit-*.js` async chunk.
  Importing anything from `three` outside `threeKit.ts` pulls it back into the first load — check `npm run build`'s
  "web bundles" list after touching 3D code.
- Title/opening prefetch the kit and `sheets.webp`; the day's black card (`door`) decodes them. Decoded sheets are
  module-cached; WebGL contexts are released in `dispose()`.
- Vercel caches `/_expo/static/*`, `/assets/*`, `/hospital/*`, `/cutscenes/*` for a year (all content-hashed);
  `index.html` is always revalidated.

## Habits that save time here

- Foreground `sleep N && …` is blocked: start long jobs with `run_in_background` and wait for the notification; for
  "wait until X" use a background `until …; do sleep 5; done`.
- A bash heredoc containing `${…}` or backticks (JS template strings) can break the shell: write the patch script with
  the Write tool to the scratchpad, then run it.
- `grep -c` exits 1 when the count is 0 — a "failed" background job can just mean "0 BAD lines". Read the log.
- Big files (`Hospital.tsx`, `hospitalScene.ts`, `script.ts`): Grep for the symbol, then Read with offset/limit.
- Reply to the user in Korean, briefly; the user isn't a programmer-first audience.

---
name: visit-playtest
description: Test the 병문안 game the way a player sees it — headless-Chrome walkthroughs with screenshots (any phase, any floor, a remembered place, small phone, large text, desktop), contact sheets to review many shots in one look, and first-load/caching checks. Use whenever asked to test, playtest, check, screenshot or "확인/시험/테스트" the game, to confirm a UI or 3D change actually looks right, to hunt for visual or flow problems, or to judge loading speed, even if the user only says "잘 되는지 봐줘".
---

# Playtesting 병문안

Seeing the game beats guessing from code. Three tools, all in `scripts/` next to this file (run them with node from
anywhere; they find the repo themselves):

- `probe.js <baseUrl> <plan.json> [outDir]` — plays a planned path and takes screenshots (format in the file's header).
- `sheet.js <out.png> <cellWidth> <cols> <files…>` — one labelled contact sheet; Read that instead of each image.
- `loadcheck.js [distDir] [liveUrl]` — what the first load costs and which files the live site caches.

Background facts (state shape, dev hooks, key cells) are in the visit-map skill.

## 1. Something to test against

- Local: `npm run build`, then serve `dist` in the background: `npx serve -s dist -l 5077` (run_in_background; it keeps
  serving the newest build). Probe `http://localhost:5077`.
- Live: `https://dpt-app-green.vercel.app`.
- Already have pictures? `node scripts/check-core-flow.js` (and every `verify.js` run) leaves ~75 screenshots of the
  whole game in `scripts/.check-shots/` — a contact sheet of those is the cheapest full review.

## 2. A plan per question

Put the game where the question is with `state` + `jump`/`remember` rather than walking there. Starting points:

```json
{ "dev": true,
  "state": { "noticeSeen": true, "openingSeen": true, "tutorial": "done", "run": 1, "sound": false },
  "steps": [["title"], ["wait", "들어가기"], ["sleep", 800], ["click", "들어가기"], ["sleep", 2000], ["shot", "lobby"],
            ["jump", { "floor": 4, "x": 7, "y": 5, "dir": 2 }], ["key", "w"], ["sleep", 3500], ["shot", "arrive"],
            ["advanceUntil", "직접 쓸게요"], ["shot", "tell"]] }
```

- Her room on day 1: no `startDate` (title says 이야기 시작), jump to (7,5) facing south, step forward.
- A later day / second run: `startDate` a few days back, `visited`, `done`, `run: 2`; clues/gifts via `clues`, `gifts`.
- A remembered place: `["remember", 2]` (1 river, 2 rehab, 3 beach, 4 market, 5 yard, 6 night), then `advance` past
  the opening and `jump` with `floor: 0`.
- An ending and the notebook: `ending: "normal"` (or `bad`, `letter`, `withGirl`, `happy`) + `told` entries, then
  `["title"]` and `advanceUntil "다음 장 ›"`. Long text in `told[].text` tests overflow.
- Settings that matter: `fontScale: 1.2` (크게), `graphics: "low" | "normal" | "high"`.
- Sizes worth one pass each: `[390, 760]` (default phone), `[360, 640]` with fontScale 1.2 (worst case), `[1280, 800]`.

A choice tapped in `tell` stores `text: ''`; to see the player's own words, put them in `state.told`.

## 3. Review

Make a sheet, then Read it once:

```
node .claude/skills/visit-playtest/scripts/sheet.js <scratch>/review.png 300 5 shots/*.png
```

Look for: text cut off or overlapping (HUD vs goal box vs bubble), panels that don't cover what's under them, buttons
pushed off screen, labels unreadable on pale backgrounds, wrong phase/day in the dev bar, a blank 3D view, anything
the player could tap that does nothing. Then zoom: `sharp(file).extract({...}).resize(720)` on the suspicious area.

Compare before/after renders at the same pose (e.g. `graphics: normal` vs `high`) when a rendering change should not
change colours.

## 4. Loading

`node .claude/skills/visit-playtest/scripts/loadcheck.js` after a build. Healthy: the first load is one `index-*.js`
(~0.8 MB raw, ~0.22 MB gzip); `threeKit-*.js` is a separate chunk; live `_expo/static` and `assets` say
`max-age=31536000, immutable`, `/` says `max-age=0`. If three.js shows up in the first load, something imported
`three` outside `threeKit.ts`. For timings in a real run, a plan step can log
`performance.getEntriesByType('resource').map(e => e.name.split('/').pop() + ' ' + Math.round(e.responseEnd))`.

## 5. Report

Tell the user in Korean what was checked, what was wrong and what was fixed, with the evidence (a number, or a
screenshot that was looked at). Fixes that change visible text or flow also need `scripts/check-core-flow.js` updated
(visit-ship skill).

---
name: visit-art
description: Make or fix pictures for the 병문안 game with Gemini — comic panels, dictionary and relaxation pictures, sprites, places, title art — including the rules for asking before billed calls, the prompt table, rebuilding the game files, the reality check every picture must pass, and retouching stray letters. Use whenever the user asks to draw, redraw, regenerate, "다시 만들어줘", check whether images look right or realistic ("현실 검증"), or add any new art to the game, even a single image.
---

# Art for 병문안

## Before any Gemini call

Gemini is billed. The user decides, every time:

1. Say in Korean what will be drawn (a short version of each prompt) and how many calls, including the running total
   from `docs/병문안_모티브와_아트_구상.md` (the last "N차 제작 결과" heading has it).
2. Up to 10 calls for one task: say it and go. More than 10: ask first with AskUserQuestion (options: all / a subset /
   none).
3. Afterwards add a "N차 제작 결과 (date, Gemini k회, 누적 n회)" section at the top of that log: what was drawn, what
   failed and was retried, where the old raws went. Count every call, failed ones too.

## The pipeline

- Prompts: the `ART` table in `scripts/assets/generate-hospital-art.js` (other `generate-*.js` follow the same CLI).
  Run `node scripts/assets/generate-hospital-art.js name1 name2` (in the background for many). Raws land in
  `generated/hospital-art/<name>-raw.png` (gitignored). An existing raw is skipped, never overwritten: to redo one,
  move the old raw to `generated/hospital-art/before-<version>/` first.
- Prompt building blocks: `SAME` = the girl, same face, **same pajamas** (only for hospital scenes); `DRESSED(clothes)`
  = the girl in other clothes (memories outside the hospital, with `SCHOOL`, `GYM` or plain clothes); `SAME_STYLE` = the
  style only, no girl. Reference images per name are in `REFS` (default: her heads sheet). `relax-*`, `floor-*` and
  `lying-*` get no style suffix; edits ("Edit the attached drawing…") work for small changes.
- Editing the prompt file: write a small Python patch with the Write tool (regex-replace the `'name': \`…\`,` line) and
  run it; a bash heredoc with `${…}` breaks.
- Into the game (no API calls):
  - comics and title art: `node scripts/assets/build-comics.js mono-collar-2 end-cry …` → `src/assets/visit/comics/*.jpg`
    (cut to the drawn border, 720 px, grey for `mono-*`)
  - dictionary: `node scripts/assets/build-dictionary.js mindread …` → `src/assets/visit/dictionary/<id>.jpg`
  - relaxation pairs: `node scripts/assets/build-relax.js feet` → `src/assets/visit/relax/<part>-tense|calm.png`
  - sprites, tiles, places: `build-hospital-sheets.js` then `pack-hospital-sheets.js` (rewrites `sheets.webp` and
    `hospitalSheets.ts`); films: `build-cutscenes.js`.
  Pass names so only those files change; `git status src/assets` should list exactly what was redrawn.

## Reality check (every picture, before it goes in)

Look at the raw at full size (contact sheet at 560 px, 2 columns, with the visit-playtest `sheet.js`), then zoom on hands,
faces and any writing. Ask of each:

- **What it's for:** which line or entry it sits with. Comic panel i of a memory goes with `CLUE_TEXT[clue].lines[2+i]`
  (`src/assets/visitUi.ts`); the ending panels with `HAPPY_BEATS` in `script.ts`. The mood must match the words (no big
  laugh over "이제는 크게 말하면 숨이 차").
- **Clothes for the place:** pajamas and slippers only in the hospital. School, sports day, karaoke, the street: uniforms,
  gym clothes, everyday clothes.
- **Bodies:** two arms, two hands, each joined to an arm; fingers and toes countable; the pose does what the text says
  (curled toes are really curled).
- **Direction and order:** walking *out* faces away from the door; the last runner is behind the others; a dog on a walk
  has its leash.
- **Ground and height:** people stand on something; a 4th-floor window looks down; a tree isn't inside a building.
- **Writing:** no English or gibberish words (the game is Korean and Gemini can't write Hangul well); remove with
  `scripts/erase-text.js` (find the exact box with `scripts/pixmap.js`) or redraw.
- **People:** a friend isn't the girl's twin; elders are present-day (no topknot and hanbok in a hospital); a
  character matches the one the game shows elsewhere.

When a picture fails, fix the prompt, not just retry: say what was wrong in plain words ("not in pajamas", "exactly two
arms and two hands", "seen from the side"). If a framing keeps failing, change the angle.

## Finish

Rebuild only the changed assets, look at the built files once (the shipped crop can differ from the raw), update the
art log and the plan doc's version row, then ship with the visit-ship skill. Tell the user in Korean what was wrong
with each picture and what it shows now.

@AGENTS.md

# 마음 연습 (DPT app)

Korean-language self-help psychology Expo/React Native Web app. Repo `supullim555/dpt-app`,
deployed to Vercel at production alias `dpt-app-green.vercel.app` (auto-deploys on push to
`master`). **The plan is `docs/계획서.md`, rewritten from scratch on 2026-11-01 — read it before any new
work.** The product is **병문안**: first-person visits to a terminally ill girl over 7 real days,
branching endings, a fairy-led second run. Dialogue is human-written (`src/features/visit/script.ts`);
on-device AI only ever picks one keyword from the player's text, verified by code, never writes
sentences. It's built in `src/features/visit/`, reachable only at `?visit=1` (`&dev=1` adds
day-skipping) because pushing deploys publicly and the script needs expert review first; the default
address is still the old room version. ALTER EGO and 저주소녀 아틀리에 are the top-priority references
for direction and art (learn structure and mood, copy nothing): `docs/병문안_모티브와_아트_구상.md`.
The old plan and planning docs are in `docs/archive/`, for history only. Where code goes is in
**`src/README.md`**.

## Ship workflow — follow this for every change, every time

1. Implement.
2. `npx tsc --noEmit`.
3. `npm run verify` — checks the layer/feature-boundary rules (`scripts/check-architecture.js`),
   type-checks, builds, serves `dist` on a free local port, runs the headless-Chrome
   regression suite (`scripts/check-core-flow.js`, built on `scripts/lib/uitest.js`). If a UI
   change altered visible text/DOM structure the suite depends on, update the suite in the same
   change — don't ship with a stale regression script.
4. Update `docs/계획서.md` (see below) — **before** committing, not after.
5. `git add` the specific files (never `-A`), commit, `git push`.
6. Poll the new Vercel deployment (`npx vercel ls`, then `npx vercel inspect <url>` until
   `Ready`), confirm `npx vercel inspect dpt-app-green.vercel.app` now points at it.
7. `node scripts/verify.js --live` — re-run the regression suite against the live production URL.

Only report a change as done once all seven steps pass. Docs-only commits (no app code changed)
can skip steps 2–3 and 6–7's regression re-run, but still get pushed and Vercel will still rebuild
(harmless).

## Updating the plan doc

`docs/계획서.md` describes the game as it is meant to be, not a log. When a decision changes, change
the section it belongs in, mark unconfirmed ideas "(제안)", and add one row at the top of its 변경 이력
table. Keep it short.

## Gemini API

**Never call it without an explicit, in-the-moment instruction from the user for that specific
call** — not implied by "make it better" or similar. When the user does authorize it, log the
call count and what was generated in `docs/병문안_모티브와_아트_구상.md`.

### Asset generation pipeline (when Gemini is authorized for art)

Pattern used for character sprites, room furniture and quest icons — clone it rather
than inventing a new one:

1. `scripts/assets/generate-<name>.js` — a name→description table, a style prompt, and one
   `runGenerateCli({ outDir, names, promptFor })` call (`scripts/lib/generateCli.js`: argument
   parsing, skip-existing, no retries; it calls `scripts/lib/gemini.js`'s `generateImage` with the
   reference sheet in `art/`). Writes white-background raw PNGs to `generated/<name>/`. Keep the
   style prompt close to the app's existing pixel-art look (dark-brown outlines, soft pastel
   palette, simple/bold since most of these render tiny). `generate-quest-icons.js` is the template.
2. `scripts/assets/extract-<name>.js` — one `cutOutAll({ rawDir, outDir, names, maxSide })` call
   (`scripts/lib/cutout.js`: flood-fill white-background removal + speck removal + halo + crop +
   resize), writing to `src/assets/<name>/*.png`. Paths come from `scripts/lib/paths.js`.
   `extract-quest-icons.js` is the template.
3. **Read the resulting PNGs to visually check them before wiring anything to them.**
4. Only then write the `src/assets/<name>.ts` barrel file (`Record<Id, ImageSourcePropType>` via
   `require()`) and reference it from components. A barrel file that `require()`s a PNG that
   doesn't exist on disk yet breaks the build immediately — sequencing matters.
5. Add the new sources to `src/app/ArtPreloader.tsx`'s `SOURCES` array.
6. Add the asset to `scripts/assets/polish.js`'s `RECIPES` and run it (PhotoCraft: Defringe, plus
   Vibrance/Unsharp Mask for icons; refuses any size or alpha change). It starts from
   `generated/unpolished/`, so after re-running an extract script delete that asset's copy there.

## Architecture notes worth knowing before touching them

- **Layout** (full guide: `src/README.md`): `src/core` (app-agnostic) ← `src/ui` (shared look/frame)
  ← `src/features/<name>` (one folder per feature) ← `src/app` (navigation, preloading). Other
  features are imported only through `@/features/<name>` (its `index.ts`); inside a feature use
  relative imports; across layers use the `@/` alias (tsconfig `paths`, which Expo's Metro
  resolves by default). Screens aren't exported from feature indexes — only `app/navigation`
  imports them. `scripts/check-architecture.js` enforces all of this in `npm run verify`.
  `api/chat.ts` is built by Vercel, not Metro, so it keeps a relative import.
- **Single-source registries**: an exercise is one entry in `features/exercises/exercises.ts`
  (its quest label lives on the entry); a furniture piece is one entry in
  `features/room/objects.ts` (`later: true` = appears once granted via `progress`'s `roomItems`). Don't add parallel
  id-keyed maps elsewhere — add a field to the entry.

- **No scoring** (v0.28, plan §40): coins, the shop and stats were removed — don't add rewards,
  streaks or points back; the reason to return is the story's next chapter.
- **`ProgressContext.tsx` / `ProgressState` migration** (`features/progress`; storage key still
  `game-state`): loading a saved state goes through
  `mergeWithDefaults(DEFAULT_STATE, saved)` (`src/core/lib/mergeWithDefaults.ts`) — drops keys the
  current shape doesn't have, falls back on wrongly-typed values, and merges plain-object
  (`Record<SomeId, …>`, like `lastCompleted`) fields key-by-key so a newly-added id still gets its
  default in an older save. Adding a `ProgressState` field = adding it to `DEFAULT_STATE`; no
  per-field load code. Use the same helper for any other persisted object shape.
- **Storage** (`src/core/storage.ts`): every write is serialized per key. Read-modify-write
  goes through `updateEntry`, never a hand-written load-then-save; an append-only list is
  `createLog(key, { max })` (what `memory.ts`/`gate.ts` are). Day keys come from `today()` /
  `localDateKey()` in `src/core/lib/date.ts` (local time — it was UTC before v0.25, which made the
  day roll over at 09:00 KST).
- **Shared hooks**: `useAsyncEffect` (async load + cancellation-safe setState, replaces hand-
  written `let cancelled` effects), `useTimeout(cb, ms | null)` / `useTimer()` (declarative /
  event-started timers that clear on unmount — no raw `setTimeout` in components),
  `useBreathPacer(phases, { cycles, running, onDone })` (the breathing-circle animation behind
  the gate and 숨 고르기; reuse it for any new calming routine), `useDialogueCompletion` (record
  answer → mark done → close after hold), `useRoomBoxSize` (the room's own
  `ROOM_MAX_ASPECT`-capped width, computed outside `RoomBackdrop`'s tree for anything — like
  `FloatingPanel` — that needs to match the room's width on a wide desktop window instead of
  stretching edge-to-edge).
- **Network**: client calls go through `postJson` (`src/core/lib/http.ts`), which has a timeout.
- **Shared components**: `IconOrEmoji` (generated-icon-or-emoji-fallback branch, used by
  `QuestWidget`). Dialogue questions are `DialogueQuestion` (`string` = optional typing,
  `{ text, choices }` = tap-first) — answers are tap-first and every question can be skipped.
- **Testing**: `scripts/lib/uitest.js` is a from-scratch headless-Chrome CDP harness (no
  Puppeteer) — `withBrowser(url, fn)`, `clickText`, `tapAnyOf`, `fillTextarea`, `waitText`,
  `shot`, `passStartupGates()` for the disclaimer → gate-skip sequence every check needs first.
  `scripts/check-core-flow.js` is the maintained regression suite built on it.

## This machine's environment (checked, don't re-assume)

- No GIMP/Krita, no actual Adobe Creative Cloud installation (checked 2026-10-31). Python 3.12 and
  cargo are installed.
- `typescript-language-server` + `typescript` are installed globally (for the `typescript-lsp`
  plugin).
- `.claude/settings.json` enables these `claude-plugins-official` plugins: `expo`,
  `typescript-lsp`, `playwright`, `frontend-design`, `commit-commands`, `security-guidance`
  (inert until Python is installed — it requires Python 3.8+), `claude-md-management`.
- `C:\Users\user\Documents\artcraft-suite` is a local checkout of the open-source "ArtCraft"
  Crafting Apps (clean-room Rust reimplementations of the Adobe product line — EffectCraft≈After
  Effects, PhotoCraft≈Photoshop, etc.), **not** an Adobe product. Its `<app>-cli.exe` are built under
  `<app>/target/release/`; `scripts/assets/polish.js` drives PhotoCraft's. See
  `docs/archive/3D_전환_가능성_검토.md` for what was already investigated there (EffectCraft's 3D features, for
  a possible future 3D treatment of the room/character art — nothing implemented yet).

---
name: visit-ship
description: Finish and ship a change to the 병문안 game (dpt-app on Vercel) the fast, complete way — tsc, the full local verify in the background, the plan-doc row, a commit of exactly the changed files, push, waiting for the Vercel deploy, and the live regression run. Use whenever a change in C:\Users\user\Documents\DPT\app is done, or the user says 커밋, 푸시, 배포, 올려줘, 실제 사이트에 반영, "ship it", even for one-line fixes or docs.
---

# Shipping 병문안

`CLAUDE.md` sets the rule: a change is done only when all seven steps pass. This is the efficient way through them.
Long steps run in the background; you get a notification when each ends, so do other work (or end the turn with a short
status) instead of sleeping.

## 1. Local

1. `npx tsc --noEmit` (seconds).
2. If visible text or flow changed, update `scripts/check-core-flow.js` in the same change (it clicks by exact text and
   `aria-label`).
3. Full check in the background, log to the scratchpad:
   `node scripts/verify.js > <scratch>/verify.log 2>&1` (architecture, visit logic, tsc, build, serve, ~416 UI checks;
   about 10 minutes).
4. Read the result, don't trust the exit code alone: `grep -n "all checks passed\|✗" verify.log`, count `^OK` / `^BAD`,
   and read the "console exceptions" block. A wrapping `grep -c` exits 1 when it counts 0 BAD.
5. A BAD line: open its screenshot in `scripts/.check-shots/` before changing anything; the cause may be the test
   (timing, changed text) rather than the game. Re-run only after a fix.

## 2. Docs

- `docs/계획서.md`: one row in the 변경 이력 table (after the latest version row, which is not at the top) and the
  section the change belongs to. Korean, short.
- New Gemini art: the art log (visit-art skill).

## 3. Commit and push

- `git add` the files by name (never `-A`; `generated/` is ignored on purpose, `.claude/settings.local.json` stays out).
- Message: `vX.YY: what changed` plus short bullet lines, ending with the Co-Authored-By line the session gives. Write
  it to a file with the Write tool and `git commit -F file` when it's long.
- `git push`.

## 4. Deploy

- `npx vercel ls` shows the new deployment as Building within ~10 s.
- Wait in the background:
  `until npx vercel inspect <deployment-url> 2>&1 | grep -qE "status\s+● (Ready|Error|Canceled)"; do sleep 10; done`
- Confirm the alias moved: `npx vercel inspect dpt-app-green.vercel.app` shows the same url, or the live `index.html`
  names the new `index-*.js`.

## 5. Live

`node scripts/verify.js --live > <scratch>/live.log 2>&1` in the background (~10 min), read it as in step 1.4.

## Report

In Korean, briefly: what changed for the player, what was checked (local and live pass counts, console errors), the
commit hash, Gemini calls if any. If the user asks to skip waiting ("그냥 바로"), commit and push, and say which checks
are still running or were skipped.

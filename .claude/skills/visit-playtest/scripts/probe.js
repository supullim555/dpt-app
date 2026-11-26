// Plays a planned path through the game in headless Chrome and takes screenshots on the way.
//   node probe.js <baseUrl> <plan.json> [outDir]
// plan.json:
// {
//   "size": [390, 760],            // viewport (default 390x760); also try [360, 640] and [1280, 800]
//   "dev": true,                   // open with ?dev=1 (dev bar, __visitJump, __visitRemember)
//   "state": { ... },              // written to localStorage dpt.visit.state before a reload (omit for a fresh start)
//   "steps": [
//     ["title"],                   // press 이어하기 or 이야기 시작, whichever is there
//     ["click", "들어가기"],        // exact text of the leaf element
//     ["tapAny", ["별일 없었어", "잘 모르겠어"]],
//     ["wait", "text", 4000],      // until the text is on the page
//     ["sleep", 800],
//     ["jump", { "floor": 4, "x": 7, "y": 5, "dir": 2 }],
//     ["remember", 2],             // into a request's remembered day (request day 1-6)
//     ["advance", 6],              // tap through her lines up to n times
//     ["advanceUntil", "text", 12],// tap through until the text shows
//     ["key", "Escape"],           // keydown on window (w/a/s/d, ArrowUp, Enter, Escape …)
//     ["shot", "name"],            // <outDir>/name.png
//     ["log", "js expression"],    // prints the value
//     ["eval", "js expression"]
//   ]
// }
// Prints each log line and the page's uncaught exceptions. Uses the repo's own harness (scripts/lib/uitest.js).
const fs = require('fs');
const path = require('path');
const APP = path.resolve(__dirname, '../../../..');
const { withBrowser } = require(path.join(APP, 'scripts/lib/uitest'));

const [base, planFile, outArg] = process.argv.slice(2);
if (!base || !planFile) {
  console.error('usage: node probe.js <baseUrl> <plan.json> [outDir]');
  process.exit(1);
}
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const OUT = path.resolve(outArg || path.join(path.dirname(path.resolve(planFile)), 'shots'));
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [width, height] = plan.size || [390, 760];
const ADVANCE = `(document.querySelector('[aria-label="대화 넘기기"]')?.click(), true)`;

withBrowser(
  `${base}/${plan.dev === false ? '' : '?dev=1'}`,
  async (t) => {
    await t.waitText('들어가 볼게요', 15000);
    if (plan.state) {
      await t.evalJs(`localStorage.setItem('dpt.visit.state', ${JSON.stringify(JSON.stringify(plan.state))}); true`);
      await t.evalJs('location.reload(); true');
      await sleep(2500);
    }
    for (const [op, a, b] of plan.steps || []) {
      if (op === 'title') {
        const hit = await t.tapAnyOf(['이어하기', '이야기 시작']);
        if (!hit) console.log('title: no button');
        await sleep(800);
      } else if (op === 'click') {
        if (!(await t.clickText(a))) console.log(`click: not found "${a}"`);
        await sleep(450);
      } else if (op === 'tapAny') {
        console.log('tapAny ->', await t.tapAnyOf(a));
        await sleep(450);
      } else if (op === 'wait') {
        if (!(await t.waitText(a, b || 4000))) console.log(`wait: timed out "${a}"`);
      } else if (op === 'sleep') await sleep(a);
      else if (op === 'jump') {
        await t.evalJs(`window.__visitJump(${JSON.stringify(a)}); true`);
        await sleep(1500);
      } else if (op === 'remember') {
        await t.evalJs(`window.__visitRemember(${a}); true`);
        await sleep(3000);
      } else if (op === 'advance') {
        for (let i = 0; i < a; i++) {
          await t.evalJs(ADVANCE);
          await sleep(450);
        }
      } else if (op === 'advanceUntil') {
        let i = 0;
        for (; i < (b || 12) && !(await t.hasText(a)); i++) {
          await t.evalJs(ADVANCE);
          await sleep(450);
        }
        if (!(await t.hasText(a))) console.log(`advanceUntil: never saw "${a}"`);
      } else if (op === 'key') {
        const code = a.length === 1 ? `Key${a.toUpperCase()}` : a;
        await t.evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(a)}, code: ${JSON.stringify(code)} })), true`);
        await sleep(450);
      } else if (op === 'shot') {
        await t.shot(path.relative(t.shotDir, path.join(OUT, `${a}.png`)));
        console.log('shot', path.join(OUT, `${a}.png`));
      } else if (op === 'log') console.log(a, '=>', JSON.stringify(await t.evalJs(a)));
      else if (op === 'eval') await t.evalJs(a);
      else console.log('unknown step', op);
    }
  },
  { shotDir: OUT, width, height }
).then(() => console.log('done'));

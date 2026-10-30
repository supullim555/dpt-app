// Reusable headless-Chrome (raw CDP, no puppeteer) harness for click-through UI verification.
// Every feature check written for this app so far rebuilt the same WebSocket connect / click /
// exact-text-match boilerplate from scratch in a throwaway scratchpad script; this pulls it into
// one module so a new check is just the few lines specific to what's actually being tested, and
// it can live in the repo (scripts/) instead of being lost at the end of a session.
//
// Usage:
//   const { withBrowser } = require('./lib/uitest');
//   const { passed } = await withBrowser(BASE_URL, async (t) => {
//     await t.passStartupGates();
//     t.note('무언가 보임', await t.hasText('무언가'));
//     await t.shot('01_state.png');
//   }, { shotDir: __dirname });
//   process.exit(passed ? 0 : 1);
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

function findChrome() {
  return CHROME_PATHS.find((p) => fs.existsSync(p)) || CHROME_PATHS[0];
}

class Tester {
  constructor(ws, shotDir) {
    this.ws = ws;
    this.shotDir = shotDir;
    this.reqId = 0;
    this.pending = new Map();
    this.results = [];
    this.consoleErrors = [];
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) {
        this.pending.get(m.id)(m);
        this.pending.delete(m.id);
      }
      if (m.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300));
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve) => {
      const id = ++this.reqId;
      this.pending.set(id, resolve);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evalJs(expression) {
    return (await this.send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;
  }

  async click(x, y) {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await this.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
  }

  // Exact-text match on the deepest (leaf) element, scrolled into view first — every check
  // written by hand for this app used this same rule (emoji glyphs, button labels, and bubble
  // text all render as their own leaf text node) and the same scrollIntoView fix for targets
  // below a short headless viewport's fold.
  centerOfText(text) {
    return this.evalJs(
      `(()=>{const els=[...document.querySelectorAll('div,span,p')].filter(e=>e.children.length===0&&e.textContent.trim()===${JSON.stringify(
        text
      )});const e=els[els.length-1];if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`
    );
  }

  async clickText(text) {
    const c = await this.centerOfText(text);
    if (c) await this.click(c[0], c[1]);
    return !!c;
  }

  // Try each candidate in order, click the first one found on screen — for "exactly one of these
  // labels is showing depending on current state" situations (e.g. which of 4 time-of-day
  // greetings, or which question in a dialogue is currently up).
  async tapAnyOf(candidates) {
    for (const t of candidates) {
      const c = await this.centerOfText(t);
      if (c) {
        await this.click(c[0], c[1]);
        return t;
      }
    }
    return null;
  }

  clickEmoji(emoji) {
    return this.clickText(emoji);
  }

  hasText(text) {
    return this.evalJs(`document.body.innerText.includes(${JSON.stringify(text)})`);
  }

  async waitText(text, ms = 15000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await this.hasText(text)) return true;
      await sleep(200);
    }
    return false;
  }

  // Sets a RN-web TextInput/TextArea's value through the native setter + input event, the only
  // way that's reliably picked up by React's controlled-input listeners under CDP.
  async fillTextarea(text) {
    return this.evalJs(
      `(()=>{const ta=[...document.querySelectorAll('textarea')].pop(); if(!ta) return false; const setter=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set; setter.call(ta,${JSON.stringify(
        text
      )}); ta.dispatchEvent(new Event('input',{bubbles:true})); return true;})()`
    );
  }

  async shot(name) {
    const s = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(this.shotDir, name), Buffer.from(s.result.data, 'base64'));
  }

  // Records one pass/fail line, prints it immediately (so a long script's progress is visible
  // while it runs, not just in the final summary), and returns `ok` for inline use in `if`s.
  note(label, ok) {
    this.results.push({ label, ok: !!ok });
    console.log(`${ok ? 'OK ' : 'BAD'} ${label}`);
    return !!ok;
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await sleep(3000);
  }

  // Runs the v0.28 startup sequence (IntroGate's one disclaimer tap → GateScreen's first
  // question → skip) that sits at the top of nearly every check. AI starts off; a check that
  // needs it turns it on from Home's ✨ prompt.
  async passStartupGates() {
    await this.waitText('시작하기 전에', 12000);
    await this.clickText('시작하기');
    await sleep(800);
    await this.waitText('건너뛰기', 12000);
    await this.clickText('건너뛰기');
    await sleep(1200);
  }

  // Prints console exceptions + the OK/BAD list and returns whether every check passed.
  summary() {
    console.log('\n--- console exceptions ---');
    console.log(this.consoleErrors.join('\n') || '(none)');
    console.log('\n--- SUMMARY ---');
    for (const r of this.results) console.log(`${r.ok ? 'OK ' : 'BAD'} ${r.label}`);
    return this.results.length > 0 && this.results.every((r) => r.ok);
  }
}

// Launches headless Chrome, connects over CDP, runs `fn(tester)`, always tears Chrome down
// afterward (even if `fn` throws). `shotDir` defaults to the CALLER's directory via its own
// `__dirname`, not this library's — pass it explicitly.
async function withBrowser(baseUrl, fn, { shotDir = process.cwd(), width = 390, height = 760 } = {}) {
  const port = 9333 + Math.floor(Math.random() * 2000);
  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      '--disable-gpu',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${process.env.TEMP}/cdp-${port}`,
      '--hide-scrollbars',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );
  try {
    let targets;
    for (let i = 0; i < 40; i++) {
      try {
        targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
        if (targets.length) break;
      } catch {
        /* Chrome's debug endpoint not up yet */
      }
      await sleep(250);
    }
    const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    const t = new Tester(ws, shotDir);
    await t.send('Runtime.enable');
    await t.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await t.navigate(baseUrl);
    await fn(t);
    const passed = t.summary();
    ws.close();
    return { passed, tester: t };
  } finally {
    chrome.kill();
  }
}

module.exports = { withBrowser, Tester };

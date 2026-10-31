// The one command for "did this change actually work" — replaces manually running tsc, then
// build, then starting a static server by hand, then remembering the right port for the
// regression script, every single time (§31). Chains: architecture check -> type-check -> web build -> serve dist on a
// free local port -> scripts/check-core-flow.js against it -> shut the server down. Exits nonzero
// on the first failing step, with that step's own output already printed.
//
//   node scripts/verify.js              -> full local check (tsc + build + serve + regression)
//   node scripts/verify.js --live[=URL] -> skip tsc/build/serve, run the regression script
//                                          straight against a live deployment (URL defaults to
//                                          the production alias)
//   node scripts/verify.js --skip-build -> reuse the existing dist/ (e.g. you already built it)
const { spawnSync, spawn } = require('child_process');
const path = require('path');
const net = require('net');

const ROOT = path.join(__dirname, '..');
const LIVE_URL_DEFAULT = 'https://dpt-app-green.vercel.app';

const args = process.argv.slice(2);
const liveArg = args.find((a) => a.startsWith('--live'));
const skipBuild = args.includes('--skip-build');

function run(label, cmd, cmdArgs) {
  console.log(`\n=== ${label} ===`);
  const res = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', shell: true });
  if (res.status !== 0) {
    console.error(`\n✗ ${label} failed (exit ${res.status})`);
    process.exit(res.status ?? 1);
  }
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function waitForServer(url, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  if (liveArg) {
    const url = liveArg.includes('=') ? liveArg.split('=')[1] : LIVE_URL_DEFAULT;
    console.log(`\n=== regression check (live: ${url}) ===`);
    run('regression check', 'node', ['scripts/check-core-flow.js', url]);
    console.log('\n✓ all checks passed');
    return;
  }

  run('architecture (layers / feature boundaries)', 'node', ['scripts/check-architecture.js']);
  run('visit logic (endings, keywords, crisis check)', 'node', ['--disable-warning=ExperimentalWarning', 'scripts/check-visit-logic.mjs']);
  run('tsc --noEmit', 'npx', ['tsc', '--noEmit']);
  if (!skipBuild) run('web build', 'npm', ['run', 'build']);

  const port = await findFreePort();
  const url = `http://localhost:${port}`;
  console.log(`\n=== serving dist on ${url} ===`);
  const server = spawn('npx', ['serve', '-s', 'dist', '-l', String(port)], { cwd: ROOT, stdio: 'ignore', shell: true });
  try {
    const up = await waitForServer(url);
    if (!up) {
      console.error(`\n✗ local server never came up on ${url}`);
      process.exit(1);
    }
    run('regression check', 'node', ['scripts/check-core-flow.js', url]);
  } finally {
    server.kill();
  }

  console.log('\n✓ all checks passed — safe to commit');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

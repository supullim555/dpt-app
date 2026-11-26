// How heavy the first load is, and whether the live site caches what it should.
//   node loadcheck.js [distDir] [liveUrl]
// distDir (default <app>/dist): the scripts index.html loads first, raw and gzipped, the other chunks, and the biggest
// modules in the entry chunk. liveUrl (default https://dpt-app-green.vercel.app): Cache-Control of the page, its
// bundles, one asset, the sheets and a sound.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const APP = path.resolve(__dirname, '../../../..');
const dist = path.resolve(process.argv[2] || path.join(APP, 'dist'));
const live = process.argv[3] || 'https://dpt-app-green.vercel.app';
const kb = (n) => `${Math.round(n / 1024)}KB`;

(async () => {
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
    const first = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
    console.log('== first load (index.html scripts)');
    for (const s of first) {
      const buf = fs.readFileSync(path.join(dist, s));
      console.log(`  ${path.basename(s)}  ${kb(buf.length)} raw, ${kb(zlib.gzipSync(buf).length)} gzip`);
    }
    const dir = path.join(dist, '_expo/static/js/web');
    console.log('== all chunks');
    for (const f of fs.readdirSync(dir)) console.log(`  ${f}  ${kb(fs.statSync(path.join(dir, f)).size)}${first.some((s) => s.endsWith(f)) ? '  (first load)' : ''}`);
    const entry = first.find((s) => /index-/.test(s));
    if (entry) {
      const src = fs.readFileSync(path.join(dist, entry), 'utf8');
      const mods = src.split('__d(function').slice(1).map((p) => [p.length, p.slice(0, 200).replace(/\s+/g, ' ')]);
      mods.sort((a, b) => b[0] - a[0]);
      console.log('== biggest modules in the entry chunk');
      for (const [n, head] of mods.slice(0, 12)) {
        const name = head.match(/"(\w+)",\{enumerable/)?.[1] || head.match(/@license ([\w-. ]+)/)?.[1] || head.slice(0, 60);
        console.log(`  ${kb(n).padStart(6)}  ${name}`);
      }
    }
  } else console.log(`(no build at ${dist}: npm run build first)`);

  console.log(`== cache headers on ${live}`);
  try {
    const page = await (await fetch(`${live}/`)).text();
    const urls = ['/', ...[...page.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]), '/hospital/sheets.webp', '/sound/music.webm'];
    const asset = fs.existsSync(path.join(dist, 'assets')) ? findFirst(path.join(dist, 'assets')) : null;
    if (asset) urls.push('/' + path.relative(dist, asset).split(path.sep).join('/'));
    for (const u of urls) {
      const r = await fetch(live + u, { method: 'HEAD' });
      console.log(`  ${r.status} ${(r.headers.get('cache-control') || '-').padEnd(38)} ${u}`);
    }
  } catch (e) {
    console.log('  (live check failed:', e.message + ')');
  }
})();

function findFirst(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      const r = findFirst(p);
      if (r) return r;
    } else if (/\.(jpg|png)$/.test(f)) return p;
  }
  return null;
}

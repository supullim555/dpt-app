// The scribbles over her notebook's later pages (v0.96), mostly straight now: clusters of short hatching, long slashes,
// a cross or two, each line gone over two or three times a little off, like a pencil pressed hard. The old curls read
// as made, not written. Writes src/assets/visit/scribble-a/b/c.png (600x800, transparent), lighter to heavier.
//   node scripts/assets/make-scribbles.js
const path = require('path');
const sharp = require('sharp');
const { ASSETS_DIR } = require('../lib/paths');

const W = 600;
const H = 800;

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// one stroke, gone over a few times, each pass a hair off and a little lighter or darker
function stroke(r, x1, y1, x2, y2, width) {
  let out = '';
  const passes = 2 + Math.floor(r() * 2);
  for (let p = 0; p < passes; p++) {
    const j = () => (r() - 0.5) * 4;
    // a pencil line isn't quite straight: it bows a little in the middle
    const mx = (x1 + x2) / 2 + (r() - 0.5) * 8;
    const my = (y1 + y2) / 2 + (r() - 0.5) * 8;
    out += `<path d="M${x1 + j()} ${y1 + j()} Q${mx} ${my} ${x2 + j()} ${y2 + j()}" fill="none" stroke="#1a1a20" stroke-width="${width * (0.7 + r() * 0.5)}" stroke-opacity="${0.45 + r() * 0.4}" stroke-linecap="round"/>`;
  }
  return out;
}

function scribble(seed, { hatches, slashes, crosses }) {
  const r = seeded(seed);
  let paths = '';
  // hatching: a patch of short parallel lines, as if blacking out a word
  for (let h = 0; h < hatches; h++) {
    const cx = 80 + r() * (W - 160);
    const cy = 120 + r() * (H - 240);
    const len = 60 + r() * 120;
    const angle = (-0.35 + r() * 0.7) - Math.PI / 4;
    const n = 6 + Math.floor(r() * 10);
    for (let i = 0; i < n; i++) {
      const off = (i - n / 2) * (6 + r() * 3);
      const ox = cx + Math.cos(angle + Math.PI / 2) * off;
      const oy = cy + Math.sin(angle + Math.PI / 2) * off;
      const l = len * (0.7 + r() * 0.4);
      paths += stroke(r, ox - Math.cos(angle) * l / 2, oy - Math.sin(angle) * l / 2, ox + Math.cos(angle) * l / 2, oy + Math.sin(angle) * l / 2, 2.2);
    }
  }
  // long slashes across the page
  for (let s = 0; s < slashes; s++) {
    const y1 = r() * H;
    const y2 = y1 + (r() - 0.3) * H * 0.6;
    paths += stroke(r, 20 + r() * 80, y1, W - 20 - r() * 80, y2, 2.6 + r() * 1.6);
  }
  // a cross over something
  for (let c = 0; c < crosses; c++) {
    const cx = 100 + r() * (W - 200);
    const cy = 150 + r() * (H - 300);
    const s = 40 + r() * 60;
    paths += stroke(r, cx - s, cy - s, cx + s, cy + s, 3);
    paths += stroke(r, cx + s, cy - s, cx - s, cy + s, 3);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${paths}</svg>`;
}

(async () => {
  const levels = { a: { hatches: 2, slashes: 1, crosses: 0 }, b: { hatches: 4, slashes: 3, crosses: 1 }, c: { hatches: 7, slashes: 6, crosses: 2 } };
  for (const [name, level] of Object.entries(levels)) {
    await sharp(Buffer.from(scribble(name.charCodeAt(0) * 131, level))).png().toFile(path.join(ASSETS_DIR, 'visit', `scribble-${name}.png`));
    console.log(`scribble-${name}.png`);
  }
})();

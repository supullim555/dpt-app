// v0.98: the comic panels told after her memories and at the happy ending (generate-hospital-art.js mono-*, end-*).
// Each was drawn as one panel with a thin black border on whatever ground came: cut to that border, then written as a
// jpg to src/assets/visit/comics/. No API calls.
//   node scripts/assets/build-comics.js [name ...]
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { ASSETS_DIR, GENERATED_DIR } = require('../lib/paths');

const ART = path.join(GENERATED_DIR, 'hospital-art');
const OUT = path.join(ASSETS_DIR, 'visit', 'comics');
const SIZE = 720;
const NAMES = fs.readdirSync(ART).filter((f) => /^(mono-|end-|title-after).*-raw\.png$/.test(f)).map((f) => f.replace(/-raw\.png$/, ''));
// v1.00: `node scripts/assets/build-comics.js mono-collar-2 end-cry` for just those
const ONLY = process.argv.slice(2);

/** The panel: the box inside which most rows and columns are no longer the ground at the corners. */
async function panelBox(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (x, y) => [data[(y * W + x) * 3], data[(y * W + x) * 3 + 1], data[(y * W + x) * 3 + 2]];
  const ground = px(2, 2);
  const off = (x, y) => {
    const p = px(x, y);
    return Math.abs(p[0] - ground[0]) + Math.abs(p[1] - ground[1]) + Math.abs(p[2] - ground[2]) > 60;
  };
  // a row or column belongs to the panel when a good part of it isn't ground
  const rowIn = (y) => { let n = 0; for (let x = 0; x < W; x += 4) n += off(x, y) ? 1 : 0; return n > W / 4 / 3; };
  const colIn = (x) => { let n = 0; for (let y = 0; y < H; y += 4) n += off(x, y) ? 1 : 0; return n > H / 4 / 3; };
  let top = 0, bottom = H - 1, left = 0, right = W - 1;
  while (top < H / 3 && !rowIn(top)) top++;
  while (bottom > (H * 2) / 3 && !rowIn(bottom)) bottom--;
  while (left < W / 3 && !colIn(left)) left++;
  while (right > (W * 2) / 3 && !colIn(right)) right--;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const name of NAMES) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    const file = path.join(ART, `${name}-raw.png`);
    // the credits' sky is a whole picture, not a panel
    const box = name === 'end-sky' || name === 'title-after' ? null : await panelBox(file);
    const img = (box ? sharp(file).extract(box) : sharp(file)).resize(SIZE, SIZE, { fit: 'cover' });
    // her memories are ink and grey, like the rest of the game; only the ending has its colour
    if (name.startsWith('mono-')) img.grayscale();
    await img.jpeg({ quality: 82 }).toFile(path.join(OUT, `${name.replace(/^(mono|end)-/, '$1-')}.jpg`));
    console.log(name, box);
  }
})();

// The pictures for relaxing together (v0.93, BreatheTogether.tsx): each Gemini drawing (generate-hospital-art.js relax-*)
// is two panels, tensing on the left and letting go on the right; each half is trimmed to its panel, made grey and
// small, its plain ground cut away (v0.96), and written to src/assets/visit/relax/<part>-tense.png and -calm.png.
//   node scripts/assets/build-relax.js
// The shoulders are the exception: asked for whole, the shrug kept coming with the hands behind the head, so the calm
// half of one drawing is kept and the shrug made from it here, the head moved down onto the shoulders.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { ASSETS_DIR, GENERATED_DIR } = require('../lib/paths');
const { photocraft } = require('./retouch-hospital-art');

const ART = path.join(GENERATED_DIR, 'hospital-art');
const OUT = path.join(ASSETS_DIR, 'visit', 'relax');
const PARTS = ['hands', 'arms', 'shoulders', 'face', 'breath', 'legs', 'feet'];
const WIDTH = 300;

async function half(file, side) {
  const { width, height } = await sharp(file).metadata();
  const w = Math.floor(width / 2);
  return sharp(file).extract({ left: side === 'left' ? 0 : w, top: 0, width: w, height }).png().toBuffer();
}

async function write(buffer, name) {
  // trim the plain surround down to the panel, then in past its frame
  const trimmed = await sharp(buffer).trim({ threshold: 18 }).png().toBuffer();
  const { width, height } = await sharp(trimmed).metadata();
  const inset = Math.round(Math.min(width, height) * 0.035);
  const panel = path.join(GENERATED_DIR, 'relax-tmp', name.replace('.png', '-panel.png'));
  const keyed = panel.replace('-panel.png', '-keyed.png');
  fs.mkdirSync(path.dirname(panel), { recursive: true });
  await sharp(trimmed).extract({ left: inset, top: inset, width: width - inset * 2, height: height - inset * 2 }).png().toFile(panel);
  // v0.96: the plain ground taken out (PhotoCraft's magic wand from the corner), so only the person shows
  // from each corner, gently (the pajamas are as pale as the ground, and only their outline keeps the wand out)
  const { width: pw, height: ph } = await sharp(panel).metadata();
  const corners = [[3, 3], [pw - 4, 3], [3, ph - 4], [pw - 4, ph - 4]];
  photocraft(panel, keyed, [
    ['layer.new.layerFromBackground', { ifPresent: true }],
    ...corners.flatMap(([x, y]) => [
      ['select.magicWand', { x, y, tolerance: 12, contiguous: true }],
      ['edit.clear', {}],
      ['select.deselect', {}],
    ]),
  ]);
  await sharp(keyed).trim({ threshold: 1 }).grayscale().resize({ width: WIDTH, height: Math.round(WIDTH * 1.25), fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ palette: true, quality: 90 }).toFile(path.join(OUT, name));
}

// the calm drawing's panel, in past its frame (it sits at 48-462, 215-773 of the half drawing)
const SHOULDER_PANEL = { left: 60, top: 228, width: 390, height: 532 };
const keyCorners = async (file, out) => {
  const { width: w, height: h } = await sharp(file).metadata();
  photocraft(file, out, [
    ['layer.new.layerFromBackground', { ifPresent: true }],
    ...[[3, 3], [w - 4, 3], [3, h - 4], [w - 4, h - 4]].flatMap(([x, y]) => [
      ['select.magicWand', { x, y, tolerance: 12, contiguous: true }],
      ['edit.clear', {}],
      ['select.deselect', {}],
    ]),
  ]);
};

// v0.96: keyed first and the head moved after (moving it first broke the outline at the shoulders, and the wand ran
// through into the pajamas)
async function shrug() {
  const tmp = path.join(GENERATED_DIR, 'relax-tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const panel = path.join(tmp, 'shoulders-calm-panel.png');
  const keyed = path.join(tmp, 'shoulders-calm-keyedfull.png');
  await sharp(path.join(ART, 'relax-shoulders-calm.png')).extract(SHOULDER_PANEL).png().toFile(panel);
  await keyCorners(panel, keyed);
  const d = 24;
  const box = { left: 118, top: 0, width: 160, height: 170 };
  const head = await sharp(keyed).extract(box).png().toBuffer();
  const clear = await sharp({ create: { width: box.width, height: d, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
  const tense = await sharp(keyed)
    .composite([{ input: clear, left: box.left, top: box.top, blend: 'dest-out' }, { input: head, left: box.left, top: box.top + d }])
    .png()
    .toBuffer();
  return { tense, calm: await sharp(keyed).png().toBuffer() };
}

async function finish(buffer, name) {
  await sharp(buffer).trim({ threshold: 1 }).grayscale().resize({ width: WIDTH, height: Math.round(WIDTH * 1.25), fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ palette: true, quality: 90 }).toFile(path.join(OUT, name));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const part of PARTS) {
    if (part === 'shoulders') {
      const pair = await shrug();
      await finish(pair.tense, `${part}-tense.png`);
      await finish(pair.calm, `${part}-calm.png`);
      continue;
    }
    await write(await half(path.join(ART, `relax-${part}-raw.png`), 'left'), `${part}-tense.png`);
    await write(await half(path.join(ART, `relax-${part}-raw.png`), 'right'), `${part}-calm.png`);
  }
  console.log(fs.readdirSync(OUT).map((f) => `${f} ${fs.statSync(path.join(OUT, f)).size}`).join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

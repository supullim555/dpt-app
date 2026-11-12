// The pictures for relaxing together (v0.93, BreatheTogether.tsx): each Gemini drawing (generate-hospital-art.js relax-*)
// is two panels, tensing on the left and letting go on the right; each half is trimmed to its panel, made grey and
// small, and written to src/assets/visit/relax/<part>-tense.jpg and -calm.jpg. No API calls.
//   node scripts/assets/build-relax.js
// The shoulders are the exception: asked for whole, the shrug kept coming with the hands behind the head, so the calm
// half of one drawing is kept and the shrug made from it here, the head moved down onto the shoulders.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { ASSETS_DIR, GENERATED_DIR } = require('../lib/paths');

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
  // trim the plain surround down to the panel, then grey and small
  const trimmed = await sharp(buffer).trim({ threshold: 18 }).png().toBuffer();
  await sharp(trimmed).grayscale().resize({ width: WIDTH }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, name));
}

async function shrug() {
  const calm = path.join(ART, 'relax-shoulders-calm.png');
  const d = 24;
  const box = { left: 178, top: 222, width: 160, height: 176 };
  const head = await sharp(calm).extract(box).png().toBuffer();
  const white = await sharp({ create: { width: box.width, height: d, channels: 3, background: '#fbfbfb' } }).png().toBuffer();
  return {
    tense: await sharp(calm).composite([{ input: white, left: box.left, top: box.top }, { input: head, left: box.left, top: box.top + d }]).png().toBuffer(),
    calm: await sharp(calm).png().toBuffer(),
  };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const part of PARTS) {
    const pair = part === 'shoulders' ? await shrug() : { tense: await half(path.join(ART, `relax-${part}-raw.png`), 'left'), calm: await half(path.join(ART, `relax-${part}-raw.png`), 'right') };
    await write(pair.tense, `${part}-tense.jpg`);
    await write(pair.calm, `${part}-calm.jpg`);
  }
  console.log(fs.readdirSync(OUT).map((f) => `${f} ${fs.statSync(path.join(OUT, f)).size}`).join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

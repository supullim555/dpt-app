// The cover for showing the game: the Gemini cover drawing (generate-hospital-art.js cover) with the title set over
// the plain wall at its top left. Writes art/cover/cover-square.png (1080x1080) and cover-wide.png (1920x1080, the
// drawing at the right and the wall carried on to the left). No API calls.
//   node scripts/assets/build-cover.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { ART_DIR, GENERATED_DIR } = require('../lib/paths');

const RAW = path.join(GENERATED_DIR, 'hospital-art', 'cover-raw.png');
const OUT = path.join(ART_DIR, 'cover');
const TITLE = '병문안';
const LINE = '그 아이에게 오늘 하루를 들려주는 일주일';
const INK = '#2b2a28';
const FONT = "Batang, 'Noto Serif KR', serif";

// `wall`: a soft patch of the wall's colour behind the words, so the drawing's lines don't run through them
const title = (w, h, x, y, size, wall) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      (wall ? `<defs><filter id="b"><feGaussianBlur stdDeviation="${size * 0.25}"/></filter></defs><rect x="${x - size * 0.3}" y="${y - size * 1.05}" width="${size * 4.1}" height="${size * 1.85}" rx="${size * 0.3}" fill="${wall}" fill-opacity="0.92" filter="url(#b)"/>` : '') +
      `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${INK}" letter-spacing="${size * 0.12}">${TITLE}</text>` +
      `<text x="${x + 4}" y="${y + size * 0.62}" font-family="${FONT}" font-size="${size * 0.19}" fill="${INK}" fill-opacity="0.75">${LINE}</text>` +
      `</svg>`
  );

async function build() {
  fs.mkdirSync(OUT, { recursive: true });
  const art = await sharp(RAW).resize(1080, 1080, { kernel: 'lanczos3' }).png().toBuffer();

  // the wall's own colour, from the plain patch above her head
  // (stats() reads the whole input, not the extract: cut the patch out first)
  const patch = await sharp(art).extract({ left: 60, top: 40, width: 400, height: 250 }).png().toBuffer();
  const { channels } = await sharp(patch).stats();
  const wall = `rgb(${channels.slice(0, 3).map((c) => Math.round(c.mean)).join(',')})`;
  await sharp(art).composite([{ input: title(1080, 1080, 64, 190, 112, wall) }]).png().toFile(path.join(OUT, 'cover-square.png'));

  // Wide: that colour carried on to the left, fading into the drawing's left edge.
  const FEATHER = 260;
  const fade = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><defs><linearGradient id="g" x1="0" x2="1">` +
      `<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="${FEATHER / 1080}" stop-color="#fff" stop-opacity="1"/>` +
      `</linearGradient></defs><rect width="1080" height="1080" fill="url(#g)"/></svg>`
  );
  const faded = await sharp(art).ensureAlpha().composite([{ input: fade, blend: 'dest-in' }]).png().toBuffer();
  await sharp({ create: { width: 1920, height: 1080, channels: 3, background: wall } })
    .composite([{ input: faded, left: 840, top: 0 }, { input: title(1920, 1080, 130, 470, 150) }])
    .png()
    .toFile(path.join(OUT, 'cover-wide.png'));
  console.log('cover-square.png, cover-wide.png in', OUT);
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});

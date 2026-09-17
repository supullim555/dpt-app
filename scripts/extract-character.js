const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = path.join(__dirname, '..', '캐릭터_스포트라이트_시트.png');
const OUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'character');

// The template's rounded "card" behind each pose uses two lavender-grey
// tones: a flat fill and a slightly darker vignette near the card edge.
// Key out pixels close to either, with a small feather so the cut edge
// isn't a hard jaggy line. Tight radii keep this from eating into the
// character's own pale/desaturated pixels (white shirt highlights etc).
const BG_COLORS = [
  { c: [215, 215, 227], inner: 16, outer: 30 },
  { c: [189, 194, 211], inner: 12, outer: 24 },
];

function bgAlpha(r, g, b) {
  let minAlpha = 255;
  for (const { c, inner, outer } of BG_COLORS) {
    const dist = Math.sqrt((r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2);
    if (dist < outer) {
      const t = Math.max(0, Math.min(1, (dist - inner) / (outer - inner)));
      minAlpha = Math.min(minAlpha, Math.round(t * 255));
    }
  }
  return minAlpha;
}

async function loadKeyed(x0, y0, w, h) {
  const { data, info } = await sharp(SRC)
    .extract({ left: x0, top: y0, width: w, height: h })
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < info.width * info.height; i++) {
    const o = i * 4;
    out[o + 3] = bgAlpha(data[o], data[o + 1], data[o + 2]);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

const IDLE_FRONT = { y: [87, 363], cells: [[628, 880], [891, 1143], [1155, 1407], [1419, 1671]] };
const WALK_SOUTH = { y: [438, 715], cells: [[628, 880], [891, 1143], [1155, 1408], [1419, 1672], [1684, 1935]] };
const PORTRAIT = { x: [111, 505], y: [64, 692] };

async function extractRow(spec, outFile) {
  const frameW = spec.cells[0][1] - spec.cells[0][0];
  const frameH = spec.y[1] - spec.y[0];
  const frames = await Promise.all(
    spec.cells.map(async ([x0, x1]) => {
      const buf = await loadKeyed(x0, spec.y[0], x1 - x0, frameH);
      return sharp(buf).resize(frameW, frameH).toBuffer();
    })
  );
  const sheetWidth = frameW * frames.length;
  await sharp({
    create: { width: sheetWidth, height: frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(frames.map((buf, i) => ({ input: buf, left: i * frameW, top: 0 })))
    .png()
    .toFile(outFile);
  console.log('wrote', outFile, sheetWidth, 'x', frameH, `(${frames.length} frames @ ${frameW}px)`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await extractRow(IDLE_FRONT, path.join(OUT_DIR, 'idle-front.png'));
  await extractRow(WALK_SOUTH, path.join(OUT_DIR, 'walk-south.png'));

  const portraitBuf = await loadKeyed(
    PORTRAIT.x[0],
    PORTRAIT.y[0],
    PORTRAIT.x[1] - PORTRAIT.x[0],
    PORTRAIT.y[1] - PORTRAIT.y[0]
  );
  fs.writeFileSync(path.join(OUT_DIR, 'portrait-front.png'), portraitBuf);
  console.log('wrote portrait-front.png');
}

main().catch((e) => { console.error(e); process.exit(1); });

const sharp = require('sharp');
const path = require('path');

const SRC = path.join(__dirname, '..', 'walk-away-generated.png');
const OUT_FILE = path.join(__dirname, '..', 'src', 'assets', 'character', 'walk-away.png');

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

const CORNER_RADIUS = 22;
const EDGE_TRIM = 4;
function cornerAlpha(x, y, width, height) {
  if (x < EDGE_TRIM || y < EDGE_TRIM || x >= width - EDGE_TRIM || y >= height - EDGE_TRIM) return 0;
  const inLeft = x <= CORNER_RADIUS;
  const inRight = x >= width - CORNER_RADIUS;
  const inTop = y <= CORNER_RADIUS;
  const inBottom = y >= height - CORNER_RADIUS;
  let cx = null, cy = null;
  if (inLeft && inTop) { cx = CORNER_RADIUS; cy = CORNER_RADIUS; }
  else if (inRight && inTop) { cx = width - CORNER_RADIUS; cy = CORNER_RADIUS; }
  else if (inLeft && inBottom) { cx = CORNER_RADIUS; cy = height - CORNER_RADIUS; }
  else if (inRight && inBottom) { cx = width - CORNER_RADIUS; cy = height - CORNER_RADIUS; }
  if (cx === null) return 255;
  return Math.hypot(x - cx, y - cy) > CORNER_RADIUS ? 0 : 255;
}

async function loadKeyed(x0, y0, w, h) {
  const { data, info } = await sharp(SRC)
    .extract({ left: x0, top: y0, width: w, height: h })
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const o = (y * info.width + x) * 4;
      out[o + 3] = Math.min(
        bgAlpha(data[o], data[o + 1], data[o + 2]),
        cornerAlpha(x, y, info.width, info.height)
      );
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

const Y0 = 294, Y1 = 545;
const CELLS = [[42, 296], [322, 575], [602, 853], [880, 1134]];
const TARGET_W = 252, TARGET_H = 277;

async function main() {
  const frames = await Promise.all(
    CELLS.map(async ([x0, x1]) => {
      const buf = await loadKeyed(x0, Y0, x1 - x0, Y1 - Y0);
      return sharp(buf).resize(TARGET_W, TARGET_H).toBuffer();
    })
  );
  const sheetWidth = TARGET_W * frames.length;
  await sharp({
    create: { width: sheetWidth, height: TARGET_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(frames.map((buf, i) => ({ input: buf, left: i * TARGET_W, top: 0 })))
    .png()
    .toFile(OUT_FILE);
  console.log('wrote', OUT_FILE, sheetWidth, 'x', TARGET_H, `(${frames.length} frames @ ${TARGET_W}px)`);
}

main().catch((e) => { console.error(e); process.exit(1); });

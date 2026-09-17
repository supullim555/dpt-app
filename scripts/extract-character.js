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

// Each card in the template has rounded corners, so the crop's four corner
// wedges are actually the page's plain white behind the card — not caught by
// the lavender color-key above. Punch those out geometrically instead of by
// color, since color-matching "white" would also eat the character's white
// shirt/socks. The character art never reaches into these corners.
const CORNER_RADIUS = 22;

// A rounded rect's corner is an arc centered *inset* by the radius from the
// true corner point — not the corner point itself. (Using the corner point
// as the circle center, as an earlier version of this did, means "distance
// > radius" is never true near the corner, so nothing actually gets cut.)
// A faint 1px sliver of the card's antialiased boundary survives right at
// the crop edge (distinct from the interior vignette, and just outside the
// color-key's radius) — trim a couple of pixels off every straight edge too,
// not just the rounded corners. Cheap insurance; the character never reaches
// this close to any edge.
const EDGE_TRIM = 3;

function cornerAlpha(x, y, width, height) {
  if (x < EDGE_TRIM || y < EDGE_TRIM || x >= width - EDGE_TRIM || y >= height - EDGE_TRIM) return 0;
  const inLeft = x <= CORNER_RADIUS;
  const inRight = x >= width - CORNER_RADIUS;
  const inTop = y <= CORNER_RADIUS;
  const inBottom = y >= height - CORNER_RADIUS;
  let cx = null;
  let cy = null;
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
      const i = y * info.width + x;
      const o = i * 4;
      const alpha = Math.min(
        bgAlpha(data[o], data[o + 1], data[o + 2]),
        cornerAlpha(x, y, info.width, info.height)
      );
      out[o + 3] = alpha;
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

const IDLE_FRONT = { y: [87, 363], cells: [[628, 880], [891, 1143], [1155, 1407], [1419, 1671]] };
// Cell 2 of the original 5 (x:[891,1143]) is a full back-of-head turn —
// dropped, since it reads as "walking away" no matter which way the
// character is actually moving on screen. The remaining 4 all face the
// viewer through the stride.
const WALK_SOUTH = { y: [438, 715], cells: [[628, 880], [1155, 1408], [1419, 1672], [1684, 1935]] };
// The dropped back-of-head frame, kept on its own — the only art we have
// that reads as "walking away from the viewer" (used for upward movement).
const WALK_AWAY = { y: [438, 715], cells: [[891, 1143]] };
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
  await extractRow(WALK_AWAY, path.join(OUT_DIR, 'walk-away.png'));

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

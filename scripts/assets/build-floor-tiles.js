// The floors (v0.93): five drawings of each space's ground, laid at random so no floor is one drawing over and over.
// Each Gemini sheet (generate-hospital-art.js floor-*) has six swatches on a plain ground, laid out however it came;
// they're found here, the frame round each trimmed off, brought to one shared lightness, and five kept. Written as one
// grey sheet, generated/hospital-sheets/sheet-floors.png: a row per space, 128 px tiles, five across. No API calls.
//   node scripts/assets/build-floor-tiles.js   (then pack-hospital-sheets.js)
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { GENERATED_DIR } = require('../lib/paths');
const { SINGLES } = require('./pack-hospital-sheets');

const ART = path.join(GENERATED_DIR, 'hospital-art');
const SHEET = 1024;
const CELL = 128;
/** Row by row, the order hospitalArt.ts FLOOR_ROW reads them in. `inset`: how much of each edge to cut off (its frame). */
const SPACES = [
  // `contrast`: how strongly its marks show, about its own lightness. Tiles keep their edges (inset 0): those are the joints
  // between tiles anyway. Sand's ripples soft, or ripples that don't meet across tiles read as a patchwork.
  { id: 'hospital', inset: 0, contrast: 1.6 },
  { id: 'courtyard', inset: 0.07, contrast: 0.8 },
  // light stones on a light ground can't be found on their own: these by hand (the fine gravel, much smaller, left out)
  { id: 'pebbles', inset: 0.05, contrast: 0.9, boxes: [[76, 74, 276, 274], [375, 74, 274, 274], [672, 74, 276, 274], [76, 673, 276, 276], [672, 673, 276, 276]] },
  { id: 'rehab', inset: 0, contrast: 1.3 },
  { id: 'sand', inset: 0.07, contrast: 0.35 },
  { id: 'paving', inset: 0, contrast: 0.8 },
  { id: 'dirt', inset: 0.07, contrast: 0.75 },
  { id: 'asphalt', inset: 0.07, contrast: 0.7 },
];
const KEEP = 5;
const SCAN = 256;

/** The swatches on a sheet: everything that isn't its plain ground, in boxes of about a swatch's size. */
async function swatches(file) {
  const { data, info } = await sharp(file).resize(SCAN, SCAN).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => [data[(y * SCAN + x) * 3], data[(y * SCAN + x) * 3 + 1], data[(y * SCAN + x) * 3 + 2]];
  const corners = [px(1, 1), px(SCAN - 2, 1), px(1, SCAN - 2), px(SCAN - 2, SCAN - 2)];
  // the ground: what's between the swatches, the colour at the corners and at the very middle gap is the same
  const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 40;
  const isGround = (x, y) => corners.some((c) => near(px(x, y), c)) || near(px(x, y), [255, 255, 255]);
  const seen = new Uint8Array(SCAN * SCAN);
  const boxes = [];
  for (let y = 0; y < SCAN; y++) {
    for (let x = 0; x < SCAN; x++) {
      if (seen[y * SCAN + x] || isGround(x, y)) continue;
      let [x0, y0, x1, y1, n] = [x, y, x, y, 0];
      const stack = [[x, y]];
      seen[y * SCAN + x] = 1;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        n++;
        x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= SCAN || ny >= SCAN || seen[ny * SCAN + nx] || isGround(nx, ny)) continue;
          seen[ny * SCAN + nx] = 1;
          stack.push([nx, ny]);
        }
      }
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      // a swatch: big, and near enough square
      if (w > SCAN * 0.15 && h > SCAN * 0.15 && w < SCAN * 0.48 && h < SCAN * 0.48 && w / h > 0.7 && w / h < 1.4) boxes.push({ x0, y0, w, h, n });
    }
  }
  const scale = info.width / SCAN;
  return boxes.map((b) => ({ left: Math.round(b.x0 * scale * 4), top: Math.round(b.y0 * scale * 4), width: Math.round(b.w * scale * 4), height: Math.round(b.h * scale * 4) }));
}

async function main() {
  const sheet = Buffer.alloc(SHEET * SHEET, 128);
  for (const [row, space] of SPACES.entries()) {
    const file = path.join(ART, `floor-${space.id}-raw.png`);
    const { width } = await sharp(file).metadata();
    const found = space.boxes ? space.boxes.map(([left, top, w, h]) => ({ left, top, width: w, height: h })) : (await swatches(file)).map((b) => {
      // back to full size (the scan was at 256, the drawing is `width`)
      const k = width / (SCAN * 4);
      return { left: Math.round(b.left * k), top: Math.round(b.top * k), width: Math.round(b.width * k), height: Math.round(b.height * k) };
    });
    if (found.length < KEEP) throw new Error(`floor-${space.id}: found ${found.length} swatches, need ${KEEP}`);
    const tiles = [];
    for (const b of found) {
      const cut = Math.round(Math.min(b.width, b.height) * space.inset);
      const grey = await sharp(file)
        .extract({ left: b.left + cut, top: b.top + cut, width: b.width - cut * 2, height: b.height - cut * 2 })
        .resize(CELL, CELL, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer();
      const mean = grey.reduce((a, v) => a + v, 0) / grey.length;
      tiles.push({ grey, mean });
    }
    // keep the five closest to the middle lightness, then bring each to it: the same floor, five ways
    const sorted = [...tiles].sort((a, b) => a.mean - b.mean);
    const middle = sorted[Math.floor(sorted.length / 2)].mean;
    const kept = [...tiles].sort((a, b) => Math.abs(a.mean - middle) - Math.abs(b.mean - middle)).slice(0, KEEP);
    const target = kept.reduce((a, t) => a + t.mean, 0) / KEEP;
    kept.forEach((t, col) => {
      for (let y = 0; y < CELL; y++) {
        for (let x = 0; x < CELL; x++) {
          const v = Math.max(0, Math.min(255, Math.round(target + (t.grey[y * CELL + x] - t.mean) * space.contrast)));
          sheet[(row * CELL + y) * SHEET + col * CELL + x] = v;
        }
      }
    });
    console.log(space.id, `${found.length} found, kept ${KEEP}, lightness ${Math.round(target)}`);
  }
  fs.mkdirSync(SINGLES, { recursive: true });
  await sharp(sheet, { raw: { width: SHEET, height: SHEET, channels: 1 } }).png().toFile(path.join(SINGLES, 'sheet-floors.png'));
  console.log('sheet-floors.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

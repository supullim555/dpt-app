// The floors (v0.93): five drawings of each space's ground, laid at random so no floor is one drawing over and over.
// v0.97: five different drawings side by side read as a patchwork. Now it's one drawing per ground, the swatch nearest
// the middle, and the five are that one turned and mirrored, the way a block game varies one texture. Grounds without
// joints (`seamless`) are made to run on across their edges first, so no square shows.
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
  // `plain`: a tiled floor keeps its joints and an even, finely speckled face; a mark of its own would repeat on every tile
  { id: 'hospital', plain: true, inset: 0, contrast: 1.6 },
  { id: 'courtyard', seamless: true, inset: 0.07, contrast: 0.8 },
  // light stones on a light ground can't be found on their own: these by hand (the fine gravel, much smaller, left out)
  { id: 'pebbles', seamless: true, inset: 0.05, contrast: 0.9, boxes: [[76, 74, 276, 274], [375, 74, 274, 274], [672, 74, 276, 274], [76, 673, 276, 276], [672, 673, 276, 276]] },
  { id: 'rehab', plain: true, inset: 0, contrast: 1.3 },
  { id: 'sand', seamless: true, soften: 2.5, inset: 0.07, contrast: 0.35 },
  { id: 'paving', inset: 0, contrast: 0.8 },
  { id: 'dirt', seamless: true, inset: 0.07, contrast: 0.75 },
  { id: 'asphalt', seamless: true, inset: 0.07, contrast: 0.7 },
];
const KEEP = 5;
const SCAN = 256;

/** A tiled floor's face without its marks: the joints (the outer few pixels) as drawn, inside them the tile blurred to
 * its shading only, with a fine seeded speckle so it isn't flat. */
async function plain(grey) {
  const soft = await sharp(grey, { raw: { width: CELL, height: CELL, channels: 1 } }).blur(14).extractChannel(0).raw().toBuffer();
  const out = Buffer.from(grey);
  let r = 12345;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const JOINT = 5;
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const d = Math.min(x, y, CELL - 1 - x, CELL - 1 - y);
      if (d < JOINT) continue;
      const t = Math.min(1, (d - JOINT) / 3);
      const inner = soft[y * CELL + x] + (rand() - 0.5) * 6;
      out[y * CELL + x] = Math.round(grey[y * CELL + x] * (1 - t) + inner * t);
    }
  }
  return out;
}

/** A tile that runs on across its own edges: blended with itself moved half a tile, weighted toward whichever copy is
 * further from its own edge there, so the seams of each fall in the other's middle. */
function seamless(grey) {
  const out = Buffer.alloc(CELL * CELL);
  const edge = (v) => Math.min(v, CELL - 1 - v) / (CELL / 2);
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const a = grey[y * CELL + x];
      const b = grey[((y + CELL / 2) % CELL) * CELL + ((x + CELL / 2) % CELL)];
      const wa = Math.min(edge(x), edge(y)) ** 1.5;
      const wb = Math.min(edge((x + CELL / 2) % CELL), edge((y + CELL / 2) % CELL)) ** 1.5;
      out[y * CELL + x] = Math.round((a * wa + b * wb) / (wa + wb + 1e-6));
    }
  }
  return out;
}

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
    // the one nearest the middle lightness, turned and mirrored five ways
    const sorted = [...tiles].sort((a, b) => a.mean - b.mean);
    const one = sorted[Math.floor(sorted.length / 2)];
    const target = one.mean;
    let base = space.seamless ? seamless(one.grey) : one.grey;
    if (space.soften) base = await sharp(base, { raw: { width: CELL, height: CELL, channels: 1 } }).blur(space.soften).extractChannel(0).raw().toBuffer();
    if (space.plain) base = await plain(one.grey);
    const ways = [(x, y) => [x, y], (x, y) => [y, CELL - 1 - x], (x, y) => [CELL - 1 - x, CELL - 1 - y], (x, y) => [CELL - 1 - y, x], (x, y) => [CELL - 1 - x, y]];
    ways.forEach((way, col) => {
      for (let y = 0; y < CELL; y++) {
        for (let x = 0; x < CELL; x++) {
          const [sx, sy] = way(x, y);
          const v = Math.max(0, Math.min(255, Math.round(target + (base[sy * CELL + sx] - one.mean) * space.contrast)));
          sheet[(row * CELL + y) * SHEET + col * CELL + x] = v;
        }
      }
    });
    console.log(space.id, `${found.length} found, one kept, lightness ${Math.round(target)}`);
  }
  fs.mkdirSync(SINGLES, { recursive: true });
  await sharp(sheet, { raw: { width: SHEET, height: SHEET, channels: 1 } }).png().toFile(path.join(SINGLES, 'sheet-floors.png'));
  console.log('sheet-floors.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

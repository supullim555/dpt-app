// Cuts the Gemini drawings (scripts/assets/generate-hospital-art.js, generated/hospital-art/) into the three
// one-channel sheets the hospital loads, and the opening's three pictures. No API calls: run it as often as you like.
//   node scripts/assets/build-hospital-sheets.js
// The cells here must match hospitalArt.ts. On a sheet, exactly black means nothing is there.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { GENERATED_DIR, ROOT } = require('../lib/paths');

const RAW = path.join(GENERATED_DIR, 'hospital-art');
const OUT = path.join(ROOT, 'src', 'assets', 'visit');
// Served as they are, and fetched only on reaching the hospital.
const SHEETS_OUT = path.join(ROOT, 'public', 'hospital');
const SHEET = 1024;
const EDGE = 6;
// The darkest ink a sheet may hold, so that hair isn't taken for nothing.
const INK_FLOOR = 20;
// How much greener than it is red or blue the painted background is, at the least.
const GREEN_BY = 10;
const SMALLEST_PIECE = 120;
const SEAL = 4;
const CROWN_ENDS = 505;

const bust = (src, box, x, y) => ({ src, box, cell: { x, y, w: 256, h: 340 }, scale: 0.64 });
const ITEMS = {
  people: [
    { src: 'people-a', box: [60, 190, 240, 790], cell: slot(0), height: 470 },
    { src: 'people-a', box: [280, 195, 480, 790], cell: slot(1), height: 480 },
    { src: 'people-a', box: [550, 235, 750, 790], cell: slot(2), height: 440 },
    { src: 'people-a', box: [800, 435, 935, 785], cell: slot(3), height: 300 },
    { src: 'people-b', box: [70, 185, 310, 885], cell: slot(4), height: 480 },
    { src: 'people-b', box: [430, 185, 620, 885], cell: slot(5), height: 470 },
    { src: 'people-b', box: [720, 200, 920, 880], cell: slot(6), height: 470 },
  ],
  props: [
    { src: 'large', box: [5, 255, 365, 720], cell: { x: 0, y: 0, w: 512, h: 512 }, solid: true, tone: tree },
    { src: 'bed', box: [295, 215, 720, 465], cell: { x: 512, y: 0, w: 512, h: 256 } },
    { src: 'bed', box: [265, 540, 750, 770], cell: { x: 512, y: 256, w: 512, h: 256 } },
    { src: 'large', box: [340, 480, 535, 725], cell: { x: 0, y: 512, w: 256, h: 256 } },
    { src: 'large', box: [560, 490, 765, 725], cell: { x: 256, y: 512, w: 256, h: 256 } },
    { src: 'large', box: [800, 400, 1000, 705], cell: { x: 512, y: 512, w: 256, h: 412 } },
    { src: 'small', box: [160, 265, 365, 455], cell: { x: 0, y: 768, w: 256, h: 256 }, edge: EDGE - 2 },
    { src: 'small', box: [600, 235, 790, 450], cell: { x: 256, y: 768, w: 256, h: 256 }, edge: EDGE - 2 },
    { src: 'small', box: [285, 480, 615, 745], cell: { x: 768, y: 512, w: 256, h: 256 }, edge: EDGE - 2 },
    { src: 'small', box: [615, 570, 840, 765], cell: { x: 768, y: 768, w: 256, h: 256 }, edge: EDGE - 2 },
  ],
  girl: [
    bust('heads-loose', [10, 225, 365, 770], 0, 0),
    bust('heads-loose', [405, 225, 660, 765], 256, 0),
    bust('heads-loose', [715, 220, 1005, 770], 512, 0),
    bust('heads-tied', [60, 275, 345, 765], 768, 0),
    bust('heads-tied', [680, 280, 1015, 765], 0, 340),
    bust('heads-tied-2', [655, 265, 985, 750], 256, 340),
    { src: 'body', box: [830, 460, 955, 735], cell: { x: 512, y: 340, w: 256, h: 340 } },
    { src: 'body', box: [30, 465, 370, 745], cell: { x: 0, y: 680, w: 256, h: 180 }, scale: 0.64 },
    // below her hair: the head on top of it is sometimes turned another way
    { src: 'body', box: [405, 500, 730, 752], cell: { x: 256, y: 680, w: 256, h: 180 }, scale: 0.64 },
    { src: 'things', box: [130, 110, 290, 325], cell: { x: 512, y: 680, w: 256, h: 172 } },
    { src: 'things', box: [640, 120, 895, 335], cell: { x: 512, y: 852, w: 256, h: 172 } },
    { src: 'things', box: [100, 400, 280, 925], cell: { x: 768, y: 340, w: 256, h: 684 } },
    { src: 'blanket', box: [10, 345, 1010, 765], cell: { x: 0, y: 860, w: 512, h: 164 }, keep: blanketOnly },
  ],
};

function slot(i) {
  return { x: (i % 4) * 256, y: Math.floor(i / 4) * 512, w: 256, h: 512 };
}

// The crown goes bright so it takes the window's light; the trunk stays out of it.
function tree(v, y) {
  return y < CROWN_ENDS ? Math.min(255, v * 1.5) : v * 0.55;
}

// A pillow came with it, which would sit in front of her: only what's below the blanket's top edge.
function blanketOnly(x, y) {
  const edge = [[0, 760], [20, 740], [190, 492], [270, 440], [360, 418], [500, 395], [660, 425], [760, 445], [830, 495], [1024, 760]];
  for (let i = 1; i < edge.length; i++) {
    if (x > edge[i][0]) continue;
    const [x0, y0] = edge[i - 1];
    const [x1, y1] = edge[i];
    return y >= y0 + ((y1 - y0) * (x - x0)) / (x1 - x0) - 4;
  }
  return false;
}

async function cut({ src, box, solid, keep, tone }) {
  const { data, info } = await sharp(path.join(RAW, `${src}-raw.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const [x0, y0, x1, y1] = box;
  const w = x1 - x0;
  const h = y1 - y0;
  const isGreen = (i) => data[i * 3 + 1] - Math.max(data[i * 3], data[i * 3 + 2]) > GREEN_BY;
  const at = (x, y) => (y0 + y) * info.width + x0 + x;
  const on = new Uint8Array(w * h);
  if (solid) {
    // Its leaves were shaded in the background's own green: only the green joined to the outside goes.
    // Its outline has gaps: thickened for this, so the outside can't get in through them.
    const wall = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (isGreen(at(x, y))) continue;
        for (let j = Math.max(0, y - SEAL); j <= Math.min(h - 1, y + SEAL); j++) for (let i = Math.max(0, x - SEAL); i <= Math.min(w - 1, x + SEAL); i++) wall[j * w + i] = 1;
      }
    }
    on.fill(1);
    const stack = [];
    for (let x = 0; x < w; x++) stack.push(x, x + (h - 1) * w);
    for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
    while (stack.length) {
      const k = stack.pop();
      if (!on[k] || wall[k]) continue;
      on[k] = 0;
      const x = k % w;
      if (x > 0) stack.push(k - 1);
      if (x < w - 1) stack.push(k + 1);
      if (k >= w) stack.push(k - w);
      if (k < w * (h - 1)) stack.push(k + w);
    }
    // Only the crown is shaded that green: below it the green simply goes, or the trunk gets a dark rim.
    for (let y = Math.max(0, CROWN_ENDS - y0); y < h; y++) for (let x = 0; x < w; x++) if (isGreen(at(x, y))) on[y * w + x] = 0;
  } else {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) on[y * w + x] = isGreen(at(x, y)) || (keep && !keep(x0 + x, y0 + y)) ? 0 : 1;
  }
  // Specks left in the green, which would stretch the box and get a paper margin of their own.
  const seen = new Uint8Array(w * h);
  const smallest = solid ? on.length / 8 : SMALLEST_PIECE;
  for (let start = 0; start < on.length; start++) {
    if (!on[start] || seen[start]) continue;
    const piece = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const k = stack.pop();
      piece.push(k);
      const x = k % w;
      for (const n of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, k >= w ? k - w : -1, k < w * (h - 1) ? k + w : -1]) {
        if (n >= 0 && on[n] && !seen[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    if (piece.length < smallest) for (const k of piece) on[k] = 0;
  }
  let left = w, right = 0, top = h, bottom = 0;
  const la = Buffer.alloc(w * h * 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!on[y * w + x]) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      const i = at(x, y) * 3;
      const lum = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
      la[(y * w + x) * 2] = Math.max(INK_FLOOR, Math.min(255, Math.round(tone ? tone(lum, y0 + y) : lum)));
      la[(y * w + x) * 2 + 1] = 255;
    }
  }
  return { la, w, h, trim: { left, top, width: right - left + 1, height: bottom - top + 1 } };
}

/** A white paper margin round everything in one cell, the way scissors would leave it. */
function cutEdge(sheet, cell, radius, paper = 244) {
  const { x, y, w, h } = cell;
  const far = 255;
  const dist = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (sheet[(y + j) * SHEET + x + i] > 12) continue;
      dist[j * w + i] = Math.min(far, Math.min(j > 0 ? dist[(j - 1) * w + i] : far, i > 0 ? dist[j * w + i - 1] : far) + 1);
    }
  }
  for (let j = h - 1; j >= 0; j--) {
    for (let i = w - 1; i >= 0; i--) {
      const k = j * w + i;
      if (dist[k] === 0) continue;
      dist[k] = Math.min(dist[k], Math.min(j < h - 1 ? dist[k + w] : far, i < w - 1 ? dist[k + 1] : far) + 1);
      if (dist[k] <= radius) sheet[(y + j) * SHEET + x + i] = paper;
    }
  }
}

async function buildSheet(name) {
  const sheet = new Uint8Array(SHEET * SHEET);
  for (const item of ITEMS[name]) {
    const { la, w, h, trim } = await cut(item);
    const edge = item.edge ?? EDGE;
    const room = { w: item.cell.w - (edge + 4) * 2, h: item.cell.h - (edge + 4) * 2 };
    const fit = item.scale ?? (item.height ? item.height / trim.height : 0);
    const by = fit || Math.min(room.w / trim.width, room.h / trim.height);
    const size = { width: Math.min(room.w, Math.round(trim.width * by)), height: Math.min(room.h, Math.round(trim.height * by)) };
    const { data, info } = await sharp(la, { raw: { width: w, height: h, channels: 2 } })
      .extract(trim)
      .resize({ ...size, fit: 'inside', kernel: 'lanczos3' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Standing on the cell's bottom edge, and in the middle of it.
    const ox = item.cell.x + Math.floor((item.cell.w - info.width) / 2);
    const oy = item.cell.y + item.cell.h - edge - 4 - info.height;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * info.channels;
        if (data[i + info.channels - 1] >= 128) sheet[(oy + y) * SHEET + ox + x] = Math.max(INK_FLOOR, data[i]);
      }
    }
    // The tree takes the window's light on whatever is bright: its margin stays under that, or it turns the colour of the day.
    cutEdge(sheet, item.cell, edge, item.solid ? 180 : 244);
  }
  if (name === 'props') {
    // her hairpin, the one thing on her with a colour of its own (the shader's)
    const pin = Buffer.from(`<svg width="64" height="64"><rect x="4" y="23" width="56" height="18" fill="rgb(242,242,242)" transform="rotate(-23 32 32)"/></svg>`);
    const { data } = await sharp(pin).extractChannel('red').raw().toBuffer({ resolveWithObject: true });
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) sheet[(940 + y) * SHEET + 512 + x] = data[y * 64 + x];
  }
  fs.mkdirSync(SHEETS_OUT, { recursive: true });
  const file = path.join(SHEETS_OUT, `sheet-${name}.png`);
  await sharp(Buffer.from(sheet), { raw: { width: SHEET, height: SHEET, channels: 1 } }).toColourspace('b-w').png({ compressionLevel: 9, palette: false }).toFile(file);
  console.log(`sheet-${name}.png`, fs.statSync(file).size);
}

// The opening: grey like everything else, with the seal and her window as the only colours.
const OPENING = [
  { name: 'op-hand', src: 'op-hand', crop: { left: 112, top: 0, width: 737, height: 1024 }, mark: `<circle cx="540" cy="540" r="17" fill="#a4263f"/>` },
  { name: 'op-desk', src: 'op-desk-2', crop: { left: 150, top: 0, width: 737, height: 1024 } },
  { name: 'op-hospital', src: 'op-hospital', crop: { left: 175, top: 56, width: 672, height: 933 }, mark: `<rect x="526" y="432" width="83" height="46" fill="#dba83f"/>` },
];

async function buildOpening({ name, src, crop, mark }) {
  const grey = await sharp(path.join(RAW, `${src}-raw.png`)).removeAlpha().greyscale().toColourspace('srgb').png().toBuffer();
  const layers = mark ? [{ input: Buffer.from(`<svg width="1024" height="1024">${mark}</svg>`) }] : [];
  const out = await sharp(grey).composite(layers).png().toBuffer();
  const file = path.join(OUT, `${name}.jpg`);
  await sharp(out).extract(crop).resize(720, 1000).jpeg({ quality: 74, mozjpeg: true }).toFile(file);
  console.log(`${name}.jpg`, fs.statSync(file).size);
}

(async () => {
  for (const name of Object.keys(ITEMS)) await buildSheet(name);
  for (const item of OPENING) await buildOpening(item);
})();

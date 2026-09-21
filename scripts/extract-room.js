// Cuts the Gemini room images (generated/room/*-raw.png) into game assets in
// src/assets/room/: white background -> transparent, trimmed to the object, and
// downsized. Also writes manifest.json with each asset's pixel size, which the
// room layout uses to keep every object's proportions.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const RAW_DIR = path.join(__dirname, '..', 'generated', 'room');
const OUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'room');

const OBJECTS = [
  'bed', 'nightstand', 'bookshelf', 'desk_set', 'rug', 'cushion', 'plant', 'wardrobe',
  'wall_frames', 'window', 'standing_lamp', 'teddy_bear', 'book_stack', 'basket',
];
const TILES = ['floor', 'wallpaper'];

const BG_DIST = 34; // distance from pure white still counted as background
const HALO_DIST = 90; // pale pixels touching the background become half-transparent
const MAX_SIDE = 420; // longest side of a saved object (plenty for a phone screen at 2-3x)
const TILE_WIDTH = 720;

// Same idea as extract-portrait.js: flood from the edges through near-white
// pixels, so whites enclosed by an outline (pillows, clouds in the window) survive.
async function cutOut(name) {
  const { data, info } = await sharp(path.join(RAW_DIR, `${name}-raw.png`))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const dist = (i) => Math.hypot(255 - data[i * 4], 255 - data[i * 4 + 1], 255 - data[i * 4 + 2]);

  const bg = new Uint8Array(W * H);
  const stack = [];
  const push = (x, y) => {
    const i = y * W + x;
    if (!bg[i] && dist(i) < BG_DIST) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < W; x++) (push(x, 0), push(x, H - 1));
  for (let y = 0; y < H; y++) (push(0, y), push(W - 1, y));
  while (stack.length) {
    const i = stack.pop();
    const x = i % W;
    const y = (i - x) / W;
    if (x > 0) push(x - 1, y);
    if (x < W - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < H - 1) push(x, y + 1);
  }

  // The generator leaves faint specks (corner ticks, dust) that aren't connected to
  // the background fill. Keep only real pieces of the object: connected components
  // of non-background pixels at least ~2% the size of the biggest one.
  const comp = new Int32Array(W * H).fill(-1);
  const sizes = [];
  for (let s0 = 0; s0 < W * H; s0++) {
    if (bg[s0] || comp[s0] !== -1) continue;
    const id = sizes.length;
    let count = 0;
    const st = [s0];
    comp[s0] = id;
    while (st.length) {
      const i = st.pop();
      count++;
      const x = i % W;
      const y = (i - x) / W;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (!bg[j] && comp[j] === -1) {
          comp[j] = id;
          st.push(j);
        }
      }
    }
    sizes.push(count);
  }
  const biggest = Math.max(...sizes);
  const keep = sizes.map((n) => n >= biggest * 0.02);

  const out = Buffer.from(data);
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (bg[i] || !keep[comp[i]]) {
        out[i * 4 + 3] = 0;
        continue;
      }
      const edge = (x > 0 && bg[i - 1]) || (x < W - 1 && bg[i + 1]) || (y > 0 && bg[i - W]) || (y < H - 1 && bg[i + W]);
      if (edge && dist(i) < HALO_DIST) out[i * 4 + 3] = 110;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const cropped = sharp(out, { raw: { width: W, height: H, channels: 4 } }).extract({
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  });
  const buf = await cropped.resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  await sharp(buf).toFile(path.join(OUT_DIR, `${name}.png`));
  return sharp(buf).metadata();
}

async function tile(name) {
  // Shave a few px so any faint border from the generator isn't tiled in.
  const meta = await sharp(path.join(RAW_DIR, `${name}-raw.png`)).metadata();
  const buf = await sharp(path.join(RAW_DIR, `${name}-raw.png`))
    .extract({ left: 6, top: 6, width: meta.width - 12, height: meta.height - 12 })
    .resize({ width: TILE_WIDTH })
    .png()
    .toBuffer();
  await sharp(buf).toFile(path.join(OUT_DIR, `${name}.png`));
  return sharp(buf).metadata();
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = {};
  for (const n of OBJECTS) {
    const m = await cutOut(n);
    manifest[n] = { width: m.width, height: m.height };
    console.log(n, `${m.width}x${m.height}`);
  }
  for (const n of TILES) {
    const m = await tile(n);
    manifest[n] = { width: m.width, height: m.height };
    console.log(n, `${m.width}x${m.height} (tile)`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
})();

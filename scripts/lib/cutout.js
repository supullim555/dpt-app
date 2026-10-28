// White-background cut-out for Gemini outputs: the algorithm extract-room / extract-quest-icons /
// extract-stat-icons each used to carry a full copy of.
//
//   1. Flood from the image edges through near-white pixels — whatever the fill reaches is
//      background. Whites ENCLOSED by an outline (pillows, a mask's eye holes, clouds in a
//      window) are never reached, so they stay opaque.
//   2. Group what's left into connected pieces and drop specks smaller than `speckRatio` of the
//      biggest piece (stray generator noise).
//   3. Pale pixels right on the background edge become half-transparent, softening the cut.
//   4. Crop to the content and shrink to fit `maxSide` (never enlarged).
const sharp = require('sharp');

const DEFAULTS = {
  bgDist: 34, // distance from pure white still counted as background
  haloDist: 90, // pale pixels touching the background become half-transparent
  haloAlpha: 110,
  speckRatio: 0.02,
};

/** Returns the cut-out as a PNG buffer. `input` is a path or a buffer. */
async function cutOutWhite(input, { maxSide, ...opts }) {
  const { bgDist, haloDist, haloAlpha, speckRatio } = { ...DEFAULTS, ...opts };
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const dist = (i) => Math.hypot(255 - data[i * 4], 255 - data[i * 4 + 1], 255 - data[i * 4 + 2]);

  // 1. background flood fill from the edges
  const bg = new Uint8Array(W * H);
  const stack = [];
  const push = (x, y) => {
    const i = y * W + x;
    if (!bg[i] && dist(i) < bgDist) {
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

  // 2. connected foreground pieces, specks dropped
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
  const keep = sizes.map((n) => n >= biggest * speckRatio);

  // 3. alpha + halo, tracking the content box
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
      if (edge && dist(i) < haloDist) out[i * 4 + 3] = haloAlpha;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // 4. crop + fit
  return sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
}

/**
 * Cuts `<rawDir>/<name>-raw.png` -> `<outDir>/<name>.png` for each name, skipping (and saying so)
 * any whose raw file doesn't exist yet. Returns { name: { width, height } } for what was written.
 */
async function cutOutAll({ rawDir, outDir, names, maxSide, ...opts }) {
  const fs = require('fs');
  const path = require('path');
  fs.mkdirSync(outDir, { recursive: true });
  const sizes = {};
  for (const name of names) {
    const raw = path.join(rawDir, `${name}-raw.png`);
    if (!fs.existsSync(raw)) {
      console.log('skip (no raw file):', name);
      continue;
    }
    const buf = await cutOutWhite(raw, { maxSide, ...opts });
    await sharp(buf).toFile(path.join(outDir, `${name}.png`));
    const { width, height } = await sharp(buf).metadata();
    sizes[name] = { width, height };
    console.log(name, `${width}x${height}`);
  }
  return sizes;
}

module.exports = { cutOutWhite, cutOutAll };

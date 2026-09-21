// Cuts every Gemini character strip (generated/<dir>/<clip>-raw.png) into game sheets:
// src/assets/character/clips/<clip>.png, one row of equal cells per clip, plus
// clips/manifest.json (cell size and standing height).
//
// Per strip: white background -> transparent (flood from the edges), stray specks
// dropped, frames found by splitting on empty columns, then every frame is scaled by
// ONE factor per clip (so she doesn't "grow" between frames) and seated on a shared
// baseline. All clips — standing AND walking — share the same cell size, and scale to
// the same standing height, so switching between them never makes her jump or resize.
//
// Horizontal anchor differs by kind: standing clips align on where her FEET are; walking
// clips align on her BODY (upper 60%), because in a walk the feet swing apart and back
// and anchoring on them would make the whole body jitter left and right.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'src', 'assets', 'character', 'clips');

// clip -> where its raw strip lives, the expected frame count (a mismatch is reported,
// not fatal) and the alignment anchor
const CLIPS = {
  breathe: { dir: 'idle', frames: 5, anchor: 'feet' },
  blink: { dir: 'idle', frames: 4, anchor: 'feet' },
  look: { dir: 'idle', frames: 5, anchor: 'feet' },
  stretch: { dir: 'idle', frames: 5, anchor: 'feet' },
  walk_down: { dir: 'walk', frames: 5, anchor: 'body' },
  walk_up: { dir: 'walk', frames: 5, anchor: 'body' },
  walk_side: { dir: 'walk', frames: 5, anchor: 'body' },
};

const BG_DIST = 34; // distance from pure white still counted as background
const HALO_DIST = 90; // pale pixels touching the background become half-transparent
const MIN_GAP = 6; // empty columns that separate two frames
const STAND_H = 200; // her standing height in the output cells (source px)

async function loadFrames(name, { dir, frames: expected, anchor }) {
  const { data, info } = await sharp(path.join(ROOT, 'generated', dir, `${name}-raw.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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

  // drop specks: connected non-background pieces far smaller than the biggest
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
  const solid = new Uint8Array(W * H);
  const out = Buffer.from(data);
  for (let i = 0; i < W * H; i++) {
    if (bg[i] || sizes[comp[i]] < biggest * 0.01) {
      out[i * 4 + 3] = 0;
      continue;
    }
    solid[i] = 1;
    const x = i % W;
    const y = (i - x) / W;
    const edge = (x > 0 && bg[i - 1]) || (x < W - 1 && bg[i + 1]) || (y > 0 && bg[i - W]) || (y < H - 1 && bg[i + W]);
    if (edge && dist(i) < HALO_DIST) out[i * 4 + 3] = 110;
  }

  // frames = runs of occupied columns separated by >= MIN_GAP empty ones
  const occupied = new Uint8Array(W);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid[y * W + x]) occupied[x] = 1;
  const runs = [];
  let start = -1;
  let gap = 0;
  for (let x = 0; x <= W; x++) {
    if (x < W && occupied[x]) {
      if (start < 0) start = x;
      gap = 0;
    } else if (start >= 0) {
      gap++;
      if (gap >= MIN_GAP || x === W) {
        runs.push([start, x - gap]);
        start = -1;
        gap = 0;
      }
    }
  }
  const frameRuns = runs.filter(([a, b]) => b - a + 1 >= 40);
  if (frameRuns.length !== expected) console.warn(`  ! ${name}: found ${frameRuns.length} frames, expected ${expected}`);

  const frames = [];
  for (const [x0, x1] of frameRuns) {
    let minY = H, maxY = 0;
    for (let y = 0; y < H; y++) for (let x = x0; x <= x1; x++) if (solid[y * W + x]) (minY = Math.min(minY, y), (maxY = Math.max(maxY, y)));
    // anchor x: mean column of the solid pixels in the lowest 10% (feet) or the upper 60% (body)
    const [yA, yB] = anchor === 'body' ? [minY, minY + Math.round((maxY - minY) * 0.6)] : [maxY - Math.round((maxY - minY) * 0.1), maxY];
    let sx = 0, n = 0;
    for (let y = yA; y <= yB; y++) for (let x = x0; x <= x1; x++) if (solid[y * W + x]) (sx += x, n++);
    const anchorX = n ? sx / n - x0 : (x1 - x0) / 2;
    const buf = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
      .extract({ left: x0, top: minY, width: x1 - x0 + 1, height: maxY - minY + 1 })
      .png()
      .toBuffer();
    frames.push({ buf, w: x1 - x0 + 1, h: maxY - minY + 1, anchorX });
  }
  return frames;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const clips = {};
  for (const [name, spec] of Object.entries(CLIPS)) {
    const frames = await loadFrames(name, spec);
    const heights = frames.map((f) => f.h).sort((a, b) => a - b);
    const scale = STAND_H / heights[Math.floor(heights.length / 2)]; // median = her standing height
    clips[name] = frames.map((f) => ({
      ...f,
      w: Math.max(1, Math.round(f.w * scale)),
      h: Math.max(1, Math.round(f.h * scale)),
      anchorX: f.anchorX * scale,
    }));
    console.log(name.padEnd(10), `${frames.length} frames, scale ${scale.toFixed(3)}, sizes:`, clips[name].map((f) => `${f.w}x${f.h}`).join(' '));
  }

  // One cell for every clip: wide enough for the widest pose about her anchor, tall for the tallest.
  const all = Object.values(clips).flat();
  const half = Math.ceil(Math.max(...all.map((f) => Math.max(f.anchorX, f.w - f.anchorX))));
  const CELL_W = half * 2 + 4;
  const CELL_H = Math.max(...all.map((f) => f.h)) + 2;

  const manifest = { cellWidth: CELL_W, cellHeight: CELL_H, contentHeight: STAND_H, clips: {} };
  for (const [name, frames] of Object.entries(clips)) {
    const composites = [];
    for (const [i, f] of frames.entries()) {
      const img = await sharp(f.buf).resize(f.w, f.h).png().toBuffer();
      composites.push({ input: img, left: i * CELL_W + Math.round(CELL_W / 2 - f.anchorX), top: CELL_H - f.h });
    }
    const size = { width: CELL_W * frames.length, height: CELL_H, channels: 4 };
    await sharp({ create: { ...size, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(composites)
      .png()
      .toFile(path.join(OUT_DIR, `${name}.png`));
    manifest.clips[name] = { frames: frames.length };
    // review sheet on the room's dark color
    await sharp({ create: { ...size, background: { r: 58, g: 42, b: 36, alpha: 1 } } })
      .composite(composites)
      .png()
      .toFile(path.join(ROOT, 'generated', CLIPS[name].dir, `${name}-review.png`));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`cell ${CELL_W}x${CELL_H}, standing height ${STAND_H}px`);
})();

// Erases unwanted letters Gemini drew into a picture (an English word on a coupon, a logo on a snack bag).
//   node erase-text.js in.png out.png x0 y0 x1 y1 [cx0 cy0 cx1 cy1]
// The box x0..y1 (pixels of the raw image) should just hold the word. Dark strokes wholly inside it (each letter its
// own connected piece) are filled with the paper around them, soft grey edges too; strokes that run out past the box
// (an outline, a finger) are kept. A letter that touches a line you keep can't be told apart from it: give a second box
// cx0..cy1 to clear outright (find it with a pixel map of that corner first). Keep the original raw: write to a new
// file, look at a zoomed crop, then replace.
const path = require('path');
const sharp = require(path.join(path.resolve(__dirname, '../../../..'), 'node_modules/sharp'));
const [inp, out, ...b] = process.argv.slice(2);
const [x0, y0, x1, y1] = b.map(Number);
(async () => {
  const { data, info } = await sharp(inp).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, C = info.channels;
  const lum = (x, y) => { const i = (y * W + x) * C; return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; };
  const inBox = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const DARK = 170;
  const label = new Int32Array(W * info.height).fill(-1);
  const pieces = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (label[y * W + x] !== -1 || lum(x, y) >= DARK) continue;
      const id = pieces.length, stack = [[x, y]], pts = [];
      let edge = false;
      label[y * W + x] = id;
      while (stack.length) {
        const [px, py] = stack.pop();
        pts.push([px, py]);
        if (px === x0 || px === x1 || py === y0 || py === y1) edge = true;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx, ny = py + dy;
            if (!inBox(nx, ny) || label[ny * W + nx] !== -1 || lum(nx, ny) >= DARK) continue;
            label[ny * W + nx] = id;
            stack.push([nx, ny]);
          }
      }
      pieces.push({ pts, edge });
    }
  const kept = new Set(pieces.flatMap((p, i) => (p.edge ? [i] : [])));
  // the paper: the median of the light pixels in the box
  const light = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (lum(x, y) > 225) light.push((y * W + x) * C);
  const pick = (c) => { const v = light.map((i) => data[i + c]).sort((a, b) => a - b); return v[v.length >> 1] ?? 250; };
  const paper = [pick(0), pick(1), pick(2)];
  const nearKept = (x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const l = label[(y + dy) * W + (x + dx)]; if (l !== -1 && kept.has(l)) return true; } return false; };
  let erased = 0;
  pieces.forEach((p, id) => {
    if (p.edge) return;
    for (const [px, py] of p.pts)
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const x = px + dx, y = py + dy;
          if (!inBox(x, y) || nearKept(x, y)) continue;
          const i = (y * W + x) * C;
          if (lum(x, y) < 250) { data[i] = paper[0]; data[i + 1] = paper[1]; data[i + 2] = paper[2]; erased++; }
        }
  });
  // and a plain box to clear outright, where a letter touches a line that stays (here the E, against the thumb)
  const clear = process.argv.slice(8).map(Number);
  if (clear.length === 4) {
    const [cx0, cy0, cx1, cy1] = clear;
    for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) { const i = (y * W + x) * C; if (lum(x, y) < 250) { data[i] = paper[0]; data[i + 1] = paper[1]; data[i + 2] = paper[2]; erased++; } }
  }
  await sharp(data, { raw: { width: W, height: info.height, channels: C } }).png().toFile(out);
  console.log('pieces', pieces.length, 'kept', kept.size, 'erased px', erased, 'paper', paper.join(','));
})();

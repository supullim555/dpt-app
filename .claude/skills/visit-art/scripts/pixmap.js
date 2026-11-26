// A text map of how dark each pixel is in a small region, to see exactly where a letter ends and a line begins.
//   node pixmap.js image.png x0 y0 x1 y1        (keep it under ~40 x 40)
// ## dark, ++ mid, .. light, blank = paper. Columns are labelled with the last two digits of x.
const path = require('path');
const sharp = require(path.join(path.resolve(__dirname, '../../../..'), 'node_modules/sharp'));
const [file, ...b] = process.argv.slice(2);
const [x0, y0, x1, y1] = b.map(Number);
(async () => {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const C = info.channels;
  const lum = (x, y) => {
    const i = (y * W + x) * C;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };
  let s = '     ';
  for (let x = x0; x <= x1; x++) s += String(x % 100).padStart(2, ' ');
  s += '\n';
  for (let y = y0; y <= y1; y++) {
    s += String(y).padStart(4, ' ') + ' ';
    for (let x = x0; x <= x1; x++) {
      const l = lum(x, y);
      s += l < 90 ? '##' : l < 170 ? '++' : l < 235 ? '..' : '  ';
    }
    s += '\n';
  }
  console.log(s);
})();

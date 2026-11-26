// Contact sheet: many screenshots or pictures in one labelled image, so one Read reviews them all (a fraction of the
// tokens of reading each).
//   node sheet.js <out.png> <cellWidth> <columns> <file...>
// Phone screenshots: 300 px wide, 5-6 columns. Comics or art to judge hands and faces: 560 px, 2 columns.
const path = require('path');
const APP = path.resolve(__dirname, '../../../..');
const sharp = require(path.join(APP, 'node_modules/sharp'));

const [out, sizeS, colsS, ...files] = process.argv.slice(2);
if (!out || !files.length) {
  console.error('usage: node sheet.js <out.png> <cellWidth> <columns> <file...>');
  process.exit(1);
}
const size = +sizeS;
const cols = +colsS;
const esc = (s) => s.replace(/[&<>"]/g, '');
(async () => {
  const label = 18;
  const cells = [];
  for (const f of files) {
    const m = await sharp(f).metadata();
    const h = Math.round((size * m.height) / m.width);
    cells.push({ f, h, buf: await sharp(f).flatten({ background: '#ffffff' }).resize(size, h).png().toBuffer() });
  }
  const rowH = Math.max(...cells.map((c) => c.h)) + label + 6;
  const comps = [];
  cells.forEach((c, i) => {
    const x = (i % cols) * (size + 6);
    const y = Math.floor(i / cols) * rowH;
    const svg = Buffer.from(`<svg width="${size}" height="${label}"><rect width="100%" height="100%" fill="#fff"/><text x="3" y="13" font-size="13" font-family="Arial">${esc(path.basename(c.f))}</text></svg>`);
    comps.push({ input: svg, left: x, top: y }, { input: c.buf, left: x, top: y + label });
  });
  const rows = Math.ceil(cells.length / cols);
  await sharp({ create: { width: cols * (size + 6), height: rows * rowH, channels: 3, background: '#888' } }).composite(comps).png().toFile(out);
  console.log(out);
})();

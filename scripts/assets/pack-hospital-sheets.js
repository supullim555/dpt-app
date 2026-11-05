// Stacks the hospital's one-channel sheets (build-hospital-sheets.js writes them to generated/hospital-sheets/) into
// one tall lossless WebP, so reaching the hospital is one request instead of eleven. Its address carries a hash of
// its contents, so it can be cached for good (vercel.json) and a new build is still fetched.
//   node scripts/assets/pack-hospital-sheets.js   (build-hospital-sheets.js runs it at the end)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { GENERATED_DIR, ROOT } = require('../lib/paths');

const SHEET = 1024;
const SINGLES = path.join(GENERATED_DIR, 'hospital-sheets');
const OUT = path.join(ROOT, 'public', 'hospital', 'sheets.webp');
const LIST = path.join(ROOT, 'src', 'features', 'visit', 'hospitalSheets.ts');
// Top to bottom. The key is the name hospitalArt.ts loads it by, the value the file it was built as.
const ORDER = { structure: 'structure', people: 'people', people2: 'people2', props: 'props', girl: 'girl', lying: 'lying', extra: 'extra', furniture: 'furniture', memory: 'memory', memoryProps: 'memoryprops', memoryProps2: 'memoryprops2' };

async function pack() {
  const sheets = await Promise.all(Object.values(ORDER).map((n) => sharp(path.join(SINGLES, `sheet-${n}.png`)).extractChannel(0).raw().toBuffer()));
  for (const [i, s] of sheets.entries()) if (s.length !== SHEET * SHEET) throw new Error(`${Object.values(ORDER)[i]}: not ${SHEET} square`);
  const tall = Buffer.concat(sheets);
  const webp = await sharp(tall, { raw: { width: SHEET, height: SHEET * sheets.length, channels: 1 } }).webp({ lossless: true, effort: 6 }).toBuffer();
  // The same pixels back, or it isn't shipped.
  const back = await sharp(webp).extractChannel(0).raw().toBuffer();
  if (!back.equals(tall)) throw new Error('sheets.webp does not give the same pixels back');
  fs.writeFileSync(OUT, webp);
  const hash = crypto.createHash('sha256').update(webp).digest('hex').slice(0, 10);
  fs.writeFileSync(
    LIST,
    `// Written by scripts/assets/pack-hospital-sheets.js: don't edit by hand.\n` +
      `export const SHEETS_URL = '/hospital/sheets.webp?v=${hash}';\n` +
      `/** Top to bottom on it, each ${SHEET} square. */\n` +
      `export const SHEET_ORDER = ${JSON.stringify(Object.keys(ORDER)).replace(/,/g, ', ')} as const;\n`
  );
  console.log('sheets.webp', webp.length, hash);
}

module.exports = { pack, SINGLES };
if (require.main === module) pack().catch((e) => {
  console.error(e);
  process.exit(1);
});

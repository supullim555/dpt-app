// The dictionary's pictures (Dictionary.tsx, v0.96): each Gemini drawing (generate-hospital-art.js dict-*) made grey and
// small, as the rest of the game, and written to src/assets/visit/dictionary/<id>.jpg. No API calls.
//   node scripts/assets/build-dictionary.js                -> every dict-*-raw.png there is
//   node scripts/assets/build-dictionary.js mindread fortune
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { ASSETS_DIR, GENERATED_DIR } = require('../lib/paths');

const ART = path.join(GENERATED_DIR, 'hospital-art');
const OUT = path.join(ASSETS_DIR, 'visit', 'dictionary');
const SIZE = 360;

(async () => {
  const all = fs.readdirSync(ART).filter((f) => /^dict-.*-raw\.png$/.test(f)).map((f) => f.slice('dict-'.length, -'-raw.png'.length));
  const ids = process.argv.length > 2 ? process.argv.slice(2) : all;
  for (const id of ids) {
    const file = path.join(ART, `dict-${id}-raw.png`);
    if (!fs.existsSync(file)) throw new Error(`no ${file}`);
    await sharp(file).resize(SIZE, SIZE, { fit: 'cover' }).grayscale().jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, `${id}.jpg`));
    console.log(id, fs.statSync(path.join(OUT, `${id}.jpg`)).size);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

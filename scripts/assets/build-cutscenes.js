// Builds the video cutscenes with EffectCraft (an open After Effects clone built on this machine,
// ../../artcraft-suite/effectcraft): cuts the layers out of the Gemini drawings (keyed in PhotoCraft), runs the
// scene's script to lay them out in 3D with a camera, focus and light, and renders an H.264 MP4 into
// public/cutscenes/. No API calls. Writes src/features/visit/cutscenes.ts with the address and a hash of the video.
//   node scripts/assets/build-cutscenes.js
// For now one scene: the last light (scripts/assets/cutscenes/last-light.jsx).
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { GENERATED_DIR, ROOT } = require('../lib/paths');
const { KEY, photocraft } = require('./retouch-hospital-art');

const ART = path.join(GENERATED_DIR, 'hospital-art');
const WORK = path.join(GENERATED_DIR, 'cutscenes', 'light');
const OUT = path.join(ROOT, 'public', 'cutscenes', 'last-light.mp4');
const LIST = path.join(ROOT, 'src', 'features', 'visit', 'cutscenes.ts');
const EFFECTCRAFT = process.env.EFFECTCRAFT_CLI ?? path.join(process.env.USERPROFILE ?? '', 'Documents', 'artcraft-suite', 'effectcraft', 'target', 'release', 'effectcraft-cli.exe');
const slash = (p) => p.replace(/\\/g, '/');

// [layer, drawing, box [left, top, width, height], keyed?]
const LAYERS = [
  ['ginkgo', 'large', [0, 250, 352, 480], true],
  ['ground-crop', 'yard-scene', [556, 306, 418, 400], false],
  ['turn-back', 'girl-turn', [12, 222, 350, 546], true],
  ['turn-side', 'girl-turn', [368, 222, 334, 546], true],
  ['turn-front', 'girl-turn', [704, 222, 318, 546], true],
];

async function build() {
  if (!fs.existsSync(EFFECTCRAFT)) throw new Error(`EffectCraft CLI not found at ${EFFECTCRAFT} (set EFFECTCRAFT_CLI).`);
  fs.mkdirSync(WORK, { recursive: true });
  for (const [name, src, [left, top, width, height], keyed] of LAYERS) {
    const crop = path.join(WORK, keyed ? `${name}-crop.png` : `${name}.png`);
    await sharp(path.join(ART, `${src}-raw.png`)).extract({ left, top, width, height }).png().toFile(crop);
    if (keyed) photocraft(crop, path.join(WORK, `${name}.png`), KEY);
  }
  const jsx = fs
    .readFileSync(path.join(__dirname, 'cutscenes', 'last-light.jsx'), 'utf8')
    .replace('__DIR__', `${slash(WORK)}/`)
    .replace('__SKY__', slash(path.join(ART, 'sky-autumn-raw.png')));
  const script = path.join(WORK, 'last-light.jsx');
  fs.writeFileSync(script, jsx);
  execFileSync(EFFECTCRAFT, ['script', script], { stdio: ['ignore', 'inherit', 'inherit'] });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  execFileSync(EFFECTCRAFT, ['render', '--project', path.join(WORK, 'last-light.ecproj'), '--comp', 'last-light', '--format', 'h264', '--bitrate', '900', '--out', OUT], { stdio: ['ignore', 'ignore', 'inherit'] });
  const video = fs.readFileSync(OUT);
  const hash = crypto.createHash('sha256').update(video).digest('hex').slice(0, 10);
  fs.writeFileSync(
    LIST,
    `// Written by scripts/assets/build-cutscenes.js: don't edit by hand.\n` +
      `/** The last light: she turns under the ginkgo, the light, the world in colour, ending on amber. 540x960. */\n` +
      `export const LAST_LIGHT_URL = '/cutscenes/last-light.mp4?v=${hash}';\n`
  );
  console.log('last-light.mp4', video.length, hash);
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Builds the video cutscenes with EffectCraft (an open After Effects clone built on this machine,
// ../../artcraft-suite/effectcraft): cuts the layers out of the Gemini drawings (keyed in PhotoCraft), runs the
// scene's script to lay them out in 3D with a camera, focus and light, and renders an H.264 MP4 into
// public/cutscenes/. No API calls. Writes src/features/visit/cutscenes.ts with the addresses and a hash of each video.
//   node scripts/assets/build-cutscenes.js                 all of them
//   node scripts/assets/build-cutscenes.js mem-collar      one (others keep their last render)
//   node scripts/assets/build-cutscenes.js mem-collar --frames   only a few stills to look at, into generated/cutscenes/
// The last light (cutscenes/last-light.jsx, v0.87) and her four memories (cutscenes/memory.jsx, v0.92).
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { GENERATED_DIR, ROOT } = require('../lib/paths');
const { KEY, photocraft } = require('./retouch-hospital-art');

const ART = path.join(GENERATED_DIR, 'hospital-art');
const WORK_ROOT = path.join(GENERATED_DIR, 'cutscenes');
const OUT_DIR = path.join(ROOT, 'public', 'cutscenes');
const LIST = path.join(ROOT, 'src', 'features', 'visit', 'cutscenes.ts');
const EFFECTCRAFT = process.env.EFFECTCRAFT_CLI ?? path.join(process.env.USERPROFILE ?? '', 'Documents', 'artcraft-suite', 'effectcraft', 'target', 'release', 'effectcraft-cli.exe');
const slash = (p) => p.replace(/\\/g, '/');

// Cut a layer out of a drawing: [left, top, width, height] of the raw 1024 image; keyed ones lose their green in
// PhotoCraft and are trimmed to what's left.
async function cutLayer(work, name, src, box, keyed) {
  const [left, top, width, height] = box;
  const out = path.join(work, `${name}.png`);
  const crop = path.join(work, keyed ? `${name}-crop.png` : `${name}.png`);
  await sharp(path.join(ART, `${src}-raw.png`)).extract({ left, top, width, height }).png().toFile(crop);
  if (!keyed) return out;
  const keyedFile = path.join(work, `${name}-keyed.png`);
  photocraft(crop, keyedFile, KEY);
  await sharp(keyedFile).trim({ threshold: 1 }).png().toFile(out);
  return out;
}

const LAST_LIGHT = {
  id: 'last-light',
  jsx: 'last-light.jsx',
  // [layer, drawing, box, keyed?]
  layers: [
    ['ginkgo', 'large', [0, 250, 352, 480], true],
    ['ground-crop', 'yard-scene', [556, 306, 418, 400], false],
    ['turn-back', 'girl-turn', [12, 222, 350, 546], true],
    ['turn-side', 'girl-turn', [368, 222, 334, 546], true],
    ['turn-front', 'girl-turn', [704, 222, 318, 546], true],
  ],
};

// Her memories. Each layer: [name, drawing, box, keyed?, { pos [x, y, z], scale, anchor, move }]; listed back to front.
// The comp is 540x960 and the camera sits 750 in front of z 0, so a layer at z 0 shows at its own size.
const MEMORIES = [
  {
    id: 'mem-collar', // the morning walk: down the street with the dog
    duration: 8,
    // children laughing and the dog barking, twice each (generated/sound: CREDITS.txt)
    sounds: [
      { file: 'giggle.wav', at: 1.3, from: 2.6, length: 1.5, gain: -9 },
      { file: 'dog.wav', at: 3.1, from: 0.0, length: 0.42, gain: -4 },
      { file: 'giggle.wav', at: 4.4, from: 3.3, length: 1.2, gain: -11 },
      { file: 'dog.wav', at: 6.0, from: 0.5, length: 0.45, gain: -6 },
    ],
    camera: { from: [250, 470], to: [300, 500], push: 140, focus: 0, aperture: 10 },
    layers: [
      ['street', 'mem-collar-bg', [0, 0, 1024, 1024], false, { pos: [270, 420, 900], scale: 225, anchor: 'center' }],
      ['walk', 'mem-collar-fig', [70, 210, 870, 640], true, { pos: [230, 900, 0], scale: 60, anchor: 'bottom', move: [70, 0, -40] }],
    ],
  },
  {
    id: 'mem-snack', // the last one in the bag, in front of the shop after school
    duration: 8,
    sounds: [{ file: 'rustle.wav', at: 3.2, from: 0, length: 0.7, gain: -6 }], // the bag, once
    camera: { from: [270, 500], to: [270, 540], push: 160, focus: 0, aperture: 10 },
    layers: [
      ['sky', 'sky-dusk', [0, 0, 1024, 1024], false, { pos: [270, 300, 1400], scale: 300, anchor: 'center' }],
      // the pavement, lying flat from the shop out to us
      ['pavement', 'yard-scene', [556, 306, 418, 400], false, { pos: [270, 760, 150], scale: 220, anchor: 'center', xRotation: 90 }],
      ['shop', 'mem-snack-bg', [40, 180, 944, 680], true, { pos: [270, 760, 450], scale: 120, anchor: 'bottom' }],
      // close, their seats below the frame: two friends at the table, not two girls in the air
      ['friends', 'mem-snack-fig', [50, 230, 940, 590], true, { pos: [270, 1060], scale: 60, anchor: 'bottom', front: true }],
    ],
  },
  {
    id: 'mem-laces', // last in the race, out of breath and smiling
    duration: 8,
    // her running steps coming closer, one after another (the step sounds from public/sound, copied to generated/sound)
    sounds: [1.4, 1.85, 2.3, 2.75, 3.2, 3.65, 4.1, 4.55, 5.0, 5.45, 5.9].map((at, i) => ({ file: `step${i % 4}.wav`, at, from: 0, length: 0.24, gain: -14 + i })),
    camera: { from: [270, 470], to: [270, 500], push: 60, focus: -60, aperture: 9 },
    layers: [
      ['track', 'mem-laces-bg', [0, 0, 1024, 1024], false, { pos: [270, 470, 800], scale: 210, anchor: 'center' }],
      ['ahead', 'mem-laces-fig', [380, 70, 240, 140], true, { pos: [270, 560, 420], scale: 70, anchor: 'bottom', move: [0, -20, 250] }],
      ['her', 'mem-laces-fig', [360, 230, 300, 760], true, { pos: [270, 1000, 120], scale: 60, anchor: 'bottom', move: [0, 0, -220] }],
    ],
  },
  {
    id: 'mem-coupon', // shouting more than singing, after the exams
    duration: 8,
    sounds: [
      { file: 'giggle.wav', at: 1.6, from: 0.4, length: 2.2, gain: -5 },
      { file: 'giggle.wav', at: 4.8, from: 2.8, length: 1.8, gain: -7 },
    ],
    camera: { from: [230, 500], to: [300, 520], push: 150, focus: 0, aperture: 10 },
    layers: [
      ['room', 'mem-coupon-bg', [0, 0, 1024, 1024], false, { pos: [270, 470, 700], scale: 195, anchor: 'center' }],
      ['three', 'mem-coupon-fig', [60, 120, 920, 810], true, { pos: [270, 980, 0], scale: 50, anchor: 'bottom' }],
    ],
  },
];

// v0.93: the way down to the ginkgo. Its corridors are the game's own on the seventh day, photographed from the 3D
// hospital with nothing else on screen (generated/cutscenes/descent/plate-*.png: 4F from (7, 4) west, 3F (7, 7) west,
// 2F (4, 4) east, 1F (7, 9) south); she's generate-hospital-art.js girl-walk.
const STEP_TIMES = (from, to) => Array.from({ length: Math.floor((to - from) / 0.55) + 1 }, (_, i) => from + i * 0.55);
const DESCENT = {
  segment: 3.4,
  crossfade: 0.7,
  floors: [
    { plate: 'plate-4', lines: ['4층. 복도 불빛을 하나씩 지나간다.'], at: [270, 785], to: [258, 735], scale: 50 },
    // on the chair nearest, held still so she stays on it (the plate from (7, 7) looking west); turned to face as it does
    { plate: 'plate-3', lines: ['3층. 의자에 앉아 오래 쉰다.', '"괜찮아. 가."'], rest: true, still: true, at: [112, 776], scale: 54, mirror: true },
    { plate: 'plate-2', lines: ['2층. "숨차다." 소녀가 웃는다.'], at: [282, 785], to: [270, 740], scale: 50 },
    { plate: 'plate-1', lines: ['1층. 사람들 사이를 지나 안뜰로 나간다.'], at: [270, 790], to: [270, 725], scale: 48 },
  ],
};

async function buildDescent() {
  const work = path.join(WORK_ROOT, 'descent');
  fs.mkdirSync(work, { recursive: true });
  const walk = await cutLayer(work, 'walk', 'girl-walk', [78, 128, 370, 774], true);
  const rest = await cutLayer(work, 'rest', 'girl-walk', [518, 168, 430, 738], true);
  const seg = DESCENT.segment;
  // steps while she walks (not on the third floor, where she sits)
  const steps = [0, 2, 3].flatMap((i) => STEP_TIMES(i * seg + 0.6, (i + 1) * seg + 0.2)).map((at, n) => ({ file: slash(path.join(GENERATED_DIR, 'sound', `step${n % 4}.wav`)), at, gain: -12 }));
  const project = path.join(work, 'descent.ecproj');
  const scene = {
    name: 'descent',
    segment: seg,
    crossfade: DESCENT.crossfade,
    walk: slash(walk),
    rest: slash(rest),
    floors: DESCENT.floors.map((f) => ({ ...f, plate: slash(path.join(work, `${f.plate}.png`)) })),
    steps,
    save: slash(project),
  };
  const script = path.join(work, 'descent.jsx');
  fs.writeFileSync(script, fs.readFileSync(path.join(__dirname, 'cutscenes', 'descent.jsx'), 'utf8').replace('__SCENE__', JSON.stringify(scene)));
  execFileSync(EFFECTCRAFT, ['script', script], { stdio: ['ignore', 'inherit', 'inherit'] });
  return { project, comp: 'descent', times: [1.5, 4.8, 8.3, 11.8], audio: true };
}

function render(project, comp, out, audio = false) {
  execFileSync(EFFECTCRAFT, ['render', '--project', project, '--comp', comp, '--format', 'h264', '--bitrate', '900', '--audio', audio ? 'on' : 'off', '--out', out], { stdio: ['ignore', 'ignore', 'inherit'] });
}

async function buildLastLight() {
  const work = path.join(WORK_ROOT, 'light');
  fs.mkdirSync(work, { recursive: true });
  for (const [name, src, box, keyed] of LAST_LIGHT.layers) {
    // the last light's layers keep their crops as they are (its script anchors them by those sizes)
    const [left, top, width, height] = box;
    const crop = path.join(work, keyed ? `${name}-crop.png` : `${name}.png`);
    await sharp(path.join(ART, `${src}-raw.png`)).extract({ left, top, width, height }).png().toFile(crop);
    if (keyed) photocraft(crop, path.join(work, `${name}.png`), KEY);
  }
  const jsx = fs
    .readFileSync(path.join(__dirname, 'cutscenes', 'last-light.jsx'), 'utf8')
    .replace('__DIR__', `${slash(work)}/`)
    .replace('__SKY__', slash(path.join(ART, 'sky-autumn-raw.png')));
  const script = path.join(work, 'last-light.jsx');
  fs.writeFileSync(script, jsx);
  execFileSync(EFFECTCRAFT, ['script', script], { stdio: ['ignore', 'inherit', 'inherit'] });
  return { project: path.join(work, 'last-light.ecproj'), comp: 'last-light', times: [1, 2.75, 5, 9] };
}

async function buildMemory(m) {
  const work = path.join(WORK_ROOT, m.id);
  fs.mkdirSync(work, { recursive: true });
  const layers = [];
  for (const [name, src, box, keyed, place] of m.layers) {
    const file = await cutLayer(work, name, src, box, keyed);
    layers.push({ file: slash(file), ...place });
  }
  const project = path.join(work, `${m.id}.ecproj`);
  const sounds = (m.sounds ?? []).map((s) => ({ ...s, file: slash(path.join(GENERATED_DIR, 'sound', s.file)) }));
  const scene = { name: m.id, duration: m.duration, camera: m.camera, layers, sounds, save: slash(project) };
  const script = path.join(work, `${m.id}.jsx`);
  fs.writeFileSync(script, fs.readFileSync(path.join(__dirname, 'cutscenes', 'memory.jsx'), 'utf8').replace('__SCENE__', JSON.stringify(scene)));
  execFileSync(EFFECTCRAFT, ['script', script], { stdio: ['ignore', 'inherit', 'inherit'] });
  return { project, comp: m.id, times: [1.2, 4, 6.8], audio: sounds.length > 0 };
}

async function stills(id, { project, comp, times }) {
  const shots = [];
  for (const t of times) {
    const f = path.join(WORK_ROOT, `${id}-${t}.png`);
    execFileSync(EFFECTCRAFT, ['render-frame', '--project', project, '--comp', comp, '--time', String(t), '--out', f], { stdio: 'ignore' });
    shots.push(await sharp(f).resize(270, 480).toBuffer());
  }
  const sheet = path.join(WORK_ROOT, `${id}-stills.png`);
  await sharp({ create: { width: 270 * shots.length, height: 480, channels: 3, background: '#000' } })
    .composite(shots.map((input, i) => ({ input, left: i * 270, top: 0 })))
    .png()
    .toFile(sheet);
  console.log(sheet);
}

const hashOf = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10);

function writeList() {
  const url = (id) => `/cutscenes/${id}.mp4?v=${hashOf(path.join(OUT_DIR, `${id}.mp4`))}`;
  const ids = { collar: 'mem-collar', snack: 'mem-snack', laces: 'mem-laces', coupon: 'mem-coupon' };
  fs.writeFileSync(
    LIST,
    `// Written by scripts/assets/build-cutscenes.js: don't edit by hand.\n` +
      `import type { ClueId } from './progress';\n\n` +
      `/** The last light: she turns under the ginkgo, the light, the world in colour, ending on amber. 540x960. */\n` +
      `export const LAST_LIGHT_URL = '${url('last-light')}';\n\n` +
      `/** The way down to the ginkgo, floor by floor in the seventh day's corridors, from black to black. 540x960. */\n` +
      `export const DESCENT_URL = '${url('descent')}';\n\n` +
      `/** Her memories, one for each thing found: from black to black, 8 seconds, 540x960. */\n` +
      `export const MEMORY_FILM: Record<ClueId, string> = {\n` +
      Object.entries(ids)
        .map(([clue, id]) => `  ${clue}: '${url(id)}',\n`)
        .join('') +
      `};\n`
  );
}

async function main() {
  if (!fs.existsSync(EFFECTCRAFT)) throw new Error(`EffectCraft CLI not found at ${EFFECTCRAFT} (set EFFECTCRAFT_CLI).`);
  const args = process.argv.slice(2);
  const onlyFrames = args.includes('--frames');
  const only = args.filter((a) => !a.startsWith('--'));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const scenes = [{ id: 'last-light', build: buildLastLight }, { id: 'descent', build: buildDescent }, ...MEMORIES.map((m) => ({ id: m.id, build: () => buildMemory(m) }))];
  for (const s of scenes) {
    if (only.length && !only.includes(s.id)) continue;
    const built = await s.build();
    if (onlyFrames) {
      await stills(s.id, built);
      continue;
    }
    const out = path.join(OUT_DIR, `${s.id}.mp4`);
    render(built.project, built.comp, out, built.audio);
    console.log(`${s.id}.mp4`, fs.statSync(out).size);
  }
  if (!onlyFrames && scenes.every((s) => fs.existsSync(path.join(OUT_DIR, `${s.id}.mp4`)))) writeList();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Retouches the cut-out assets in src/assets with PhotoCraft (the open-source Photoshop clone in
// artcraft-suite, driven headless — NOT Adobe; there's no Adobe install on this machine). Last
// step of the asset pipeline, after extract-*.js:
//
//   node scripts/assets/polish.js              -> everything
//   node scripts/assets/polish.js quest-icons  -> just the assets whose path contains that
//
// Always starts from a pristine copy in generated/unpolished/ (made the first time an asset is
// seen), so running this twice doesn't sharpen twice. After re-running an extract script, delete
// that asset's copy in generated/unpolished/ or its new version will be ignored.
//
// Only colour may change: a result with different dimensions or a single different alpha value is
// refused, because sprite frames and the room's manifest.json depend on them.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const sharp = require('sharp');
const { ASSETS_DIR, GENERATED_DIR } = require('../lib/paths');

const PHOTOCRAFT =
  process.env.PHOTOCRAFT_CLI || 'C:/Users/user/Documents/artcraft-suite/photocraft/target/release/photocraft-cli.exe';

// Layer > Matting > Defringe: recolours the 1px rim left behind by the white-background cut-out
// (pale specks that show on anything darker than white) from the colours just inside it.
const DEFRINGE = { command: 'layer.matting.defringe', params: { width: 1 } };
// Quest icons show at 26px inside a white button: pale colours wash out and edges go soft.
const ICON_PUNCH = [
  { command: 'image.adjustments.vibrance', params: { vibrance: 30, saturation: 0 } },
  { command: 'filter.sharpen.unsharpMask', params: { amount: 70, radius: 1, threshold: 0 } },
];

const RECIPES = {
  'character/portrait-front.png': [DEFRINGE],
  ...Object.fromEntries(
    ['blink', 'breathe', 'look', 'stretch', 'walk_down', 'walk_side', 'walk_up'].map((c) => [`character/clips/${c}.png`, [DEFRINGE]])
  ),
  ...Object.fromEntries(
    ['basket', 'bed', 'book_stack', 'bookshelf', 'cushion', 'desk_set', 'nightstand', 'plant', 'rug', 'standing_lamp', 'teddy_bear', 'wall_frames', 'wardrobe', 'window'].map(
      (n) => [`room/${n}.png`, [DEFRINGE]]
    )
  ),
  ...Object.fromEntries(
    ['defusion-play', 'externalization-interview', 'letter-from-future-self', 'scaling-exception'].map((n) => [
      `quest-icons/${n}.png`,
      [DEFRINGE, ...ICON_PUNCH],
    ])
  ),
};

// One long-lived headless session; its file access is limited to generated/.
function openSession() {
  const proc = spawn(PHOTOCRAFT, ['serve', '--automation-read-root', '.', '--automation-write-root', '.'], { cwd: GENERATED_DIR });
  proc.stderr.on('data', (d) => process.stderr.write(d));
  const pending = new Map();
  readline.createInterface({ input: proc.stdout }).on('line', (line) => {
    const msg = JSON.parse(line);
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  });
  let nextId = 0;
  const call = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, (m) => (m.ok ? resolve(m.result) : reject(new Error(`${method}: ${m.error}`))));
      proc.stdin.write(JSON.stringify({ id, method, params }) + '\n');
    });
  return { call, close: () => proc.stdin.end() };
}

async function assertOnlyColourChanged(before, after, name) {
  const read = (f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [a, b] = [await read(before), await read(after)];
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) throw new Error(`${name}: size changed`);
  for (let i = 3; i < a.data.length; i += 4) {
    if (a.data[i] !== b.data[i]) throw new Error(`${name}: alpha changed at byte ${i}`);
  }
}

(async () => {
  const filters = process.argv.slice(2);
  const names = Object.keys(RECIPES).filter((n) => !filters.length || filters.some((f) => n.includes(f)));
  const session = openSession();
  try {
    for (const name of names) {
      const pristine = path.join(GENERATED_DIR, 'unpolished', name);
      const output = path.join(GENERATED_DIR, 'polished', name);
      if (!fs.existsSync(pristine)) {
        fs.mkdirSync(path.dirname(pristine), { recursive: true });
        fs.copyFileSync(path.join(ASSETS_DIR, name), pristine);
      }
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.rmSync(output, { force: true });
      await session.call('doc.open', { path: `unpolished/${name}` });
      for (const step of RECIPES[name]) await session.call('engine.execute', step);
      await session.call('doc.save', { path: `polished/${name}` });
      await session.call('doc.close');
      await assertOnlyColourChanged(pristine, output, name);
      // Through sharp, as extract-*.js writes them: same PNG encoding as the rest of src/assets.
      await sharp(output).png().toFile(path.join(ASSETS_DIR, name));
      console.log('polished', name);
    }
  } finally {
    session.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

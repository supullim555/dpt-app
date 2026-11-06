// Photoshop-style retouching of the Gemini drawings, done headless with PhotoCraft (an open Photoshop clone built on this
// machine, ../../artcraft-suite/photocraft). Reads generated/hospital-art/<src>-raw.png and writes <name>-retouched.png
// beside it, which build-hospital-sheets.js uses in place of the raw drawing. No API calls.
//   node scripts/assets/retouch-hospital-art.js
//
// What it's for, each a thing the plain green-key and resize pipeline couldn't do:
// - keying with the Magic Wand: only the green joined to the corner goes, so leaves drawn in the same green as the
//   background stay (the vegetable stall, the potted plant on the alley wall; until v0.86 both were unusable).
// - Curves: the market's paving at less contrast, so its stones don't shout under the stalls.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GENERATED_DIR } = require('../lib/paths');

const RAW = path.join(GENERATED_DIR, 'hospital-art');
const PHOTOCRAFT = process.env.PHOTOCRAFT_CLI ?? path.join(process.env.USERPROFILE ?? '', 'Documents', 'artcraft-suite', 'photocraft', 'target', 'release', 'photocraft-cli.exe');

// Select the background from the top-left corner (contiguous, so enclosed greens are left alone), take in its fringe and
// clear it: a layer with transparency where the background was.
const KEY = [
  ['layer.new.layerFromBackground', { ifPresent: true }],
  ['select.magicWand', { x: 4, y: 4, tolerance: 28, contiguous: true }],
  ['select.modify.expand', { radius: 1 }],
  ['edit.clear', {}],
  ['select.deselect', {}],
];

const JOBS = [
  { name: 'market-props-keyed', src: 'market-props', steps: KEY },
  { name: 'night-props-keyed', src: 'night-props', steps: KEY },
  // the shadows lifted and the whites held down a little: the same stones, quieter
  { name: 'tex-ground-soft', src: 'tex-ground', steps: [['image.adjustments.curves', { points: [[0, 64], [96, 128], [190, 200], [255, 236]] }]] },
];

if (!fs.existsSync(PHOTOCRAFT)) {
  console.error(`PhotoCraft CLI not found at ${PHOTOCRAFT} (set PHOTOCRAFT_CLI).`);
  process.exit(1);
}
for (const job of JOBS) {
  const args = ['run', path.join(RAW, `${job.src}-raw.png`)];
  for (const [cmd, params] of job.steps) args.push('--cmd', cmd, '--params', JSON.stringify(params));
  const out = path.join(RAW, `${job.name}-retouched.png`);
  args.push('--out', out);
  execFileSync(PHOTOCRAFT, args, { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log(`${job.name}-retouched.png`, fs.statSync(out).size);
}

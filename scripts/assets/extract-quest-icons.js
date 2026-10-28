// Cuts the Gemini quest-icon raw images (generated/quest-icons/<id>-raw.png) into game assets in
// src/assets/quest-icons/ — white background -> transparent, trimmed, downsized (lib/cutout.js).
// Shown tiny inside QuestWidget's round buttons, hence the small maxSide.
const path = require('path');
const { cutOutAll } = require('../lib/cutout');
const { GENERATED_DIR, ASSETS_DIR } = require('../lib/paths');

cutOutAll({
  rawDir: path.join(GENERATED_DIR, 'quest-icons'),
  outDir: path.join(ASSETS_DIR, 'quest-icons'),
  names: ['externalization-interview', 'scaling-exception', 'letter-from-future-self', 'defusion-play', 'thought-check'],
  maxSide: 120, // plenty for a ~28px on-screen icon at up to 4x pixel density
});

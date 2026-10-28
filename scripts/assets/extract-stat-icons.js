// Cuts the Gemini stat-icon raw images (generated/stat-icons/<id>-raw.png) into game assets in
// src/assets/stat-icons/ — white background -> transparent, trimmed, downsized (lib/cutout.js).
const path = require('path');
const { cutOutAll } = require('../lib/cutout');
const { GENERATED_DIR, ASSETS_DIR } = require('../lib/paths');

cutOutAll({
  rawDir: path.join(GENERATED_DIR, 'stat-icons'),
  outDir: path.join(ASSETS_DIR, 'stat-icons'),
  names: ['courage', 'insight', 'hope', 'flexibility', 'calm', 'bond'],
  maxSide: 120, // plenty for a ~24-28px on-screen icon at up to 4x pixel density
});

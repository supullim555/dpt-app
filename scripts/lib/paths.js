// Where the asset pipeline reads and writes — one place, so a script never hand-builds
// `path.join(__dirname, '..', '..', ...)` again.
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

module.exports = {
  ROOT,
  /** Raw Gemini outputs (gitignored): generated/<group>/<name>-raw.png */
  GENERATED_DIR: path.join(ROOT, 'generated'),
  /** Cut-out assets the app bundles: src/assets/<group>/<name>.png */
  ASSETS_DIR: path.join(ROOT, 'src', 'assets'),
  /** Hand-made source art (the style reference every generation call is sent with). */
  ART_DIR: path.join(ROOT, 'art'),
  REFERENCE_SHEET: path.join(ROOT, 'art', '캐릭터_스포트라이트_시트.png'),
};

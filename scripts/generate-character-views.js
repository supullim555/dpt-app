// Regenerates the character's other views in the SAME art as the detailed portrait, so
// walking / standing / talking all look like one character (the old walk sheets were
// cut from tiny low-res cells of the original sheet and read as a different drawing).
//
//   node scripts/generate-character-views.js turnaround          -> front / side / back reference
//   node scripts/generate-character-views.js walk_down walk_up walk_side
//   node scripts/generate-character-views.js --all               -> everything not yet generated
//
// One call per name, no automatic retries, existing raw files are skipped (delete one on
// purpose to redo it). Run only when the user has explicitly asked — every call is billed.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { generateImage } = require('./lib/gemini');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'generated', 'walk');
const CHAR_DIR = path.join(ROOT, 'src', 'assets', 'character');

const DESCRIPTION = `long brown hair with a white heart hair clip, white long-sleeve shirt, navy tie, dark grey pleated skirt, white knee-high socks, black mary-jane shoes`;

const STYLE_RULES = `- Match the pixel-art style of the reference exactly: same chunky pixel size, dark-brown outlines, colors, proportions (chibi, big head) and level of detail. It must look like the same character drawn by the same artist.
- Background: plain solid pure white (#FFFFFF) everywhere. No cards, panels, rounded corners, drop shadows, floor, grid lines, borders, text, numbers or labels.`;

const TURNAROUND_PROMPT = `The attached image shows the reference for ONE character: a large detailed portrait and, next to it, the small game sprite of the same character (${DESCRIPTION}).

Generate ONE image: a character turnaround of this SAME character standing in a neutral relaxed pose (arms down at her sides), shown from exactly 3 views in ONE single row, left to right:
(1) front view facing the viewer, exactly like the reference portrait,
(2) side view in profile, facing to the right,
(3) back view facing away from the viewer (the long brown hair covers her back, then the pleated skirt, socks and black shoes).

Rules:
- The three views have exactly the same size, the same feet baseline and clear empty white space between them (no touching or overlapping).
- The side and back views must keep exactly the same hair length and volume, the same clothes, colors and proportions as the front view. Do not redesign anything.
${STYLE_RULES}
- Nothing else in the image besides the 3 views.`;

const WALKS = {
  walk_down: 'walking straight toward the viewer (front view)',
  walk_up: 'walking straight away from the viewer (back view, we see her back and the back of her head)',
  walk_side: 'walking to the right in side profile (facing right)',
};

function walkPrompt(name) {
  return `The attached image shows the reference for ONE character: on the left a large detailed portrait, on the right a turnaround (front, side, back) of the same character (${DESCRIPTION}).

Generate ONE image: a horizontal strip of exactly 6 animation frames of this SAME character ${WALKS[name]}: one complete looping walk cycle with the legs stepping alternately, the arms swinging gently, the hair and skirt swaying a little and a small up-and-down bob.

Rules:
- Exactly 6 frames in ONE single row, left to right in animation order, evenly spaced, with clear empty white space between neighbouring frames (they must not touch or overlap).
- In EVERY one of the 6 frames she faces exactly the same direction: ${WALKS[name]}. Never turn her to another direction in any frame (no side view, no three-quarter view unless that is the described direction).
- She walks IN PLACE like on a treadmill: in every frame she has exactly the same size and is centered in her own slot, with the planted foot on exactly the same baseline. She does not travel across the strip.
- The last frame leads smoothly back into the first frame, so the loop is seamless.
- Keep exactly the same character design as the reference in every frame (same hair, clothes, colors, proportions). Do not redesign anything.
${STYLE_RULES}
- Nothing else in the image besides the 6 frames.`;
}

async function buildReference(withTurnaround) {
  const out = path.join(OUT_DIR, withTurnaround ? 'reference-walk.png' : 'reference-turnaround.png');
  const portrait = await sharp(path.join(CHAR_DIR, 'portrait-front.png')).resize({ height: 620 }).toBuffer();
  const pm = await sharp(portrait).metadata();
  let right;
  if (withTurnaround) {
    right = await sharp(path.join(OUT_DIR, 'turnaround-raw.png')).resize({ height: 620, fit: 'inside' }).toBuffer();
  } else {
    right = await sharp(path.join(CHAR_DIR, 'idle-front.png'))
      .extract({ left: 4, top: 0, width: 244, height: 276 })
      .resize({ height: 620 })
      .toBuffer();
  }
  const rm = await sharp(right).metadata();
  await sharp({ create: { width: pm.width + rm.width + 90, height: 700, channels: 4, background: '#ffffff' } })
    .composite([
      { input: portrait, left: 30, top: 40 },
      { input: right, left: 60 + pm.width, top: 40 },
    ])
    .png()
    .toFile(out);
  return out;
}

(async () => {
  const known = ['turnaround', ...Object.keys(WALKS)];
  const args = process.argv.slice(2);
  const names = args.includes('--all') ? known : args;
  const unknown = names.filter((n) => !known.includes(n));
  if (!names.length || unknown.length) {
    console.error(unknown.length ? `Unknown: ${unknown.join(', ')}` : 'Name views or pass --all.', '\nKnown:', known.join(', '));
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let failed = 0;
  for (const name of names) {
    const out = path.join(OUT_DIR, `${name}-raw.png`);
    if (fs.existsSync(out)) {
      console.log('skip (exists):', name);
      continue;
    }
    try {
      if (name !== 'turnaround' && !fs.existsSync(path.join(OUT_DIR, 'turnaround-raw.png'))) {
        throw new Error('turnaround-raw.png is missing — generate (and check) the turnaround first');
      }
      const ref = await buildReference(name !== 'turnaround');
      const buf = await generateImage(name === 'turnaround' ? TURNAROUND_PROMPT : walkPrompt(name), ref);
      fs.writeFileSync(out, buf);
      console.log('wrote', name, `(${buf.length} bytes)`);
    } catch (e) {
      failed++;
      console.error('FAILED', name, '-', e.message);
    }
  }
  if (failed) process.exit(1);
})();

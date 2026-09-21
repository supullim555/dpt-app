// Generates the "standing still" animation clips with Gemini: one call per clip,
// each a single horizontal strip of frames (a plain strip is what Gemini does
// reliably; a full multi-row grid made it imitate the reference sheet's layout).
//   node scripts/generate-idle-clips.js breathe blink   -> only those
//   node scripts/generate-idle-clips.js --all           -> every clip not yet generated
// Existing raw files are skipped; delete a raw file on purpose to redo that clip.
// Run only when the user has explicitly asked for it — every call is billed.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { generateImage } = require('./lib/gemini');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'generated', 'idle');
const CHAR_DIR = path.join(ROOT, 'src', 'assets', 'character');

// name -> [frame count, what moves]
const CLIPS = {
  breathe: [6, 'very subtle breathing: the chest and shoulders rise a tiny bit and settle back, the hair and skirt hem sway by only one or two pixels, eyes open, a small gentle smile'],
  blink: [4, 'a single natural blink: eyes open, eyes half closed, eyes fully closed, eyes half open again; the head, body and hair do not move at all'],
  look: [5, 'curiously looking around: frame 1 faces the front, frame 2 the head is turned toward her left, frame 3 back to the front, frame 4 the head is turned toward her right, frame 5 back to the front; only the head turns (a gentle three-quarter turn, her eyes follow), the body, arms and feet stay completely still'],
  sway: [5, 'a very gentle sway while waiting: both feet stay flat and planted in exactly the same place on the ground in every frame; only the upper body and head lean a tiny bit to her left, then back to center, then a tiny bit to her right, then back to center; hands clasped behind her back, small happy smile; always the front view, no turning, no lifted feet, no kicking, no winking, no jumping'],
  stretch: [5, 'a small relaxed stretch: she raises both arms slightly up and out, closes her eyes, then lowers her arms and relaxes back to standing'],
};

function promptFor(name) {
  const [n, motion] = CLIPS[name];
  return `The attached image shows the reference for ONE character: a large detailed portrait and, next to it, the small game sprite of the same character
(long brown hair with a white heart hair clip, white long-sleeve shirt, navy tie, dark grey pleated skirt, white knee-high socks, black mary-jane shoes).

Generate ONE image: a horizontal strip of exactly ${n} animation frames of this SAME character standing still in place, facing the viewer, doing this small looping idle motion: ${motion}.

Rules:
- Exactly ${n} frames in ONE single row, left to right in animation order, evenly spaced, with clear empty white space between neighbouring frames (they must not touch or overlap).
- In every frame the character has exactly the same size, the same horizontal position and her feet on exactly the same baseline. Only the described small motion changes between frames.
- The first frame is the neutral, relaxed standing pose (arms down at her sides, front view, eyes open) and the last frame returns almost to that pose, so the loop is seamless.
- Match the pixel-art style of the reference exactly: same chunky pixel size, dark-brown outlines, colors, proportions and level of detail. It must look like the same character from the same game.
- Background: plain solid pure white (#FFFFFF) everywhere. No cards, panels, rounded corners, drop shadows, floor, grid lines, borders, text, numbers or labels.
- Nothing else in the image besides the ${n} frames.`;
}

// Reference: the detailed portrait and the game sprite's first frame, side by side
// on white. Deliberately NOT the labelled sheet, which the model copies the layout of.
async function buildReference() {
  const out = path.join(OUT_DIR, 'reference.png');
  const portrait = await sharp(path.join(CHAR_DIR, 'portrait-front.png')).resize({ height: 620 }).toBuffer();
  const pm = await sharp(portrait).metadata();
  const sprite = await sharp(path.join(CHAR_DIR, 'idle-front.png'))
    .extract({ left: 4, top: 0, width: 244, height: 276 })
    .resize({ height: 620 })
    .toBuffer();
  const sm = await sharp(sprite).metadata();
  const W = pm.width + sm.width + 90;
  await sharp({ create: { width: W, height: 700, channels: 4, background: '#ffffff' } })
    .composite([
      { input: portrait, left: 30, top: 40 },
      { input: sprite, left: 60 + pm.width, top: 40 },
    ])
    .png()
    .toFile(out);
  return out;
}

(async () => {
  const args = process.argv.slice(2);
  const names = args.includes('--all') ? Object.keys(CLIPS) : args;
  const unknown = names.filter((n) => !CLIPS[n]);
  if (!names.length || unknown.length) {
    console.error(unknown.length ? `Unknown: ${unknown.join(', ')}` : 'Name clips or pass --all.', '\nKnown:', Object.keys(CLIPS).join(', '));
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ref = await buildReference();
  let failed = 0;
  for (const name of names) {
    const out = path.join(OUT_DIR, `${name}-raw.png`);
    if (fs.existsSync(out)) {
      console.log('skip (exists):', name);
      continue;
    }
    try {
      const buf = await generateImage(promptFor(name), ref);
      fs.writeFileSync(out, buf);
      console.log('wrote', name, `(${buf.length} bytes)`);
    } catch (e) {
      failed++;
      console.error('FAILED', name, '-', e.message);
    }
  }
  if (failed) process.exit(1);
})();

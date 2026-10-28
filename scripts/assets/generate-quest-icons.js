// Generates the quest-widget exercise icons with Gemini, one call per icon, replacing the plain
// emoji (🎭📏💌🎈🔍) QuestWidget used before so each exercise reads as a small hand-drawn object
// in the app's own art style instead of a generic system glyph.
//   node scripts/assets/generate-quest-icons.js externalization-interview   -> just that one
//   node scripts/assets/generate-quest-icons.js --all                       -> everything not yet generated
// Existing raw files are skipped (never regenerated implicitly): every call is billed,
// so redoing an icon means deleting its file on purpose. Run only when the user has explicitly
// asked for it.
const path = require('path');
const { runGenerateCli } = require('../lib/generateCli');
const { GENERATED_DIR } = require('../lib/paths');

const OUT_DIR = path.join(GENERATED_DIR, 'quest-icons');

// Kept close to the emoji each one replaces (🎭📏💌🎈🔍) so the meaning carries over for anyone
// who already knows the old icons, just redrawn in the room/character's own pixel-art style.
const ICONS = {
  'externalization-interview': 'a cute simple theater comedy/tragedy mask, pastel lavender and cream colors, friendly rounded shape',
  'scaling-exception': 'a cute short wooden ruler with a few tick marks, tilted slightly, pastel warm-yellow wood tone',
  'letter-from-future-self': 'a cute pastel-pink envelope, sealed with one small heart-shaped wax seal',
  'defusion-play': 'a cute round balloon on a short curly string, pastel sky-blue, floating upward',
  'thought-check': 'a cute magnifying glass with a round lens, examining a small fluffy thought-bubble cloud beside it',
};

const STYLE = `Use the attached character reference sheet ONLY as a style guide for the pixel size, dark-brown
outlines, soft warm pastel palette and cute cozy chibi mobile-game look. Do NOT copy its layout: do not draw any
character, portrait, card, panel, label or text, and do not make a sheet or grid. Draw exactly ONE small icon-like
object.
Pixel-art, chunky pixels of the same size as the character's, dark-brown outline around the object.
Keep the shape VERY simple and bold with minimal fine detail — this will be shown tiny (about 28x28 pixels on
screen) inside a small round button, so it must still read clearly at that size.
Viewpoint: straight-on, flat, centered, with a small margin around it.
Background: plain solid pure white (#FFFFFF) everywhere outside the object. No drop shadow, no floor, no ground,
no wall, no grid, no border, no text.`;

function promptFor(id) {
  return `Generate ${ICONS[id]}.\n\n${STYLE}`;
}

runGenerateCli({ outDir: OUT_DIR, names: Object.keys(ICONS), promptFor });

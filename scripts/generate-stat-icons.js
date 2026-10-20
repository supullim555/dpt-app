// Generates the status-screen stat badge icons with Gemini, one call per icon (§33) — same
// template as generate-quest-icons.js.
//   node scripts/generate-stat-icons.js courage   -> just that one
//   node scripts/generate-stat-icons.js --all     -> everything not yet generated
// Existing raw files are skipped (never regenerated implicitly): every call is billed,
// so redoing an icon means deleting its file on purpose. Run only when the user has explicitly
// asked for it.
const fs = require('fs');
const path = require('path');
const { generateImage } = require('./lib/gemini');

const OUT_DIR = path.join(__dirname, '..', 'generated', 'stat-icons');

const ICONS = {
  courage: 'a cute small lit torch with a warm orange-yellow flame, simple bold shape',
  insight: 'a cute small lightbulb with one tiny sparkle beside it, pastel yellow glass, warm-brown base',
  hope: 'a cute small sprouting seedling with one curved leaf, pastel green, in a tiny patch of soil',
  flexibility: 'a cute small pastel-teal ribbon loosely curled into a soft spiral, bendy relaxed look',
  calm: 'a cute small pastel-blue teacup with a saucer and one gentle wisp of steam',
  bond: 'a cute small pair of interlocked pastel-pink hearts, one slightly behind the other',
};

const STYLE = `Use the attached character reference sheet ONLY as a style guide for the pixel size, dark-brown
outlines, soft warm pastel palette and cute cozy chibi mobile-game look. Do NOT copy its layout: do not draw any
character, portrait, card, panel, label or text, and do not make a sheet or grid. Draw exactly ONE small icon-like
object.
Pixel-art, chunky pixels of the same size as the character's, dark-brown outline around the object.
Keep the shape VERY simple and bold with minimal fine detail — this will be shown tiny (about 24x24 pixels on
screen) inside a status bar row or a small toast pill, so it must still read clearly at that size.
Viewpoint: straight-on, flat, centered, with a small margin around it.
Background: plain solid pure white (#FFFFFF) everywhere outside the object. No drop shadow, no floor, no ground,
no wall, no grid, no border, no text.`;

function promptFor(id) {
  return `Generate ${ICONS[id]}.\n\n${STYLE}`;
}

(async () => {
  const args = process.argv.slice(2);
  const names = args.includes('--all') ? Object.keys(ICONS) : args;
  const unknown = names.filter((n) => !ICONS[n]);
  if (!names.length || unknown.length) {
    console.error(
      unknown.length ? `Unknown: ${unknown.join(', ')}` : 'Name icons or pass --all.',
      '\nKnown:',
      Object.keys(ICONS).join(', ')
    );
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
      const buf = await generateImage(promptFor(name));
      fs.writeFileSync(out, buf);
      console.log('wrote', name, `(${buf.length} bytes)`);
    } catch (e) {
      failed++;
      console.error('FAILED', name, '-', e.message);
    }
  }
  if (failed) process.exit(1);
})();

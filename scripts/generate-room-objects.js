// Generates separate room-object images with Gemini, one call per object.
//   node scripts/generate-room-objects.js bed bookshelf     -> only those
//   node scripts/generate-room-objects.js --all             -> everything not yet generated
// Existing raw files are skipped (never regenerated implicitly): every call is billed,
// so redoing an object means deleting its file on purpose.
// Run only when the user has explicitly asked for it.
const fs = require('fs');
const path = require('path');
const { generateImage } = require('./lib/gemini');

const OUT_DIR = path.join(__dirname, '..', 'generated', 'room');

const STYLE = `Use the attached character reference sheet ONLY as a style guide for the pixel size, dark-brown
outlines, soft warm color palette and cute cozy chibi mobile-game look. Do NOT copy its layout: do not draw any
character, portrait, card, panel, label or text, and do not make a sheet or grid. Draw exactly ONE object.
Pixel-art, chunky pixels of the same size as the character's, dark-brown outline around the object.
Viewpoint: STRAIGHT-ON FRONT VIEW, like a room in a farming or JRPG game seen from the front. The front face of the object
is parallel to the picture plane, so horizontal edges stay perfectly horizontal and the object is left-right symmetrical
where the real object is. Only a slight glimpse of the top surface, as if looking down from about 30 degrees.
This is NOT isometric: no diagonal or rotated views, no corner-on view, never turned to the side.
The object stands upright with its base at the bottom of the image, centered, with a small margin around it.
Background: plain solid pure white (#FFFFFF) everywhere outside the object. No drop shadow, no floor, no ground,
no wall, no grid, no border, no text.`;

// kind 'object' = cut out from the white background; 'tile' = a seamless texture that fills the image.
const OBJECTS = {
  bed: { desc: 'a cozy single bed, headboard at the back, white pillows, a lavender quilt, seen from the foot of the bed, straight-on and symmetrical, the pillows near the top of the mattress' },
  nightstand: { desc: 'a small wooden nightstand with one drawer and a small warm yellow table lamp on top' },
  bookshelf: { desc: 'a tall wooden bookshelf with three shelves full of colorful books and a few small decorations' },
  desk_set: { desc: 'a small wooden study desk with a laptop, a tiny desk lamp, a notebook and a mug, and a matching wooden chair tucked in front, facing the desk' },
  rug: { desc: 'a round-ish oval pink rug with a lighter pink inner oval, a flat horizontal oval as seen from the front and slightly above, lying flat on the floor' },
  cushion: { desc: 'a round soft floor cushion in warm orange-yellow with a small button in the middle' },
  plant: { desc: 'a green leafy houseplant in a terracotta pot' },
  wardrobe: { desc: 'a wooden two-door wardrobe with small round knobs and a tiny heart sticker on one door' },
  wall_frames: { desc: 'a small group of three different framed pictures of different sizes arranged together as one wall decoration (a pink heart, a landscape, a star)' },
  window: { desc: 'a window with a white frame, pink curtains tied to the sides, a light-blue sky with white clouds in the glass, and a small sill' },
  standing_lamp: { desc: 'a slim standing floor lamp with a round warm-yellow shade' },
  teddy_bear: { desc: 'a cute brown teddy bear sitting upright with a small pink ribbon' },
  book_stack: { desc: 'a small stack of three colorful books lying on top of each other' },
  basket: { desc: 'a woven wicker basket with a soft blanket folded inside' },
  floor: { kind: 'tile', desc: 'a seamless tileable texture of warm light-wood floor planks (horizontal planks, subtle grain and seams)' },
  wallpaper: { kind: 'tile', desc: 'a seamless tileable cream wallpaper texture with faint vertical stripes and tiny flowers' },
};

function promptFor(name) {
  const o = OBJECTS[name];
  if (o.kind === 'tile') {
    return `Pixel-art texture. Use the attached character reference sheet ONLY as a style guide for the pixel size and soft warm
palette; do not draw any character, card, label or text. Generate ${o.desc}. The pattern must fill the ENTIRE image edge to edge
(no border, no white background, no object), and repeat seamlessly when tiled. Front-on, flat, no perspective.`;
  }
  return `Generate ${o.desc}.\n\n${STYLE}`;
}

(async () => {
  const args = process.argv.slice(2);
  const names = args.includes('--all') ? Object.keys(OBJECTS) : args;
  const unknown = names.filter((n) => !OBJECTS[n]);
  if (!names.length || unknown.length) {
    console.error(unknown.length ? `Unknown: ${unknown.join(', ')}` : 'Name objects or pass --all.', '\nKnown:', Object.keys(OBJECTS).join(', '));
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

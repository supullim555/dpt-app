// Cuts the Gemini room images (generated/room/*-raw.png) into game assets in src/assets/room/:
// objects get the white-background cut-out (lib/cutout.js), the two tiles (floor, wallpaper) are
// just edge-trimmed and resized. Also writes manifest.json with each asset's pixel size, which the
// room layout (features/room/layout.ts) uses to keep every object's proportions.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { cutOutAll } = require('../lib/cutout');
const { GENERATED_DIR, ASSETS_DIR } = require('../lib/paths');

const RAW_DIR = path.join(GENERATED_DIR, 'room');
const OUT_DIR = path.join(ASSETS_DIR, 'room');

const OBJECTS = [
  'bed', 'nightstand', 'bookshelf', 'desk_set', 'rug', 'cushion', 'plant', 'wardrobe',
  'wall_frames', 'window', 'standing_lamp', 'teddy_bear', 'book_stack', 'basket',
];
const TILES = ['floor', 'wallpaper'];
const TILE_WIDTH = 720;

async function tile(name) {
  // Shave a few px so any faint border from the generator isn't tiled in.
  const raw = path.join(RAW_DIR, `${name}-raw.png`);
  const meta = await sharp(raw).metadata();
  const buf = await sharp(raw)
    .extract({ left: 6, top: 6, width: meta.width - 12, height: meta.height - 12 })
    .resize({ width: TILE_WIDTH })
    .png()
    .toBuffer();
  await sharp(buf).toFile(path.join(OUT_DIR, `${name}.png`));
  const { width, height } = await sharp(buf).metadata();
  console.log(name, `${width}x${height} (tile)`);
  return { width, height };
}

(async () => {
  // longest side of a saved object: plenty for a phone screen at 2-3x
  const manifest = await cutOutAll({ rawDir: RAW_DIR, outDir: OUT_DIR, names: OBJECTS, maxSide: 420 });
  for (const n of TILES) manifest[n] = await tile(n);
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
})();

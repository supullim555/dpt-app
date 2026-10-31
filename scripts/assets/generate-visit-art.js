// Generates the 병문안 art test with Gemini, one call per image. Billed: run only when the user has
// explicitly asked, and show them the plan first (docs/병문안_모티브와_아트_구상.md §3).
//   node scripts/assets/generate-visit-art.js room girl-front girl-back
// The style is described in words only. Never pass screenshots of other games as a reference, and
// never name them or their artists here.
const path = require('path');
const { runGenerateCli } = require('../lib/generateCli');
const { GENERATED_DIR } = require('../lib/paths');

const OUT_DIR = path.join(GENERATED_DIR, 'visit-art');

const STYLE = `Monochrome black and white ink illustration with no color at all. Rough hand-drawn pen lines,
visible strokes, loose grey wash shading, deep blacks and clean white paper highlights. Quiet and melancholic but
warm and gentle, not scary. Original character and scene. No text, no letters, no signature, no frame, no border.
No horror, no blood, no medical equipment close-ups. Vertical portrait composition, 3:4.`;

const GIRL = `an original teenage girl with long straight dark hair, thin, gentle tired eyes, wearing plain loose
modest light-colored hospital pajamas buttoned to the neck`;

const ART = {
  room: `A small quiet hospital room seen from the doorway in first person, one-point perspective. A single empty bed
in the center with a white pillow and a folded blanket, a plain bedside table, a thin curtain, and a large window on the
far wall. The window panes must be completely blank pure white with nothing drawn outside. The room around it is dark.
Nobody in the room.`,
  'girl-front': `${GIRL}, sitting up in a hospital bed in a dim room, looking straight at the viewer with a small, tired,
kind expression. Waist-up, the figure large in frame, plain dark background.`,
  'girl-back': `The same girl as in the attached image, same hair and same pajamas, in the same drawing style. She lies in a
hospital bed on her side with her back to the viewer, facing away toward a window. Her face cannot be seen, only her
long dark hair spread on the pillow and her shoulder under a blanket. Seen from the foot of the bed.`,
};

// Second try at the style: the first came out as realistic pencil drawings of an adult.
const STYLE2 = `Stylized Japanese illustration style, drawn with bold rough black ink lines and flat grey screentone-like
shading, high contrast, large areas of solid black, simplified shapes, not realistic, not a pencil drawing. Black and white
only, no color at all. Quiet, melancholic, gentle, not scary. Original design. The image fills the whole canvas edge to edge
with no white margins. No text, no signature, no border, no blood, no medical equipment close-ups.`;
const STYLE2_NAMES = new Set(['room2', 'girl2']);
ART.room2 = `A small quiet hospital room seen from the doorway in first person, one-point perspective, with the walls and floor reaching the edges of the image. A single empty bed in the center, a plain bedside table, a thin curtain, and a window on the far wall whose panes are completely blank pure white. The room is dark. Nobody in the room.`;
ART.girl2 = `An original young teenage girl with long straight dark hair and soft bangs, a small thin face and gentle tired eyes, wearing plain loose modest hospital pajamas buttoned to the neck. She sits up in a hospital bed and looks straight at the viewer with a faint, tired, kind expression. Waist-up, large in frame, dark plain background.`;

// room and girl-front stand alone; girl-back is drawn from girl-front to test keeping the same person.
const REF = { 'girl-back': path.join(OUT_DIR, 'girl-front-raw.png') };

runGenerateCli({
  outDir: OUT_DIR,
  names: Object.keys(ART),
  promptFor: (name) => `Generate this image: ${ART[name]}\n\n${STYLE2_NAMES.has(name) ? STYLE2 : STYLE}`,
  refFor: (name) => REF[name] ?? null,
});

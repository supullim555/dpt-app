// Generates the hospital's paper cutouts and the opening with Gemini, one call per image. Billed: run only when the
// user has explicitly asked, and show them the plan first (docs/병문안_모티브와_아트_구상.md).
//   node scripts/assets/generate-hospital-art.js heads-loose
// The style is described in words only. Never pass screenshots of other games as a reference, and never name them
// or their artists here. She is a child: her clothes and her description stay modest.
const path = require('path');
const { runGenerateCli } = require('../lib/generateCli');
const { GENERATED_DIR } = require('../lib/paths');

const OUT_DIR = path.join(GENERATED_DIR, 'hospital-art');

const INK = `Stylized Japanese illustration style, bold rough black ink lines, flat grey screentone-like shading, high
contrast, simplified shapes, not realistic, not a pencil drawing. Black and white only, apart from the background. Quiet,
melancholic, gentle, not scary. Original design.`;
const NO_MARKS = 'No text, no signature, no border, no blood, no medical equipment close-ups.';
const CUTOUT = `${INK} Each item separate with wide gaps, nothing overlapping or cut off. Perfectly flat pure green
background (#00FF00), no shadows on it. ${NO_MARKS}`;
const FULL = `${INK} The image fills the whole canvas edge to edge with no margins. Vertical portrait composition. ${NO_MARKS}`;

const GIRL = `An original young teenage girl, about 13, with a shoulder-length dark bob, a small thin face, calm eyes and
the faintest playful hint at the corner of her mouth, in plain loose modest hospital pajamas buttoned to the neck. No hairpin.`;
const SAME = 'The same girl as in the attached image, same face, same hair, same pajamas, in exactly the same drawing style.';
const SAME_STYLE = 'In exactly the same drawing style as the attached image, but do not draw the girl from it.';

const LYING = `The same girl as in the attached image, same face, same tied-back hair, same pajamas,
in exactly the same drawing style. No hairpin. She lies on her back in bed on one
pillow, seen from the foot of the bed and slightly above, whole figure in frame. A
plain blanket covers her from the chest down, her pajamas buttoned to the neck. No
bed frame. Perfectly flat pure green background (#00FF00), no shadows on it. No text,
no signature, no border, no blood, no medical equipment.`;

const LYING_LOOSE = `The same girl as in the attached image, same face, same pajamas buttoned to the neck,
same pillow, mattress and blanket, same framing from above, in exactly the same
drawing style. She lies flat on her back, both shoulders resting evenly on the
mattress, relaxed, arms at her sides under the blanket, which covers her from the
chest down. Her hair is down, a shoulder-length bob spread softly on the pillow, not
tied. No hairpin. No window in the image. Perfectly flat pure green background
(#00FF00), no shadows on it. No text, no signature, no border, no blood, no medical
equipment.`;

const ART = {
  'heads-loose': `${GIRL} Three drawings of her head and neck only, side by side at the same size, her hair down: from
directly behind so no face shows, in left profile, and in three-quarter view looking left.`,
  'heads-tied': `${SAME} No hairpin. Four drawings framed just like the attached ones, head and shoulders, in a row at the same size, her hair now
loosely tied back: in left profile, in three-quarter view looking left, from the front looking at the viewer, and from the
front with tired half-closed eyes and a still gentle expression.`,
  body: `${SAME} Her neck, shoulders and body down to the waist only, with no head, her arms at her sides, in the modest
buttoned pajamas: one seen from the front, one seen from behind. Beside them, one small hand and pajama cuff, resting
open and relaxed, fingers pointing up.`,
  bed: `${SAME_STYLE} An empty, plain hospital bed in two separate pieces, both seen straight on: the upper part with its
head rail and a white pillow, wide and low; and the low foot rail with the end of the mattress, equally wide.`,
  things: `${SAME_STYLE} Four separate things: a small closed notebook with a plain cover, seen from above; a few fallen
ginkgo leaves; a tall plain drip stand with one bag hanging on it, simple and seen from a distance; a wide blanket, drawn
as if pulled up over someone lying down, its top edge turned down, spread much wider than it is tall.`,
  'people-a': `${SAME_STYLE} Four separate ordinary people at a hospital, each full body, standing, facing the viewer, with
a calm expression, feet visible, all drawn tall and narrow: a nurse, a hospital worker in plain work clothes, an elderly
person with a walking stick, a small child.`,
  'people-b': `${SAME_STYLE} Three separate ordinary people at a hospital, each full body, standing, facing the viewer, with
a calm expression, feet visible, all drawn tall and narrow: a visitor in an ordinary coat, an adult patient in hospital
pajamas, a shopkeeper in an apron.`,
  large: `${SAME_STYLE} Four separate things, each whole and seen straight on: a large ginkgo tree with its full crown and
trunk; an empty hospital gurney; a small hospital supply cart with shelves; a plain vending machine with blank buttons and
no writing on it.`,
  small: `${SAME_STYLE} Four separate small things someone has dropped, each seen from above: a small pet collar with a round
tag, a small empty crumpled snack packet with no writing, a loose tangled shoelace, a blank paper coupon with a perforated edge
and no writing.`,
  'op-hand': `${SAME_STYLE} A first-person view of a young person's hand holding a small folded letter, out in front of them on a dim
street, the writing on the letter not visible.`,
  'op-desk': `${SAME_STYLE} A young person's plain room at night seen from behind them, sitting at a small desk under one lamp, unfolding
a letter, their face not visible, the writing on the letter not visible.`,
  'op-hospital': `${SAME_STYLE} A plain mid-sized hospital building seen from outside at dusk from across the road, four storeys, with a
bare ginkgo-lined path to the entrance. Every window is an empty dark pane. Nobody around. No signs and no writing.`,
  // Second tries. The first sheet had no three-quarter view and no tired eyes, the blanket had her under it, and the
  // desk showed the player with her hair.
  'heads-tied-2': `The same girl as in the attached image, same face, same tied-back hair, same pajamas, in exactly the same
drawing style and framing. No hairpin. Two drawings side by side at the same size: her head turned halfway to the left in a
clear three-quarter view with both eyes visible; and from the front with heavy, tired, half-closed eyes and a faint gentle
smile.`,
  blanket: `${SAME_STYLE} One wide plain empty blanket and nothing else, seen straight on from the foot of a bed, shaped like a
low soft hill much wider than it is tall, its top edge turned down, a few soft folds. There is no person, no head, no hair
and no pillow anywhere in the image.`,
  'op-desk-2': `${SAME_STYLE} A first-person view looking down at a small plain desk at night under the light of one lamp. Two
hands unfolding a letter, the writing not visible. Only the hands and forearms show: no face, no head, no hair, no body.`,
  // The last two days: the whole of her lying down, in one drawing. These carry their own full prompt.
  'lying-window': `${LYING} Her head is turned away toward her left, looking out of a window. Calm.`,
  'lying-turned': `${LYING} Her head is turned slowly toward the viewer. Tired half-closed eyes, a faint gentle smile.`,
  'lying-hand': `${LYING} She looks straight at the viewer, tired and gentle. One hand rests on top of the blanket, palm down, relaxed.`,
  // The first day: hair down, both shoulders on the mattress, only her head turning.
  'lying-loose-window': `${LYING_LOOSE} Only her head is turned to the side, her face in profile looking far away out of a window. Calm, a little distant.`,
  'lying-loose-turned': `${LYING_LOOSE} Only her head is turned about halfway back toward the viewer, both eyes visible, looking up from the pillow. The faintest playful hint at the corner of her mouth.`,
};

const FULL_SCREEN = new Set(['op-hand', 'op-desk', 'op-desk-2', 'op-hospital']);
const TIRED = path.join(OUT_DIR, 'heads-tied-2-raw.png');
const LYING_POSE = path.join(OUT_DIR, 'lying-window-raw.png');
const REFS = { 'heads-tied-2': path.join(OUT_DIR, 'heads-tied-raw.png'), 'lying-window': TIRED, 'lying-turned': TIRED, 'lying-hand': TIRED, 'lying-loose-window': LYING_POSE, 'lying-loose-turned': LYING_POSE };
const FIRST = path.join(OUT_DIR, 'heads-loose-raw.png');

runGenerateCli({
  outDir: OUT_DIR,
  names: Object.keys(ART),
  promptFor: (name) => (name.startsWith('lying-') ? `Generate this image: ${ART[name]}` : `Generate this image: ${ART[name]}\n\n${FULL_SCREEN.has(name) ? FULL : CUTOUT}`),
  // Null, not undefined: undefined would send the old room's character sheet.
  refFor: (name) => (name === 'heads-loose' ? null : REFS[name] ?? FIRST),
});

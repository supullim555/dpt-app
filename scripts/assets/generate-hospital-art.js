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
  // v0.85: skies over the remembered places, wrapped round them above the backdrops; and things on the hospital's walls.
  'sky-summer': `${SAME_STYLE} One square panel completely filled edge to edge with sky only, flat, no frame: a bright open
summer sky, a few soft rounded cumulus clouds drifting across the lower half, clear and plain towards the top. No ground,
no horizon, no trees, no buildings, no birds, no sun.`,
  'sky-autumn': `${SAME_STYLE} One square panel completely filled edge to edge with sky only, flat, no frame: a high clear
autumn sky, long thin streaks of high wispy clouds and a few small clouds in the lower half, plain towards the top. No
ground, no horizon, no trees, no buildings, no birds, no sun.`,
  'sky-dusk': `${SAME_STYLE} One square panel completely filled edge to edge with sky only, flat, no frame: an evening sky at
dusk just after sunset, long low layered clouds lit softly from below in the lower half, the sky growing darker towards
the top. No ground, no horizon, no trees, no buildings, no birds, no sun, no moon.`,
  'wall-decor': `${SAME_STYLE} Four separate things that hang flat on a hospital corridor wall, each whole and seen straight
on from the front, with no wall drawn around them: a cork notice board with a few blank pinned papers; a simple framed
picture of calm rolling hills; a round plain wall clock; a small wall-mounted hand sanitizer dispenser. No writing
anywhere.`,
  // v0.82: the fifth request's memory, an autumn yard with a janggi board
  'yard-scene': `${SAME_STYLE} Two separate square panels side by side with a wide plain gap, each completely filled edge to
edge, flat, no frame: the far side of a traditional Korean house yard seen straight across, a low stone wall topped with
dark roof tiles along the lower half, persimmon branches leaning over it, an autumn sky above; and a packed dirt yard seen
from straight above, a few fallen leaves, evenly lit.`,
  'yard-props': `${SAME_STYLE} Five separate things, each whole and seen straight on: a short section of a raised wooden
veranda floor of a traditional Korean house; a low wooden table with a janggi board and its round wooden pieces on it; a
persimmon tree with a few fruits on its branches; a closed wooden double gate in a small tiled gateway; and a boy about ten
in a plain sweater holding a small paper bag, full body, standing, facing the viewer, feet visible, bright.`,
  // v0.83: the sixth request's memory, a night alley to the postbox
  'night-scene': `${SAME_STYLE} Two separate square panels side by side with a wide plain gap, each completely filled edge to
edge, flat, no frame: a quiet residential alley at night seen straight across, a row of low houses with a few warmly lit
windows and a utility pole along the lower half, a night sky with a small moon above; and the asphalt of a narrow alley
seen from straight above, a faint painted line and a few cracks, evenly lit.`,
  'night-props': `${SAME_STYLE} Four separate things, each whole and seen straight on: a round-topped street postbox on a short
post, with no writing on it; a tall old streetlamp, lit; a low stone garden wall with a potted plant on top; and an old man
in his seventies in a long cardigan over pajamas and slippers, thin, a gentle tired smile, full body, standing, facing the
viewer, feet visible.`,
  // v0.81: the fourth request's memory, a traditional market at dusk
  'market-scene': `${SAME_STYLE} Two separate things side by side with a wide plain gap. Left: one square panel completely
filled edge to edge, flat, no frame: an old traditional market street at dusk seen straight across, a row of small shop
fronts with cloth awnings and hanging bulbs along the lower half, the evening sky above. Right: a tall stack of wooden fruit
crates, whole, seen straight on.`,
  'market-props': `${SAME_STYLE} Five separate things, each whole and seen straight on: a small fruit stall with piles of
tangerines and apples under a cloth awning; a vegetable stall with baskets of greens; a rice cake stall with trays on a low
table; a middle-aged woman stall keeper in an apron and arm sleeves, full body, standing, facing the viewer, feet visible,
friendly; and a child about nine in plain clothes holding a small coin purse, full body, standing, facing the viewer, feet
visible, cheerful.`,
  // v0.80: the third request's memory, a summer beach with a mother
  'beach-tex': `${SAME_STYLE} Two separate square panels side by side with a wide plain gap, each completely filled edge to edge,
flat, no frame: a sandy beach seen from straight above, fine sand with a few footprints and small shells, evenly lit; and
the sea seen straight out from the beach, the upper half an open summer sky with a few soft clouds, the horizon across the
middle, gentle waves and a strip of wet sand along the bottom edge.`,
  'beach-props': `${SAME_STYLE} Five separate things, each whole and seen straight on: a striped beach umbrella planted in the
sand; a small seaside snack kiosk with an awning and no writing; a small wooden rowboat pulled up on the sand, seen from
the side; a low wooden bench; and a woman in her late sixties in a wide sun hat, a light cardigan and a long skirt, full
body, standing, facing the viewer, feet visible, a gentle smile.`,
  // v0.79: the second request's memory, a rehabilitation room on the first day of walking again
  'rehab-tex': `${SAME_STYLE} Two separate square panels side by side with a wide plain gap, each completely filled edge to edge,
flat, no perspective, evenly lit: a rehabilitation room floor of soft rubber floor tiles seen from straight above; and a
rehabilitation room wall seen straight on, a long wall mirror in the middle with a horizontal handrail along the wall in
front of it at waist height.`,
  'rehab-props': `${SAME_STYLE} Four separate pieces of rehabilitation room equipment, each whole and seen straight on from the
side: a pair of long parallel walking bars on a low wooden platform; a small set of practice stairs with handrails; a folded
blue exercise mat on a low bench; a stationary exercise bicycle.`,
  // v0.78: the way out, looking like a hospital's front door
  'tex-entrance': `${SAME_STYLE} One square panel completely filled edge to edge, seen straight on from inside, no perspective: a
hospital's main entrance, a pair of wide automatic sliding glass doors in a plain metal frame, closed, bright daylight
outside showing a short path and a few trees beyond the glass, a mat on the floor in front. No text, no signs, no letters.`,
  // v0.76: a riverside that looks like one: the far bank with its sky as one tall backdrop, moving water, and bushes
  // thick enough to hide a child.
  'river-scene': `${SAME_STYLE} Two separate square panels side by side with a wide plain gap, each completely filled edge to edge,
flat, no frame. Left: the far bank of a wide summer river seen straight across from the near shore, the upper half an open
sky with soft drifting clouds, the lower half a dense line of leafy trees and bushes along the far shore, the bottom edge the
far water's edge. Right: the surface of a clear shallow river seen from straight above, water flowing in long smooth ripples
all one way, sparkling highlights of sunlight and faint reflections of clouds, a few stones under the water.`,
  'river-bushes': `${SAME_STYLE} Three separate dense riverside bushes, each whole, seen straight on from the front, each wider
than tall and as tall as an adult, the leaves packed thick so nothing behind them shows through, a few reed stalks among the
leaves.`,
  // v0.74: the walls, floors and doors themselves, in the same hand, cut into the structure sheet. Flat and square.
  'tex-ground': `${SAME_STYLE} Four separate square texture swatches in a 2x2 grid with wide plain gaps between them, each seen straight
from above. Each swatch completely filled edge to edge with one flat surface, no objects in front of it, evenly lit, no perspective, no vanishing lines. Top left: hospital vinyl floor tiles in a simple grid. Top right: a suspended ceiling of acoustic panels
with one rectangular fluorescent light panel in the middle. Bottom left: outdoor stone paving slabs. Bottom right: small
smooth river pebbles.`,
  'tex-walls': `${SAME_STYLE} Four separate square texture swatches in a 2x2 grid with wide plain gaps between them, each seen straight
on from the front. Each swatch completely filled edge to edge with one flat surface, no objects in front of it, evenly lit, no perspective, no vanishing lines. Top left: a plain hospital corridor wall, painted plaster above a darker wainscot panel along the
bottom third and a skirting board at the very bottom. Top right: an old brick courtyard wall. Bottom left: the far bank of a
river, a dense line of trees and bushes filling the lower two thirds against a pale summer sky. Bottom right: shallow clear
river water seen from above with gentle ripples.`,
  'tex-doors': `${SAME_STYLE} Three separate square panels side by side with wide plain gaps, each completely filled edge to edge,
seen straight on from the front, no perspective, a plain hospital corridor wall around each opening: a closed hospital room
door in its frame with a small wired-glass window and a lever handle; closed stainless steel elevator doors in their frame
with a call button panel at the right; an open stairwell doorway showing a flight of stairs going up into shadow.`,
  'tex-window': `${SAME_STYLE} Two separate square panels side by side with a wide plain gap, each completely filled edge to edge, seen
straight on from the front, no perspective: a hospital corridor wall with one window in its upper half, a plain frame and
sill, through the glass a courtyard with a large ginkgo tree in bright daylight; and the front of a hospital nurses'
station, a long low counter with a ledge on top, the wall behind it above.`,
  // Second tries: the first water came out as a whirlpool and the station's front was blank; the old man held a giant chess piece.
  'tex-water': `${SAME_STYLE} Two separate square texture swatches side by side with a wide plain gap, each completely filled edge to
edge, flat, no perspective: shallow river water seen from straight above, long gentle parallel ripples all running the same
way, a few pebbles faintly visible beneath; and the front of a hospital nurses' station counter seen straight on, a wood-grain
panelled front with a raised ledge along the top and a few papers and a pen holder on the ledge.`,
  'grandpa': `${SAME_STYLE} One frail old man at a hospital, full body, standing, facing the viewer, feet visible, drawn tall and
narrow: thin, bald on top with white hair at the sides, in hospital pajamas with a cardigan over them and slippers, holding
one small flat octagonal wooden game piece between his fingers at chest height, a quiet patient expression.`,
  // v0.74: everyone their own face. Same framing as people-a and people-b.
  'people-c': `${SAME_STYLE} Three separate ordinary people at a hospital, each full body, standing, facing the viewer, feet
visible, all drawn tall and narrow, each clearly different in face, age, build and hair: a tired young man nurse in plain
scrubs with short messy hair; a neat middle-aged woman receptionist in a plain blazer with a lanyard and her hair in a low
bun; a broad-shouldered older security guard in a plain uniform and cap.`,
  'people-d': `${SAME_STYLE} Three separate ordinary people at a hospital, each full body, standing, facing the viewer, feet
visible, all drawn tall and narrow, each clearly different in face, age, build and hair: a lanky young hospital porter in a
plain short-sleeved work uniform; a sturdy woman physiotherapist in a polo shirt and track trousers with a small towel over
one shoulder; a thin middle-aged woman in a long cardigan holding a paperback book against her chest.`,
  'people-e': `${SAME_STYLE} Three separate older people at a hospital, each full body, standing, facing the viewer, feet
visible, all drawn tall and narrow, each clearly different in face, build and hair: a kind older woman volunteer in a plain
vest over a blouse, holding a small vase of flowers; a frail old man in hospital pajamas with a cardigan over them, holding
a wooden game piece; a small old woman in a padded vest and a knitted hat, slightly stooped.`,
  // The first request's memory (v0.72): a summer riverside, walked through as the parent.
  river: `${SAME_STYLE} Five separate things for a summer riverside campsite, each whole and seen straight on from the
front: a small plain family car seen from behind; a small dome camping tent; a cluster of large smooth river boulders,
wider than tall, big enough for a child to hide behind; a clump of tall reeds; and a boy about eight in a plain summer
t-shirt and shorts, full body, standing, facing the viewer, holding a flat stone in one hand, a cheerful calm expression,
feet visible.`,
  // The doctor at his desk on her floor (v0.70): from the waist up, so a desk in the game hides where he'd sit.
  doctor: `${SAME_STYLE} One middle-aged doctor in a plain white coat over a plain shirt, seated, seen straight on from the
front, drawn from the waist up only, both forearms resting forward on an invisible desk, hands loosely together. Short
greying hair, plain glasses, tired kind eyes, a small patient smile. Nothing below the waist, no desk, no chair, no
stethoscope.`,
  // The last light (v0.87 cutscene): she turns under the ginkgo and looks at you. Waist up, three steps of one turn.
  'girl-turn': `${SAME} Her hair down, the shoulder-length bob, no hairpin. Three drawings of her from the waist up, side by
side at the same size and height, standing, arms at her sides, in the modest pajamas buttoned to the neck: seen from
directly behind so no face shows; turning to look back over her right shoulder at the viewer; and facing the viewer, a
small calm smile, a little surprised.`,
};

const FULL_SCREEN = new Set(['op-hand', 'op-desk', 'op-desk-2', 'op-hospital']);
const SKY = `${INK} The image fills the whole square canvas edge to edge with no margins. ${NO_MARKS}`;
const TIRED = path.join(OUT_DIR, 'heads-tied-2-raw.png');
const LYING_POSE = path.join(OUT_DIR, 'lying-window-raw.png');
const REFS = { 'heads-tied-2': path.join(OUT_DIR, 'heads-tied-raw.png'), 'lying-window': TIRED, 'lying-turned': TIRED, 'lying-hand': TIRED, 'lying-loose-window': LYING_POSE, 'lying-loose-turned': LYING_POSE };
const FIRST = path.join(OUT_DIR, 'heads-loose-raw.png');

runGenerateCli({
  outDir: OUT_DIR,
  names: Object.keys(ART),
  promptFor: (name) => (name.startsWith('lying-') ? `Generate this image: ${ART[name]}` : `Generate this image: ${ART[name]}\n\n${name.startsWith('sky-') ? SKY : FULL_SCREEN.has(name) ? FULL : CUTOUT}`),
  // Null, not undefined: undefined would send the old room's character sheet.
  refFor: (name) => (name === 'heads-loose' ? null : REFS[name] ?? FIRST),
});

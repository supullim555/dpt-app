// Cuts the Gemini drawings (scripts/assets/generate-hospital-art.js, generated/hospital-art/) into the three
// one-channel sheets the hospital loads, and the opening's three pictures. No API calls: run it as often as you like.
//   node scripts/assets/build-hospital-sheets.js
// The cells here must match hospitalArt.ts. On a sheet, exactly black means nothing is there.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { GENERATED_DIR, ROOT } = require('../lib/paths');

const RAW = path.join(GENERATED_DIR, 'hospital-art');
const OUT = path.join(ROOT, 'src', 'assets', 'visit');
// Served as they are, and fetched only on reaching the hospital.
const SHEETS_OUT = path.join(ROOT, 'public', 'hospital');
const SHEET = 1024;
const EDGE = 6;
// The darkest ink a sheet may hold, so that hair isn't taken for nothing.
const INK_FLOOR = 20;
// How much greener than it is red or blue the painted background is, at the least.
const GREEN_BY = 10;
const SMALLEST_PIECE = 120;
const SEAL = 4;
const CROWN_ENDS = 505;

const bust = (src, box, x, y) => ({ src, box, cell: { x, y, w: 256, h: 340 }, scale: 0.64 });
const ITEMS = {
  people: [
    { src: 'people-a', box: [60, 190, 240, 790], cell: slot(0), height: 470 },
    { src: 'people-a', box: [280, 195, 480, 790], cell: slot(1), height: 480 },
    { src: 'people-a', box: [550, 235, 750, 790], cell: slot(2), height: 440 },
    { src: 'people-a', box: [800, 435, 935, 785], cell: slot(3), height: 300 },
    { src: 'people-b', box: [70, 185, 310, 885], cell: slot(4), height: 480 },
    { src: 'people-b', box: [430, 185, 620, 885], cell: slot(5), height: 470 },
    { src: 'people-b', box: [720, 200, 920, 880], cell: slot(6), height: 470 },
    // from the waist up: he sits behind a desk, which hides the rest
    { src: 'doctor', box: [200, 155, 820, 800], cell: slot(7), height: 236 },
  ],
  props: [
    { src: 'large', box: [5, 255, 365, 720], cell: { x: 0, y: 0, w: 512, h: 512 }, solid: true, tone: tree },
    // the head of the bed only: the mattress between its two ends is drawn below
    { src: 'bed', box: [360, 225, 655, 352], cell: { x: 512, y: 0, w: 512, h: 256 } },
    { src: 'bed', box: [265, 540, 750, 770], cell: { x: 512, y: 256, w: 512, h: 256 } },
    { src: 'large', box: [340, 480, 535, 725], cell: { x: 0, y: 512, w: 256, h: 256 } },
    { src: 'large', box: [560, 490, 765, 725], cell: { x: 256, y: 512, w: 256, h: 256 } },
    { src: 'large', box: [800, 400, 1000, 705], cell: { x: 512, y: 512, w: 256, h: 412 } },
    { src: 'small', box: [160, 265, 365, 455], cell: { x: 0, y: 768, w: 256, h: 256 }, edge: EDGE - 2 },
    { src: 'small', box: [600, 235, 790, 450], cell: { x: 256, y: 768, w: 256, h: 256 }, edge: EDGE - 2 },
    { src: 'small', box: [285, 480, 615, 745], cell: { x: 768, y: 512, w: 256, h: 256 }, edge: EDGE - 2 },
    { src: 'small', box: [615, 570, 840, 765], cell: { x: 768, y: 768, w: 256, h: 256 }, edge: EDGE - 2 },
  ],
  girl: [
    bust('heads-loose', [10, 225, 365, 770], 0, 0),
    bust('heads-loose', [405, 225, 660, 765], 256, 0),
    bust('heads-loose', [715, 220, 1005, 770], 512, 0),
    bust('heads-tied', [60, 275, 345, 765], 768, 0),
    bust('heads-tied', [680, 280, 1015, 765], 0, 340),
    bust('heads-tied-2', [655, 265, 985, 750], 256, 340),
    { src: 'body', box: [30, 465, 370, 745], cell: { x: 0, y: 680, w: 256, h: 180 }, scale: 0.64 },
    // below her hair: the head on top of it is sometimes turned another way
    { src: 'body', box: [405, 500, 730, 752], cell: { x: 256, y: 680, w: 256, h: 180 }, scale: 0.64 },
    { src: 'things', box: [130, 110, 290, 325], cell: { x: 512, y: 680, w: 256, h: 172 } },
    { src: 'things', box: [640, 120, 895, 335], cell: { x: 512, y: 852, w: 256, h: 172 } },
    { src: 'things', box: [100, 400, 280, 925], cell: { x: 768, y: 340, w: 256, h: 684 } },
    { src: 'blanket', box: [10, 345, 1010, 765], cell: { x: 0, y: 860, w: 512, h: 164 }, keep: blanketOnly },
  ],
  // The whole of her lying down, each to the same size of shoulders. The foot of each goes under the bed's rail.
  lying: [
    { src: 'lying-window', box: [230, 235, 885, 940], cell: { x: 0, y: 0, w: 512, h: 512 }, scale: 0.7 },
    { src: 'lying-turned', box: [125, 115, 895, 1024], cell: { x: 512, y: 0, w: 512, h: 512 }, scale: 0.547 },
    { src: 'lying-hand', box: [205, 45, 825, 1024], cell: { x: 0, y: 512, w: 512, h: 512 }, scale: 0.505 },
    // the first request's riverside (v0.72): the boy, the car and the rocks
    { src: 'river', box: [752, 245, 962, 755], cell: { x: 512, y: 512, w: 256, h: 512 }, height: 330 },
    { src: 'river', box: [38, 355, 268, 575], cell: { x: 768, y: 512, w: 256, h: 256 } },
    { src: 'river', box: [198, 562, 582, 722], cell: { x: 768, y: 768, w: 256, h: 256 } },
  ],
  // Sofas, chairs and so on, drawn further down.
  furniture: [],
  // v0.79: the remembered places' things (hospitalArt.ts MEMORY_PART)
  memoryprops: [
    { src: 'rehab-props', box: [18, 476, 324, 690], cell: { x: 0, y: 0, w: 256, h: 256 } },
    { src: 'rehab-props', box: [330, 470, 530, 670], cell: { x: 256, y: 0, w: 256, h: 256 } },
    { src: 'rehab-props', box: [542, 538, 756, 674], cell: { x: 512, y: 0, w: 256, h: 256 } },
    { src: 'rehab-props', box: [768, 418, 1000, 678], cell: { x: 768, y: 0, w: 256, h: 256 } },
    // v0.80: the beach
    { src: 'beach-props', box: [12, 438, 270, 750], cell: { x: 0, y: 256, w: 256, h: 256 } },
    { src: 'beach-props', box: [278, 498, 528, 748], cell: { x: 256, y: 256, w: 256, h: 256 } },
    { src: 'beach-props', box: [488, 636, 702, 732], cell: { x: 512, y: 256, w: 256, h: 256 } },
    { src: 'beach-props', box: [698, 664, 850, 750], cell: { x: 768, y: 256, w: 256, h: 256 } },
    { src: 'beach-props', box: [858, 362, 988, 766], cell: { x: 0, y: 512, w: 256, h: 512 }, height: 470 },
    // v0.81: the market (the vegetable stall left out: its green leaves go with the green ground when cut)
    { src: 'market-props', box: [720, 286, 856, 722], cell: { x: 256, y: 512, w: 256, h: 512 }, height: 470 },
    { src: 'market-props', box: [878, 414, 990, 724], cell: { x: 512, y: 512, w: 256, h: 256 } },
    { src: 'market-scene', box: [684, 258, 950, 780], cell: { x: 512, y: 768, w: 256, h: 256 } },
    { src: 'market-props', box: [32, 372, 256, 680], cell: { x: 768, y: 512, w: 256, h: 256 } },
    { src: 'market-props', box: [466, 512, 708, 702], cell: { x: 768, y: 768, w: 256, h: 256 } },
  ],
  // v0.82: the yard and the night alley (hospitalArt.ts MEMORY2_PART)
  memoryprops2: [
    { src: 'yard-props', box: [16, 452, 284, 636], cell: { x: 0, y: 0, w: 256, h: 256 } },
    { src: 'yard-props', box: [292, 526, 492, 646], cell: { x: 256, y: 0, w: 256, h: 256 } },
    { src: 'yard-props', box: [678, 394, 872, 640], cell: { x: 512, y: 0, w: 256, h: 256 } },
    { src: 'night-props', box: [56, 320, 224, 756], cell: { x: 768, y: 0, w: 256, h: 256 } },
    { src: 'yard-props', box: [448, 348, 674, 644], cell: { x: 0, y: 256, w: 256, h: 512 }, height: 470 },
    { src: 'yard-props', box: [890, 352, 990, 658], cell: { x: 256, y: 256, w: 256, h: 512 }, height: 400 },
    { src: 'night-props', box: [296, 156, 402, 752], cell: { x: 512, y: 256, w: 256, h: 512 }, height: 490 },
    { src: 'night-props', box: [794, 228, 970, 764], cell: { x: 768, y: 256, w: 256, h: 512 }, height: 470 },
  ],
  // v0.74: everyone who shared a drawing now has their own (hospitalArt.ts PERSON2_SLOT).
  people2: [
    { src: 'people-c', box: [420, 200, 615, 930], cell: slot(0), height: 470 },
    { src: 'people-c', box: [675, 160, 940, 920], cell: slot(1), height: 480 },
    { src: 'people-d', box: [88, 115, 315, 930], cell: slot(2), height: 480 },
    { src: 'people-d', box: [395, 150, 635, 930], cell: slot(3), height: 465 },
    { src: 'people-d', box: [735, 170, 940, 930], cell: slot(4), height: 465 },
    { src: 'people-e', box: [95, 175, 330, 875], cell: slot(5), height: 450 },
    { src: 'grandpa', box: [360, 75, 665, 960], cell: slot(6), height: 460 },
    { src: 'people-e', box: [695, 290, 920, 875], cell: slot(7), height: 390 },
  ],
  // The first day, with her hair down, and below it the lobby's furniture (drawn further down).
  extra: [
    { src: 'lying-loose-window', box: [230, 235, 885, 940], cell: { x: 0, y: 0, w: 512, h: 512 }, scale: 0.7 },
    { src: 'lying-loose-turned', box: [185, 165, 890, 910], cell: { x: 512, y: 0, w: 512, h: 512 }, scale: 0.657 },
    // the riverside's tent and reeds
    { src: 'river', box: [282, 322, 590, 525], cell: { x: 0, y: 512, w: 512, h: 256 } },
    // v0.76: bushes thick enough to hide him, where the reeds were
    { src: 'river-bushes', box: [28, 280, 338, 668], cell: { x: 512, y: 512, w: 256, h: 256 } },
  ],
};

function slot(i) {
  return { x: (i % 4) * 256, y: Math.floor(i / 4) * 512, w: 256, h: 512 };
}

// The crown goes bright so it takes the window's light; the trunk stays out of it.
function tree(v, y) {
  return y < CROWN_ENDS ? Math.min(255, v * 1.5) : v * 0.55;
}

// A pillow came with it, which would sit in front of her: only what's below the blanket's top edge.
function blanketOnly(x, y) {
  const edge = [[0, 760], [20, 740], [190, 492], [270, 440], [360, 418], [500, 395], [660, 425], [760, 445], [830, 495], [1024, 760]];
  for (let i = 1; i < edge.length; i++) {
    if (x > edge[i][0]) continue;
    const [x0, y0] = edge[i - 1];
    const [x1, y1] = edge[i];
    return y >= y0 + ((y1 - y0) * (x - x0)) / (x1 - x0) - 4;
  }
  return false;
}

async function cut({ src, box, solid, keep, tone }) {
  const { data, info } = await sharp(path.join(RAW, `${src}-raw.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const [x0, y0, x1, y1] = box;
  const w = x1 - x0;
  const h = y1 - y0;
  const isGreen = (i) => data[i * 3 + 1] - Math.max(data[i * 3], data[i * 3 + 2]) > GREEN_BY;
  const at = (x, y) => (y0 + y) * info.width + x0 + x;
  const on = new Uint8Array(w * h);
  if (solid) {
    // Its leaves were shaded in the background's own green: only the green joined to the outside goes.
    // Its outline has gaps: thickened for this, so the outside can't get in through them.
    const wall = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (isGreen(at(x, y))) continue;
        for (let j = Math.max(0, y - SEAL); j <= Math.min(h - 1, y + SEAL); j++) for (let i = Math.max(0, x - SEAL); i <= Math.min(w - 1, x + SEAL); i++) wall[j * w + i] = 1;
      }
    }
    on.fill(1);
    const stack = [];
    for (let x = 0; x < w; x++) stack.push(x, x + (h - 1) * w);
    for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
    while (stack.length) {
      const k = stack.pop();
      if (!on[k] || wall[k]) continue;
      on[k] = 0;
      const x = k % w;
      if (x > 0) stack.push(k - 1);
      if (x < w - 1) stack.push(k + 1);
      if (k >= w) stack.push(k - w);
      if (k < w * (h - 1)) stack.push(k + w);
    }
    // Only the crown is shaded that green: below it the green simply goes, or the trunk gets a dark rim.
    for (let y = Math.max(0, CROWN_ENDS - y0); y < h; y++) for (let x = 0; x < w; x++) if (isGreen(at(x, y))) on[y * w + x] = 0;
  } else {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) on[y * w + x] = isGreen(at(x, y)) || (keep && !keep(x0 + x, y0 + y)) ? 0 : 1;
  }
  // Specks left in the green, which would stretch the box and get a paper margin of their own.
  const seen = new Uint8Array(w * h);
  const smallest = solid ? on.length / 8 : SMALLEST_PIECE;
  for (let start = 0; start < on.length; start++) {
    if (!on[start] || seen[start]) continue;
    const piece = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const k = stack.pop();
      piece.push(k);
      const x = k % w;
      for (const n of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, k >= w ? k - w : -1, k < w * (h - 1) ? k + w : -1]) {
        if (n >= 0 && on[n] && !seen[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    if (piece.length < smallest) for (const k of piece) on[k] = 0;
  }
  let left = w, right = 0, top = h, bottom = 0;
  const la = Buffer.alloc(w * h * 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!on[y * w + x]) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      const i = at(x, y) * 3;
      const lum = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
      la[(y * w + x) * 2] = Math.max(INK_FLOOR, Math.min(255, Math.round(tone ? tone(lum, y0 + y) : lum)));
      la[(y * w + x) * 2 + 1] = 255;
    }
  }
  return { la, w, h, trim: { left, top, width: right - left + 1, height: bottom - top + 1 } };
}

/** A white paper margin round everything in one cell, the way scissors would leave it. */
function cutEdge(sheet, cell, radius, paper = 244) {
  const { x, y, w, h } = cell;
  const far = 255;
  const dist = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (sheet[(y + j) * SHEET + x + i] > 12) continue;
      dist[j * w + i] = Math.min(far, Math.min(j > 0 ? dist[(j - 1) * w + i] : far, i > 0 ? dist[j * w + i - 1] : far) + 1);
    }
  }
  for (let j = h - 1; j >= 0; j--) {
    for (let i = w - 1; i >= 0; i--) {
      const k = j * w + i;
      if (dist[k] === 0) continue;
      dist[k] = Math.min(dist[k], Math.min(j < h - 1 ? dist[k + w] : far, i < w - 1 ? dist[k + 1] : far) + 1);
      if (dist[k] <= radius) sheet[(y + j) * SHEET + x + i] = paper;
    }
  }
}

// The signs: words have to be right, so these are drawn here and not generated.
const FONT = 'font-family="Batang, serif" font-weight="700" text-anchor="middle" fill="rgb(26,26,26)"';
const INK_LINE = 'stroke="rgb(26,26,26)" stroke-width="4" stroke-linejoin="round"';
const FAINT = 'stroke="rgb(90,90,90)" stroke-width="2"';
const sign = (word) => `<svg width="512" height="128"><path d="M110 10 V36 M402 10 V36" ${INK_LINE}/><rect x="24" y="34" width="464" height="84" rx="6" fill="rgb(238,238,238)" ${INK_LINE}/><text x="256" y="97" font-size="62" ${FONT}>${word}</text></svg>`;
const FURNITURE = [
  { cell: { x: 0, y: 768, w: 512, h: 128 }, svg: sign('안내') },
  { cell: { x: 512, y: 768, w: 512, h: 128 }, svg: sign('매점') },
];

// What makes it a hospital: somewhere to wait, and things left along the walls.
const ROOM_THINGS = [
  {
    // a wheelchair left folded out against a wall
    cell: { x: 768, y: 0, w: 256, h: 256 },
    svg: `<svg width="256" height="256">
      <path d="M66 32 h28 M80 32 V136 H186 V96 M186 136 L204 200 M180 96 H136" fill="none" stroke="rgb(26,26,26)" stroke-width="9" stroke-linecap="round"/>
      <rect x="84" y="60" width="16" height="74" fill="rgb(150,150,150)"/><rect x="84" y="118" width="102" height="20" fill="rgb(150,150,150)" ${INK_LINE}/>
      <circle cx="102" cy="184" r="56" fill="none" stroke="rgb(26,26,26)" stroke-width="11"/><circle cx="102" cy="184" r="44" fill="none" stroke="rgb(190,190,190)" stroke-width="4"/>
      <path d="M102 128 V240 M46 184 H158 M62 144 L142 224 M142 144 L62 224" stroke="rgb(90,90,90)" stroke-width="2"/>
      <circle cx="202" cy="222" r="20" fill="rgb(236,236,236)" stroke="rgb(26,26,26)" stroke-width="7"/>
    </svg>`,
  },
  {
    // a big-leafed plant someone waters
    cell: { x: 0, y: 256, w: 256, h: 512 },
    svg: `<svg width="256" height="512">
      <g fill="rgb(150,150,150)" ${INK_LINE}>
        <path d="M128 360 C70 300 34 220 44 150 C96 190 128 280 128 360 Z"/>
        <path d="M128 360 C186 300 222 220 212 150 C160 190 128 280 128 360 Z"/>
        <path d="M128 360 C90 260 90 110 128 34 C166 110 166 260 128 360 Z" fill="rgb(180,180,180)"/>
        <path d="M128 372 C80 348 34 330 14 276 C70 276 110 316 128 372 Z" fill="rgb(120,120,120)"/>
        <path d="M128 372 C176 348 222 330 242 276 C186 276 146 316 128 372 Z" fill="rgb(120,120,120)"/>
      </g>
      <path d="M128 70 V340 M64 182 L120 330 M192 182 L136 330" ${FAINT}/>
      <path d="M72 372 H184 L168 498 H88 Z" fill="rgb(226,226,226)" ${INK_LINE}/><rect x="62" y="360" width="132" height="24" rx="4" fill="rgb(238,238,238)" ${INK_LINE}/>
    </svg>`,
  },
];

// The sofa that stands in the room as a solid: every side of it laid out flat, like a skin (SOFA_SKIN in hospitalArt.ts).
// Each side is its own piece of card, with a pale edge where it folds.
const skinFace = (x, y, w, h, tone, extra = '') => `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="rgb(${tone},${tone},${tone})" stroke="rgb(232,232,232)" stroke-width="4"/><rect x="${x + 7}" y="${y + 7}" width="${w - 14}" height="${h - 14}" fill="none" stroke="rgb(26,26,26)" stroke-width="3"/>${extra}`;
const THE_REST_ART = {
  // the other solids, along the bottom of the sheet (the same places as in SKIN)
  cell: { x: 0, y: 768, w: 1024, h: 256 },
  svg: `<svg width="1024" height="256">${[
    skinFace(0, 0, 256, 128, 176, `<rect x="66" y="26" width="124" height="76" rx="4" fill="rgb(240,240,240)" ${INK_LINE}/><text x="128" y="84" font-size="50" ${FONT}>안내</text>`),
    skinFace(256, 0, 128, 128, 150),
    skinFace(384, 0, 256, 64, 236),
    skinFace(640, 0, 128, 96, 110),
    skinFace(768, 0, 64, 64, 236, '<path d="M780 26 H820 M780 40 H820" stroke="rgb(90,90,90)" stroke-width="3"/>'),
    skinFace(832, 0, 96, 128, 228),
    skinFace(928, 0, 96, 128, 200, `<path d="M936 62 H1016" ${INK_LINE}/><path d="M964 34 H988 M964 94 H988" stroke="rgb(26,26,26)" stroke-width="5"/>`),
    skinFace(0, 128, 256, 128, 128, `<rect x="66" y="154" width="124" height="76" rx="4" fill="rgb(240,240,240)" ${INK_LINE}/><text x="128" y="212" font-size="50" ${FONT}>매점</text>`),
    skinFace(256, 128, 128, 128, 108),
    skinFace(384, 64, 256, 64, 232),
    skinFace(384, 128, 96, 96, 186),
    skinFace(480, 128, 96, 96, 214),
    skinFace(640, 96, 96, 96, 120, '<path d="M650 136 H726" stroke="rgb(200,200,200)" stroke-width="3"/>'),
    skinFace(736, 96, 96, 96, 214, '<path d="M770 104 V184" stroke="rgb(90,90,90)" stroke-width="3"/>'),
    skinFace(832, 128, 96, 96, 170),
    skinFace(928, 128, 96, 96, 238),
  ].join('')}</svg>`,
};
const SOFA_SKIN_ART = {
  cell: { x: 512, y: 256, w: 512, h: 512 },
  svg: `<svg width="512" height="512">${[
    skinFace(0, 0, 256, 128, 178, '<path d="M88 12 V116 M170 12 V116" stroke="rgb(70,70,70)" stroke-width="3"/><path d="M24 60 q20 8 40 0 M112 72 q18 8 36 0 M192 54 q18 8 36 0" fill="none" stroke="rgb(120,120,120)" stroke-width="2"/>'),
    skinFace(256, 0, 256, 64, 142, '<path d="M344 10 V54 M426 10 V54" stroke="rgb(60,60,60)" stroke-width="3"/>'),
    skinFace(0, 128, 256, 128, 124, '<path d="M88 138 V246 M170 138 V246" stroke="rgb(50,50,50)" stroke-width="3"/><path d="M26 164 q18 -8 40 2 M110 200 q20 -8 38 2 M190 170 q18 -8 40 2" fill="none" stroke="rgb(85,85,85)" stroke-width="2"/>'),
    skinFace(256, 128, 256, 128, 104, '<path d="M270 192 H498" stroke="rgb(60,60,60)" stroke-width="2"/>'),
    skinFace(0, 256, 256, 32, 158),
    skinFace(256, 256, 64, 128, 150),
    skinFace(320, 256, 128, 128, 138, '<path d="M336 300 q44 -14 80 2" fill="none" stroke="rgb(90,90,90)" stroke-width="2"/>'),
    skinFace(448, 256, 64, 128, 170),
    skinFace(0, 320, 32, 32, 60),
  ].join('')}</svg>`,
};

async function buildSheet(name) {
  const sheet = new Uint8Array(SHEET * SHEET);
  for (const item of ITEMS[name]) {
    const { la, w, h, trim } = await cut(item);
    const edge = item.edge ?? EDGE;
    const room = { w: item.cell.w - (edge + 4) * 2, h: item.cell.h - (edge + 4) * 2 };
    const fit = item.scale ?? (item.height ? item.height / trim.height : 0);
    const by = fit || Math.min(room.w / trim.width, room.h / trim.height);
    const size = { width: Math.min(room.w, Math.round(trim.width * by)), height: Math.min(room.h, Math.round(trim.height * by)) };
    const { data, info } = await sharp(la, { raw: { width: w, height: h, channels: 2 } })
      .extract(trim)
      .resize({ ...size, fit: 'inside', kernel: 'lanczos3' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Standing on the cell's bottom edge, and in the middle of it.
    const ox = item.cell.x + Math.floor((item.cell.w - info.width) / 2);
    const oy = item.cell.y + item.cell.h - edge - 4 - info.height;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * info.channels;
        if (data[i + info.channels - 1] >= 128) sheet[(oy + y) * SHEET + ox + x] = Math.max(INK_FLOOR, data[i]);
      }
    }
    // The tree takes the window's light on whatever is bright: its margin stays under that, or it turns the colour of the day.
    cutEdge(sheet, item.cell, edge, item.solid ? 180 : 244);
  }
  if (name === 'extra' || name === 'furniture') {
    for (const f of name === 'extra' ? FURNITURE : [...ROOM_THINGS, SOFA_SKIN_ART, THE_REST_ART]) {
      const { data } = await sharp(Buffer.from(f.svg)).extractChannel('red').raw().toBuffer({ resolveWithObject: true });
      const a = await sharp(Buffer.from(f.svg)).extractChannel('alpha').raw().toBuffer();
      for (let y = 0; y < f.cell.h; y++) {
        for (let x = 0; x < f.cell.w; x++) {
          if (a[y * f.cell.w + x] >= 128) sheet[(f.cell.y + y) * SHEET + f.cell.x + x] = Math.max(INK_FLOOR, data[y * f.cell.w + x]);
        }
      }
      cutEdge(sheet, f.cell, EDGE);
    }
  }
  if (name === 'girl') {
    // the mattress, plain enough to draw: it lies flat between the two ends of the bed, seen along its length
    const mattress = Buffer.from(`<svg width="256" height="340"><rect x="5" y="5" width="246" height="330" rx="12" fill="rgb(226,226,226)" stroke="rgb(30,30,30)" stroke-width="5"/><path d="M40 70 q50 -12 90 4 M150 150 q40 14 70 2 M30 240 q60 16 110 -4" fill="none" stroke="rgb(135,135,135)" stroke-width="3"/></svg>`);
    const { data } = await sharp(mattress).extractChannel('red').raw().toBuffer({ resolveWithObject: true });
    for (let y = 0; y < 340; y++) for (let x = 0; x < 256; x++) sheet[(340 + y) * SHEET + 512 + x] = data[y * 256 + x];
  }
  if (name === 'props') {
    // her hairpin, the one thing on her with a colour of its own (the shader's)
    const pin = Buffer.from(`<svg width="64" height="64"><rect x="4" y="23" width="56" height="18" fill="rgb(242,242,242)" transform="rotate(-23 32 32)"/></svg>`);
    const { data } = await sharp(pin).extractChannel('red').raw().toBuffer({ resolveWithObject: true });
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) sheet[(940 + y) * SHEET + 512 + x] = data[y * 64 + x];
  }
  fs.mkdirSync(SHEETS_OUT, { recursive: true });
  const file = path.join(SHEETS_OUT, `sheet-${name}.png`);
  await sharp(Buffer.from(sheet), { raw: { width: SHEET, height: SHEET, channels: 1 } }).toColourspace('b-w').png({ compressionLevel: 9, palette: false }).toFile(file);
  console.log(`sheet-${name}.png`, fs.statSync(file).size);
}

// v0.74: the walls, floors and doors, drawn with Gemini (generate-hospital-art.js tex-*), cut into the tiles of the
// structure sheet at hospitalArt.ts's places. Whatever tiles must also repeats seamlessly; the game still paints the
// parts with writing (floor numbers, the floor guide) and the small marks on the walls over the top.
const TILE = 200;
const tileAt = (t) => ({ x: (t % 5) * TILE, y: Math.floor(t / 5) * TILE });
const WALL = { src: 'tex-walls', box: [76, 76, 469, 466], seam: 'x' };
const STRUCTURE = [
  // the corridor wall four ways, so it doesn't look copied: as drawn, mirrored, moved half along, both
  { tile: 0, ...WALL },
  { tile: 1, ...WALL, flip: true, shift: true },
  // v0.78: the front door
  { tile: 2, src: 'tex-entrance', box: [345, 280, 680, 700] },
  // under the parts the game writes on
  { tile: 15, ...WALL },
  { tile: 16, ...WALL },
  { tile: 17, ...WALL },
  { tile: 18, ...WALL },
  { tile: 20, ...WALL },
  // the floor softened, or its tile lines turn to noise down a corridor; the drawn ceiling came out in perspective
  // and zigzags when repeated, so the ceiling stays painted in code
  { tile: 4, src: 'tex-ground', box: [84, 84, 482, 472], seam: 'xy', soften: 0.5 },
  { tile: 6, src: 'tex-doors', box: [29, 362, 328, 670] },
  // a window per floor; the view through each is put in below (VIEWS)
  { tile: 8, src: 'tex-window', box: [62, 309, 469, 726] },
  { tile: 3, src: 'tex-window', box: [62, 309, 469, 726] },
  { tile: 7, src: 'tex-window', box: [62, 309, 469, 726] },
  { tile: 11, src: 'tex-window', box: [62, 309, 469, 726] },
  { tile: 9, src: 'tex-doors', box: [366, 362, 660, 670] },
  { tile: 10, src: 'tex-doors', box: [698, 362, 998, 670] },
  { tile: 12, src: 'tex-water', box: [554, 316, 965, 710], seam: 'x' },
  { tile: 13, src: 'tex-walls', box: [552, 76, 947, 466], seam: 'x' },
  { tile: 14, src: 'tex-ground', box: [84, 546, 482, 939], seam: 'xy' },
  // v0.76: the river and its far bank under the sky
  { tile: 21, src: 'river-scene', box: [554, 289, 953, 686], seam: 'xy' },
  { tile: 24, src: 'river-scene', box: [70, 289, 484, 686], seam: 'x' },
  { tile: 22, src: 'tex-walls', box: [76, 552, 469, 946], seam: 'x' },
  { tile: 23, src: 'tex-ground', box: [551, 546, 942, 939], seam: 'xy' },
];
const SEAM = 40;
// v0.79: the remembered places' tiles (hospitalArt.ts MEMORY_TILES), cut the same way into their own sheet.
const MEMORY = [
  { tile: 0, src: 'tex-ground', box: [551, 546, 942, 939], seam: 'xy' },
  { tile: 1, src: 'river-scene', box: [554, 289, 953, 686], seam: 'xy' },
  { tile: 2, src: 'tex-walls', box: [76, 552, 469, 946], seam: 'x' },
  { tile: 3, src: 'river-scene', box: [70, 289, 484, 686], seam: 'x' },
  { tile: 4, src: 'rehab-tex', box: [56, 296, 466, 712], seam: 'xy', soften: 0.3 },
  { tile: 5, src: 'rehab-tex', box: [556, 294, 966, 712], seam: 'x' },
  { tile: 6, ...WALL },
  { tile: 7, flat: 224 },
  // v0.80: the beach's sand, and the sea under its sky
  { tile: 8, src: 'beach-tex', box: [56, 300, 458, 590], seam: 'xy' },
  { tile: 9, src: 'beach-tex', box: [560, 294, 972, 696], seam: 'x' },
  // v0.81: the market's paving, and its street at dusk
  { tile: 10, src: 'tex-ground', box: [84, 546, 482, 939], seam: 'xy' },
  { tile: 11, src: 'market-scene', box: [62, 264, 560, 776], seam: 'x' },
  // v0.82: the yard's dirt and its wall under an autumn sky; the night alley's asphalt and its houses
  { tile: 12, src: 'yard-scene', box: [557, 308, 973, 706], seam: 'xy' },
  { tile: 13, src: 'yard-scene', box: [50, 308, 474, 706], seam: 'x' },
  { tile: 14, src: 'night-scene', box: [600, 330, 880, 700], seam: 'xy' },
  { tile: 15, src: 'night-scene', box: [88, 314, 476, 712], seam: 'x' },
];
// The glass of the window tile, and what each floor sees through it: the horizon of the courtyard, and the ginkgo
// (the same drawing as the courtyard's own) at its middle, its foot and its height. From the fourth floor it's small
// and far down; from the first it fills the glass.
const GLASS = { x: 28, y: 8, w: 150, h: 144 };
const VIEWS = [
  { tile: 8, horizon: 30, x: 108, foot: 116, height: 56 },
  { tile: 11, horizon: 56, x: 52, foot: 128, height: 82 },
  { tile: 7, horizon: 86, x: 98, foot: 142, height: 112 },
  { tile: 3, horizon: 124, x: 70, foot: 168, height: 190 },
];

async function cutTiles(list, sheet) {
  for (const t of list) {
    if (t.flat) {
      const { x: ox, y: oy } = tileAt(t.tile);
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) sheet[(oy + y) * SHEET + ox + x] = t.flat;
      continue;
    }
    const [x0, y0, x1, y1] = t.box;
    const n = TILE + SEAM;
    // a little more than a tile: the extra goes into the cross-fade that makes the edges meet
    let { data } = await sharp(path.join(RAW, `${t.src}-raw.png`))
      .extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
      .resize(n, n, { fit: 'fill', kernel: 'lanczos3' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const at = (x, y) => data[y * n + x];
    const out = new Uint8Array(TILE * TILE);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        let v = at(x, y);
        if (t.seam && x < SEAM) v = at(x + TILE, y) + (v - at(x + TILE, y)) * (x / SEAM);
        if (t.seam === 'xy' && y < SEAM) {
          let below = at(x, y + TILE);
          if (x < SEAM) below = at(x + TILE, y + TILE) + (below - at(x + TILE, y + TILE)) * (x / SEAM);
          v = below + (v - below) * (y / SEAM);
        }
        // a softened tile keeps its pattern at half the contrast, around a light grey
        if (t.soften) v = 190 + (v - 190) * t.soften;
        out[y * TILE + x] = Math.round(v);
      }
    }
    const { x: ox, y: oy } = tileAt(t.tile);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        let sx = t.flip ? TILE - 1 - x : x;
        if (t.shift) sx = (sx + TILE / 2) % TILE;
        // never exactly black: on the structure sheet that would read as "paint this one in code"
        sheet[(oy + y) * SHEET + ox + x] = Math.max(1, out[y * TILE + sx]);
      }
    }
  }
}

async function buildMemory() {
  const sheet = new Uint8Array(SHEET * SHEET);
  await cutTiles(MEMORY, sheet);
  const file = path.join(SHEETS_OUT, 'sheet-memory.png');
  await sharp(Buffer.from(sheet), { raw: { width: SHEET, height: SHEET, channels: 1 } }).toColourspace('b-w').png({ compressionLevel: 9, palette: false }).toFile(file);
  console.log('sheet-memory.png', fs.statSync(file).size);
}

async function buildStructure() {
  const sheet = new Uint8Array(SHEET * SHEET);
  await cutTiles(STRUCTURE, sheet);
  // each floor's view of the ginkgo
  const ginkgo = await cut({ src: 'large', box: [5, 255, 365, 720], solid: true, tone: tree });
  for (const v of VIEWS) {
    const { x: ox, y: oy } = tileAt(v.tile);
    for (let y = 0; y < GLASS.h; y++) for (let x = 0; x < GLASS.w; x++) sheet[(oy + GLASS.y + y) * SHEET + ox + GLASS.x + x] = y < v.horizon ? 236 : y === v.horizon ? 130 : 204;
    const width = Math.round((ginkgo.trim.width * v.height) / ginkgo.trim.height);
    const { data, info } = await sharp(ginkgo.la, { raw: { width: ginkgo.w, height: ginkgo.h, channels: 2 } }).extract(ginkgo.trim).resize({ width, height: v.height }).raw().toBuffer({ resolveWithObject: true });
    const left = GLASS.x + v.x - Math.round(width / 2);
    const top = GLASS.y + v.foot - v.height;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const gx = left + x;
        const gy = top + y;
        if (gx < GLASS.x || gx >= GLASS.x + GLASS.w || gy < GLASS.y || gy >= GLASS.y + GLASS.h) continue;
        const i = (y * info.width + x) * info.channels;
        if (data[i + info.channels - 1] >= 128) sheet[(oy + gy) * SHEET + ox + gx] = Math.max(1, data[i]);
      }
    }
    // the bar down the middle of the window, over the view
    for (let y = 0; y < GLASS.h; y++) for (const x of [59, 60]) sheet[(oy + GLASS.y + y) * SHEET + ox + GLASS.x + x] = 40;
  }
  const file = path.join(SHEETS_OUT, 'sheet-structure.png');
  await sharp(Buffer.from(sheet), { raw: { width: SHEET, height: SHEET, channels: 1 } }).toColourspace('b-w').png({ compressionLevel: 9, palette: false }).toFile(file);
  console.log('sheet-structure.png', fs.statSync(file).size);
}

// The opening: grey like everything else, with the seal and her window as the only colours.
const OPENING = [
  { name: 'op-hand', src: 'op-hand', crop: { left: 112, top: 0, width: 737, height: 1024 }, mark: `<circle cx="540" cy="540" r="17" fill="#a4263f"/>` },
  { name: 'op-desk', src: 'op-desk-2', crop: { left: 150, top: 0, width: 737, height: 1024 } },
  { name: 'op-hospital', src: 'op-hospital', crop: { left: 175, top: 56, width: 672, height: 933 }, mark: `<rect x="526" y="432" width="83" height="46" fill="#dba83f"/>` },
];

async function buildOpening({ name, src, crop, mark }) {
  const grey = await sharp(path.join(RAW, `${src}-raw.png`)).removeAlpha().greyscale().toColourspace('srgb').png().toBuffer();
  const layers = mark ? [{ input: Buffer.from(`<svg width="1024" height="1024">${mark}</svg>`) }] : [];
  const out = await sharp(grey).composite(layers).png().toBuffer();
  const file = path.join(OUT, `${name}.jpg`);
  await sharp(out).extract(crop).resize(720, 1000).jpeg({ quality: 74, mozjpeg: true }).toFile(file);
  console.log(`${name}.jpg`, fs.statSync(file).size);
}

(async () => {
  for (const name of Object.keys(ITEMS)) await buildSheet(name);
  await buildStructure();
  await buildMemory();
  for (const item of OPENING) await buildOpening(item);
})();

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
  ],
  // Sofas, chairs and so on, drawn further down.
  furniture: [],
  // The first day, with her hair down, and below it the lobby's furniture (drawn further down).
  extra: [
    { src: 'lying-loose-window', box: [230, 235, 885, 940], cell: { x: 0, y: 0, w: 512, h: 512 }, scale: 0.7 },
    { src: 'lying-loose-turned', box: [185, 165, 890, 910], cell: { x: 512, y: 0, w: 512, h: 512 }, scale: 0.657 },
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

// The front desk, the shop counter and their signs: words have to be right, so these are drawn here and not generated.
const FONT = 'font-family="Batang, serif" font-weight="700" text-anchor="middle" fill="rgb(26,26,26)"';
const INK_LINE = 'stroke="rgb(26,26,26)" stroke-width="4" stroke-linejoin="round"';
const FAINT = 'stroke="rgb(90,90,90)" stroke-width="2"';
const hatchLines = (x, y, w, h, gap) => {
  let d = '';
  for (let i = gap; i < w; i += gap) d += `M${x + i} ${y + 2} l-3 ${h - 4} `;
  return `<path d="${d}" fill="none" ${FAINT}/>`;
};
const sign = (word) => `<svg width="512" height="128"><path d="M110 10 V36 M402 10 V36" ${INK_LINE}/><rect x="24" y="34" width="464" height="84" rx="6" fill="rgb(238,238,238)" ${INK_LINE}/><text x="256" y="97" font-size="62" ${FONT}>${word}</text></svg>`;
const FURNITURE = [
  {
    // a flat-topped desk: a screen's back, a stack of leaflets, a bell
    cell: { x: 0, y: 512, w: 512, h: 256 },
    svg: `<svg width="512" height="256">
      <rect x="88" y="26" width="104" height="66" rx="4" fill="rgb(120,120,120)" ${INK_LINE}/><rect x="126" y="90" width="28" height="14" fill="rgb(90,90,90)" ${INK_LINE}/>
      <rect x="250" y="82" width="84" height="22" fill="rgb(235,235,235)" ${INK_LINE}/><path d="M250 92 H334" ${FAINT}/>
      <path d="M372 104 a24 24 0 0 1 48 0 Z" fill="rgb(200,200,200)" ${INK_LINE}/><circle cx="396" cy="77" r="4" fill="rgb(60,60,60)"/>
      <rect x="44" y="124" width="424" height="120" fill="rgb(176,176,176)" ${INK_LINE}/>${hatchLines(44, 124, 424, 120, 26)}
      <rect x="18" y="102" width="476" height="24" rx="3" fill="rgb(236,236,236)" ${INK_LINE}/>
      <rect x="166" y="140" width="180" height="88" rx="4" fill="rgb(240,240,240)" ${INK_LINE}/><text x="256" y="205" font-size="62" ${FONT}>안내</text>
    </svg>`,
  },
  {
    // a low counter with the day's small things out on it
    cell: { x: 512, y: 512, w: 512, h: 256 },
    svg: `<svg width="512" height="256">
      <g fill="rgb(214,214,214)" ${INK_LINE}><circle cx="62" cy="92" r="19"/><circle cx="100" cy="92" r="19"/><circle cx="81" cy="62" r="19"/></g>
      <rect x="150" y="56" width="62" height="54" fill="rgb(120,120,120)" ${INK_LINE}/><path d="M150 76 H212" ${FAINT}/>
      <rect x="236" y="44" width="40" height="66" rx="8" fill="rgb(236,236,236)" ${INK_LINE}/><rect x="244" y="30" width="24" height="16" fill="rgb(90,90,90)" ${INK_LINE}/>
      <rect x="298" y="72" width="78" height="38" fill="rgb(224,224,224)" ${INK_LINE}/><path d="M298 86 H376 M322 72 V110" ${FAINT}/>
      <path d="M398 110 L410 58 L466 58 L478 110 Z" fill="rgb(170,170,170)" ${INK_LINE}/>
      <rect x="44" y="128" width="424" height="116" fill="rgb(128,128,128)" ${INK_LINE}/>${hatchLines(44, 128, 424, 116, 34)}
      <rect x="18" y="108" width="476" height="24" rx="3" fill="rgb(232,232,232)" ${INK_LINE}/>
      <rect x="176" y="146" width="160" height="80" rx="4" fill="rgb(240,240,240)" ${INK_LINE}/><text x="256" y="205" font-size="56" ${FONT}>매점</text>
    </svg>`,
  },
  { cell: { x: 0, y: 768, w: 512, h: 128 }, svg: sign('안내') },
  { cell: { x: 512, y: 768, w: 512, h: 128 }, svg: sign('매점') },
];

// What makes it a hospital: somewhere to wait, and things left along the walls.
const ROOM_THINGS = [
  {
    // a long vinyl waiting-room sofa
    cell: { x: 0, y: 0, w: 512, h: 256 },
    svg: `<svg width="512" height="256">
      <rect x="36" y="44" width="440" height="106" rx="16" fill="rgb(120,120,120)" ${INK_LINE}/><path d="M183 50 V148 M329 50 V148" ${FAINT}/>
      <rect x="20" y="96" width="50" height="104" rx="14" fill="rgb(146,146,146)" ${INK_LINE}/><rect x="442" y="96" width="50" height="104" rx="14" fill="rgb(146,146,146)" ${INK_LINE}/>
      <rect x="66" y="142" width="380" height="58" rx="10" fill="rgb(172,172,172)" ${INK_LINE}/><path d="M193 146 V198 M319 146 V198" ${FAINT}/>
      <path d="M62 200 V238 M450 200 V238" stroke="rgb(26,26,26)" stroke-width="9"/>
    </svg>`,
  },
  {
    // a plastic chair, the kind in a row along a corridor
    cell: { x: 512, y: 0, w: 256, h: 256 },
    svg: `<svg width="256" height="256">
      <path d="M60 50 q68 -22 136 0 l-6 92 h-124 Z" fill="rgb(186,186,186)" ${INK_LINE}/>
      <path d="M54 142 h148 l10 34 h-168 Z" fill="rgb(214,214,214)" ${INK_LINE}/>
      <path d="M62 176 L52 244 M194 176 L204 244 M92 176 L88 228 M164 176 L168 228" stroke="rgb(26,26,26)" stroke-width="7"/>
    </svg>`,
  },
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
  {
    // the bedside cabinet in her room
    cell: { x: 256, y: 256, w: 256, h: 256 },
    svg: `<svg width="256" height="256">
      <rect x="50" y="60" width="156" height="170" fill="rgb(206,206,206)" ${INK_LINE}/><rect x="36" y="44" width="184" height="20" rx="3" fill="rgb(238,238,238)" ${INK_LINE}/>
      <path d="M50 118 H206" ${INK_LINE}/><path d="M112 90 H144 M112 150 H144" stroke="rgb(26,26,26)" stroke-width="6"/>
      <path d="M62 230 V246 M194 230 V246" stroke="rgb(26,26,26)" stroke-width="8"/>
    </svg>`,
  },
];

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
    for (const f of name === 'extra' ? FURNITURE : ROOM_THINGS) {
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
  for (const item of OPENING) await buildOpening(item);
})();

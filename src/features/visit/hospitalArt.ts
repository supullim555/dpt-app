// The hospital's seven sheets, one channel of ink each and 1024 square: about 9MB of GPU memory in all
// (docs/병원_지도.md). Colour comes later, in the shader. The walls and floors are painted here on a canvas, since they
// have to tile. People, props and the girl are drawings, cut out of paper by scripts/assets/build-hospital-sheets.js,
// whose cells must match these; on those three sheets exactly black means nothing is there.

export const SHEET = 1024;
export const TILE = 200;
export const TILES = {
  wall: 0, // to 3: four versions
  floor: 4,
  ceiling: 5,
  shutDoor: 6,
  jamb: 7,
  window: 8,
  lift: 9,
  stairs: 10,
  roomDoor: 11,
  counter: 12,
  yardWall: 13,
  yardGround: 14,
  number: 15, // to 18: floors 1 to 4
  shelf: 19,
  floorGuide: 20,
  // the riverside in the first request's memory
  water: 21,
  treeline: 22,
  pebbles: 23,
} as const;

/** Top-left corner of a tile, in pixels. */
export const tileAt = (t: number) => ({ x: (t % 5) * TILE, y: Math.floor(t / 5) * TILE });

type FirstPerson = 'nurse' | 'worker' | 'elder' | 'child' | 'visitor' | 'patient' | 'shopkeeper' | 'doctor';
/** v0.74: the people who shared someone else's drawing until then, on a sheet of their own. */
type SecondPerson = 'receptionist' | 'guard' | 'porter' | 'physio' | 'reader' | 'volunteer' | 'grandpa' | 'grandma';
export type PersonLook = FirstPerson | SecondPerson;
export const PERSON_SLOT: Record<FirstPerson, number> = { nurse: 0, worker: 1, elder: 2, child: 3, visitor: 4, patient: 5, shopkeeper: 6, doctor: 7 };
export const PERSON2_SLOT: Record<SecondPerson, number> = { receptionist: 0, guard: 1, porter: 2, physio: 3, reader: 4, volunteer: 5, grandpa: 6, grandma: 7 };
/** Slots on the people sheet: 4 across, 2 down. */
export const SLOT_W = 256;
export const SLOT_H = 512;

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const grey = (v: number) => {
  const n = Math.round(v * 255);
  return `rgb(${n},${n},${n})`;
};

type Pen = { c: CanvasRenderingContext2D; r: () => number };

function line(p: Pen, x0: number, y0: number, x1: number, y1: number, width = 2.2, v = 0.1) {
  const { c, r } = p;
  c.strokeStyle = grey(v);
  c.lineCap = 'round';
  // Twice over and not quite straight: a hand, not a ruler.
  for (let pass = 0; pass < 2; pass++) {
    c.lineWidth = width * (0.6 + r() * 0.7);
    c.beginPath();
    c.moveTo(x0 + (r() - 0.5) * 3, y0 + (r() - 0.5) * 3);
    const n = 4;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      c.lineTo(x0 + (x1 - x0) * t + (r() - 0.5) * 2.4, y0 + (y1 - y0) * t + (r() - 0.5) * 2.4);
    }
    c.stroke();
  }
}

function box(p: Pen, x: number, y: number, w: number, h: number, width = 2.2, v = 0.1) {
  line(p, x, y, x + w, y, width, v);
  line(p, x + w, y, x + w, y + h, width, v);
  line(p, x + w, y + h, x, y + h, width, v);
  line(p, x, y + h, x, y, width, v);
}

function hatch(p: Pen, x: number, y: number, w: number, h: number, gap: number, v = 0.3) {
  for (let i = -h; i < w; i += gap) {
    const x0 = Math.max(x, x + i);
    const y0 = y + (x0 - (x + i));
    const x1 = Math.min(x + w, x + i + h);
    const y1 = y + (x1 - (x + i));
    line(p, x0, y0, x1, y1, 1.1, v);
  }
}

/** Uneven paper: a few pale blotches over a flat tone. */
function paper(p: Pen, x: number, y: number, s: number, tone: number) {
  const { c, r } = p;
  c.fillStyle = grey(tone);
  c.fillRect(x, y, s, s);
  c.save();
  c.beginPath();
  c.rect(x, y, s, s);
  c.clip();
  for (let i = 0; i < 26; i++) {
    c.globalAlpha = 0.05 + r() * 0.07;
    c.fillStyle = grey(r() < 0.5 ? tone - 0.2 : tone + 0.1);
    c.beginPath();
    c.arc(x + r() * s, y + r() * s, 8 + r() * 34, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  // a fold in the card: a dark line with a light one beside it
  if (r() < 0.6) {
    const fold = x + 30 + r() * (s - 60);
    c.globalAlpha = 0.14;
    c.fillStyle = grey(0.1);
    c.fillRect(fold, y, 1.5, s);
    c.globalAlpha = 0.28;
    c.fillStyle = grey(1);
    c.fillRect(fold + 1.5, y, 2.5, s);
    c.globalAlpha = 1;
  }
  c.restore();
}

// The Gemini-drawn structure sheet (build-hospital-sheets.js), while paintStructure runs; null if it couldn't load.
let drawn: Uint8Array | null = null;

/** A tile's square from the drawn sheet, as it is. */
function fromDrawn(c: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }) {
  if (!drawn) return;
  const img = c.createImageData(TILE, TILE);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const v = drawn[(from.y + y) * SHEET + from.x + x];
      const i = (y * TILE + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  c.putImageData(img, to.x, to.y);
}

function wallBase(p: Pen, x: number, y: number) {
  if (drawn) return fromDrawn(p.c, { x, y }, { x, y });
  paper(p, x, y, TILE, 0.82);
  line(p, x, y + 118, x + TILE, y + 118, 2.4);
  hatch(p, x, y + 120, TILE, 62, 12, 0.42);
  line(p, x, y + 182, x + TILE, y + 182, 3.4, 0.08);
}

function doorShape(p: Pen, x: number, y: number) {
  paper(p, x, y, TILE, 0.68);
  box(p, x + 28, y + 6, 144, 190, 4);
  box(p, x + 40, y + 18, 120, 172, 2);
  line(p, x + 140, y + 104, x + 152, y + 104, 5, 0.06);
}

// Tiles taken whole from the drawn sheet when it's there; the rest are painted here, over the drawn wall where they have one.
const DRAWN_TILES = [TILES.floor, TILES.shutDoor, TILES.window, TILES.lift, TILES.stairs, TILES.roomDoor, TILES.counter, TILES.yardWall, TILES.yardGround, TILES.water, TILES.treeline, TILES.pebbles];

function paintStructure(c: CanvasRenderingContext2D, base: Uint8Array | null = null) {
  drawn = base;
  paintTiles(c);
  for (const t of base ? DRAWN_TILES : []) fromDrawn(c, tileAt(t), tileAt(t));
  drawn = null;
}

function paintTiles(c: CanvasRenderingContext2D) {
  const p: Pen = { c, r: seeded(11) };
  const at = (t: number) => tileAt(t);

  for (let v = 0; v < 4; v++) {
    const { x, y } = at(TILES.wall + v);
    wallBase(p, x, y);
    if (v === 1) {
      c.globalAlpha = 0.22;
      c.fillStyle = grey(0.25);
      c.beginPath();
      c.ellipse(x + 62, y + 58, 34, 22, 0.3, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
    if (v === 2) {
      line(p, x + 130, y + 8, x + 118, y + 50, 1.4);
      line(p, x + 118, y + 50, x + 142, y + 92, 1.4);
    }
    if (v === 3) {
      c.fillStyle = grey(0.95);
      c.fillRect(x + 66, y + 28, 66, 66);
      box(p, x + 66, y + 28, 66, 66, 2);
      for (let i = 0; i < 4; i++) line(p, x + 76, y + 44 + i * 11, x + 122 - i * 5, y + 44 + i * 11, 1.2, 0.3);
    }
  }

  let t = at(TILES.floor);
  paper(p, t.x, t.y, TILE, 0.56);
  for (const o of [0, 100]) {
    line(p, t.x + o, t.y, t.x + o, t.y + TILE, 1.6, 0.2);
    line(p, t.x, t.y + o, t.x + TILE, t.y + o, 1.6, 0.2);
  }

  t = at(TILES.ceiling);
  paper(p, t.x, t.y, TILE, 0.7);
  c.fillStyle = grey(1);
  c.fillRect(t.x + 62, t.y + 36, 76, 128);
  box(p, t.x + 62, t.y + 36, 76, 128, 2.5);

  t = at(TILES.shutDoor);
  doorShape(p, t.x, t.y);
  c.fillStyle = grey(0.28);
  c.fillRect(t.x + 72, t.y + 32, 56, 42);
  box(p, t.x + 72, t.y + 32, 56, 42, 2);

  t = at(TILES.jamb);
  wallBase(p, t.x, t.y);
  hatch(p, t.x, t.y, TILE, TILE, 14, 0.36);

  t = at(TILES.window);
  wallBase(p, t.x, t.y);
  c.fillStyle = grey(1);
  c.fillRect(t.x + 30, t.y + 22, 140, 92);
  // the same ginkgo every south window looks down on
  c.fillStyle = grey(0.68);
  c.beginPath();
  c.arc(t.x + 136, t.y + 88, 24, 0, Math.PI * 2);
  c.fill();
  box(p, t.x + 30, t.y + 22, 140, 92, 4);
  line(p, t.x + 100, t.y + 22, t.x + 100, t.y + 114, 3);

  t = at(TILES.lift);
  paper(p, t.x, t.y, TILE, 0.5);
  box(p, t.x + 18, t.y + 14, 164, 182, 5, 0.06);
  line(p, t.x + 100, t.y + 14, t.x + 100, t.y + 196, 4, 0.06);
  c.fillStyle = grey(0.92);
  c.fillRect(t.x + 172, t.y + 84, 20, 34);

  t = at(TILES.stairs);
  c.fillStyle = grey(0.32);
  c.fillRect(t.x, t.y, TILE, TILE);
  for (let i = 0; i < 7; i++) {
    const inset = 10 + i * 8;
    const h = 22 - i * 1.5;
    const y = t.y + 186 - i * 26;
    c.fillStyle = grey(0.8 - i * 0.07);
    c.fillRect(t.x + inset, y, TILE - inset * 2, h);
    box(p, t.x + inset, y, TILE - inset * 2, h, 1.6);
  }

  t = at(TILES.roomDoor);
  doorShape(p, t.x, t.y);
  c.fillStyle = grey(1);
  c.fillRect(t.x + 72, t.y + 32, 56, 42);
  box(p, t.x + 72, t.y + 32, 56, 42, 2);

  t = at(TILES.counter);
  wallBase(p, t.x, t.y);
  c.fillStyle = grey(0.62);
  c.fillRect(t.x, t.y + 96, TILE, 104);
  line(p, t.x, t.y + 96, t.x + TILE, t.y + 96, 5, 0.06);
  hatch(p, t.x, t.y + 104, TILE, 92, 16, 0.32);

  t = at(TILES.yardWall);
  paper(p, t.x, t.y, TILE, 0.6);
  for (let row = 0; row < 8; row++) {
    const yy = t.y + row * 25;
    line(p, t.x, yy, t.x + TILE, yy, 1.4, 0.25);
    for (let col = row % 2 ? 25 : 0; col < TILE; col += 50) line(p, t.x + col, yy, t.x + col, yy + 25, 1.2, 0.25);
  }

  t = at(TILES.yardGround);
  paper(p, t.x, t.y, TILE, 0.66);
  for (let i = 0; i < 26; i++) {
    const lx = t.x + 10 + p.r() * 180;
    const ly = t.y + 10 + p.r() * 180;
    line(p, lx, ly, lx + 6, ly + 3, 2.6, 0.32);
  }

  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (let f = 1; f <= 4; f++) {
    t = at(TILES.number + f - 1);
    wallBase(p, t.x, t.y);
    c.fillStyle = grey(0.1);
    c.font = '700 78px serif';
    c.fillText(`${f}층`, t.x + 100, t.y + 62);
  }

  // the riverside: shallow water in long ripples, a far bank of trees, a beach of pebbles
  t = at(TILES.water);
  paper(p, t.x, t.y, TILE, 0.74);
  for (let i = 0; i < 18; i++) {
    const lx = t.x + p.r() * 160;
    const ly = t.y + 8 + p.r() * 184;
    line(p, lx, ly, lx + 24 + p.r() * 30, ly, 1.6, 0.42);
  }
  t = at(TILES.treeline);
  paper(p, t.x, t.y, TILE, 0.8);
  c.fillStyle = grey(0.55);
  for (let i = 0; i < 7; i++) {
    const cx = t.x + i * 32 + p.r() * 10;
    const top = t.y + 60 + p.r() * 60;
    c.beginPath();
    c.moveTo(cx - 26, t.y + TILE);
    c.lineTo(cx, top);
    c.lineTo(cx + 26, t.y + TILE);
    c.fill();
  }
  t = at(TILES.pebbles);
  paper(p, t.x, t.y, TILE, 0.72);
  for (let i = 0; i < 40; i++) {
    const lx = t.x + 8 + p.r() * 184;
    const ly = t.y + 8 + p.r() * 184;
    c.strokeStyle = grey(0.3);
    c.lineWidth = 1.4;
    c.beginPath();
    c.ellipse(lx, ly, 3 + p.r() * 5, 2 + p.r() * 3, p.r() * 3, 0, Math.PI * 2);
    c.stroke();
  }

  // the shop's walls: shelves from floor to ceiling, things on them in no particular order
  t = at(TILES.shelf);
  paper(p, t.x, t.y, TILE, 0.46);
  for (let row = 0; row < 3; row++) {
    const base = t.y + 60 + row * 64;
    let lx = t.x + 6;
    while (lx < t.x + 170) {
      const w = 14 + p.r() * 22;
      const h = 22 + p.r() * 24;
      const v = 0.45 + p.r() * 0.5;
      c.fillStyle = grey(v);
      if (p.r() < 0.3) {
        c.beginPath();
        c.arc(lx + w / 2, base - w / 2, w / 2, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = grey(0.1);
        c.lineWidth = 2;
        c.stroke();
      } else {
        c.fillRect(lx, base - h, w, h);
        box(p, lx, base - h, w, h, 1.6);
      }
      lx += w + 4 + p.r() * 6;
    }
    c.fillStyle = grey(0.78);
    c.fillRect(t.x, base, TILE, 7);
    line(p, t.x, base + 7, t.x + TILE, base + 7, 2.4, 0.08);
  }

  // behind the front desk: which floor is which
  t = at(TILES.floorGuide);
  wallBase(p, t.x, t.y);
  c.fillStyle = grey(0.96);
  c.fillRect(t.x + 22, t.y + 8, 156, 104);
  box(p, t.x + 22, t.y + 8, 156, 104, 3);
  c.fillStyle = grey(0.1);
  c.font = '700 17px serif';
  c.fillText('4층 호스피스', t.x + 100, t.y + 26);
  c.fillText('3층 중증 병동', t.x + 100, t.y + 49);
  c.fillText('2층 일반 병동', t.x + 100, t.y + 72);
  c.fillText('1층 로비·매점', t.x + 100, t.y + 95);
}

/** Cells on the props sheet. Each clue has its own, so it can be lifted up and looked at. */
export const PROP = {
  tree: { x: 0, y: 0, w: 512, h: 512 },
  bed: { x: 512, y: 0, w: 512, h: 256 },
  bedFront: { x: 512, y: 256, w: 512, h: 256 },
  gurney: { x: 0, y: 512, w: 256, h: 256 },
  cart: { x: 256, y: 512, w: 256, h: 256 },
  vending: { x: 512, y: 512, w: 256, h: 412 },
  collar: { x: 0, y: 768, w: 256, h: 256 },
  snack: { x: 256, y: 768, w: 256, h: 256 },
  laces: { x: 768, y: 512, w: 256, h: 256 },
  coupon: { x: 768, y: 768, w: 256, h: 256 },
  pin: { x: 512, y: 940, w: 64, h: 64 },
  // the same one, on a head further off
  pinSmall: { x: 512, y: 940, w: 64, h: 64 },
} as const;

/** Parts of her on their own sheet (girlDays.ts says which go together on which day). Each head has her shoulders with it. */
const bust = (col: number, row: number) => ({ x: col * 256, y: row * 340, w: 256, h: 340 });
export const GIRL_PART = {
  headBack: bust(0, 0),
  headSide: bust(1, 0),
  headThree: bust(2, 0),
  headSideTied: bust(3, 0),
  headFront: bust(0, 1),
  headTired: bust(1, 1),
  mattress: bust(2, 1),
  torso: { x: 0, y: 680, w: 256, h: 180 },
  torsoBack: { x: 256, y: 680, w: 256, h: 180 },
  notebook: { x: 512, y: 680, w: 256, h: 172 },
  leaves: { x: 512, y: 852, w: 256, h: 172 },
  drip: { x: 768, y: 340, w: 256, h: 684 },
  blanket: { x: 0, y: 860, w: 512, h: 164 },
} as const;
export type GirlPart = keyof typeof GIRL_PART;

/** The whole of her lying down, on a sheet of their own: the last two days. */
export const LYING_PART = {
  lyingWindow: { x: 0, y: 0, w: 512, h: 512 },
  lyingTurned: { x: 512, y: 0, w: 512, h: 512 },
  lyingHand: { x: 0, y: 512, w: 512, h: 512 },
  riverBoy: { x: 512, y: 512, w: 256, h: 512 },
  riverCar: { x: 768, y: 512, w: 256, h: 256 },
  riverRocks: { x: 768, y: 768, w: 256, h: 256 },
} as const;
export type LyingPart = keyof typeof LYING_PART;

/** What's too round or too thin to be built out of boxes, and stays a cutout. */
export const FURNITURE_PART = {
  wheelchair: { x: 768, y: 0, w: 256, h: 256 },
  plant: { x: 0, y: 256, w: 256, h: 512 },
} as const;
export type FurniturePart = keyof typeof FURNITURE_PART;

/**
 * The sides of the solid furniture, laid out flat on the furniture sheet like a skin. Each is a rectangle, in pixels; to
 * dress something differently, only this drawing changes.
 */
const skinFace = (x: number, y: number, w: number, h: number) => ({ x: 512 + x, y: 256 + y, w, h });
const lowerFace = (x: number, y: number, w: number, h: number) => ({ x, y: 768 + y, w, h });
export const SKIN = {
  seatTop: skinFace(0, 0, 256, 128),
  seatFront: skinFace(256, 0, 256, 64),
  backFront: skinFace(0, 128, 256, 128),
  backRear: skinFace(256, 128, 256, 128),
  backTop: skinFace(0, 256, 256, 32),
  armFront: skinFace(256, 256, 64, 128),
  armSide: skinFace(320, 256, 128, 128),
  armTop: skinFace(448, 256, 64, 128),
  leg: skinFace(0, 320, 32, 32),
  deskFront: lowerFace(0, 0, 256, 128),
  deskSide: lowerFace(256, 0, 128, 128),
  deskTop: lowerFace(384, 0, 256, 64),
  screen: lowerFace(640, 0, 128, 96),
  leaflets: lowerFace(768, 0, 64, 64),
  jar: lowerFace(832, 0, 96, 128),
  cabinetFront: lowerFace(928, 0, 96, 128),
  counterFront: lowerFace(0, 128, 256, 128),
  counterSide: lowerFace(256, 128, 128, 128),
  counterTop: lowerFace(384, 64, 256, 64),
  chairBack: lowerFace(384, 128, 96, 96),
  chairSeat: lowerFace(480, 128, 96, 96),
  boxDark: lowerFace(640, 96, 96, 96),
  boxPale: lowerFace(736, 96, 96, 96),
  cabinetSide: lowerFace(832, 128, 96, 96),
  cabinetTop: lowerFace(928, 128, 96, 96),
} as const;
export type SkinFace = keyof typeof SKIN;

/** The first day, with her hair down, and the lobby's furniture. */
export const EXTRA_PART = {
  lyingLooseWindow: { x: 0, y: 0, w: 512, h: 512 },
  lyingLooseTurned: { x: 512, y: 0, w: 512, h: 512 },
  signGuide: { x: 0, y: 768, w: 512, h: 128 },
  signShop: { x: 512, y: 768, w: 512, h: 128 },
  riverTent: { x: 0, y: 512, w: 512, h: 256 },
  riverReeds: { x: 512, y: 512, w: 256, h: 256 },
} as const;
export type ExtraPart = keyof typeof EXTRA_PART;

function toChannel(paint: (c: CanvasRenderingContext2D) => void): Uint8Array {
  const canvas = document.createElement('canvas');
  canvas.width = SHEET;
  canvas.height = SHEET;
  const c = canvas.getContext('2d', { willReadFrequently: true })!;
  paint(c);
  const rgba = c.getImageData(0, 0, SHEET, SHEET).data;
  const out = new Uint8Array(SHEET * SHEET);
  for (let i = 0; i < out.length; i++) out[i] = rgba[i * 4];
  return out;
}

const SHEET_FILES = { structure: '/hospital/sheet-structure.png', people2: '/hospital/sheet-people2.png', people: '/hospital/sheet-people.png', props: '/hospital/sheet-props.png', girl: '/hospital/sheet-girl.png', lying: '/hospital/sheet-lying.png', extra: '/hospital/sheet-extra.png', furniture: '/hospital/sheet-furniture.png' };

/** Fetched only on reaching the hospital. If one can't be, the caller falls back to the floor plan. */
function loadChannel(url: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(toChannel((c) => c.drawImage(img, 0, 0)));
    img.onerror = () => reject(new Error(`no ${url}`));
    img.src = url;
  });
}

export const loadSheets = async () => {
  // Without the drawn walls the painted ones still do.
  const [drawnWalls, people, people2, props, girl, lying, extra, furniture] = await Promise.all([loadChannel(SHEET_FILES.structure).catch(() => null), loadChannel(SHEET_FILES.people), loadChannel(SHEET_FILES.people2), loadChannel(SHEET_FILES.props), loadChannel(SHEET_FILES.girl), loadChannel(SHEET_FILES.lying), loadChannel(SHEET_FILES.extra), loadChannel(SHEET_FILES.furniture)]);
  return { structure: toChannel((c) => paintStructure(c, drawnWalls)), people, people2, props, girl, lying, extra, furniture };
};

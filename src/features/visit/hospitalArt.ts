// Stand-in ink drawings, painted once on a canvas and kept as one channel each: four 1024 sheets, about
// 5MB of GPU memory in all (docs/병원_지도.md). Colour comes later, in the shader. Real drawings can replace
// these sheets cell for cell. On the people, props and girl sheets, exactly black means nothing is there. Everything on them is
// cut out of paper: cutEdge leaves a white margin round each one, the way scissors would.

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
} as const;

/** Top-left corner of a tile, in pixels. */
export const tileAt = (t: number) => ({ x: (t % 5) * TILE, y: Math.floor(t / 5) * TILE });

export type PersonLook = 'nurse' | 'worker' | 'elder' | 'child' | 'visitor' | 'patient' | 'shopkeeper';
export const PERSON_SLOT: Record<PersonLook, number> = { nurse: 0, worker: 1, elder: 2, child: 3, visitor: 4, patient: 5, shopkeeper: 6 };
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

function wallBase(p: Pen, x: number, y: number) {
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

function paintStructure(c: CanvasRenderingContext2D) {
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
}

function slot(i: number) {
  return { x: (i % 4) * SLOT_W, y: Math.floor(i / 4) * SLOT_H };
}

function figure(p: Pen, i: number, o: { coat: number; hair: number; height: number; width?: number; cap?: boolean; apron?: boolean }) {
  const { c } = p;
  const { x, y } = slot(i);
  const cx = x + 128;
  const foot = y + 500;
  const top = foot - o.height;
  const head = o.height * 0.13;
  const halfW = (o.width ?? 74) * (o.height / 470);
  const shoulder = top + head * 2.1;

  c.fillStyle = grey(o.coat);
  c.beginPath();
  c.moveTo(cx - halfW * 0.7, shoulder);
  c.lineTo(cx + halfW * 0.7, shoulder);
  c.lineTo(cx + halfW, foot - o.height * 0.2);
  c.lineTo(cx - halfW, foot - o.height * 0.2);
  c.closePath();
  c.fill();
  c.fillStyle = grey(0.25);
  c.fillRect(cx - halfW * 0.6, foot - o.height * 0.2, halfW * 0.5, o.height * 0.2);
  c.fillRect(cx + halfW * 0.1, foot - o.height * 0.2, halfW * 0.5, o.height * 0.2);

  c.fillStyle = grey(0.88);
  c.beginPath();
  c.arc(cx, top + head, head, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = grey(o.hair);
  c.beginPath();
  c.arc(cx, top + head * 0.8, head, Math.PI, 0);
  c.fill();
  if (o.cap) {
    c.fillStyle = grey(0.96);
    c.fillRect(cx - head * 0.7, top - head * 0.2, head * 1.4, head * 0.6);
    line(p, cx - head * 0.7, top + head * 0.4, cx + head * 0.7, top + head * 0.4, 2);
  }
  if (o.apron) {
    c.fillStyle = grey(0.94);
    c.fillRect(cx - halfW * 0.5, shoulder + head, halfW, o.height * 0.42);
  }
  line(p, cx - halfW * 0.7, shoulder, cx - halfW, foot - o.height * 0.2, 3);
  line(p, cx + halfW * 0.7, shoulder, cx + halfW, foot - o.height * 0.2, 3);
  line(p, cx - halfW, foot - o.height * 0.2, cx + halfW, foot - o.height * 0.2, 3);
  c.strokeStyle = grey(0.1);
  c.lineWidth = 3;
  c.beginPath();
  c.arc(cx, top + head, head, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = grey(0.1);
  c.beginPath();
  c.arc(cx - head * 0.35, top + head * 1.05, 3, 0, Math.PI * 2);
  c.arc(cx + head * 0.35, top + head * 1.05, 3, 0, Math.PI * 2);
  c.fill();
}

function paintPeople(c: CanvasRenderingContext2D) {
  const p: Pen = { c, r: seeded(23) };
  c.fillStyle = '#000';
  c.fillRect(0, 0, SHEET, SHEET);
  figure(p, PERSON_SLOT.nurse, { coat: 0.95, hair: 0.2, height: 460, cap: true });
  figure(p, PERSON_SLOT.worker, { coat: 0.45, hair: 0.3, height: 470 });
  figure(p, PERSON_SLOT.elder, { coat: 0.6, hair: 0.8, height: 420, width: 84 });
  figure(p, PERSON_SLOT.child, { coat: 0.82, hair: 0.15, height: 290, width: 92 });
  figure(p, PERSON_SLOT.visitor, { coat: 0.34, hair: 0.2, height: 460 });
  figure(p, PERSON_SLOT.patient, { coat: 0.78, hair: 0.25, height: 450 });
  figure(p, PERSON_SLOT.shopkeeper, { coat: 0.5, hair: 0.3, height: 450, apron: true });
}

/** Cells on the props sheet. Each clue has its own, so it can be lifted up and looked at. */
export const PROP = {
  tree: { x: 0, y: 0, w: 512, h: 512 },
  bed: { x: 512, y: 0, w: 512, h: 256 },
  bedFront: { x: 512, y: 256, w: 512, h: 256 },
  gurney: { x: 0, y: 512, w: 256, h: 512 },
  cart: { x: 256, y: 512, w: 256, h: 512 },
  vending: { x: 512, y: 512, w: 256, h: 512 },
  collar: { x: 768, y: 512, w: 128, h: 128 },
  snack: { x: 896, y: 512, w: 128, h: 128 },
  laces: { x: 768, y: 640, w: 128, h: 128 },
  coupon: { x: 896, y: 640, w: 128, h: 128 },
  pin: { x: 768, y: 768, w: 64, h: 64 },
} as const;

function paintProps(c: CanvasRenderingContext2D) {
  const p: Pen = { c, r: seeded(37) };
  c.fillStyle = '#000';
  c.fillRect(0, 0, SHEET, SHEET);

  // ginkgo: the crown goes bright, so it takes the same light as the window
  c.fillStyle = grey(0.28);
  c.fillRect(234, 300, 44, 212);
  for (let i = 0; i < 70; i++) {
    const a = p.r() * Math.PI * 2;
    const d = p.r();
    c.fillStyle = grey(0.82 + p.r() * 0.18);
    c.beginPath();
    c.arc(256 + Math.cos(a) * d * 190, 170 + Math.sin(a) * d * 130, 22 + p.r() * 20, 0, Math.PI * 2);
    c.fill();
  }

  // her bed, seen from the foot: the head and pillow behind her, the blanket and rail in front
  c.fillStyle = grey(0.5);
  c.fillRect(530, 40, 476, 204);
  box(p, 530, 40, 476, 204, 4);
  c.fillStyle = grey(0.95);
  c.beginPath();
  c.ellipse(768, 150, 150, 58, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = grey(0.1);
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = grey(0.86);
  c.beginPath();
  c.moveTo(520, 500);
  c.lineTo(520, 370);
  c.quadraticCurveTo(768, 270, 1016, 370);
  c.lineTo(1016, 500);
  c.closePath();
  c.fill();
  line(p, 524, 370, 650, 322, 3);
  line(p, 886, 322, 1012, 370, 3);
  for (const fold of [620, 760, 900]) line(p, fold, 340, fold + 20, 430, 1.6, 0.35);
  c.fillStyle = grey(0.3);
  c.fillRect(516, 450, 504, 58);
  box(p, 516, 450, 504, 58, 4);

  // gurney
  let { x, y }: { x: number; y: number } = PROP.gurney;
  c.fillStyle = grey(0.92);
  c.fillRect(x + 20, y + 330, 216, 44);
  box(p, x + 20, y + 330, 216, 44, 3);
  line(p, x + 50, y + 374, x + 50, y + 490, 5, 0.12);
  line(p, x + 206, y + 374, x + 206, y + 490, 5, 0.12);
  line(p, x + 30, y + 490, x + 226, y + 490, 4, 0.12);

  // laundry cart
  ({ x, y } = PROP.cart);
  c.fillStyle = grey(0.5);
  c.fillRect(x + 34, y + 240, 188, 240);
  box(p, x + 34, y + 240, 188, 240, 3);
  hatch(p, x + 34, y + 240, 188, 240, 18, 0.2);
  c.fillStyle = grey(0.94);
  c.beginPath();
  c.ellipse(x + 128, y + 240, 92, 46, 0, 0, Math.PI * 2);
  c.fill();

  // vending machine
  ({ x, y } = PROP.vending);
  c.fillStyle = grey(0.42);
  c.fillRect(x + 28, y + 40, 200, 460);
  box(p, x + 28, y + 40, 200, 460, 4);
  c.fillStyle = grey(0.96);
  c.fillRect(x + 48, y + 66, 120, 250);
  for (let i = 1; i < 4; i++) line(p, x + 48, y + 66 + i * 62, x + 168, y + 66 + i * 62, 2);

  // the four clues: someone else's things, dropped
  ({ x, y } = PROP.collar);
  c.strokeStyle = grey(0.75);
  c.lineWidth = 16;
  c.beginPath();
  c.arc(x + 64, y + 60, 40, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = grey(0.95);
  c.beginPath();
  c.arc(x + 64, y + 108, 14, 0, Math.PI * 2);
  c.fill();
  ({ x, y } = PROP.snack);
  c.fillStyle = grey(0.85);
  c.fillRect(x + 28, y + 18, 72, 94);
  box(p, x + 28, y + 18, 72, 94, 3);
  for (let i = 0; i < 3; i++) line(p, x + 40, y + 44 + i * 20, x + 88, y + 40 + i * 20, 2, 0.3);
  ({ x, y } = PROP.laces);
  c.strokeStyle = grey(0.92);
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(x + 16, y + 30);
  c.bezierCurveTo(x + 120, y + 10, x + 10, y + 70, x + 100, y + 76);
  c.bezierCurveTo(x + 130, y + 90, x + 40, y + 110, x + 20, y + 106);
  c.stroke();
  ({ x, y } = PROP.coupon);
  c.fillStyle = grey(0.95);
  c.fillRect(x + 12, y + 38, 104, 54);
  box(p, x + 12, y + 38, 104, 54, 3);
  line(p, x + 88, y + 40, x + 88, y + 90, 2, 0.4);
  for (let i = 0; i < 2; i++) line(p, x + 24, y + 54 + i * 16, x + 76, y + 54 + i * 16, 2, 0.3);

  // her hairpin, the one thing on her with a colour of its own (the shader's)
  ({ x, y } = PROP.pin);
  c.fillStyle = grey(0.95);
  c.save();
  c.translate(x + 32, y + 32);
  c.rotate(-0.4);
  c.fillRect(-28, -9, 56, 18);
  c.restore();
}

/** Parts of her, a cell each on their own sheet (girlDays.ts says which go together on which day). */
export const GIRL_CELL = 256;
const girlPart = (col: number, row: number, h = 1) => ({ x: col * GIRL_CELL, y: row * GIRL_CELL, w: GIRL_CELL, h: h * GIRL_CELL });
export const GIRL_PART = {
  headBack: girlPart(0, 0),
  headSide: girlPart(1, 0),
  headThree: girlPart(2, 0),
  headSideTied: girlPart(3, 0),
  headThreeTied: girlPart(0, 1),
  headFront: girlPart(1, 1),
  headTired: girlPart(2, 1),
  hand: girlPart(3, 1),
  torso: girlPart(0, 2),
  torsoBack: girlPart(1, 2),
  notebook: girlPart(2, 2),
  leaves: girlPart(3, 2),
  // the stand and the bag, two cells tall; the second bag is the same stand with one more on it
  drip: girlPart(0, 3),
  blanket: { x: 2 * GIRL_CELL, y: 3 * GIRL_CELL, w: 2 * GIRL_CELL, h: GIRL_CELL },
} as const;
export type GirlPart = keyof typeof GIRL_PART;

const SKIN = 0.9;
const GIRL_HAIR = 0.14;

/** A head in its cell. `turn`: 0 faces you, 1 is full profile looking left, 2 is the back of her head. */
function head(p: Pen, part: GirlPart, turn: number, tied: boolean, eyes: 'open' | 'tired' | 'none') {
  const { c } = p;
  const { x, y } = GIRL_PART[part];
  const cx = x + 128;
  const cy = y + 130;
  const r = 66;
  const hairBack = () => {
    c.fillStyle = grey(GIRL_HAIR);
    c.beginPath();
    if (tied) {
      // gathered behind: a neat cap and a short tail to one side
      c.ellipse(cx, cy - 6, r * 1.08, r * 1.08, 0, 0, Math.PI * 2);
      c.moveTo(cx + r * 0.7, cy + 8);
      c.quadraticCurveTo(cx + r * 1.5, cy + 20, cx + r * 1.12, cy + r * 1.16);
      c.quadraticCurveTo(cx + r * 0.84, cy + r * 0.74, cx + r * 0.7, cy + 8);
    } else {
      c.ellipse(cx, cy - 2, r * 1.22, r * 1.2, 0, Math.PI, 0);
      c.lineTo(cx + r * 1.22, cy + r * 1.08);
      c.lineTo(cx - r * 1.22, cy + r * 1.08);
      c.closePath();
    }
    c.fill();
  };
  hairBack();
  if (turn >= 2) {
    // the back of her head is hair and nothing else, with one strand to show which way it falls
    line(p, cx - 10, cy - r * 0.8, cx - 18, cy + r * 0.9, 1.8, 0.34);
    line(p, cx + 16, cy - r * 0.7, cx + 22, cy + r * 0.9, 1.8, 0.34);
    return;
  }
  // the face moves off centre as she turns away
  const fx = cx - turn * r * 0.34;
  const fw = r * (1 - turn * 0.2);
  c.fillStyle = grey(SKIN);
  c.beginPath();
  c.ellipse(fx, cy + 4, fw, r * 0.98, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = grey(0.1);
  c.lineWidth = 3;
  c.stroke();
  // the fringe across the top of the face
  c.fillStyle = grey(GIRL_HAIR);
  c.beginPath();
  c.ellipse(fx + turn * 8, cy - r * 0.42, fw * 1.04, r * 0.56, 0, Math.PI, 0);
  c.quadraticCurveTo(fx + fw * 0.3, cy - r * 0.2, fx - fw * 1.04, cy - r * 0.42);
  c.fill();
  // eyes and mouth: far eye gone by full profile
  const eyeY = cy + 6;
  const near = fx - fw * 0.42;
  const far = fx + fw * 0.42;
  const eye = (ex: number) => {
    if (eyes === 'open') {
      c.fillStyle = grey(0.08);
      c.beginPath();
      c.ellipse(ex, eyeY, 5.5, 8, 0, 0, Math.PI * 2);
      c.fill();
      line(p, ex - 9, eyeY - 12, ex + 9, eyeY - 12, 1.6, 0.25);
    } else {
      // tired: a heavy lid, and the shadow under it
      line(p, ex - 10, eyeY - 1, ex + 10, eyeY - 1, 3, 0.1);
      c.fillStyle = grey(0.08);
      c.beginPath();
      c.ellipse(ex, eyeY + 2, 4.5, 3.5, 0, 0, Math.PI * 2);
      c.fill();
      line(p, ex - 9, eyeY + 12, ex + 8, eyeY + 13, 2, 0.5);
    }
  };
  if (eyes !== 'none') {
    eye(near);
    if (turn < 0.9) eye(far);
    line(p, fx - turn * 18 - 8, cy + r * 0.56, fx - turn * 18 + 8, cy + r * 0.56, 1.8, 0.2);
  }
}

function paintGirl(c: CanvasRenderingContext2D) {
  const p: Pen = { c, r: seeded(53) };
  c.fillStyle = '#000';
  c.fillRect(0, 0, SHEET, SHEET);

  head(p, 'headBack', 2, false, 'none');
  head(p, 'headSide', 0.9, false, 'open');
  head(p, 'headThree', 0.45, false, 'open');
  head(p, 'headSideTied', 0.9, true, 'open');
  head(p, 'headThreeTied', 0.45, true, 'open');
  head(p, 'headFront', 0, true, 'open');
  head(p, 'headTired', 0, true, 'tired');

  // a loose hospital gown, buttoned to the neck
  const gown = (part: GirlPart, back: boolean) => {
    const { x, y } = GIRL_PART[part];
    const cx = x + 128;
    c.fillStyle = grey(0.8);
    c.beginPath();
    c.moveTo(cx - 44, y + 18);
    c.lineTo(cx + 44, y + 18);
    c.quadraticCurveTo(cx + 92, y + 32, cx + 100, y + 96);
    c.lineTo(cx + 104, y + 246);
    c.lineTo(cx - 104, y + 246);
    c.lineTo(cx - 100, y + 96);
    c.quadraticCurveTo(cx - 92, y + 32, cx - 44, y + 18);
    c.closePath();
    c.fill();
    c.strokeStyle = grey(0.1);
    c.lineWidth = 3;
    c.stroke();
    line(p, cx - 66, y + 90, cx - 72, y + 240, 1.6, 0.4);
    line(p, cx + 66, y + 90, cx + 72, y + 240, 1.6, 0.4);
    if (back) line(p, cx, y + 26, cx, y + 240, 1.8, 0.35);
    else {
      line(p, cx - 22, y + 22, cx, y + 46, 2.2, 0.15);
      line(p, cx + 22, y + 22, cx, y + 46, 2.2, 0.15);
      for (const b of [70, 110, 150]) {
        c.fillStyle = grey(0.3);
        c.beginPath();
        c.arc(cx, y + b, 3.5, 0, Math.PI * 2);
        c.fill();
      }
    }
  };
  gown('torso', false);
  gown('torsoBack', true);

  // her hand, out from under the blanket
  let { x, y }: { x: number; y: number } = GIRL_PART.hand;
  c.fillStyle = grey(0.8);
  c.fillRect(x + 92, y + 150, 72, 96);
  box(p, x + 92, y + 150, 72, 96, 2.6);
  c.fillStyle = grey(SKIN);
  c.beginPath();
  c.ellipse(x + 128, y + 122, 38, 44, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = grey(0.1);
  c.lineWidth = 3;
  c.stroke();
  for (const f of [-18, -6, 6, 18]) line(p, x + 128 + f, y + 82, x + 128 + f, y + 112, 1.5, 0.3);

  // the notebook she shuts when you come in
  ({ x, y } = GIRL_PART.notebook);
  c.fillStyle = grey(0.55);
  c.fillRect(x + 54, y + 60, 148, 186);
  box(p, x + 54, y + 60, 148, 186, 3);
  line(p, x + 72, y + 62, x + 72, y + 244, 3, 0.2);
  c.fillStyle = grey(0.92);
  c.fillRect(x + 98, y + 92, 78, 34);

  // ginkgo leaves she's kept, on the table by the bed
  ({ x, y } = GIRL_PART.leaves);
  for (const [lx, ly, a] of [[70, 196, -0.5], [120, 176, 0.3], [176, 200, 0.9], [130, 222, -1.1]]) {
    c.save();
    c.translate(x + lx, y + ly);
    c.rotate(a);
    c.fillStyle = grey(0.86);
    c.beginPath();
    c.moveTo(0, 18);
    c.quadraticCurveTo(-40, -6, -30, -24);
    c.quadraticCurveTo(0, -14, 30, -24);
    c.quadraticCurveTo(40, -6, 0, 18);
    c.fill();
    c.strokeStyle = grey(0.2);
    c.lineWidth = 2.2;
    c.stroke();
    c.restore();
  }

  // the blanket, once it's pulled up over her
  ({ x, y } = GIRL_PART.blanket);
  c.fillStyle = grey(0.86);
  c.beginPath();
  c.moveTo(x + 10, y + 250);
  c.lineTo(x + 10, y + 96);
  c.quadraticCurveTo(x + 256, y + 8, x + 502, y + 96);
  c.lineTo(x + 502, y + 250);
  c.closePath();
  c.fill();
  c.strokeStyle = grey(0.1);
  c.lineWidth = 3;
  c.stroke();
  // the fold where it's turned down over her chest
  line(p, x + 40, y + 112, x + 256, y + 66, 1.8, 0.35);
  line(p, x + 256, y + 66, x + 472, y + 112, 1.8, 0.35);
  for (const fold of [130, 270, 390]) line(p, x + fold, y + 110, x + fold + 16, y + 220, 1.6, 0.35);

  // the drip stand
  ({ x, y } = GIRL_PART.drip);
  line(p, x + 128, y + 60, x + 128, y + 240, 6, 0.32);
  line(p, x + 96, y + 60, x + 160, y + 60, 4, 0.32);
  c.fillStyle = grey(0.93);
  c.fillRect(x + 72, y + 62, 48, 74);
  box(p, x + 72, y + 62, 48, 74, 2.4);
  line(p, x + 96, y + 136, x + 112, y + 250, 1.6, 0.4);
  line(p, x + 96, y + 246, x + 160, y + 246, 5, 0.32);
}

/** A white paper margin round everything in one cell, with the cell's own edge as the limit. */
function cutEdge(data: Uint8Array, cell: { x: number; y: number; w: number; h: number }, radius: number) {
  const { x, y, w, h } = cell;
  const far = 255;
  const dist = new Uint8Array(w * h);
  // How far each empty pixel is from something drawn: one sweep each way is close enough for scissors.
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (data[(y + j) * SHEET + x + i] > 12) continue;
      const up = j > 0 ? dist[(j - 1) * w + i] : far;
      const left = i > 0 ? dist[j * w + i - 1] : far;
      dist[j * w + i] = Math.min(far, Math.min(up, left) + 1);
    }
  }
  for (let j = h - 1; j >= 0; j--) {
    for (let i = w - 1; i >= 0; i--) {
      const at = j * w + i;
      if (dist[at] === 0) continue;
      const down = j < h - 1 ? dist[at + w] : far;
      const right = i < w - 1 ? dist[at + 1] : far;
      dist[at] = Math.min(dist[at], Math.min(down, right) + 1);
      if (dist[at] <= radius) data[(y + j) * SHEET + x + i] = 244;
    }
  }
}

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

const EDGE = 6;

export const paintSheets = () => {
  const people = toChannel(paintPeople);
  for (let i = 0; i < 7; i++) cutEdge(people, { ...slot(i), w: SLOT_W, h: SLOT_H }, EDGE);
  const props = toChannel(paintProps);
  for (const [name, cell] of Object.entries(PROP)) {
    if (name !== 'pin') cutEdge(props, cell, name === 'tree' ? EDGE * 2 : ['collar', 'snack', 'laces', 'coupon'].includes(name) ? EDGE - 2 : EDGE);
  }
  const girl = toChannel(paintGirl);
  for (const cell of Object.values(GIRL_PART)) cutEdge(girl, cell, EDGE);
  return { structure: toChannel(paintStructure), people, props, girl };
};

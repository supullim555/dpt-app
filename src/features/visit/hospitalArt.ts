// Stand-in ink drawings, painted once on a canvas and kept as one channel each: three 1024 sheets, about
// 4MB of GPU memory in all (docs/병원_지도.md). Colour comes later, in the shader. Real drawings can replace
// these sheets cell for cell. On the people and props sheets, exactly black means nothing is there.

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
  c.fillStyle = grey(0.45);
  c.beginPath();
  c.arc(t.x + 100, t.y + 86, 30, 0, Math.PI * 2);
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

function figure(p: Pen, i: number, o: { coat: number; hair: number; height: number; width?: number; cap?: boolean; apron?: boolean; bald?: boolean }) {
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
  if (!o.bald) {
    c.fillStyle = grey(o.hair);
    c.beginPath();
    c.arc(cx, top + head * 0.8, head, Math.PI, 0);
    c.fill();
  }
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

/** Cells on the props sheet: the tree across the top half, the rest below. */
export const PROP = {
  tree: { x: 0, y: 0, w: 1024, h: 512 },
  gurney: { x: 0, y: 512, w: 256, h: 512 },
  cart: { x: 256, y: 512, w: 256, h: 512 },
  vending: { x: 512, y: 512, w: 256, h: 512 },
  clue: { x: 768, y: 512, w: 256, h: 512 },
} as const;

function paintProps(c: CanvasRenderingContext2D) {
  const p: Pen = { c, r: seeded(37) };
  c.fillStyle = '#000';
  c.fillRect(0, 0, SHEET, SHEET);

  // ginkgo: the crown goes bright, so it takes the same light as the window
  c.fillStyle = grey(0.28);
  c.fillRect(490, 300, 44, 212);
  for (let i = 0; i < 90; i++) {
    const a = p.r() * Math.PI * 2;
    const d = p.r() * 1;
    c.fillStyle = grey(0.82 + p.r() * 0.18);
    c.beginPath();
    c.arc(512 + Math.cos(a) * d * 300, 170 + Math.sin(a) * d * 140, 26 + p.r() * 22, 0, Math.PI * 2);
    c.fill();
  }

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

  // something dropped
  ({ x, y } = PROP.clue);
  c.fillStyle = grey(0.96);
  c.beginPath();
  c.ellipse(x + 128, y + 466, 64, 28, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = grey(0.1);
  c.lineWidth = 4;
  c.stroke();
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

export const paintSheets = () => ({ structure: toChannel(paintStructure), people: toChannel(paintPeople), props: toChannel(paintProps) });

// The first-person view: one floor at a time, built from hospitalMap.ts. Only draws while something moves.
// three.js loads here and nowhere else, so it costs nothing until you reach the hospital.
import { charAt, DX, DY, GIRL_FRONT, ROOM_ENTRY, turn, walkable, type Cell, type Dir, type FloorNo, type Pose } from './hospitalMap';
import { EXTRA_PART, FURNITURE_PART, GIRL_PART, loadSheets, LYING_PART, PERSON_SLOT, PROP, SHEET, SKIN, SLOT_H, SLOT_W, tileAt, TILE, TILES, type ExtraPart, type FurniturePart, type GirlPart, type LyingPart, type PersonLook, type SkinFace } from './hospitalArt';

const STEP_MS = 280;
const FOCUS_MS = 420;
// With people 1.7m tall, a cell is about 2.1m across, the ceiling about 2.7m and your eyes about 1.35m (docs/병원_지도.md).
const EYE = 0.64;
const WALL_H = 1.25;
const YARD_WALL_H = 3;
// A little behind the middle of the cell, or a wall ahead would fill the screen.
const STAND_BACK = 0.36;
// How dark everything but the person or thing you're looking at gets.
const FOCUS_DIM = 0.42;
const HOLD_AWAY = 0.5;
const HOLD_SIZE = 1.5;
// Paper: everyone is a cutout. They fold up off the floor when you arrive, lag behind as you turn, and
// flip edge-on to change which way they face.
const POP_MS = 460;
const POP_STAGGER_MS = 34;
const POP_DELAY_LIMIT_MS = 260;
const FLIP_MS = 340;
const SWING = 0.34;
const WOBBLE = 0.012;
const SHADOW_OPACITY = 0.34;
const UV_INSET = 3;
// Her window: to one side of the head of the bed, where lying there she can look out of it.
const WINDOW_X = GIRL_FRONT.x + 1;
const INK = [0.09, 0.08, 0.06];
const PAPER = [0.93, 0.9, 0.84];
const FLOOR_LIGHT: Record<FloorNo, number> = { 1: 1, 2: 0.94, 3: 0.8, 4: 0.68 };
const FOG_COLOR: Record<FloorNo, number[]> = { 1: [0.2, 0.19, 0.17], 2: [0.15, 0.14, 0.13], 3: [0.09, 0.09, 0.08], 4: [0.04, 0.04, 0.04] };

const VERTEX = /* glsl */ `
attribute float aShade;
attribute float aLit;
varying vec2 vUv;
varying float vShade;
varying float vLit;
varying float vDist;
void main() {
  vUv = uv;
  vShade = aShade;
  vLit = aLit;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vDist = length(view.xyz);
  gl_Position = projectionMatrix * view;
}`;

// The sheets hold one channel of ink. Everything else about the colour is decided here, so the day's
// light and the floor's mood cost no extra drawings. aLit: 1 takes the day's light, 2 is the hairpin.
const FRAGMENT = /* glsl */ `
precision mediump float;
uniform sampler2D uMap;
uniform float uCutout;
uniform float uFloorLight;
uniform float uDim;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform vec3 uFog;
uniform vec3 uDayLight;
varying vec2 vUv;
varying float vShade;
varying float vLit;
varying float vDist;
void main() {
  float v = texture2D(uMap, vUv).r;
  if (uCutout > 0.5 && v < 0.05) discard;
  vec3 c = mix(uInk, uPaper, v) * vShade * uFloorLight;
  if (vLit > 1.5) c = vec3(0.64, 0.15, 0.25) * v;
  else if (vLit > 0.5 && v > 0.75) c = uDayLight * v;
  float fog = smoothstep(1.2, 6.5, vDist);
  // the window's light stays when the room dims around whoever you're looking at
  if (vLit > 0.5 && vLit < 1.5 && v > 0.75) gl_FragColor = vec4(c, 1.0);
  else gl_FragColor = vec4(mix(c, uFog, fog) * uDim, 1.0);
}`;

export type SpriteLook = PersonLook | keyof typeof PROP | GirlPart | LyingPart | ExtraPart | FurniturePart | SolidLook;
export type HospitalSprite = {
  cell: Cell;
  look: SpriteLook;
  /** Nudged from the middle of the cell: across, along and up. */
  shift?: [number, number, number];
  /** Tipped back from upright. */
  lean?: number;
  /** Named so it can be flipped later. */
  id?: string;
  /** Part of the furniture of her room: no folding up, no shadow. */
  fixed?: boolean;
  /** A solid: the way its front faces. It stays put as you walk round it, where a cutout turns to you. */
  face?: Dir;
};
/** What to look at: a point above a cell, from how far away. */
export type FocusTarget = { cell: Cell; height: number; away: number; eye?: number };

export type HospitalScene = {
  showFloor: (floor: FloorNo, sprites: HospitalSprite[], pose: Pose, roomShut: boolean) => void;
  setSprites: (sprites: HospitalSprite[]) => void;
  setLight: (hex: string) => void;
  jump: (pose: Pose) => void;
  /** Move or turn smoothly; `done` runs when it's finished. */
  moveTo: (pose: Pose, done: () => void) => void;
  /** `ms`: 0 for no movement at all; otherwise how long the camera takes. */
  focus: (target: FocusTarget, ms?: number) => void;
  /** Turn a named cutout over, edge-on, to show a different drawing. */
  flip: (id: string, look: SpriteLook) => void;
  /** Back to where you were standing. */
  unfocus: (pose: Pose, done: () => void) => void;
  /** Lift a thing up from where it lay to just in front of your eyes. */
  hold: (look: SpriteLook, from: Cell) => void;
  dispose: () => void;
};

// Each the shape of its cell on the sheet, or the drawing comes out stretched.
const BUST = { w: 0.42, h: 0.558 };
const LYING = { w: 0.8, h: 0.8 };
const SPRITE_SIZE: Partial<Record<SpriteLook, { w: number; h: number }>> = {
  tree: { w: 3, h: 3 },
  gurney: { w: 0.9, h: 0.9 },
  cart: { w: 0.85, h: 0.85 },
  vending: { w: 0.6, h: 0.966 },
  collar: { w: 0.24, h: 0.24 },
  snack: { w: 0.24, h: 0.24 },
  laces: { w: 0.24, h: 0.24 },
  coupon: { w: 0.24, h: 0.24 },
  bed: { w: 0.9, h: 0.45 },
  bedFront: { w: 0.9, h: 0.45 },
  mattress: { w: 0.78, h: 0.66 },
  blanket: { w: 0.86, h: 0.275 },
  pin: { w: 0.05, h: 0.05 },
  pinSmall: { w: 0.03, h: 0.03 },
  headBack: BUST,
  headSide: BUST,
  headThree: BUST,
  headSideTied: BUST,
  headFront: BUST,
  headTired: BUST,
  torso: { w: 0.42, h: 0.295 },
  torsoBack: { w: 0.42, h: 0.295 },
  notebook: { w: 0.2, h: 0.134 },
  leaves: { w: 0.2, h: 0.134 },
  drip: { w: 0.337, h: 0.9 },
  lyingWindow: LYING,
  lyingTurned: LYING,
  lyingHand: LYING,
  lyingLooseWindow: LYING,
  lyingLooseTurned: LYING,
  wheelchair: { w: 0.4, h: 0.4 },
  plant: { w: 0.32, h: 0.64 },
  signGuide: { w: 0.6, h: 0.15 },
  signShop: { w: 0.6, h: 0.15 },
};
const PERSON_SIZE = { w: 0.4, h: 0.8 };

// Furniture as boxes with a skin on them: across, up and front to back, then which drawing goes on which side. Nobody
// stands on these or sits in them, so a flat person is never seen against one from the wrong side (docs/병원_지도.md).
type Box = { x: [number, number]; y: [number, number]; z: [number, number]; front: SkinFace; rear: SkinFace; side: SkinFace; top: SkinFace };
const allOver = (x: [number, number], y: [number, number], z: [number, number], skin: SkinFace): Box => ({ x, y, z, front: skin, rear: skin, side: skin, top: skin });
const leg = (x: number, z: number, h: number): Box => allOver([x - 0.02, x + 0.02], [0, h], [z - 0.02, z + 0.02], 'leg');
const sofaArm = (x0: number, x1: number): Box => ({ x: [x0, x1], y: [0.1, 0.3], z: [-0.2, 0.2], front: 'armFront', rear: 'armFront', side: 'armSide', top: 'armTop' });
const SOLIDS = {
  sofaBox: {
    shadow: [1.1, 0.7],
    boxes: [
      { x: [-0.36, 0.36], y: [0.1, 0.22], z: [-0.12, 0.2], front: 'seatFront', rear: 'seatFront', side: 'armFront', top: 'seatTop' },
      { x: [-0.36, 0.36], y: [0.1, 0.46], z: [-0.2, -0.1], front: 'backFront', rear: 'backRear', side: 'armSide', top: 'backTop' },
      sofaArm(-0.45, -0.36),
      sofaArm(0.36, 0.45),
      leg(-0.4, -0.16, 0.1),
      leg(0.4, -0.16, 0.1),
      leg(-0.4, 0.16, 0.1),
      leg(0.4, 0.16, 0.1),
    ],
  },
  chairBox: {
    shadow: [0.36, 0.36],
    boxes: [
      allOver([-0.11, 0.11], [0.16, 0.2], [-0.11, 0.11], 'chairSeat'),
      allOver([-0.11, 0.11], [0.2, 0.38], [-0.11, -0.08], 'chairBack'),
      leg(-0.09, -0.09, 0.16),
      leg(0.09, -0.09, 0.16),
      leg(-0.09, 0.09, 0.16),
      leg(0.09, 0.09, 0.16),
    ],
  },
  cabinetBox: {
    shadow: [0.42, 0.42],
    boxes: [
      { x: [-0.15, 0.15], y: [0, 0.3], z: [-0.14, 0.14], front: 'cabinetFront', rear: 'cabinetSide', side: 'cabinetSide', top: 'cabinetTop' },
      allOver([-0.17, 0.17], [0.3, 0.33], [-0.16, 0.16], 'cabinetTop'),
    ],
  },
  deskBox: {
    shadow: [1, 0.5],
    boxes: [
      { x: [-0.38, 0.38], y: [0, 0.34], z: [-0.13, 0.13], front: 'deskFront', rear: 'deskSide', side: 'deskSide', top: 'deskTop' },
      allOver([-0.41, 0.41], [0.34, 0.38], [-0.16, 0.16], 'deskTop'),
      allOver([-0.3, -0.08], [0.38, 0.56], [-0.02, 0.02], 'screen'),
      allOver([0.04, 0.2], [0.38, 0.41], [-0.06, 0.08], 'leaflets'),
      allOver([0.27, 0.33], [0.38, 0.43], [-0.02, 0.04], 'boxDark'),
    ],
  },
  counterBox: {
    shadow: [1, 0.5],
    boxes: [
      { x: [-0.38, 0.38], y: [0, 0.32], z: [-0.13, 0.13], front: 'counterFront', rear: 'counterSide', side: 'counterSide', top: 'counterTop' },
      allOver([-0.41, 0.41], [0.32, 0.36], [-0.16, 0.16], 'counterTop'),
      allOver([-0.35, -0.2], [0.36, 0.5], [-0.07, 0.08], 'boxDark'),
      allOver([-0.13, -0.05], [0.36, 0.54], [-0.04, 0.04], 'jar'),
      allOver([0.02, 0.2], [0.36, 0.46], [-0.08, 0.08], 'boxPale'),
      allOver([0.25, 0.35], [0.36, 0.44], [-0.05, 0.05], 'boxDark'),
    ],
  },
} as const satisfies Record<string, { shadow: readonly [number, number]; boxes: readonly Box[] }>;
export type SolidLook = keyof typeof SOLIDS;

// Light from above, so its sides read as sides.
const FACE_SHADE = { front: 0.96, rear: 0.74, left: 0.84, right: 0.84, top: 1 };

const hash = (x: number, y: number, d: number) => {
  const n = Math.sin(x * 12.9898 + y * 78.233 + d * 37.719) * 43758.5453;
  return n - Math.floor(n);
};

/** Null where there's no WebGL 2, so the screen can fall back to the plan. */
export async function createHospitalScene(host: HTMLElement, dayLight: string): Promise<HospitalScene | null> {
  const probe = document.createElement('canvas');
  if (!probe.getContext('webgl2')) return null;
  const [THREE, sheets] = await Promise.all([import('three'), loadSheets()]);

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const canvas = renderer.domElement;
  canvas.style.position = 'absolute';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  host.appendChild(canvas);

  const texture = (data: Uint8Array) => {
    const t = new THREE.DataTexture(data, SHEET, SHEET, THREE.RedFormat, THREE.UnsignedByteType);
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  };
  const textures = { structure: texture(sheets.structure), people: texture(sheets.people), props: texture(sheets.props), girl: texture(sheets.girl), lying: texture(sheets.lying), extra: texture(sheets.extra), furniture: texture(sheets.furniture) };

  const shared = {
    uFloorLight: { value: 1 },
    uInk: { value: new THREE.Vector3(...INK) },
    uPaper: { value: new THREE.Vector3(...PAPER) },
    uFog: { value: new THREE.Vector3() },
    uDayLight: { value: new THREE.Color(dayLight) },
  };
  // Only the building dims when you focus: whoever you're looking at stays in the light.
  const buildingDim = { value: 1 };
  const material = (map: InstanceType<typeof THREE.DataTexture>, cutout: boolean, dim: { value: number }) =>
    new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms: { ...shared, uDim: dim, uMap: { value: map }, uCutout: { value: cutout ? 1 : 0 } } });
  const materials = { structure: material(textures.structure, false, buildingDim), people: material(textures.people, true, { value: 1 }), props: material(textures.props, true, { value: 1 }), girl: material(textures.girl, true, { value: 1 }), lying: material(textures.lying, true, { value: 1 }), extra: material(textures.extra, true, { value: 1 }), furniture: material(textures.furniture, true, { value: 1 }) };
  // A soft dark spot on the floor under each cutout, so they stand on it instead of floating over it.
  const shadowMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uOpacity: { value: SHADOW_OPACITY } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'precision mediump float; uniform float uOpacity; varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.0, 0.0, 0.0, uOpacity * (1.0 - smoothstep(0.35, 1.0, d))); }',
  });
  const shadowGeometry = new THREE.PlaneGeometry(1, 1);
  shadowGeometry.rotateX(-Math.PI / 2);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(78, 1, 0.05, 12);
  camera.rotation.order = 'YXZ';
  let building: InstanceType<typeof THREE.Mesh> | null = null;
  type Cutout = {
    mesh: InstanceType<typeof THREE.Mesh>;
    key: string;
    id?: string;
    lean: number;
    /** While it's folding up off the floor. */
    popAt: number;
    /** While it's turning over: scales to nothing across, then back. */
    flipAt: number;
    flipTo: SpriteLook | null;
  };
  const cutouts: Cutout[] = [];
  const shadows: InstanceType<typeof THREE.Mesh>[] = [];
  const solids: InstanceType<typeof THREE.Mesh>[] = [];
  let held: { mesh: InstanceType<typeof THREE.Mesh>; from: { x: number; y: number; z: number }; t: number } | null = null;

  let cam = { x: 0.5, y: EYE, z: 0.5, yaw: 0, pitch: 0, dim: 1, holdT: 0 };
  let heading: Dir = 0;
  let frame = 0;

  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const yawOf = (dir: Dir) => -dir * (Math.PI / 2);
  const standPoint = (p: Cell, yaw: number) => ({ x: p.x + 0.5 + Math.sin(yaw) * STAND_BACK, z: p.y + 0.5 + Math.cos(yaw) * STAND_BACK });

  // How far the paper is swinging behind the turn, and how much it trembles from a step.
  let swing = 0;
  let wobble = 0;

  const draw = (bob = 0) => {
    camera.position.set(cam.x, cam.y + bob, cam.z);
    camera.rotation.set(cam.pitch, cam.yaw, 0);
    const now = performance.now();
    for (const o of cutouts) {
      const m = o.mesh;
      m.rotation.y = cam.yaw + swing;
      m.rotation.z = wobble;
      let tip = o.lean;
      if (o.popAt > now) tip = -Math.PI / 2;
      else if (o.popAt > 0) {
        const t = Math.min(1, (now - o.popAt) / POP_MS);
        // up, a little past upright, and settled: paper with some spring in it
        const back = 1 - t;
        tip = o.lean - (Math.PI / 2) * back * back * Math.cos(t * Math.PI * 2.4);
        if (t >= 1) o.popAt = 0;
      }
      m.rotation.x = tip;
      if (o.flipAt > 0) {
        const t = Math.min(1, (now - o.flipAt) / FLIP_MS);
        if (t >= 0.5 && o.flipTo) {
          const next = makeSpriteMesh(o.flipTo);
          m.geometry.dispose();
          m.geometry = next.geometry;
          m.material = next.material;
          o.flipTo = null;
        }
        m.scale.x = Math.abs(Math.cos(t * Math.PI));
        if (t >= 1) {
          o.flipAt = 0;
          m.scale.x = 1;
        }
      }
    }
    buildingDim.value = cam.dim;
    if (held) {
      const t = cam.holdT;
      const toX = cam.x - Math.sin(cam.yaw) * HOLD_AWAY;
      const toZ = cam.z - Math.cos(cam.yaw) * HOLD_AWAY;
      // the middle of the quad, which is drawn from its bottom edge
      const toY = cam.y - 0.14;
      held.mesh.position.set(held.from.x + (toX - held.from.x) * t, held.from.y + (toY - held.from.y) * t, held.from.z + (toZ - held.from.z) * t);
      held.mesh.scale.setScalar(1 + (HOLD_SIZE - 1) * t);
      held.mesh.rotation.y = cam.yaw;
    }
    renderer.render(scene, camera);
  };

  const buildFloor = (floor: FloorNo, roomShut: boolean) => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const shades: number[] = [];
    const lits: number[] = [];
    const indices: number[] = [];

    const quad = (corners: number[][], tile: number, o: { flip?: boolean; shade: number; lit?: boolean; flat?: boolean }) => {
      const base = positions.length / 3;
      const { x, y } = tileAt(tile);
      const pad = 2;
      const u0 = (x + pad) / SHEET;
      const u1 = (x + TILE - pad) / SHEET;
      const v0 = (y + pad) / SHEET;
      const v1 = (y + TILE - pad) / SHEET;
      const left = o.flip ? u1 : u0;
      const right = o.flip ? u0 : u1;
      // bottom-left, bottom-right, top-right, top-left: the sheet's first row is its top
      const quadUv = [[left, v1], [right, v1], [right, v0], [left, v0]];
      corners.forEach((p, i) => {
        positions.push(p[0], p[1], p[2]);
        uvs.push(quadUv[i][0], quadUv[i][1]);
        shades.push(i < 2 && !o.flat ? o.shade * 0.82 : o.shade); // walls darken toward the floor
        lits.push(o.lit ? 1 : 0);
      });
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };

    // Everything visible stands on these cells: where you can walk, who or what is in the way, and the
    // part of her room you can see but not walk on.
    const isFurnished = (c: string) => c === '%' || c === 'T' || c === '_' || c === '&' || c === '^' || (c >= 'a' && c <= 'z');
    const open = new Set(walkable(floor));
    const queue = [...open];
    while (queue.length) {
      const [x, y] = queue.pop()!.split(',').map(Number);
      const spreads = open.has(`${x},${y}`) && (walkable(floor).has(`${x},${y}`) || charAt(floor, x, y) === '_');
      if (!spreads) continue;
      for (let d = 0; d < 4; d++) {
        const k = `${x + DX[d]},${y + DY[d]}`;
        if (open.has(k) || !isFurnished(charAt(floor, x + DX[d], y + DY[d]))) continue;
        open.add(k);
        queue.push(k);
      }
    }

    const wallCorners = (x: number, y: number, d: number, h: number) =>
      d === 0 ? [[x, 0, y], [x + 1, 0, y], [x + 1, h, y], [x, h, y]]
      : d === 1 ? [[x + 1, 0, y], [x + 1, 0, y + 1], [x + 1, h, y + 1], [x + 1, h, y]]
      : d === 2 ? [[x + 1, 0, y + 1], [x, 0, y + 1], [x, h, y + 1], [x + 1, h, y + 1]]
      : [[x, 0, y + 1], [x, 0, y], [x, h, y], [x, h, y + 1]];

    const isYard = (c: string) => floor === 1 && 'YTb'.includes(c);
    const SIDE_SHADE = [1, 0.84, 0.94, 0.84];

    for (const k of open) {
      const [x, y] = k.split(',').map(Number);
      const here = charAt(floor, x, y);
      const yard = isYard(here);
      quad([[x, 0, y + 1], [x + 1, 0, y + 1], [x + 1, 0, y], [x, 0, y]], yard ? TILES.yardGround : TILES.floor, { shade: 0.92, flat: true, flip: hash(x, y, 5) < 0.5 });
      if (!yard) quad([[x, WALL_H, y], [x + 1, WALL_H, y], [x + 1, WALL_H, y + 1], [x, WALL_H, y + 1]], TILES.ceiling, { shade: 0.78, flat: true });

      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d];
        const ny = y + DY[d];
        // While she's being treated her door is shut, so the room behind it is out of reach.
        const shutHere = roomShut && floor === 4 && x === ROOM_ENTRY.x && y === ROOM_ENTRY.y && d === 2;
        // The front desk has a wall behind it, seen from either side, though the map leaves that gap open.
        const behindDesk = floor === 1 && x === 5 && ((y === 5 && d === 2) || (y === 6 && d === 0));
        if (open.has(`${nx},${ny}`) && !shutHere && !behindDesk) continue;
        const c = charAt(floor, nx, ny);
        const h = yard ? YARD_WALL_H : WALL_H;
        let tile: number = TILES.wall + Math.floor(hash(x, y, d) * 4);
        let flip = hash(y, x, d) < 0.5;
        let lit = false;
        if (shutHere) tile = TILES.roomDoor;
        else if (c === '=') tile = TILES.shutDoor;
        else if (c === 'E') tile = TILES.lift;
        else if (c === 'S') tile = TILES.stairs;
        else if (c === 'N') tile = TILES.counter;
        else if (here === '+') tile = TILES.jamb;
        else if (floor === 1 && (here === 'M' || here === 'm')) tile = TILES.shelf;
        else if (floor === 1 && here === 'i' && d === 2) tile = TILES.floorGuide;
        else if (yard) tile = TILES.yardWall;
        // windows: the end of her floor's corridor, above her bed, and the sitting room on the second
        else if ((here === 'W' && d === 2) || (floor === 4 && here === '_' && x === WINDOW_X && d === 2) || (floor === 2 && here === 'V' && d === 0)) {
          tile = TILES.window;
          lit = true;
        } else if (((x === 4 || x === 6) && y === 2 && d % 2 === 1) || (x === 4 && y === 4 && d === 2)) {
          tile = TILES.number + floor - 1;
          flip = false;
        }
        if (tile === TILES.shutDoor || tile === TILES.lift || tile === TILES.stairs || tile === TILES.roomDoor || tile === TILES.window || tile === TILES.floorGuide) flip = false;
        quad(wallCorners(x, y, d, h), tile, { shade: SIDE_SHADE[d], flip, lit: lit || tile === TILES.roomDoor });
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('aShade', new THREE.Float32BufferAttribute(shades, 1));
    geometry.setAttribute('aLit', new THREE.Float32BufferAttribute(lits, 1));
    geometry.setIndex(indices);
    if (building) {
      scene.remove(building);
      building.geometry.dispose();
    }
    building = new THREE.Mesh(geometry, materials.structure);
    building.frustumCulled = false;
    scene.add(building);
  };

  const shadowWidth = (look: SpriteLook) => (look === 'tree' ? 0.8 : (SPRITE_SIZE[look] ?? PERSON_SIZE).w);

  const makeSpriteMesh = (look: SpriteLook) => {
    const prop = PROP[look as keyof typeof PROP];
    const size = SPRITE_SIZE[look] ?? PERSON_SIZE;
    const slot = PERSON_SLOT[look as PersonLook];
    const part = GIRL_PART[look as GirlPart];
    const lying = LYING_PART[look as LyingPart];
    const extra = EXTRA_PART[look as ExtraPart];
    const furniture = FURNITURE_PART[look as FurniturePart];
    const px = prop ?? part ?? lying ?? extra ?? furniture ?? { x: (slot % 4) * SLOT_W, y: Math.floor(slot / 4) * SLOT_H, w: SLOT_W, h: SLOT_H };
    // In from the cell's edge, or the next drawing on the sheet shows as a line along this one's.
    const u0 = (px.x + UV_INSET) / SHEET;
    const u1 = (px.x + px.w - UV_INSET) / SHEET;
    const v0 = (px.y + UV_INSET) / SHEET;
    const v1 = (px.y + px.h - UV_INSET) / SHEET;
    const hw = size.w / 2;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-hw, 0, 0, hw, 0, 0, hw, size.h, 0, -hw, size.h, 0], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v1, u1, v1, u1, v0, u0, v0], 2));
    geometry.setAttribute('aShade', new THREE.Float32BufferAttribute([1, 1, 1, 1], 1));
    const lit = look === 'tree' ? 1 : look === 'pin' || look === 'pinSmall' ? 2 : 0;
    geometry.setAttribute('aLit', new THREE.Float32BufferAttribute([lit, lit, lit, lit], 1));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    const mesh = new THREE.Mesh(geometry, prop ? materials.props : part ? materials.girl : lying ? materials.lying : extra ? materials.extra : furniture ? materials.furniture : materials.people);
    mesh.frustumCulled = false;
    mesh.rotation.order = 'YXZ';
    return mesh;
  };

  const makeSolid = (look: SolidLook) => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const shades: number[] = [];
    const indices: number[] = [];
    // from a corner, along two edges whose cross product points outward
    const side = (o: number[], r: number[], u: number[], skin: SkinFace, shade: number) => {
      const base = positions.length / 3;
      const px = SKIN[skin];
      const u0 = (px.x + UV_INSET) / SHEET;
      const u1 = (px.x + px.w - UV_INSET) / SHEET;
      const v0 = (px.y + UV_INSET) / SHEET;
      const v1 = (px.y + px.h - UV_INSET) / SHEET;
      [[0, 0, u0, v1], [1, 0, u1, v1], [1, 1, u1, v0], [0, 1, u0, v0]].forEach(([a, b, tu, tv]) => {
        positions.push(o[0] + r[0] * a + u[0] * b, o[1] + r[1] * a + u[1] * b, o[2] + r[2] * a + u[2] * b);
        uvs.push(tu, tv);
        shades.push(shade);
      });
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    for (const b of SOLIDS[look].boxes) {
      const [x0, x1] = b.x;
      const [y0, y1] = b.y;
      const [z0, z1] = b.z;
      const w = x1 - x0;
      const h = y1 - y0;
      const d = z1 - z0;
      side([x0, y0, z1], [w, 0, 0], [0, h, 0], b.front, FACE_SHADE.front);
      side([x1, y0, z0], [-w, 0, 0], [0, h, 0], b.rear, FACE_SHADE.rear);
      side([x1, y0, z1], [0, 0, -d], [0, h, 0], b.side, FACE_SHADE.right);
      side([x0, y0, z0], [0, 0, d], [0, h, 0], b.side, FACE_SHADE.left);
      side([x0, y1, z1], [w, 0, 0], [0, 0, -d], b.top, FACE_SHADE.top);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('aShade', new THREE.Float32BufferAttribute(shades, 1));
    geometry.setAttribute('aLit', new THREE.Float32BufferAttribute(shades.map(() => 0), 1));
    geometry.setIndex(indices);
    const mesh = new THREE.Mesh(geometry, materials.furniture);
    mesh.frustumCulled = false;
    return mesh;
  };

  // Stops when nothing is folding or flipping any more; a moving camera draws them on its own.
  let paperFrame = 0;
  let cameraMoving = false;
  const paperTick = () => {
    if (!cameraMoving) draw();
    if (cutouts.some((o) => o.popAt > 0 || o.flipAt > 0)) paperFrame = requestAnimationFrame(paperTick);
  };
  const wakePaper = () => {
    cancelAnimationFrame(paperFrame);
    paperFrame = requestAnimationFrame(paperTick);
  };

  /** `popFrom`: where you're standing, if the new ones should fold up nearest first. */
  const buildSprites = (sprites: HospitalSprite[], popFrom?: Cell) => {
    const had = new Set(cutouts.map((o) => o.key));
    for (const o of cutouts) {
      scene.remove(o.mesh);
      o.mesh.geometry.dispose();
    }
    cutouts.length = 0;
    for (const m of shadows) scene.remove(m);
    shadows.length = 0;
    for (const m of solids) {
      scene.remove(m);
      m.geometry.dispose();
    }
    solids.length = 0;
    const started = performance.now();
    for (const s of sprites) {
      const [across, along, up] = s.shift ?? [0, 0, 0];
      const x = s.cell.x + 0.5 + across;
      const z = s.cell.y + 0.5 + along;
      if (s.look in SOLIDS) {
        const look = s.look as SolidLook;
        const solid = makeSolid(look);
        solid.position.set(x, up, z);
        const face = s.face ?? 2;
        solid.rotation.y = Math.atan2(DX[face], DY[face]);
        scene.add(solid);
        solids.push(solid);
        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadow.scale.set(SOLIDS[look].shadow[0], 1, SOLIDS[look].shadow[1]);
        shadow.position.set(x, 0.004, z);
        scene.add(shadow);
        shadows.push(shadow);
        continue;
      }
      const mesh = makeSpriteMesh(s.look);
      mesh.position.set(x, up, z);
      scene.add(mesh);
      const key = `${s.look}@${s.cell.x},${s.cell.y}`;
      let popAt = 0;
      if (!s.fixed && !still && (popFrom || !had.has(key))) {
        const steps = popFrom ? Math.abs(s.cell.x - popFrom.x) + Math.abs(s.cell.y - popFrom.y) : 0;
        popAt = started + Math.min(POP_DELAY_LIMIT_MS, steps * POP_STAGGER_MS);
      }
      cutouts.push({ mesh, key, id: s.id, lean: s.lean ?? 0, popAt, flipAt: 0, flipTo: null });
      if (!s.fixed) {
        const size = shadowWidth(s.look);
        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadow.scale.set(size, 1, size * 0.5);
        shadow.position.set(x, 0.004, z);
        scene.add(shadow);
        shadows.push(shadow);
      }
    }
    if (cutouts.some((o) => o.popAt > 0)) wakePaper();
  };

  const dropHeld = () => {
    if (!held) return;
    scene.remove(held.mesh);
    held.mesh.geometry.dispose();
    held = null;
  };

  const jump = (pose: Pose) => {
    cancelAnimationFrame(frame);
    dropHeld();
    heading = pose.dir;
    const yaw = yawOf(pose.dir);
    cam = { ...standPoint(pose, yaw), y: EYE, yaw, pitch: 0, dim: 1, holdT: 0 };
    draw();
  };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = host;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    draw();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const animate = (ms: number, to: typeof cam, bobs: boolean, done?: () => void) => {
    cancelAnimationFrame(frame);
    const from = cam;
    const started = performance.now();
    cameraMoving = true;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / ms);
      const e = t * t * (3 - 2 * t);
      const mix = (a: number, b: number) => a + (b - a) * e;
      cam = { x: mix(from.x, to.x), y: mix(from.y, to.y), z: mix(from.z, to.z), yaw: mix(from.yaw, to.yaw), pitch: mix(from.pitch, to.pitch), dim: mix(from.dim, to.dim), holdT: mix(from.holdT, to.holdT) };
      // The paper swings behind a turn and trembles from a step, and is straight again at either end.
      swing = still ? 0 : Math.sin(t * Math.PI) * (to.yaw - from.yaw) * SWING;
      wobble = bobs && !still ? Math.sin(t * Math.PI * 2) * WOBBLE : 0;
      draw(bobs && !still ? Math.sin(t * Math.PI) * 0.014 : 0);
      if (t < 1) frame = requestAnimationFrame(tick);
      else {
        cameraMoving = false;
        done?.();
      }
    };
    frame = requestAnimationFrame(tick);
  };

  return {
    showFloor: (floor, sprites, pose, roomShut) => {
      shared.uFloorLight.value = FLOOR_LIGHT[floor];
      shared.uFog.value.set(FOG_COLOR[floor][0], FOG_COLOR[floor][1], FOG_COLOR[floor][2]);
      renderer.setClearColor(new THREE.Color(FOG_COLOR[floor][0], FOG_COLOR[floor][1], FOG_COLOR[floor][2]));
      buildFloor(floor, roomShut);
      buildSprites(sprites, pose);
      jump(pose);
    },
    setSprites: (sprites) => {
      buildSprites(sprites);
      draw();
    },
    setLight: (hex) => {
      shared.uDayLight.value.set(hex);
      draw();
    },
    jump,
    moveTo: (pose, done) => {
      // Always the short way round, however many times you've turned.
      const quarter = turn(pose.dir, -heading);
      const yaw = cam.yaw + (quarter === 3 ? 1 : -quarter) * (Math.PI / 2);
      heading = pose.dir;
      animate(STEP_MS, { ...cam, ...standPoint(pose, yaw), yaw }, true, done);
    },
    focus: (target, ms = FOCUS_MS) => {
      const yaw = yawOf(heading);
      const x = target.cell.x + 0.5 + Math.sin(yaw) * target.away;
      const z = target.cell.y + 0.5 + Math.cos(yaw) * target.away;
      const y = target.eye ?? EYE + (target.height - EYE) * 0.4;
      const pitch = Math.atan2(target.height - y, target.away);
      const to = { x, y, z, yaw, pitch, dim: FOCUS_DIM, holdT: 0 };
      if (ms === 0 || still) {
        cam = to;
        draw();
      } else animate(ms, { ...to, yaw: cam.yaw }, false);
    },
    flip: (id, look) => {
      const o = cutouts.find((c) => c.id === id);
      if (!o) return;
      if (still) {
        const next = makeSpriteMesh(look);
        o.mesh.geometry.dispose();
        o.mesh.geometry = next.geometry;
        o.mesh.material = next.material;
        draw();
        return;
      }
      o.flipAt = performance.now();
      o.flipTo = look;
      wakePaper();
    },
    unfocus: (pose, done) => {
      const yaw = cam.yaw;
      animate(FOCUS_MS, { ...standPoint(pose, yaw), y: EYE, yaw, pitch: 0, dim: 1, holdT: 0 }, false, () => {
        dropHeld();
        done();
      });
    },
    hold: (look, from) => {
      dropHeld();
      const mesh = makeSpriteMesh(look);
      scene.add(mesh);
      held = { mesh, from: { x: from.x + 0.5, y: 0, z: from.y + 0.5 }, t: 0 };
      animate(FOCUS_MS + 120, { ...cam, dim: FOCUS_DIM, holdT: 1 }, false);
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(paperFrame);
      observer.disconnect();
      dropHeld();
      building?.geometry.dispose();
      for (const o of cutouts) o.mesh.geometry.dispose();
      for (const m of solids) m.geometry.dispose();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      for (const m of Object.values(materials)) m.dispose();
      for (const t of Object.values(textures)) t.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

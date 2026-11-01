// The first-person view: one floor at a time, built from hospitalMap.ts. Only draws while something moves.
// three.js loads here and nowhere else, so it costs nothing until you reach the hospital.
import { charAt, DX, DY, GIRL_FRONT, ROOM_ENTRY, turn, walkable, type Cell, type Dir, type FloorNo, type Pose } from './hospitalMap';
import { paintSheets, PERSON_SLOT, PROP, SHEET, SLOT_H, SLOT_W, tileAt, TILE, TILES, type PersonLook } from './hospitalArt';

const STEP_MS = 280;
const FOCUS_MS = 420;
const EYE = 0.52;
const WALL_H = 1;
const YARD_WALL_H = 3;
// A little behind the middle of the cell, or a wall ahead would fill the screen.
const STAND_BACK = 0.36;
// How dark everything but the person or thing you're looking at gets.
const FOCUS_DIM = 0.42;
const HOLD_AWAY = 0.5;
const HOLD_SIZE = 1.5;
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

export type SpriteLook = PersonLook | keyof typeof PROP;
export type HospitalSprite = {
  cell: Cell;
  look: SpriteLook;
  /** Nudged from the middle of the cell: across, along and up. */
  shift?: [number, number, number];
};
/** What to look at: a point above a cell, from how far away. */
export type FocusTarget = { cell: Cell; height: number; away: number };

export type HospitalScene = {
  showFloor: (floor: FloorNo, sprites: HospitalSprite[], pose: Pose, roomShut: boolean) => void;
  setSprites: (sprites: HospitalSprite[]) => void;
  setLight: (hex: string) => void;
  jump: (pose: Pose) => void;
  /** Move or turn smoothly; `done` runs when it's finished. */
  moveTo: (pose: Pose, done: () => void) => void;
  focus: (target: FocusTarget, instant?: boolean) => void;
  /** Back to where you were standing. */
  unfocus: (pose: Pose, done: () => void) => void;
  /** Lift a thing up from where it lay to just in front of your eyes. */
  hold: (look: SpriteLook, from: Cell) => void;
  dispose: () => void;
};

const SPRITE_SIZE: Partial<Record<SpriteLook, { w: number; h: number }>> = {
  tree: { w: 3, h: 3.4 },
  gurney: { w: 0.9, h: 0.9 },
  cart: { w: 0.8, h: 0.9 },
  vending: { w: 0.55, h: 0.98 },
  collar: { w: 0.24, h: 0.24 },
  snack: { w: 0.24, h: 0.24 },
  laces: { w: 0.24, h: 0.24 },
  coupon: { w: 0.24, h: 0.24 },
  bed: { w: 1.16, h: 0.58 },
  bedFront: { w: 1.16, h: 0.58 },
  pin: { w: 0.05, h: 0.05 },
  girl: { w: 0.31, h: 0.62 },
};
const PERSON_SIZE = { w: 0.46, h: 0.92 };

const hash = (x: number, y: number, d: number) => {
  const n = Math.sin(x * 12.9898 + y * 78.233 + d * 37.719) * 43758.5453;
  return n - Math.floor(n);
};

/** Null where there's no WebGL 2, so the screen can fall back to the plan. */
export async function createHospitalScene(host: HTMLElement, dayLight: string): Promise<HospitalScene | null> {
  const probe = document.createElement('canvas');
  if (!probe.getContext('webgl2')) return null;
  const THREE = await import('three');

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

  const sheets = paintSheets();
  const texture = (data: Uint8Array) => {
    const t = new THREE.DataTexture(data, SHEET, SHEET, THREE.RedFormat, THREE.UnsignedByteType);
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  };
  const textures = { structure: texture(sheets.structure), people: texture(sheets.people), props: texture(sheets.props) };

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
  const materials = { structure: material(textures.structure, false, buildingDim), people: material(textures.people, true, { value: 1 }), props: material(textures.props, true, { value: 1 }) };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(78, 1, 0.05, 12);
  camera.rotation.order = 'YXZ';
  let building: InstanceType<typeof THREE.Mesh> | null = null;
  const spriteMeshes: InstanceType<typeof THREE.Mesh>[] = [];
  let held: { mesh: InstanceType<typeof THREE.Mesh>; from: { x: number; y: number; z: number }; t: number } | null = null;

  let cam = { x: 0.5, y: EYE, z: 0.5, yaw: 0, pitch: 0, dim: 1, holdT: 0 };
  let heading: Dir = 0;
  let frame = 0;

  const yawOf = (dir: Dir) => -dir * (Math.PI / 2);
  const standPoint = (p: Cell, yaw: number) => ({ x: p.x + 0.5 + Math.sin(yaw) * STAND_BACK, z: p.y + 0.5 + Math.cos(yaw) * STAND_BACK });

  const draw = (bob = 0) => {
    camera.position.set(cam.x, cam.y + bob, cam.z);
    camera.rotation.set(cam.pitch, cam.yaw, 0);
    for (const m of spriteMeshes) m.rotation.y = cam.yaw;
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
    const isFurnished = (c: string) => c === '%' || c === 'T' || c === '_' || (c >= 'a' && c <= 'z');
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
        if (open.has(`${nx},${ny}`) && !shutHere) continue;
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
        else if (yard) tile = TILES.yardWall;
        // windows: the end of her floor's corridor, above her bed, and the sitting room on the second
        else if ((here === 'W' && d === 2) || (floor === 4 && here === '_' && x === GIRL_FRONT.x && d === 2) || (floor === 2 && here === 'V' && d === 0)) {
          tile = TILES.window;
          lit = true;
        } else if (((x === 4 || x === 6) && y === 2 && d % 2 === 1) || (x === 4 && y === 4 && d === 2)) {
          tile = TILES.number + floor - 1;
          flip = false;
        }
        if (tile === TILES.shutDoor || tile === TILES.lift || tile === TILES.stairs || tile === TILES.roomDoor || tile === TILES.window) flip = false;
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

  const makeSpriteMesh = (look: SpriteLook) => {
    const prop = PROP[look as keyof typeof PROP];
    const size = SPRITE_SIZE[look] ?? PERSON_SIZE;
    const slot = PERSON_SLOT[look as PersonLook];
    const px = prop ?? { x: (slot % 4) * SLOT_W, y: Math.floor(slot / 4) * SLOT_H, w: SLOT_W, h: SLOT_H };
    const u0 = px.x / SHEET;
    const u1 = (px.x + px.w) / SHEET;
    const v0 = px.y / SHEET;
    const v1 = (px.y + px.h) / SHEET;
    const hw = size.w / 2;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-hw, 0, 0, hw, 0, 0, hw, size.h, 0, -hw, size.h, 0], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v1, u1, v1, u1, v0, u0, v0], 2));
    geometry.setAttribute('aShade', new THREE.Float32BufferAttribute([1, 1, 1, 1], 1));
    const lit = look === 'tree' ? 1 : look === 'pin' ? 2 : 0;
    geometry.setAttribute('aLit', new THREE.Float32BufferAttribute([lit, lit, lit, lit], 1));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    const mesh = new THREE.Mesh(geometry, prop ? materials.props : materials.people);
    mesh.frustumCulled = false;
    return mesh;
  };

  const buildSprites = (sprites: HospitalSprite[]) => {
    for (const m of spriteMeshes) {
      scene.remove(m);
      m.geometry.dispose();
    }
    spriteMeshes.length = 0;
    for (const s of sprites) {
      const mesh = makeSpriteMesh(s.look);
      const [across, along, up] = s.shift ?? [0, 0, 0];
      mesh.position.set(s.cell.x + 0.5 + across, up, s.cell.y + 0.5 + along);
      scene.add(mesh);
      spriteMeshes.push(mesh);
    }
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

  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const animate = (ms: number, to: typeof cam, bobs: boolean, done?: () => void) => {
    cancelAnimationFrame(frame);
    const from = cam;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / ms);
      const e = t * t * (3 - 2 * t);
      const mix = (a: number, b: number) => a + (b - a) * e;
      cam = { x: mix(from.x, to.x), y: mix(from.y, to.y), z: mix(from.z, to.z), yaw: mix(from.yaw, to.yaw), pitch: mix(from.pitch, to.pitch), dim: mix(from.dim, to.dim), holdT: mix(from.holdT, to.holdT) };
      draw(bobs && !still ? Math.sin(t * Math.PI) * 0.014 : 0);
      if (t < 1) frame = requestAnimationFrame(tick);
      else done?.();
    };
    frame = requestAnimationFrame(tick);
  };

  return {
    showFloor: (floor, sprites, pose, roomShut) => {
      shared.uFloorLight.value = FLOOR_LIGHT[floor];
      shared.uFog.value.set(FOG_COLOR[floor][0], FOG_COLOR[floor][1], FOG_COLOR[floor][2]);
      renderer.setClearColor(new THREE.Color(FOG_COLOR[floor][0], FOG_COLOR[floor][1], FOG_COLOR[floor][2]));
      buildFloor(floor, roomShut);
      buildSprites(sprites);
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
    focus: (target, instant) => {
      const yaw = yawOf(heading);
      const x = target.cell.x + 0.5 + Math.sin(yaw) * target.away;
      const z = target.cell.y + 0.5 + Math.cos(yaw) * target.away;
      const y = EYE + (target.height - EYE) * 0.4;
      const pitch = Math.atan2(target.height - y, target.away);
      const to = { x, y, z, yaw, pitch, dim: FOCUS_DIM, holdT: 0 };
      if (instant) {
        cam = to;
        draw();
      } else animate(FOCUS_MS, { ...to, yaw: cam.yaw }, false);
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
      observer.disconnect();
      dropHeld();
      building?.geometry.dispose();
      for (const m of spriteMeshes) m.geometry.dispose();
      for (const m of Object.values(materials)) m.dispose();
      for (const t of Object.values(textures)) t.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

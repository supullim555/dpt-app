// The first-person view: one floor at a time, built from hospitalMap.ts. Only draws while something moves.
// three.js loads here and nowhere else, so it costs nothing until you reach the hospital.
import { charAt, DX, DY, turn, walkable, type Cell, type Dir, type FloorNo, type Pose } from './hospitalMap';
import { paintSheets, PERSON_SLOT, PROP, SHEET, SLOT_H, SLOT_W, tileAt, TILE, TILES, type PersonLook } from './hospitalArt';

const STEP_MS = 280;
const ENTER_MS = 460;
const EYE = 0.52;
const WALL_H = 1;
const YARD_WALL_H = 3;
// A little behind the middle of the cell, or a wall ahead would fill the screen.
const STAND_BACK = 0.36;
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
// light and the floor's mood cost no extra drawings.
const FRAGMENT = /* glsl */ `
precision mediump float;
uniform sampler2D uMap;
uniform float uCutout;
uniform float uFloorLight;
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
  if (vLit > 0.5 && v > 0.75) c = uDayLight * v;
  float fog = smoothstep(1.2, 6.5, vDist);
  gl_FragColor = vec4(mix(c, uFog, fog), 1.0);
}`;

export type HospitalSprite = { cell: Cell; look: PersonLook | keyof typeof PROP };

export type HospitalScene = {
  showFloor: (floor: FloorNo, sprites: HospitalSprite[], pose: Pose) => void;
  setSprites: (sprites: HospitalSprite[]) => void;
  jump: (pose: Pose) => void;
  /** Move or turn smoothly; `done` runs when it's finished. */
  moveTo: (pose: Pose, done: () => void) => void;
  /** Keep walking forward, through a door. */
  walkIn: (done: () => void) => void;
  dispose: () => void;
};

const SPRITE_SIZE: Record<string, { w: number; h: number; sheet: 'people' | 'props' }> = {
  tree: { w: 3, h: 3.4, sheet: 'props' },
  gurney: { w: 0.9, h: 0.9, sheet: 'props' },
  cart: { w: 0.8, h: 0.9, sheet: 'props' },
  vending: { w: 0.55, h: 0.98, sheet: 'props' },
  clue: { w: 0.5, h: 0.42, sheet: 'props' },
};

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
  const material = (map: InstanceType<typeof THREE.DataTexture>, cutout: boolean) =>
    new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms: { ...shared, uMap: { value: map }, uCutout: { value: cutout ? 1 : 0 } } });
  const materials = { structure: material(textures.structure, false), people: material(textures.people, true), props: material(textures.props, true) };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(78, 1, 0.05, 12);
  let building: InstanceType<typeof THREE.Mesh> | null = null;
  const spriteMeshes: InstanceType<typeof THREE.Mesh>[] = [];

  let cam = { x: 0.5, z: 0.5, yaw: 0 };
  let heading: Dir = 0;
  let frame = 0;

  const yawOf = (dir: Dir) => -dir * (Math.PI / 2);
  const standPoint = (p: Cell, yaw: number) => ({ x: p.x + 0.5 + Math.sin(yaw) * STAND_BACK, z: p.y + 0.5 + Math.cos(yaw) * STAND_BACK });

  const draw = (bob = 0) => {
    camera.position.set(cam.x, EYE + bob, cam.z);
    camera.rotation.set(0, cam.yaw, 0);
    for (const m of spriteMeshes) m.rotation.y = cam.yaw;
    renderer.render(scene, camera);
  };

  const buildFloor = (floor: FloorNo) => {
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

    // Everything visible stands on these cells: where you can walk, and who or what is in the way.
    const walk = walkable(floor);
    const open = new Set(walk);
    for (const k of walk) {
      const [x, y] = k.split(',').map(Number);
      for (let d = 0; d < 4; d++) {
        const c = charAt(floor, x + DX[d], y + DY[d]);
        if (c === '%' || c === 'T' || (c >= 'a' && c <= 'z')) open.add(`${x + DX[d]},${y + DY[d]}`);
      }
    }

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
        if (open.has(`${nx},${ny}`)) continue;
        const c = charAt(floor, nx, ny);
        const h = yard ? YARD_WALL_H : WALL_H;
        const corners =
          d === 0 ? [[x, 0, y], [x + 1, 0, y], [x + 1, h, y], [x, h, y]]
          : d === 1 ? [[x + 1, 0, y], [x + 1, 0, y + 1], [x + 1, h, y + 1], [x + 1, h, y]]
          : d === 2 ? [[x + 1, 0, y + 1], [x, 0, y + 1], [x, h, y + 1], [x + 1, h, y + 1]]
          : [[x, 0, y + 1], [x, 0, y], [x, h, y], [x, h, y + 1]];
        const version = Math.floor(hash(x, y, d) * 4);
        let tile: number = TILES.wall + version;
        let flip = hash(y, x, d) < 0.5;
        let lit = false;
        if (c === '=') tile = TILES.shutDoor;
        else if (c === 'E') tile = TILES.lift;
        else if (c === 'S') tile = TILES.stairs;
        else if (c === 'G') {
          tile = TILES.roomDoor;
          lit = true;
        } else if (c === 'N') tile = TILES.counter;
        else if (here === '+') tile = TILES.jamb;
        else if (yard) tile = TILES.yardWall;
        // windows: the end of her floor's corridor, and the sitting room on the second
        else if (here === 'W' && d === 2) {
          tile = TILES.window;
          lit = true;
        } else if (floor === 2 && here === 'V' && d === 0) {
          tile = TILES.window;
          lit = true;
        } else if (((x === 4 || x === 6) && y === 2 && d % 2 === 1) || (x === 4 && y === 4 && d === 2)) {
          tile = TILES.number + floor - 1;
          flip = false;
        }
        if (tile === TILES.shutDoor || tile === TILES.lift || tile === TILES.stairs || tile === TILES.roomDoor || tile === TILES.window) flip = false;
        quad(corners, tile, { shade: SIDE_SHADE[d], flip, lit });
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

  const buildSprites = (sprites: HospitalSprite[]) => {
    for (const m of spriteMeshes) {
      scene.remove(m);
      m.geometry.dispose();
    }
    spriteMeshes.length = 0;
    for (const s of sprites) {
      const prop = PROP[s.look as keyof typeof PROP];
      const size = SPRITE_SIZE[s.look] ?? { w: 0.46, h: 0.92, sheet: 'people' as const };
      const px = prop ?? (() => {
        const i = PERSON_SLOT[s.look as PersonLook];
        return { x: (i % 4) * SLOT_W, y: Math.floor(i / 4) * SLOT_H, w: SLOT_W, h: SLOT_H };
      })();
      const u0 = px.x / SHEET;
      const u1 = (px.x + px.w) / SHEET;
      const v0 = px.y / SHEET;
      const v1 = (px.y + px.h) / SHEET;
      const hw = size.w / 2;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([-hw, 0, 0, hw, 0, 0, hw, size.h, 0, -hw, size.h, 0], 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v1, u1, v1, u1, v0, u0, v0], 2));
      geometry.setAttribute('aShade', new THREE.Float32BufferAttribute([1, 1, 1, 1], 1));
      const lit = s.look === 'tree' ? 1 : 0;
      geometry.setAttribute('aLit', new THREE.Float32BufferAttribute([lit, lit, lit, lit], 1));
      geometry.setIndex([0, 1, 2, 0, 2, 3]);
      const mesh = new THREE.Mesh(geometry, materials[size.sheet]);
      mesh.position.set(s.cell.x + 0.5, 0, s.cell.y + 0.5);
      mesh.frustumCulled = false;
      scene.add(mesh);
      spriteMeshes.push(mesh);
    }
  };

  const jump = (pose: Pose) => {
    cancelAnimationFrame(frame);
    heading = pose.dir;
    const yaw = yawOf(pose.dir);
    cam = { ...standPoint(pose, yaw), yaw };
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

  const animate = (ms: number, to: { x: number; z: number; yaw: number }, bobs: boolean, done: () => void) => {
    cancelAnimationFrame(frame);
    const from = cam;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / ms);
      const e = t * t * (3 - 2 * t);
      cam = { x: from.x + (to.x - from.x) * e, z: from.z + (to.z - from.z) * e, yaw: from.yaw + (to.yaw - from.yaw) * e };
      draw(bobs && !still ? Math.sin(t * Math.PI) * 0.014 : 0);
      if (t < 1) frame = requestAnimationFrame(tick);
      else done();
    };
    frame = requestAnimationFrame(tick);
  };

  return {
    showFloor: (floor, sprites, pose) => {
      shared.uFloorLight.value = FLOOR_LIGHT[floor];
      shared.uFog.value.set(FOG_COLOR[floor][0], FOG_COLOR[floor][1], FOG_COLOR[floor][2]);
      renderer.setClearColor(new THREE.Color(FOG_COLOR[floor][0], FOG_COLOR[floor][1], FOG_COLOR[floor][2]));
      buildFloor(floor);
      buildSprites(sprites);
      jump(pose);
    },
    setSprites: (sprites) => {
      buildSprites(sprites);
      draw();
    },
    jump,
    moveTo: (pose, done) => {
      // Always the short way round, however many times you've turned.
      const quarter = turn(pose.dir, -heading);
      const yaw = cam.yaw + (quarter === 3 ? 1 : -quarter) * (Math.PI / 2);
      heading = pose.dir;
      animate(STEP_MS, { ...standPoint(pose, yaw), yaw }, true, done);
    },
    walkIn: (done) => {
      animate(ENTER_MS, { x: cam.x - Math.sin(cam.yaw) * 0.7, z: cam.z - Math.cos(cam.yaw) * 0.7, yaw: cam.yaw }, true, done);
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      building?.geometry.dispose();
      for (const m of spriteMeshes) m.geometry.dispose();
      for (const m of Object.values(materials)) m.dispose();
      for (const t of Object.values(textures)) t.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

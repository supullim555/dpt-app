// Pure geometry for the room: where furniture sits, where the character's
// feet may go, and how big she should look at a given depth. No React here so
// both the backdrop (drawing) and the roamer (walking) share one source of truth.
import type { ImageSourcePropType } from 'react-native';
import manifest from '../assets/room/manifest.json';
import { ROOM_OBJECTS, type RoomObjectDef, type RoomObjectKind } from './objects';

export type Rect = { x: number; y: number; w: number; h: number };
export type Pt = { x: number; y: number };

/** Where the back wall meets the floor, as a fraction of room height. */
export const WALL_BOTTOM = 0.38;

// The room is drawn in a box no wider than this (width / height), centered in
// the stage. On phones the box is the whole stage; on wide web windows it
// keeps furniture from stretching into an unrecognisable room.
const ROOM_MAX_ASPECT = 0.8;

// Pixel size of every cut-out asset (written by scripts/extract-room.js), so a
// piece keeps its proportions whatever width the layout gives it.
const ART = manifest as Record<string, { width: number; height: number }>;

export type PlacedObject = {
  id: string;
  source: ImageSourcePropType;
  kind: RoomObjectKind;
  /** Box in room px. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Solids only: stacking order among furniture (even numbers; she slots in between). */
  z: number;
};

export type RoomLayout = {
  /** Room box size in px, and its left offset inside the stage. */
  width: number;
  height: number;
  offsetX: number;
  wallBottom: number;
  charSize: number;
  /** Everything in the room, in draw order. */
  objects: PlacedObject[];
  /** Bounds for the character's FEET (bottom-center of the sprite), in room px. */
  walk: Rect;
  /** Solid floor footprints, already padded by the character's body. */
  blocked: Rect[];
  /** Floor-contact y of each solid, ascending: she's in front of every line above her feet. */
  depthLines: number[];
  /** Sprite scale at the far (top) and near (bottom) edge of the walkable floor. */
  farScale: number;
  nearScale: number;
};

/** What's actually in the room: the starting pieces plus anything bought. */
export function ownedObjects(owned: readonly string[]): RoomObjectDef[] {
  return ROOM_OBJECTS.filter((o) => !o.shop || owned.includes(o.id));
}

export function getRoomLayout(stageWidth: number, stageHeight: number, owned: readonly string[]): RoomLayout {
  const width = Math.min(stageWidth, stageHeight * ROOM_MAX_ASPECT);
  const height = stageHeight;
  const offsetX = (stageWidth - width) / 2;
  const charSize = Math.min(width, height) * 0.26;

  const walk: Rect = {
    x: charSize * 0.35,
    y: height * 0.45,
    w: Math.max(0, width - charSize * 0.7),
    h: height * 0.5,
  };

  const padX = charSize * 0.3;
  const padY = height * 0.012;

  const placed = ownedObjects(owned).map((def) => {
    const art = ART[def.id];
    const w = def.w * width;
    const h = (w * art.height) / art.width;
    const left = def.x * width - w / 2;
    const top = def.kind === 'wall' ? def.y * height : def.y * height - h;
    return { def, left, top, width: w, height: h, baseY: top + h };
  });

  const solids = placed.filter((p) => p.def.kind === 'solid').sort((a, b) => a.baseY - b.baseY);
  const depthLines = solids.map((p) => p.baseY);

  const blocked = solids.map((p): Rect => {
    const footW = p.width * (p.def.footWidth ?? 0.9);
    const footH = (p.def.footDepth ?? 0.03) * height;
    return {
      x: p.left + (p.width - footW) / 2 - padX,
      y: p.baseY - footH - padY,
      w: footW + padX * 2,
      h: footH + padY * 2,
    };
  });

  const objects = placed.map((p): PlacedObject => ({
    id: p.def.id,
    source: p.def.source,
    kind: p.def.kind,
    left: p.left,
    top: p.top,
    width: p.width,
    height: p.height,
    z: p.def.kind === 'solid' ? 2 * solids.indexOf(p) + 2 : 0,
  }));

  return {
    width,
    height,
    offsetX,
    wallBottom: WALL_BOTTOM * height,
    charSize,
    objects,
    walk,
    blocked,
    depthLines,
    farScale: 0.82,
    nearScale: 1.08,
  };
}

export function isFree(room: RoomLayout, p: Pt): boolean {
  const { walk, blocked } = room;
  if (p.x < walk.x || p.x > walk.x + walk.w || p.y < walk.y || p.y > walk.y + walk.h) return false;
  return !blocked.some((r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h);
}

// Straight-line walk check: sample along the segment so a path can't clip
// through a bed just because both of its endpoints happen to be free.
export function isPathClear(room: RoomLayout, a: Pt, b: Pt): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!isFree(room, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false;
  }
  return true;
}

function randomPoint(room: RoomLayout): Pt {
  const { walk } = room;
  return { x: walk.x + Math.random() * walk.w, y: walk.y + Math.random() * walk.h };
}

/**
 * Where she first appears: front-center of the floor, which is also where the
 * big dialogue portrait stands, so leaving a conversation doesn't teleport her.
 */
export function pickStart(room: RoomLayout): Pt {
  const home: Pt = { x: room.walk.x + room.walk.w / 2, y: room.walk.y + room.walk.h };
  if (isFree(room, home)) return home;
  for (let i = 0; i < 40; i++) {
    const p = randomPoint(room);
    if (isFree(room, p)) return p;
  }
  return home;
}

/** A reachable destination that's worth walking to, or null if none was found. */
export function pickTarget(room: RoomLayout, from: Pt): Pt | null {
  const minDist = Math.hypot(room.walk.w, room.walk.h) * 0.3;
  let best: Pt | null = null;
  let bestDist = room.charSize * 0.8; // anything shorter isn't worth a walk cycle
  for (let i = 0; i < 40; i++) {
    const p = randomPoint(room);
    if (!isFree(room, p) || !isPathClear(room, from, p)) continue;
    const d = Math.hypot(p.x - from.x, p.y - from.y);
    if (d >= minDist) return p;
    if (d > bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

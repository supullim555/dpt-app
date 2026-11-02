// The hospital as data, and the rules for walking it: the one source for the first-person view, the map
// button and docs/지도/ (docs/병원_지도.md). No imports, so scripts/check-visit-logic.mjs can run it directly.
// One character is one cell. Every floor has one footprint, so the lift and the stairs line up.
// '_' is floor you can see but not walk on: the part of her room around the bed. '&' is a sofa and '^' a plant.

export type FloorNo = 1 | 2 | 3 | 4;
/** 0 north, 1 east, 2 south, 3 west. */
export type Dir = 0 | 1 | 2 | 3;
export type Cell = { x: number; y: number };
export type Pose = Cell & { floor: FloorNo; dir: Dir };

export const FLOOR_ORDER: FloorNo[] = [4, 3, 2, 1];

export const HOSPITAL: Record<FloorNo, { map: string[]; rooms: Record<string, string>; blocked?: string }> = {
  4: {
    map: [
      '###############',
      '#AA#E#S#BB#LLp#',
      '#AA#.#.#BB#LL##',
      '#=##.#.##=##+##',
      '#......@......#',
      '###=#n#+#v#=#.#',
      '#CCC##_U_##DD.#',
      '#CCC##_U_##DD.#',
      '#CCC##_g_##DD.#',
      '#CCC##___##DDW#',
      '###############',
    ],
    rooms: { A: '병실', B: '병실', C: '병실', D: '가족 면담실', L: '보호자 휴게실', W: '복도 끝 창', U: '소녀의 병실' },
  },
  3: {
    map: [
      '###############',
      '#AA#E#S#BB#II##',
      '#AA#.#.#BB#II##',
      '#=##.#.##=##=##',
      '#.............#',
      '#%#NNNNNNNNN#.#',
      '#t###c#######.#',
      '#.............#',
      '###=###+###=###',
      '#DDD#RRRb#QQQ##',
      '###############',
    ],
    rooms: { A: '병실', B: '병실', I: '중환자실', D: '병실', R: '휴게실', Q: '처치실' },
    blocked: '이동식 침대가 복도를 막고 있다.',
  },
  2: {
    map: [
      '###############',
      '#AA#E#S#DD#Vh##',
      '#AA#.#.#Dd#VV##',
      '#=##.#.##+##+##',
      '#.............#',
      '#.#NNN#%#LLL#.#',
      '#.#NNN#.#LLL#.#',
      '#.............#',
      '###=###+###+###',
      '#FFF#YYYy##kJJ#',
      '###############',
    ],
    rooms: { A: '병실', D: '병실', V: '창가 쉼터', L: '린넨실', F: '병실', Y: '재활실', J: '병실' },
    blocked: '세탁 수레가 통로를 막고 있다.',
  },
  1: {
    map: [
      '###############',
      '#Oo#E#S#MMm#XX#',
      '#OO#.#.#MMM#.%#',
      '#+##.#.##+##.##',
      '@.............#',
      '#^...i..&&.g.^#',
      '#.............#',
      '###+###+###=###',
      '#HHH###.###RRR#',
      '#HHH###.###RRR#',
      '#######+#######',
      '####YYYYYYY####',
      '####YYYTYYY####',
      '####YbYYYYY####',
      '###############',
    ],
    rooms: { O: '외래 대기실', M: '매점', X: '자판기 뒤 구석', H: '응급실 앞', R: '원무과·약국', Y: '안뜰' },
    blocked: '자판기가 서 있다.',
  },
};

// Same cells as CLUES in progress.ts, by floor.
export const CLUE_CELLS: Record<FloorNo, Cell> = { 4: { x: 11, y: 1 }, 3: { x: 5, y: 9 }, 2: { x: 5, y: 9 }, 1: { x: 13, y: 1 } };

export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
export const LIFT_FRONT: Cell = { x: 4, y: 2 };
export const STAIRS_FRONT: Cell = { x: 6, y: 2 };
export const ROOM_ENTRY: Cell = { x: 7, y: 5 };
export const GIRL_FRONT: Cell = { x: 7, y: 7 };
export const SHOP_FRONT: Cell = { x: 10, y: 2 };
export const GUIDE_FRONT: Cell = { x: 5, y: 4 };

/** The start of each day: just inside the front door, looking down the lobby. */
export const ENTRANCE: Pose = { floor: 1, x: 0, y: 4, dir: 1 };
/** Where you stand when you've been sent out of her room. */
export const OUTSIDE_ROOM: Pose = { floor: 4, x: 7, y: 4, dir: 1 };
/** Where you end up once you're through her door: the view comes in on her by itself. */
export const BEDSIDE: Pose = { floor: 4, ...GIRL_FRONT, dir: 2 };
/** The way you face coming out of the lift or off the stairs. */
export const arrival = (floor: FloorNo, at: Cell): Pose => ({ floor, x: at.x, y: at.y, dir: 2 });

export const charAt = (floor: FloorNo, x: number, y: number) => HOSPITAL[floor].map[y]?.[x] ?? '#';
const isPerson = (c: string) => c >= 'a' && c <= 'z';
const STOPS_YOU = '#=%NTES_&^';

const walkableCache = new Map<FloorNo, Set<string>>();
const key = (x: number, y: number) => `${x},${y}`;

/** Every cell you can stand on: flooded from the lift, so rooms behind locked doors never count. */
export function walkable(floor: FloorNo): Set<string> {
  const cached = walkableCache.get(floor);
  if (cached) return cached;
  const seen = new Set([key(LIFT_FRONT.x, LIFT_FRONT.y)]);
  const queue: Cell[] = [LIFT_FRONT];
  while (queue.length) {
    const { x, y } = queue.pop()!;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      const c = charAt(floor, nx, ny);
      if (STOPS_YOU.includes(c) || isPerson(c) || seen.has(key(nx, ny))) continue;
      seen.add(key(nx, ny));
      queue.push({ x: nx, y: ny });
    }
  }
  walkableCache.set(floor, seen);
  return seen;
}

export const canStand = (floor: FloorNo, x: number, y: number) => walkable(floor).has(key(x, y));
export const turn = (dir: Dir, by: number) => (((dir + by) % 4) + 4) % 4 as Dir;
export const ahead = (p: Pose): Cell => ({ x: p.x + DX[p.dir], y: p.y + DY[p.dir] });

export function stepped(p: Pose, by: 1 | -1 = 1): Pose | null {
  const x = p.x + DX[p.dir] * by;
  const y = p.y + DY[p.dir] * by;
  return canStand(p.floor, x, y) ? { ...p, x, y } : null;
}

/** The direction of the first step of a shortest walk, or null if there's no way or you're already there. */
export function firstStep(floor: FloorNo, from: Cell, to: Cell): Dir | null {
  if (from.x === to.x && from.y === to.y) return null;
  const prev = new Map<string, { from: string; dir: Dir }>();
  const start = key(from.x, from.y);
  const queue: Cell[] = [from];
  for (let i = 0; i < queue.length; i++) {
    const { x, y } = queue[i];
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      const k = key(nx, ny);
      if (!canStand(floor, nx, ny) || k === start || prev.has(k)) continue;
      prev.set(k, { from: key(x, y), dir: d as Dir });
      queue.push({ x: nx, y: ny });
    }
  }
  let at = key(to.x, to.y);
  let step = prev.get(at);
  if (!step) return null;
  while (step.from !== start) {
    at = step.from;
    step = prev.get(at)!;
  }
  return step.dir;
}

export type Goal = {
  text: string;
  floor: FloorNo;
  /** Where the arrow leads on that floor; null when finding it is the point. */
  cell: Cell | null;
  /** The way to end up facing once there. */
  face?: Dir;
};

export function goalFor(o: { doneToday: boolean; boughtToday: boolean; clueToFind: { floor: FloorNo; name: string } | null }): Goal | null {
  if (!o.doneToday) return { text: '4층 소녀의 병실로 가기', floor: 4, cell: ROOM_ENTRY };
  if (o.clueToFind) return { text: `${o.clueToFind.floor}층에서 ${o.clueToFind.name} 찾기`, floor: o.clueToFind.floor, cell: null };
  if (!o.boughtToday) return { text: '1층 매점에서 선물 고르기', floor: 1, cell: SHOP_FRONT, face: 0 };
  return null;
}

// The first walk in: how to move, what the goal means, how to talk to someone, the shop, then up to her floor.
// Goes by what you've actually done, only ever forward, so wandering off never strands you in it.
export type TutorialStep = 'walk' | 'goal' | 'talk' | 'back' | 'shop' | 'buy' | 'shopBack' | 'lift' | 'room' | 'inRoom' | 'day' | 'done';

export function tutorialAfter(step: TutorialStep, o: { moved: boolean; facing: string | null; talkingTo: string | null; floor: FloorNo; bought: boolean; atBedside: boolean; doneToday: boolean }): TutorialStep {
  if (step === 'done' || step === 'day') return step;
  if (o.doneToday) return 'day';
  if (o.atBedside) return 'inRoom';
  if (step === 'inRoom' || step === 'room') return step;
  if (o.floor === 4) return 'room';
  if (step === 'lift') return step;
  if (o.bought) return o.talkingTo ? 'shopBack' : 'lift';
  if (step === 'walk' && o.moved) return 'goal';
  if (step === 'goal' && o.facing === '1i') return 'talk';
  if (step === 'talk' && o.talkingTo === '1i') return 'back';
  if (step === 'back' && !o.talkingTo) return 'shop';
  if (step === 'shop' && o.facing === '1m') return 'buy';
  return step;
}

/** What the goal is while it's being taught; afterwards goalFor decides. */
export function tutorialGoal(step: TutorialStep): Goal | null {
  if (step === 'walk' || step === 'goal' || step === 'talk' || step === 'back') return { text: '안내 직원에게 가기', floor: 1, cell: GUIDE_FRONT, face: 2 };
  if (step === 'shop' || step === 'buy' || step === 'shopBack') return { text: '1층 매점에서 선물 고르기', floor: 1, cell: SHOP_FRONT, face: 0 };
  return null;
}

/** The way to the goal from here, as quarter turns from where you're facing (0 ahead, 1 right, 2 behind, 3 left). */
export function arrowFor(p: Pose, goal: Goal | null): number | null {
  if (!goal) return null;
  const sameFloor = goal.floor === p.floor;
  const target = sameFloor ? goal.cell : LIFT_FRONT;
  if (!target) return null;
  const dir = firstStep(p.floor, p, target);
  if (dir !== null) return turn(dir, -p.dir);
  if (p.x !== target.x || p.y !== target.y) return null;
  const face = sameFloor ? goal.face : 0;
  if (face === undefined || face === p.dir) return null;
  return turn(face, -p.dir);
}

export type Thing =
  | { kind: 'lift' }
  | { kind: 'stairs' }
  | { kind: 'person'; id: string }
  | { kind: 'clue' }
  /** Something to look at. `wall`: it's part of the wall, so stand further off. `up`: look up at it. */
  | { kind: 'look'; text: string; wall?: boolean; up?: boolean }
  | { kind: 'leave' };

/** What's in front of you (or under you, for a clue or the front door). */
export function thingAt(p: Pose, clueHere: boolean): Thing | null {
  const front = ahead(p);
  const cell = CLUE_CELLS[p.floor];
  if (clueHere && ((p.x === cell.x && p.y === cell.y) || (front.x === cell.x && front.y === cell.y))) return { kind: 'clue' };
  const c = charAt(p.floor, front.x, front.y);
  if (c === 'E') return { kind: 'lift' };
  if (c === 'S') return { kind: 'stairs' };
  // The front desk has its wall behind it, so there's no talking to the guide from that side.
  if (isPerson(c) && p.floor === 1 && c === 'i' && p.dir === 0) return { kind: 'look', text: '층별 안내판의 뒷면이다.', wall: true };
  if (isPerson(c)) return { kind: 'person', id: `${p.floor}${c}` };
  if (c === 'N') return p.floor === 3 ? { kind: 'person', id: '3N' } : { kind: 'look', text: '간호사 스테이션이다. 지금은 아무도 없다.', wall: true };
  if (c === '%') return { kind: 'look', text: HOSPITAL[p.floor].blocked ?? '' };
  if (c === '&') return { kind: 'look', text: '대기실 소파다. 가운데가 조금 꺼져 있다.' };
  if (c === '^') return { kind: 'look', text: '화분이다. 누가 물을 주고 있는지 흙이 젖어 있다.' };
  if (c === 'T') return { kind: 'look', text: '은행나무다. 저 위 어딘가에 4층 창이 있다.', up: true };
  if (c === '=') {
    const behind = charAt(p.floor, front.x + DX[p.dir], front.y + DY[p.dir]);
    return { kind: 'look', text: `${HOSPITAL[p.floor].rooms[behind] ?? '방'}. 문이 닫혀 있다.`, wall: true };
  }
  if (charAt(p.floor, p.x, p.y) === 'W' && p.dir === 2) return { kind: 'look', text: '안뜰의 은행나무가 내려다보인다.', wall: true };
  if (p.floor === 1 && charAt(p.floor, p.x, p.y) === '@') return { kind: 'leave' };
  return null;
}

export const placeName = (p: Pose) => HOSPITAL[p.floor].rooms[charAt(p.floor, p.x, p.y)] ?? null;

// The hospital as data, and the rules for walking it: the one source for the first-person view, the map
// button and docs/지도/ (docs/병원_지도.md). No imports, so scripts/check-visit-logic.mjs can run it directly.
// One character is one cell. Every floor has one footprint, so the lift and the stairs line up.
// '_' is floor you can see but not walk on: the part of her room around the bed. '&' is a sofa and '^' a plant.

/** 0 isn't in the hospital: it's the riverside someone remembers (docs/의사의_부탁.md). */
export type FloorNo = 0 | 1 | 2 | 3 | 4;
/** 0 north, 1 east, 2 south, 3 west. */
export type Dir = 0 | 1 | 2 | 3;
export type Cell = { x: number; y: number };
export type Pose = Cell & { floor: FloorNo; dir: Dir };

export const FLOOR_ORDER: FloorNo[] = [4, 3, 2, 1];

export const HOSPITAL: Record<FloorNo, { map: string[]; rooms: Record<string, string>; blocked?: string }> = {
  // Whichever place is being remembered (places.ts), put here by enterPlace.
  0: { map: ['#'], rooms: {} },
  4: {
    map: [
      '###############',
      '#AA#E#S#BB#LLp#',
      '#AA#.#.#BB#&L##',
      '#=##.#.##=##+##',
      '#......@......#',
      '###=#n#+#v#+###',
      '#CCC##_U_##DDD#',
      '#CCC##_U_##DDD#',
      '#CCC##_g_##_rD#',
      '#CCC##___##__W#',
      '###############',
    ],
    rooms: { A: '병실', B: '병실', C: '병실', D: '의사 선생님의 방', L: '보호자 휴게실', W: '의사 선생님의 방', U: '소녀의 병실' },
    // v0.93: behind and left of the doctor's desk is floor you see but can't stand on (the window, right, still can be)
  },
  3: {
    map: [
      '###############',
      '#AA#E#S#BB#II##',
      '#AA#.#.#BB#II##',
      '#=##.#.##=##=##',
      '#.............#',
      '#%#NNN...NNN#.#',
      '#t###c#q#####.#',
      '#.............#',
      '###=###+###=###',
      '#DDD#RRRb#QQQ##',
      '###############',
    ],
    rooms: { A: '병실', B: '병실', I: '중환자실', D: '병실', R: '휴게실', Q: '처치실' },
    // v0.93: the nurses' station has a way in, three cells wide, with the 3F nurse (q) behind a desk at its back
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
      '#####YYYY######',
      '###############',
    ],
    // v0.93: the rehab room goes back a row, so finding what's in it takes a little more looking
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
      '#^......&&.g.^#',
      '#....i........#',
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

// Things along the walls that you walk past, not into: cell, what, and how far off the middle of the cell (across, along).
// Never against a door: scripts/check-visit-logic.mjs checks.
export const ALONG_THE_WALLS: Record<FloorNo, [number, number, 'chairBox' | 'plant' | 'wheelchair', number, number][]> = {
  0: [],
  4: [[3, 4, 'chairBox', 0, -0.36], [10, 4, 'plant', 0, -0.36], [13, 7, 'chairBox', 0.36, 0]],
  3: [[4, 7, 'chairBox', 0, 0.36], [5, 7, 'chairBox', 0, 0.36], [6, 7, 'chairBox', 0, 0.36], [13, 7, 'plant', 0.34, 0.34], [6, 9, 'chairBox', 0, 0.36], [2, 4, 'wheelchair', 0, -0.33]],
  2: [[3, 4, 'wheelchair', 0, -0.33], [9, 7, 'chairBox', 0, 0.36], [10, 7, 'chairBox', 0, 0.36], [13, 4, 'plant', 0.34, -0.34], [11, 2, 'chairBox', -0.34, 0.34], [8, 10, 'wheelchair', 0, 0.33]],
  1: [[1, 1, 'chairBox', -0.34, -0.34], [2, 2, 'chairBox', 0.34, 0.34], [1, 8, 'wheelchair', -0.32, 0], [2, 9, 'chairBox', 0, 0.36], [3, 9, 'chairBox', 0, 0.36], [7, 8, 'plant', 0.34, 0]],
};

// Same cells as CLUES in progress.ts, by floor.
/** v0.85: what hangs on the walls, so a corridor isn't a bare white run: the cell it's seen from, what, and which of
 * that cell's walls (0 north … 3 west). Never a door, a window or a floor number (scripts/check-visit-logic.mjs). */
export type WallThing = 'noticeBoard' | 'hillsPicture' | 'wallClock' | 'sanitizer';
export const ON_THE_WALLS: Record<FloorNo, [number, number, WallThing, Dir][]> = {
  0: [],
  4: [[2, 4, 'noticeBoard', 0], [8, 4, 'hillsPicture', 0], [12, 4, 'sanitizer', 2], [13, 4, 'wallClock', 1]],
  3: [[8, 4, 'hillsPicture', 0], [11, 4, 'noticeBoard', 0], [9, 7, 'wallClock', 0], [2, 7, 'sanitizer', 2]],
  2: [[7, 4, 'noticeBoard', 0], [10, 4, 'hillsPicture', 0], [5, 7, 'wallClock', 2], [2, 7, 'sanitizer', 2]],
  1: [[7, 4, 'noticeBoard', 0], [10, 4, 'hillsPicture', 0], [13, 4, 'wallClock', 1], [1, 6, 'sanitizer', 3]],
};

export const CLUE_CELLS: Record<FloorNo, Cell> = { 0: { x: -1, y: -1 }, 4: { x: 11, y: 1 }, 3: { x: 6, y: 9 }, 2: { x: 5, y: 10 }, 1: { x: 12, y: 1 } };

/** v0.93: some things only turn up once you look where they're hidden: face `behind` and use it, `text` shows, and the
 * thing then lies at CLUE_CELLS (beside the vending machine; by the chair next to the tired guardian; by the lounge's
 * sofa). The 2F laces lie out in the rehab room, to be found by looking round it. */
export const HIDDEN_CLUE: Partial<Record<FloorNo, { behind: Cell; action: string; text: string }>> = {
  1: { behind: { x: 13, y: 2 }, action: '자판기 흔들어 보기', text: '자판기를 흔들어 보았다. 자판기 뒤에서 무언가가 굴러 나왔다.' },
  // the coupon in the books piled on the 4F lounge's sofa, which the guardian next door has read through
  4: { behind: { x: 11, y: 2 }, action: '책 더미 넘겨 보기', text: '소파에 쌓인 책을 한 권씩 넘겨 보았다. 책 사이에서 무언가 떨어졌다.' },
  3: { behind: { x: 6, y: 9 }, action: '의자 밑 살펴보기', text: '보호자 옆 의자 밑을 들여다보았다. 무언가 끼어 있다.' },
};

export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
export const LIFT_FRONT: Cell = { x: 4, y: 2 };
export const STAIRS_FRONT: Cell = { x: 6, y: 2 };
export const ROOM_ENTRY: Cell = { x: 7, y: 5 };
export const GIRL_FRONT: Cell = { x: 7, y: 7 };
export const SHOP_FRONT: Cell = { x: 10, y: 2 };
export const GUIDE_FRONT: Cell = { x: 5, y: 5 };
/** The way out, once there's nothing left to do. */
export const FRONT_DOOR: Cell = { x: 0, y: 4 };
/** In front of the doctor's desk, in his room at the end of her floor. */
export const DOCTOR_FRONT: Cell = { x: 12, y: 7 };

/** As much of a remembered place (places.ts) as walking it needs. */
type PlaceLike = { map: string[]; start: { x: number; y: number; dir: Dir }; stops: string; things: Record<string, { text: string }> };
let place: PlaceLike | null = null;

/** Floor 0 becomes this remembered place. */
export function enterPlace(p: PlaceLike) {
  place = p;
  HOSPITAL[0] = { map: p.map, rooms: {} };
  walkableCache.delete(0);
}
export const currentPlace = () => place;

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
// In a remembered place its things stop you too; in the hospital the same letters can be rooms.
const stopsOn = (floor: FloorNo) => (floor === 0 ? STOPS_YOU + (place?.stops ?? '') : STOPS_YOU);

const walkableCache = new Map<FloorNo, Set<string>>();
const key = (x: number, y: number) => `${x},${y}`;

/** Every cell you can stand on: flooded from the lift, so rooms behind locked doors never count. */
export function walkable(floor: FloorNo): Set<string> {
  const cached = walkableCache.get(floor);
  if (cached) return cached;
  const start = floor === 0 && place ? place.start : LIFT_FRONT;
  const seen = new Set([key(start.x, start.y)]);
  const queue: Cell[] = [start];
  while (queue.length) {
    const { x, y } = queue.pop()!;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      const c = charAt(floor, nx, ny);
      if (stopsOn(floor).includes(c) || isPerson(c) || seen.has(key(nx, ny))) continue;
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

/** One search outward from `from`: for each cell reached, the direction of the step that reached it. Keyed by
 * x + y * 1000, so no strings are made per cell. The last one is kept: the arrow and the minimap both ask from where
 * you stand, and every redraw (each letter typed, too) asks again without your having moved. */
let lastWalk: { cells: Set<string>; floor: FloorNo; x: number; y: number; reachedBy: Map<number, Dir> } | null = null;
function walksFrom(floor: FloorNo, from: Cell): Map<number, Dir> {
  const cells = walkable(floor);
  if (lastWalk && lastWalk.cells === cells && lastWalk.floor === floor && lastWalk.x === from.x && lastWalk.y === from.y) return lastWalk.reachedBy;
  const reachedBy = new Map<number, Dir>();
  const start = from.x + from.y * 1000;
  const queue: Cell[] = [from];
  for (let i = 0; i < queue.length; i++) {
    const { x, y } = queue[i];
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      const k = nx + ny * 1000;
      if (k === start || reachedBy.has(k) || !canStand(floor, nx, ny)) continue;
      reachedBy.set(k, d as Dir);
      queue.push({ x: nx, y: ny });
    }
  }
  lastWalk = { cells, floor, x: from.x, y: from.y, reachedBy };
  return reachedBy;
}

/** The directions of a shortest walk, first step first; empty if there's no way or you're already there. */
function stepsTo(floor: FloorNo, from: Cell, to: Cell): Dir[] {
  if (from.x === to.x && from.y === to.y) return [];
  const reachedBy = walksFrom(floor, from);
  const steps: Dir[] = [];
  let x = to.x;
  let y = to.y;
  for (let d = reachedBy.get(x + y * 1000); d !== undefined; d = reachedBy.get(x + y * 1000)) {
    steps.push(d);
    x -= DX[d];
    y -= DY[d];
  }
  return x === from.x && y === from.y ? steps.reverse() : [];
}

/** The direction of the first step of a shortest walk, or null if there's no way or you're already there. */
export function firstStep(floor: FloorNo, from: Cell, to: Cell): Dir | null {
  return stepsTo(floor, from, to)[0] ?? null;
}

/** The cells of a shortest walk, not counting where you are; empty if there's no way or you're there. One search,
 * not one per step: it's worked out again on every move. */
export function pathTo(floor: FloorNo, from: Cell, to: Cell): Cell[] {
  let at: Cell = from;
  return stepsTo(floor, from, to).map((d) => (at = { x: at.x + DX[d], y: at.y + DY[d] }));
}

export type Goal = {
  text: string;
  floor: FloorNo;
  /** Where the arrow leads on that floor; null when finding it is the point. */
  cell: Cell | null;
  /** The way to end up facing once there. */
  face?: Dir;
};

export function goalFor(o: { doneToday: boolean; boughtToday: boolean; clueToFind: { floor: FloorNo; name: string } | null; metDoctor?: boolean; request?: Goal | null; somethingOfHers?: FloorNo | null }): Goal | null {
  if (!o.doneToday) return { text: '4층 소녀의 병실로 가기', floor: 4, cell: ROOM_ENTRY };
  if (o.metDoctor === false) return { text: '4층 의사 선생님의 방에 가기', floor: 4, cell: DOCTOR_FRONT, face: 2 };
  if (o.request) return o.request;
  if (o.clueToFind) return { text: `${o.clueToFind.floor}층에서 ${o.clueToFind.name} 찾기`, floor: o.clueToFind.floor, cell: null };
  if (!o.boughtToday) return { text: '1층 매점에서 선물 고르기', floor: 1, cell: SHOP_FRONT, face: 0 };
  // Before the fairy says what it is, only that something of hers is on that floor.
  if (o.somethingOfHers) return { text: `${o.somethingOfHers}층 어딘가에서 그 아이의 물건 찾기`, floor: o.somethingOfHers, cell: null };
  // Nothing left: the front door, where you can go home or straight on to the next day.
  return { text: '1층 정문으로 나가기', floor: 1, cell: FRONT_DOOR };
}

// The first walk in: how to move, what the goal means, how to talk to someone, the shop, then up to her floor.
// Goes by what you've actually done, only ever forward, so wandering off never strands you in it.
// After her room: the doctor's room, then that you may go on to the next day straight away.
export type TutorialStep = 'walk' | 'goal' | 'talk' | 'back' | 'shop' | 'buy' | 'shopBack' | 'lift' | 'room' | 'inRoom' | 'day' | 'nextDay' | 'done';

export function tutorialAfter(step: TutorialStep, o: { moved: boolean; facing: string | null; talkingTo: string | null; floor: FloorNo; bought: boolean; atBedside: boolean; doneToday: boolean; metDoctor?: boolean }): TutorialStep {
  if (step === 'done' || step === 'nextDay') return step;
  if (step === 'day') return o.metDoctor && !o.talkingTo ? 'nextDay' : step;
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
  /** Where something is hidden, before it's been found there (HIDDEN_CLUE). */
  | { kind: 'hide'; action: string; text: string }
  /** Something to look at. `wall`: it's part of the wall, so stand further off. `up`: look up at it. */
  | { kind: 'look'; text: string; wall?: boolean; up?: boolean }
  | { kind: 'leave' };

/** What's in front of you (or under you, for a clue or the front door). */
export function thingAt(p: Pose, clueHere: boolean, hiddenHere = false): Thing | null {
  const front = ahead(p);
  const hide = HIDDEN_CLUE[p.floor];
  if (hiddenHere && hide && front.x === hide.behind.x && front.y === hide.behind.y) return { kind: 'hide', action: hide.action, text: hide.text };
  const cell = CLUE_CELLS[p.floor];
  if (clueHere && ((p.x === cell.x && p.y === cell.y) || (front.x === cell.x && front.y === cell.y))) return { kind: 'clue' };
  const c = charAt(p.floor, front.x, front.y);
  if (p.floor === 0) {
    if (isPerson(c)) return { kind: 'person', id: `0${c}` };
    const it = place?.things[c];
    return it ? { kind: 'look', text: it.text } : null;
  }
  if (c === 'E') return { kind: 'lift' };
  if (c === 'S') return { kind: 'stairs' };
  // Someone with furniture in front of them is spoken to from the one spot where the two go together (docs/병원_지도.md).
  if (p.floor === 1 && c === 'i' && p.dir !== 2) return { kind: 'look', text: p.dir === 0 ? '층별 안내판의 뒷면이다.' : '안내 데스크 옆이다. 말을 걸려면 앞으로 돌아가야 한다.', wall: p.dir === 0 };
  if (p.floor === 4 && c === 'r' && p.dir !== 2) return { kind: 'look', text: '책상 옆이다. 말을 걸려면 앞으로 돌아가야 한다.' };
  if (p.floor === 1 && c === 'm' && p.dir !== 0) return { kind: 'look', text: '계산대 옆이다. 말을 걸려면 앞으로 돌아가야 한다.' };
  if (isPerson(c)) return { kind: 'person', id: `${p.floor}${c}` };
  if (p.floor === 3 && c === 'q' && p.dir !== 2) return { kind: 'look', text: '데스크 옆이다. 말을 걸려면 앞으로 돌아가야 한다.' };
  if (c === 'N') return { kind: 'look', text: p.floor === 3 ? '간호사 스테이션이다. 간호사는 가운데 데스크에 있다.' : '간호사 스테이션이다. 지금은 아무도 없다.', wall: true };
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

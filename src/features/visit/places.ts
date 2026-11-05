// The remembered places of the doctor's requests (docs/의사의_부탁.md), walked as whoever remembers them. One at a
// time takes the place of "floor 0" (hospitalMap.ts enterPlace). No imports, so scripts/check-visit-logic.mjs can
// run this file directly.
//
// Every place has the same shape of story: someone to meet (k), something happening (the "lost" moment), and
// someone to reach again (j), then back to the hospital.

type Spot = { x: number; y: number; dir: 0 | 1 | 2 | 3 };

/** Tiles on the memory sheet (hospitalArt.ts MEMORY_TILES), by name. */
export type MemoryTile = 'pebbles' | 'water' | 'woods' | 'farBank' | 'rehabFloor' | 'rehabWall' | 'plainWall' | 'ceiling' | 'sand' | 'sea';

export type Place = {
  map: string[];
  /** Out of doors: no ceiling, a thin haze instead of fog, and the walls are a backdrop of `span` cells. */
  outdoors: boolean;
  start: Spot;
  /** In front of k, and in front of j. */
  meet: Spot;
  found: Spot;
  /** Where you are when the moment comes, if not where you were standing. */
  lostAt?: Spot;
  /** Letters you can't walk through: things, and ground only to look at (`spread`, like water, reaches beyond). */
  stops: string;
  spread: string;
  /** What stands on a letter, and what looking at it says. A thing with no `look` is only ground to look at. */
  /** `face`: stood facing that way (0 north … 3 west) instead of turning to you, like the parallel bars along a lane. */
  things: Record<string, { look?: string; text: string; face?: 0 | 1 | 2 | 3 }>;
  ground: MemoryTile;
  /** Ground by letter where it isn't `ground`. */
  groundOn?: Record<string, MemoryTile>;
  wall: MemoryTile;
  /** The south wall, if it's different: across the river, the far bank. */
  southWall?: MemoryTile;
  wallHeight: number;
  /** How many cells one drawing of the wall runs on across (a backdrop); 1 for an ordinary wall. */
  span: number;
  fog: [number, number, number];
  light: number;
  people: { k: { name: string; look: string }; j: { name: string; look: string } };
  /** The goal while meeting k, and while the moment lasts; `lostArrow`: whether the way to j is shown then. */
  meetGoal: string;
  lostGoal: string;
  lostArrow: boolean;
};

export type PlaceId = 'river' | 'rehab' | 'beach';

export const PLACES: Record<PlaceId, Place> = {
  // A summer riverside: C the car, A the tent, R thick bushes (nothing behind them shows), % rocks, ~ the river.
  river: {
    map: [
      '###########',
      '#.C.......#',
      '#.........#',
      '#.A...RRR.#',
      '#.....Rj..#',
      '#..k..R%%.#',
      '#~~~~~~~~~#',
      '#~~~~~~~~~#',
      '#~~~~~~~~~#',
      '###########',
    ],
    outdoors: true,
    start: { x: 1, y: 1, dir: 2 },
    meet: { x: 3, y: 4, dir: 2 },
    found: { x: 8, y: 4, dir: 3 },
    stops: 'CAR%~',
    spread: '~',
    things: {
      C: { look: 'riverCar', text: '타고 온 차다. 트렁크가 열려 있다.' },
      A: { look: 'riverTent', text: '텐트다. 팩을 아직 덜 박았다.' },
      R: { look: 'riverBushes', text: '수풀이 키만큼 빽빽하다. 너머가 보이지 않는다.' },
      '%': { look: 'riverRocks', text: '큰 바위들이다. 그 뒤는 보이지 않는다.' },
      '~': { text: '강물이 얕게 반짝인다. 깊은 데는 저 멀리다.' },
    },
    ground: 'pebbles',
    groundOn: { '~': 'water' },
    wall: 'woods',
    southWall: 'farBank',
    wallHeight: 2.6,
    span: 3,
    fog: [0.8, 0.8, 0.77],
    light: 1.14,
    people: { k: { name: '아이', look: 'riverBoy' }, j: { name: '아이', look: 'riverBoy' } },
    meetGoal: '강가의 아이에게 가기',
    lostGoal: '아이 찾기',
    lostArrow: false,
  },
  // The rehabilitation room on the first day of walking again: P and Q the parallel bars either side of the lane down the
  // middle, S practice stairs, C an exercise bicycle, M a mat on a bench. k is the physiotherapist at the start, j the
  // same one waiting at the far end of the bars.
  rehab: {
    map: [
      '###########',
      '#S...C..M.#',
      '#..PPPPP..#',
      '#........j#',
      '#..QQQQQ..#',
      '#k........#',
      '###########',
    ],
    outdoors: false,
    start: { x: 1, y: 2, dir: 2 },
    meet: { x: 1, y: 4, dir: 2 },
    found: { x: 8, y: 3, dir: 1 },
    lostAt: { x: 4, y: 3, dir: 1 },
    stops: 'SCMPQ',
    spread: '',
    things: {
      P: { look: 'rehabBars', text: '평행봉이다. 손때가 반들반들하다.', face: 2 },
      Q: { look: 'rehabBars', text: '평행봉이다. 손때가 반들반들하다.', face: 0 },
      S: { look: 'rehabStairs', text: '연습용 계단이다. 아직은 저기까지 못 간다.' },
      C: { look: 'rehabBike', text: '실내 자전거다. 페달이 무거워 보인다.' },
      M: { look: 'rehabMat', text: '매트가 개켜져 있다. 넘어지면 저기 눕는 걸까.' },
    },
    ground: 'rehabFloor',
    wall: 'plainWall',
    southWall: 'rehabWall',
    wallHeight: 1.25,
    span: 1,
    fog: [0.26, 0.25, 0.23],
    light: 1.1,
    people: { k: { name: '물리치료사', look: 'physio' }, j: { name: '물리치료사', look: 'physio' } },
    meetGoal: '물리치료사에게 가기',
    lostGoal: '평행봉 끝까지 걷기',
    lostArrow: true,
  },
  // A summer beach, a mother and her grown-up daughter: U the umbrella, B a bench, K a closed snack kiosk (she's found
  // behind it), O a rowboat on the sand, ~ the sea.
  beach: {
    map: [
      '###########',
      '#..U......#',
      '#..k......#',
      '#.........#',
      '#.B.....Kj#',
      '#......O..#',
      '#~~~~~~~~~#',
      '#~~~~~~~~~#',
      '###########',
    ],
    outdoors: true,
    start: { x: 1, y: 3, dir: 1 },
    meet: { x: 3, y: 3, dir: 0 },
    found: { x: 9, y: 3, dir: 2 },
    lostAt: { x: 3, y: 3, dir: 0 },
    stops: 'UBKO~',
    spread: '~',
    things: {
      U: { look: 'beachUmbrella', text: '파라솔이다. 그늘이 아직 따뜻하다.' },
      B: { look: 'beachBench', text: '나무 벤치다. 모래가 잔뜩 묻어 있다.' },
      K: { look: 'beachKiosk', text: '문 닫은 매점이다. 그 뒤가 보이지 않는다.' },
      O: { look: 'beachBoat', text: '모래에 끌어올린 나룻배다.' },
      '~': { text: '파도가 발치까지 왔다가 돌아간다.' },
    },
    ground: 'sand',
    groundOn: { '~': 'water' },
    wall: 'woods',
    southWall: 'sea',
    wallHeight: 2.6,
    span: 3,
    fog: [0.84, 0.84, 0.82],
    light: 1.16,
    people: { k: { name: '엄마', look: 'mother' }, j: { name: '엄마', look: 'mother' } },
    meetGoal: '파라솔 밑의 엄마에게 가기',
    lostGoal: '엄마 찾기',
    lostArrow: false,
  },
};

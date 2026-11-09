// The remembered places of the doctor's requests (docs/의사의_부탁.md), walked as whoever remembers them. One at a
// time takes the place of "floor 0" (hospitalMap.ts enterPlace). No imports, so scripts/check-visit-logic.mjs can
// run this file directly.
//
// Every place has the same shape of story: someone to meet (k), something happening (the "lost" moment), and
// someone to reach again (j), then back to the hospital.

type Spot = { x: number; y: number; dir: 0 | 1 | 2 | 3 };

/** Tiles on the memory sheet (hospitalArt.ts MEMORY_TILES), by name. */
export type MemoryTile = 'pebbles' | 'water' | 'woods' | 'farBank' | 'rehabFloor' | 'rehabWall' | 'plainWall' | 'ceiling' | 'sand' | 'sea' | 'paving' | 'marketStreet' | 'yardDirt' | 'yardWall' | 'asphalt' | 'nightAlley';

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
  /** v0.85: the sky over it (hospitalArt.ts SKY_STRIP), out of doors by day; none at night. */
  sky?: 'summer' | 'autumn' | 'dusk';
  /** v0.85: how many times its ground drawing goes across one cell, where once makes the stones or the footprints too big. */
  groundScale?: number;
  /** Out of doors but with the full fog, not a haze: at night. */
  thickFog?: boolean;
  light: number;
  people: { k: { name: string; look: string }; j: { name: string; look: string } };
  /** The goal while meeting k, and while the moment lasts; `lostArrow`: whether the way to j is shown then. */
  meetGoal: string;
  lostGoal: string;
  lostArrow: boolean;
};

export type PlaceId = 'river' | 'rehab' | 'beach' | 'market' | 'yard' | 'night';

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
    groundScale: 2, // v0.91: once across a cell, each pebble was the size of a person (3 made a frame too slow to draw)
    groundOn: { '~': 'water' },
    wall: 'woods',
    southWall: 'farBank',
    wallHeight: 2.6,
    span: 3,
    fog: [0.8, 0.8, 0.77],
    sky: 'summer',
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
    sky: 'summer',
    groundScale: 2,
    light: 1.16,
    people: { k: { name: '엄마', look: 'mother' }, j: { name: '엄마', look: 'mother' } },
    meetGoal: '파라솔 밑의 엄마에게 가기',
    lostGoal: '엄마 찾기',
    lostArrow: false,
  },
  // An old market at dusk, years ago: S your own fruit stall, F a vegetable stall, T rice cakes, X stacked crates (the child who
  // comes every day is behind them).
  market: {
    map: [
      '###########',
      '#..F..T...#',
      '#.........#',
      '#.S.k.....#',
      '#.........#',
      '#......XXj#',
      '###########',
    ],
    outdoors: true,
    start: { x: 3, y: 4, dir: 0 },
    meet: { x: 3, y: 3, dir: 1 },
    found: { x: 9, y: 4, dir: 2 },
    // facing down the market, the way round: where she stood still blocks the row
    lostAt: { x: 3, y: 3, dir: 2 },
    stops: 'SFTX',
    spread: '',
    things: {
      S: { look: 'fruitStall', text: '내 과일 좌판이다. 귤이 오늘도 그대로다.' },
      F: { look: 'vegStall', text: '건너편 채소 가게다. 저기도 한산하다.' },
      T: { look: 'riceCakes', text: '떡집 좌판이다. 떡이 굳어 간다.' },
      X: { look: 'marketCrates', text: '빈 과일 상자가 키보다 높이 쌓여 있다.' },
    },
    ground: 'paving',
    wall: 'marketStreet',
    wallHeight: 2.6,
    span: 3,
    fog: [0.62, 0.58, 0.52],
    sky: 'dusk',
    groundScale: 2,
    light: 1.04,
    people: { k: { name: '옆 가게 아주머니', look: 'stallKeeper' }, j: { name: '꼬마', look: 'marketKid' } },
    meetGoal: '옆 가게 아주머니에게 가기',
    lostGoal: '시장 한 바퀴 돌기',
    lostArrow: false,
  },
  // An autumn yard of an old house: M the veranda, P a persimmon tree, B the low table with the janggi board, G the gate
  // (the grandson comes back through it).
  yard: {
    map: [
      '###########',
      '#.M....P..#',
      '#.........#',
      '#..Bk.....#',
      '#.........#',
      '#.......Gj#',
      '###########',
    ],
    outdoors: true,
    start: { x: 2, y: 2, dir: 1 },
    meet: { x: 4, y: 2, dir: 2 },
    found: { x: 9, y: 4, dir: 2 },
    lostAt: { x: 4, y: 2, dir: 1 },
    stops: 'MPBG',
    spread: '',
    things: {
      M: { look: 'maru', text: '마루다. 볕이 들어 따뜻하다.' },
      P: { look: 'persimmonTree', text: '감나무다. 감이 몇 개 남아 있다.' },
      B: { look: 'janggiTable', text: '장기판이다. 판이 두다 만 그대로다.' },
      G: { look: 'yardGate', text: '나무 대문이다. 조금 열려 있다.' },
    },
    ground: 'yardDirt',
    wall: 'yardWall',
    wallHeight: 2.6,
    span: 3,
    fog: [0.78, 0.76, 0.72],
    sky: 'autumn',
    groundScale: 2,
    light: 1.12,
    people: { k: { name: '손주', look: 'grandson' }, j: { name: '손주', look: 'grandson' } },
    meetGoal: '장기판 앞에 앉기',
    lostGoal: '마당 둘러보기',
    lostArrow: false,
  },
  // A night alley to the postbox: L streetlamps, P the postbox, W low stone walls with a pot on top. k is the husband at the front door, j the same man,
  // who took the short way and got there first.
  night: {
    map: [
      '###########',
      '#.....L.W.#',
      '#k........#',
      '#.........#',
      '#..L....j.#',
      '#....W...P#',
      '###########',
    ],
    outdoors: true,
    thickFog: true,
    start: { x: 3, y: 2, dir: 3 },
    meet: { x: 2, y: 2, dir: 3 },
    found: { x: 9, y: 4, dir: 3 },
    lostAt: { x: 2, y: 2, dir: 1 },
    stops: 'LPW',
    spread: '',
    things: {
      L: { look: 'streetLamp', text: '가로등이다. 불빛 아래만 환하다.' },
      P: { look: 'postbox', text: '우체통이다. 편지 넣는 구멍이 생각보다 좁다.' },
      W: { look: 'stoneWall', text: '화분을 얹은 돌담이다. 누가 매일 물을 주나 보다.' },
    },
    ground: 'asphalt',
    wall: 'nightAlley',
    wallHeight: 2.6,
    span: 3,
    fog: [0.11, 0.11, 0.14],
    light: 0.98,
    people: { k: { name: '남편', look: 'husband' }, j: { name: '남편', look: 'husband' } },
    meetGoal: '현관의 남편에게 가기',
    lostGoal: '우체통까지 걷기',
    lostArrow: true,
  },
};

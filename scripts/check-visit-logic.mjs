// Plain assertions on the 병문안 rules: the ending table, keyword finding, the crisis check. Runs the
// TypeScript directly (Node strips types); first step of `npm run verify` after the architecture check.
import assert from 'node:assert/strict';
import { CLUES, clueOn, dayInRun, endingFor, girlAppearsIn, dayNumber, happyUnlocked, REQUEST_DAYS } from '../src/features/visit/progress.ts';
import { doctorTalk, personTalk, requestGoal, REQUESTS } from '../src/features/visit/requests.ts';
import { PLACES } from '../src/features/visit/places.ts';
import { findKeyword, validateKeyword } from '../src/features/visit/keyword.ts';
import { soundsLikeCrisis } from '../src/features/visit/safety.ts';
import { GIRL_DAYS, girlOn, PIN_ON } from '../src/features/visit/girlDays.ts';
import { ON_THE_WALLS, ALONG_THE_WALLS, arrival, arrowFor, charAt, canStand, CLUE_CELLS, ENTRANCE, FLOOR_ORDER, BEDSIDE, firstStep, goalFor, HOSPITAL, pathTo, LIFT_FRONT, OUTSIDE_ROOM, enterPlace, SHOP_FRONT, STAIRS_FRONT, stepped, thingAt, turn, tutorialAfter, tutorialGoal } from '../src/features/visit/hospitalMap.ts';

// docs/계획서.md
// the first walk in moves on by what you've done, only forward, and can't strand you
{
  const at = { moved: false, facing: null, talkingTo: null, floor: 1, bought: false, atBedside: false, doneToday: false };
  assert.equal(tutorialAfter('walk', at), 'walk');
  assert.equal(tutorialAfter('walk', { ...at, moved: true }), 'goal');
  assert.equal(tutorialAfter('goal', { ...at, moved: true, facing: '1i' }), 'talk');
  assert.equal(tutorialAfter('talk', { ...at, talkingTo: '1i' }), 'back');
  assert.equal(tutorialAfter('back', { ...at, talkingTo: '1i' }), 'back');
  assert.equal(tutorialAfter('back', at), 'shop');
  assert.equal(tutorialAfter('shop', { ...at, facing: '1m' }), 'buy');
  assert.equal(tutorialAfter('buy', { ...at, talkingTo: '1m', bought: true }), 'shopBack');
  assert.equal(tutorialAfter('shopBack', { ...at, bought: true }), 'lift');
  assert.equal(tutorialAfter('lift', at), 'lift'); // the next day's shop doesn't send you back
  assert.equal(tutorialAfter('lift', { ...at, floor: 4 }), 'room');
  assert.equal(tutorialAfter('room', { ...at, atBedside: true }), 'inRoom');
  assert.equal(tutorialAfter('inRoom', at), 'inRoom');
  assert.equal(tutorialAfter('inRoom', { ...at, doneToday: true }), 'day');
  assert.equal(tutorialAfter('day', at), 'day');
  assert.equal(tutorialAfter('done', { ...at, moved: true, floor: 4 }), 'done');
  // go your own way and it catches up
  assert.equal(tutorialAfter('walk', { ...at, floor: 4 }), 'room');
  assert.equal(tutorialAfter('goal', { ...at, bought: true }), 'lift');
  assert.equal(tutorialAfter('talk', { ...at, atBedside: true }), 'inRoom');
  assert.equal(tutorialGoal('walk').face, 2);
  assert.equal(tutorialGoal('shop').cell, SHOP_FRONT);
  assert.equal(tutorialGoal('lift'), null);
  assert.deepEqual(thingAt({ floor: 1, x: 5, y: 5, dir: 2 }, false), { kind: 'person', id: '1i' });
  // the guide and the shopkeeper only from the front, where they and their furniture go together
  assert.equal(thingAt({ floor: 1, x: 4, y: 6, dir: 1 }, false).kind, 'look');
  assert.equal(thingAt({ floor: 1, x: 6, y: 6, dir: 3 }, false).kind, 'look');
  assert.deepEqual(thingAt({ floor: 1, x: 10, y: 2, dir: 0 }, false), { kind: 'person', id: '1m' });
  assert.equal(thingAt({ floor: 1, x: 9, y: 1, dir: 1 }, false).kind, 'look');
  assert.ok(canStand(4, 11, 1) && canStand(4, 12, 2) && !canStand(4, 11, 2)); // the sofa on her floor leaves the room and its clue open
}

// nothing stands against a door, or on anywhere but floor
for (const floor of FLOOR_ORDER) {
  for (const [x, y, look, across, along] of ALONG_THE_WALLS[floor]) {
    const where = `${floor}층 ${x},${y} ${look}`;
    assert.ok(!'#=%NTES&^'.includes(charAt(floor, x, y)), where);
    if (along !== 0) assert.equal(charAt(floor, x, y + Math.sign(along)), '#', `${where}: 벽이어야 함`);
    if (across !== 0) assert.equal(charAt(floor, x + Math.sign(across), y), '#', `${where}: 벽이어야 함`);
  }
}

// what hangs on the walls hangs on a plain wall, seen from somewhere you can stand: not a door, and not where a floor
// number or a window is drawn (hospitalScene.ts buildFloor)
const SOUTH_WINDOW_ROW = { 1: 6, 2: 7, 3: 7 };
for (const floor of FLOOR_ORDER) {
  const used = new Set();
  for (const [x, y, look, d] of ON_THE_WALLS[floor]) {
    const where = `${floor}층 ${x},${y} ${look}`;
    assert.ok(canStand(floor, x, y), `${where}: 설 수 있는 칸`);
    const dx = [0, 1, 0, -1][d];
    const dy = [-1, 0, 1, 0][d];
    assert.equal(charAt(floor, x + dx, y + dy), '#', `${where}: 벽이어야 함`);
    assert.ok(!(x === 4 && y === 4 && d === 2) && !(((x === 4 || x === 6) && y === 2) && d % 2 === 1), `${where}: 층 번호 자리`);
    assert.ok(!(floor < 4 && x === 13 && y === SOUTH_WINDOW_ROW[floor] && d === 2) && charAt(floor, x, y) !== 'W', `${where}: 창 자리`);
    assert.ok(!ALONG_THE_WALLS[floor].some(([ax, ay, , across, along]) => ax === x && ay === y && ((d === 0 && along < 0) || (d === 2 && along > 0) || (d === 1 && across > 0) || (d === 3 && across < 0))), `${where}: 의자나 화분과 겹침`);
    assert.ok(!used.has(`${x},${y},${d}`), `${where}: 한 벽에 하나`);
    used.add(`${x},${y},${d}`);
  }
}

// after her room, the doctor's room comes before the shop; the tutorial then tells you about going on to the next day
assert.equal(goalFor({ doneToday: true, boughtToday: false, clueToFind: null, metDoctor: false }).text, '4층 의사 선생님의 방에 가기');
assert.equal(goalFor({ doneToday: true, boughtToday: false, clueToFind: null, metDoctor: true }).text, '1층 매점에서 선물 고르기');
assert.equal(goalFor({ doneToday: true, boughtToday: false, clueToFind: { floor: 1, name: '개목걸이' }, metDoctor: true }).text, '1층에서 개목걸이 찾기');
const afterRoom = { moved: true, facing: null, talkingTo: null, floor: 4, bought: true, atBedside: false, doneToday: true };
assert.equal(tutorialAfter('day', { ...afterRoom, metDoctor: false }), 'day');
assert.equal(tutorialAfter('day', { ...afterRoom, metDoctor: true, talkingTo: '4r' }), 'day');
assert.equal(tutorialAfter('day', { ...afterRoom, metDoctor: true }), 'nextDay');
assert.equal(thingAt({ floor: 4, x: 12, y: 7, dir: 2 }, false).kind, 'person');
assert.equal(thingAt({ floor: 4, x: 11, y: 8, dir: 1 }, false).kind, 'look');

assert.equal(endingFor([]), 'bad');
assert.equal(endingFor([1, 2, 3]), 'bad'); // away 4 days, missed the last
assert.equal(endingFor([1, 7]), 'withGirl'); // away 5 days, came on the last
assert.equal(endingFor([1, 2, 3, 7]), 'normal'); // away 3 days, came on the last
assert.equal(endingFor([1, 2, 3, 4, 5, 6, 7]), 'normal');
assert.equal(endingFor([1, 2, 3, 4]), 'letter'); // away 3 days, missed the last
assert.equal(endingFor([1, 2, 3, 4, 5, 6]), 'letter');
assert.equal(endingFor([1, 1, 1, 2, 3]), 'bad'); // repeat visits to one day count once
assert.equal(endingFor([0, 8, 9, 10]), 'bad'); // out-of-range days don't count
assert.equal(girlAppearsIn('bad'), false);
assert.equal(girlAppearsIn('letter'), false);
assert.equal(girlAppearsIn('withGirl'), true);
assert.equal(girlAppearsIn('normal'), true);
assert.equal(dayNumber(0), 1);
assert.equal(dayNumber(6), 7);
assert.equal(dayNumber(-3), 1);

assert.equal(dayInRun(1, 3, 0), 4); // first run: the calendar
assert.equal(dayInRun(1, 3, 1), 5);
assert.equal(dayInRun(2, 30, 0), 1); // later runs: real days away change nothing
assert.equal(dayInRun(2, 30, 2), 3);

// One clue per floor, at most one a day, and the last early enough to show her on a later visit.
assert.equal(new Set(CLUES.map((c) => c.floor)).size, 4);
assert.equal(new Set(CLUES.map((c) => c.day)).size, CLUES.length);
assert.ok(CLUES.every((c) => c.day <= 6));
assert.equal(clueOn(1, 1)?.id, 'collar');
assert.equal(clueOn(3, 3)?.id, 'snack');
assert.equal(clueOn(2, 3), null);
assert.equal(clueOn(5, 1)?.id, 'collar', 'a clue stays out after its day until found');
assert.equal(goalFor({ doneToday: true, boughtToday: true, clueToFind: null, metDoctor: true, somethingOfHers: 2 }).text, '2층 어딘가에서 그 아이의 물건 찾기');
{
  const way = pathTo(1, ENTRANCE, SHOP_FRONT);
  assert.deepEqual(way[way.length - 1], SHOP_FRONT);
  assert.ok(way.every((c) => canStand(1, c.x, c.y)));
  assert.deepEqual(pathTo(1, SHOP_FRONT, SHOP_FRONT), []);
}
const allClues = CLUES.map((c) => c.id);
// the happy ending: the doctor's requests, every one; the clues no longer count
assert.deepEqual([...REQUEST_DAYS], REQUESTS.map((r) => r.day));
assert.equal(happyUnlocked([]), false);
assert.equal(happyUnlocked(REQUEST_DAYS), true);
void allClues;
// every request's conversations lead somewhere real, can be settled, and are taken on at the doctor's
for (const r of REQUESTS) {
  for (const talk of [r.doctor, r.person, r.memory.meet, r.memory.found]) {
    assert.ok(talk.start, `${r.day}일 부탁: start`);
    for (const [name, node] of Object.entries(talk)) {
      for (const next of [...(node.choices ?? []).map((c) => c.to), ...(node.then ? [node.then] : [])]) assert.ok(talk[next], `${r.day}일 부탁 ${name} → ${next}`);
      assert.ok(!(node.effect === 'breathe' && !node.then), `${r.day}일 부탁 ${name}: 숨 고르기 뒤`);
    }
  }
  assert.ok(Object.values(r.doctor).some((n) => n.effect === 'accept'));
  assert.ok(Object.values(r.person).some((n) => n.effect === 'solve'));
  assert.ok(Object.values(r.person).some((n) => n.effect === 'breathe'));
  assert.ok(Object.values(r.person).some((n) => n.effect === 'memory') && r.person.again, `${r.day}일 부탁: 기억으로 갔다가 again으로`);
  assert.ok(Object.values(r.memory.meet).some((n) => n.effect === 'lose'));
  assert.ok(Object.values(r.memory.found).some((n) => n.effect === 'return'));
  const [floor, letter] = [Number(r.who[0]), r.who[1]];
  assert.equal(charAt(floor, r.goal.cell.x + [0, 1, 0, -1][r.goal.face], r.goal.cell.y + [-1, 0, 1, 0][r.goal.face]), letter, `${r.day}일 부탁: 목표 앞에 그 사람`);
  assert.ok(canStand(floor, r.goal.cell.x, r.goal.cell.y));
}
// every remembered place: from the start to whoever you meet, from where the moment comes to whoever you reach,
// every thing letter described, and every request's place a real one
for (const [id, p] of Object.entries(PLACES)) {
  enterPlace(p);
  const at = (s) => ({ floor: 0, ...s });
  assert.ok(p.map.every((r) => r.length === p.map[0].length), `${id}: 너비`);
  assert.equal(thingAt(at(p.meet), false)?.id, '0k', `${id}: 만나는 사람 앞`);
  assert.equal(thingAt(at(p.found), false)?.id, '0j', `${id}: 다시 찾는 사람 앞`);
  assert.ok(firstStep(0, p.start, p.meet) !== null || (p.start.x === p.meet.x && p.start.y === p.meet.y), `${id}: 시작에서 만남까지`);
  const from = p.lostAt ?? p.meet;
  assert.ok(firstStep(0, from, p.found) !== null, `${id}: 사건 뒤 다시 찾기까지`);
  // right after the moment you can step the way you're facing, or you're looking at the empty place where k was
  if (p.lostAt) assert.ok(stepped(at(p.lostAt)) !== null || thingAt(at(p.lostAt), false)?.id === '0k', `${id}: 사건 직후 앞으로 걷거나 빈자리를 봄`);
  for (const c of p.stops + p.spread) assert.ok(p.things[c], `${id}: ${c} 설명`);
}
for (const r of REQUESTS) assert.ok(PLACES[r.memory.place], `${r.day}일 부탁의 장소`);
enterPlace(PLACES.river);
assert.ok(!canStand(0, 3, 6), 'the river is only to look at');
assert.equal(doctorTalk(1, [], []), REQUESTS[0].doctor);
assert.ok(doctorTalk(1, [1], [])['start'].lines[0].includes('만나 보셨어요'));
assert.equal(personTalk('3b', [], []), null);
assert.equal(personTalk('3b', [1], []), REQUESTS[0].person);
assert.deepEqual(personTalk('3b', [1], [1]).start.lines, REQUESTS[0].after);
assert.equal(requestGoal([1], []).text, '3층 지친 보호자와 이야기하기');
assert.equal(requestGoal([1], [1]), null);
assert.equal(goalFor({ doneToday: true, boughtToday: false, clueToFind: null, metDoctor: true, request: requestGoal([1], []) }).text, '3층 지친 보호자와 이야기하기');
assert.equal(girlAppearsIn('happy'), true);

for (const [text, want] of [
  ['오늘 회사에서 팀장님이 지적했어', '회사'],
  ['엄마랑 또 싸웠어', '엄마'],
  ['남자친구랑 헤어졌어', '남자친구'],
  ['강아지 산책시키다가 넘어졌어', null],
  ['아무도 내 얘기를 안 들어줘', '얘기'],
  ['오랜만에 하늘이 예뻐', '하늘'],
  ['그냥 그랬어', null],
  ['몰라', null],
]) assert.equal(findKeyword(text), want, text);
assert.equal(validateKeyword('보고서', '내 보고서를'), '보고서');
assert.equal(validateKeyword('시험', '내 보고서를'), null); // not in the text: never said back
assert.equal(validateKeyword('죽음', '죽음이 뭘까'), null);

for (const t of ['죽고 싶어', '다 포기하고 싶어', '약을 모아 뒀어. 오늘 밤에 먹을까 해.', '이제 그만 살래', '나 같은 건 없어도 돼']) {
  assert.ok(soundsLikeCrisis(t), t);
}
for (const t of ['감기약 먹고 일찍 잤어', '죽을 끓여 먹었어', '배고파 죽겠어', '약속이 취소됐어', '일을 그만두고 싶어']) {
  assert.ok(!soundsLikeCrisis(t), t);
}
// The hospital: one building, and nothing you need ever walled off.
for (const f of FLOOR_ORDER) {
  const { map } = HOSPITAL[f];
  assert.ok(map.every((r) => r.length === 15), `${f}층 너비`);
  assert.equal(map[1][4], 'E');
  assert.equal(map[1][6], 'S');
  assert.ok(canStand(f, LIFT_FRONT.x, LIFT_FRONT.y) && canStand(f, STAIRS_FRONT.x, STAIRS_FRONT.y));
  assert.ok(canStand(f, CLUE_CELLS[f].x, CLUE_CELLS[f].y), `${f}층 단서`);
  // everyone can be talked to from somewhere you can stand
  map.forEach((row, y) => [...row].forEach((c, x) => {
    if (!/[a-z]/.test(c)) return;
    assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => canStand(f, x + dx, y + dy)), `${f}층 ${c}`);
  }));
}
assert.ok(canStand(1, ENTRANCE.x, ENTRANCE.y));
assert.ok(canStand(4, OUTSIDE_ROOM.x, OUTSIDE_ROOM.y));
assert.ok(canStand(1, SHOP_FRONT.x, SHOP_FRONT.y));
assert.ok(!canStand(4, 1, 1)); // behind a locked door
assert.equal(stepped({ floor: 1, x: 4, y: 2, dir: 0 }), null); // the lift itself isn't floor
assert.deepEqual(stepped({ floor: 1, x: 0, y: 4, dir: 1 }), { floor: 1, x: 1, y: 4, dir: 1 });
assert.equal(turn(0, -1), 3);
assert.equal(turn(3, 1), 0);
assert.equal(thingAt({ floor: 1, x: 4, y: 2, dir: 0 }, false).kind, 'lift');
assert.equal(thingAt({ floor: 1, x: 6, y: 2, dir: 0 }, false).kind, 'stairs');
assert.equal(thingAt(BEDSIDE, false).id, '4g'); // she's a person in her room like anyone else
assert.ok(!canStand(4, 6, 7)); // the bed takes the room: you stand at its foot
assert.equal(thingAt({ floor: 3, x: 1, y: 4, dir: 2 }, false).kind, 'look'); // the gurney
assert.equal(thingAt({ floor: 1, x: 10, y: 2, dir: 0 }, false).id, '1m');
assert.equal(thingAt({ floor: 1, x: 13, y: 1, dir: 0 }, true).kind, 'clue');
assert.equal(thingAt({ floor: 1, x: 13, y: 1, dir: 0 }, false), null);
assert.equal(thingAt(ENTRANCE, false).kind, 'leave');
assert.equal(thingAt(OUTSIDE_ROOM, false), null); // the front door is on the first floor only
assert.match(thingAt({ floor: 3, x: 1, y: 4, dir: 0 }, false).text, /병실/);

// The goal's arrow: to the lift from another floor, to the door on hers, round whatever's in the way.
const toRoom = goalFor({ doneToday: false, boughtToday: false, clueToFind: null });
assert.equal(toRoom.floor, 4);
assert.equal(arrowFor(ENTRANCE, toRoom), 0); // straight on along the lobby
assert.equal(arrowFor({ floor: 1, x: 4, y: 4, dir: 1 }, toRoom), 3); // left, up to the lift
assert.equal(arrowFor({ floor: 1, x: 4, y: 2, dir: 2 }, toRoom), 2); // at the lift, facing away: turn round
assert.equal(arrowFor({ floor: 1, x: 4, y: 2, dir: 0 }, toRoom), null); // facing it: nothing more to point at
assert.equal(arrowFor(arrival(4, LIFT_FRONT), toRoom), 0);
assert.equal(arrowFor({ floor: 4, x: 7, y: 4, dir: 2 }, toRoom), 0); // the door, straight ahead
assert.equal(arrowFor({ floor: 4, x: 7, y: 5, dir: 2 }, toRoom), null); // through it
// She turns toward you and sinks lower, every day closer, never the other way.
for (let d = 2; d <= 7; d++) {
  if (d > 2) assert.ok(GIRL_DAYS[d].away < GIRL_DAYS[d - 1].away, `${d}일째 거리`); // sitting up she's further off than lying down
  if (d > 2) assert.ok(GIRL_DAYS[d].up <= GIRL_DAYS[d - 1].up, `${d}일째 자세`); // the first day she's lying down, then sits up
}
assert.equal(girlOn(8), GIRL_DAYS[7]); // an ending after the week
assert.ok(!PIN_ON[GIRL_DAYS[2].headTo] && PIN_ON[GIRL_DAYS[3].headTo]); // the pin comes with the third day's hair
assert.equal(firstStep(3, { x: 1, y: 4 }, { x: 1, y: 7 }), 1); // the gurney: the long way round
assert.equal(goalFor({ doneToday: true, boughtToday: false, clueToFind: null }).text, '1층 매점에서 선물 고르기');
assert.equal(goalFor({ doneToday: true, boughtToday: true, clueToFind: null }).text, '1층 정문으로 나가기');
assert.deepEqual(goalFor({ doneToday: true, boughtToday: true, clueToFind: null }).cell, ENTRANCE && { x: ENTRANCE.x, y: ENTRANCE.y });
// the guide stands against the lobby's south wall, spoken to from the one cell in front of the desk
assert.equal(charAt(1, 5, 7), '#');
assert.equal(thingAt({ floor: 1, x: 5, y: 5, dir: 2 }, false).id, '1i');
const findIt = goalFor({ doneToday: true, boughtToday: false, clueToFind: { floor: 2, name: '운동화 끈' } });
assert.equal(arrowFor(arrival(2, LIFT_FRONT), findIt), null); // on the floor it's up to you
console.log('✓ visit logic: endings, keywords, crisis check, hospital map');

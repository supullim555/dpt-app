// Plain assertions on the 병문안 rules: the ending table, keyword finding, the crisis check. Runs the
// TypeScript directly (Node strips types); first step of `npm run verify` after the architecture check.
import assert from 'node:assert/strict';
import { CLUES, clueOn, dayInRun, endingFor, girlAppearsIn, dayNumber, happyUnlocked } from '../src/features/visit/progress.ts';
import { findKeyword, validateKeyword } from '../src/features/visit/keyword.ts';
import { soundsLikeCrisis } from '../src/features/visit/safety.ts';
import { GIRL_DAYS, girlOn, PIN_ON } from '../src/features/visit/girlDays.ts';
import { arrival, arrowFor, canStand, CLUE_CELLS, ENTRANCE, FLOOR_ORDER, BEDSIDE, firstStep, goalFor, HOSPITAL, LIFT_FRONT, OUTSIDE_ROOM, SHOP_FRONT, STAIRS_FRONT, stepped, thingAt, turn, tutorialAfter, tutorialGoal } from '../src/features/visit/hospitalMap.ts';

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
  assert.deepEqual(thingAt({ floor: 1, x: 5, y: 4, dir: 2 }, false), { kind: 'person', id: '1i' });
}

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
const allClues = CLUES.map((c) => c.id);
assert.equal(happyUnlocked(1, allClues), false); // not before a first ending
assert.equal(happyUnlocked(2, allClues), true);
assert.equal(happyUnlocked(2, allClues.slice(1)), false);
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
assert.equal(goalFor({ doneToday: true, boughtToday: true, clueToFind: null }), null);
const findIt = goalFor({ doneToday: true, boughtToday: false, clueToFind: { floor: 2, name: '운동화 끈' } });
assert.equal(arrowFor(arrival(2, LIFT_FRONT), findIt), null); // on the floor it's up to you
console.log('✓ visit logic: endings, keywords, crisis check, hospital map');

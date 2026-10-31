// Plain assertions on the 병문안 rules: the ending table, keyword finding, the crisis check. Runs the
// TypeScript directly (Node strips types); first step of `npm run verify` after the architecture check.
import assert from 'node:assert/strict';
import { CLUES, clueOn, dayInRun, endingFor, girlAppearsIn, dayNumber, happyUnlocked } from '../src/features/visit/progress.ts';
import { findKeyword, validateKeyword } from '../src/features/visit/keyword.ts';
import { soundsLikeCrisis } from '../src/features/visit/safety.ts';

// docs/계획서.md
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
console.log('✓ visit logic: endings, keywords, crisis check');

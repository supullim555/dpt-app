// The core-flow regression check: intro → gate (first question within 10s) → daily check-in
// (tap-first) → quest widget
// (collapse/expand, start an exercise, complete it) → AI chat entry → memo tab shows the record
// → reload through the gate's full breathing flow (no skip) → 숨 고르기 loop.
// Built on scripts/lib/uitest.js (§31) so this is the one script to run — locally against a
// freshly built `dist` or directly against the live URL — before treating any change as done,
// instead of writing a one-off CDP script per feature and losing it in a scratchpad at the end
// of the session.
//
//   node scripts/check-core-flow.js                          -> http://localhost:8098
//   node scripts/check-core-flow.js http://localhost:PORT
//   node scripts/check-core-flow.js https://dpt-app-green.vercel.app
//
// Screenshots land in scripts/.check-shots/ (gitignored) for diagnosing a BAD line.
const path = require('path');
const fs = require('fs');
const { withBrowser } = require('./lib/uitest');

const BASE = process.argv[2] || 'http://localhost:8098';
const SHOT_DIR = path.join(__dirname, '.check-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Must match src/features/home/HomeScreen.tsx's DAILY_QUESTIONS and the greeting lines in GREETINGS —
// not imported from there since this runs as plain Node against a built bundle, not TS source.
const GREETINGS = [
  '아침이네요. 지금 마음은 어때요?',
  '오늘 하루 어떻게 흘러가고 있나요?',
  '수고 많았어요. 잠깐 마음을 돌아볼까요?',
  '이 시간까지 깨어있네요. 무리하지 말아요.',
];
const DAILY_QUESTIONS = ['오늘 하루는 어땠나요?', '그중에서 가장 기억에 남는 순간이 있다면요?'];

// src/features/dialogue/DialogueExercise.tsx's submit button reads '넘어가기' while the box is
// empty, then '다음' — or '완료' on the last question — once something is typed.
const submitLabel = (index, total) => (index < total - 1 ? '다음' : '완료');

// answers[i] === null passes the question over with '넘어가기' instead of typing.
async function answerDialogue(t, questions, answers) {
  for (let i = 0; i < questions.length; i++) {
    await t.waitText(questions[i], 4000);
    if (answers[i] === null) {
      await t.clickText('넘어가기');
    } else {
      await t.fillTextarea(answers[i]);
      await sleep(200);
      await t.clickText(submitLabel(i, questions.length));
    }
    await sleep(600);
  }
}

async function main() {
  const { passed } = await withBrowser(
    BASE,
    async (t) => {
      // v0.28 entrance (§2 SG1: "열고 10초 안에 첫 질문"): one disclaimer tap, then the gate's
      // feeling question — no login screen, no AI choice, no breathing first.
      const t0 = Date.now();
      await t.waitText('시작하기 전에', 12000);
      t.note('첫 화면에 로그인 화면 없음', !(await t.hasText('게스트로 시작')));
      await t.clickText('시작하기');
      const reached = await t.waitText('지금 마음에 가까운 말이 있다면?', 10000);
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      t.note(`열고 첫 질문까지 ${secs}초 (10초 이내)`, reached && Date.now() - t0 < 10000);
      // v0.29: 일차정서 (six families) first; their 이차정서 only after one is tapped
      let familiesShown = true;
      for (const fam of ['분노', '슬픔', '두려움', '기쁨', '자신감', '평온']) familiesShown = familiesShown && (await t.hasText(fam));
      t.note('감정: 일차정서 6개가 먼저 보임', familiesShown);
      t.note('감정: 이차정서는 아직 안 보임 (억울함 없음)', !(await t.hasText('억울함')));
      await t.clickText('슬픔');
      await sleep(400);
      t.note('감정: 슬픔을 누르면 이차정서(서운함·외로움)와 "그냥 슬픔"', (await t.hasText('서운함')) && (await t.hasText('외로움')) && (await t.hasText('그냥 슬픔')));
      await t.shot('00b_gate_secondary.png');
      await t.clickText('‹ 다른 감정');
      await sleep(400);
      t.note('감정: "‹ 다른 감정"으로 일차정서로 돌아감', (await t.hasText('분노')) && !(await t.hasText('서운함')));
      await t.shot('00_gate_first_question.png');
      await t.clickText('건너뛰기');
      await sleep(1200);

      // '이름 붙이기' is the label QuestWidget shows under the externalization-interview button.
      const EXERCISE_LABEL = '이름 붙이기';
      t.note('하단 탭에 상점·이야기 탭 없음', !(await t.hasText('상점')) && !(await t.hasText('이야기')));
      t.note('홈에 코인·상태 배지 없음', !(await t.hasText('📊 상태')) && !(await t.hasText('🪙')));
      t.note('체크인 대화 중엔 퀘스트 위젯 숨김 (버튼 라벨 안 보임)', !(await t.hasText(EXERCISE_LABEL)));

      // daily check-in: greeting → Q1 answered by a tap → Q2 optional typing
      await t.tapAnyOf(GREETINGS);
      await sleep(500);
      t.note('체크인 첫 질문이 선택지로 나옴 (지쳤어요)', await t.waitText('지쳤어요', 4000));
      t.note('선택지 옆 "직접 쓸게요" 보임', await t.hasText('직접 쓸게요'));
      await t.clickText('지쳤어요');
      await sleep(600);
      t.note('고른 답이 대화 기록으로 남아 보임 (지쳤어요)', await t.hasText('지쳤어요'));
      t.note('두 번째 질문은 비어 있으면 "넘어가기"', await t.hasText('넘어가기'));
      await t.fillTextarea('테스트2');
      await sleep(200);
      await t.clickText(submitLabel(1, DAILY_QUESTIONS.length));
      await sleep(2200); // past the thank-you bubble's 1800ms hold
      t.note('체크인 완료 후 보상 알림 없음 (+2 토스트 없음)', !(await t.hasText('+2')));
      t.note('체크인 끝난 뒤 퀘스트 위젯 노출 (버튼 라벨 보임)', await t.hasText(EXERCISE_LABEL));
      t.note('퀘스트에 「생각 점검」 없음', !(await t.hasText('생각 점검')));
      // §44 layout: labels on one line, the row on the floor, tab labels not clipped
      const rectOf = (text) =>
        t.evalJs(
          `(()=>{const e=[...document.querySelectorAll('div,span')].filter(e=>e.children.length===0&&e.textContent.trim()===${JSON.stringify(text)}).pop();if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,scroll:e.scrollWidth,client:e.clientWidth}})()`
        );
      let oneLine = true;
      let onFloor = true;
      for (const l of ['이름 붙이기', '척도 질문', '미래의 편지', '거리 두기', 'AI와 대화']) {
        const r = await rectOf(l);
        oneLine = oneLine && !!r && r.height < 22 && r.scroll <= r.client;
        onFloor = onFloor && !!r && r.top > 760 * 0.6;
      }
      t.note('퀘스트 이름표가 한 줄에 다 보임', oneLine);
      t.note('퀘스트 버튼이 방 아래쪽에 있음 (침대·액자를 안 가림)', onFloor);
      const tabHome = await rectOf('홈');
      const tabMemo = await rectOf('메모');
      t.note('하단 탭 글자가 화면 안에 다 보임', !!tabHome && !!tabMemo && tabHome.bottom <= 760 && tabMemo.bottom <= 760);
      await t.shot('01_idle_with_widget.png');

      // collapse / expand the quest widget
      await t.clickText('⌄');
      await sleep(400);
      t.note('접기 버튼 누르면 퀘스트 아이콘들 숨겨짐', !(await t.hasText(EXERCISE_LABEL)));
      t.note('접힌 토글(📋) 노출', await t.hasText('📋'));
      await t.shot('02_collapsed.png');
      await t.clickText('📋');
      await sleep(400);
      t.note('다시 펼치면 퀘스트 아이콘 복귀', await t.hasText(EXERCISE_LABEL));

      // start the externalization-interview exercise from the quest widget
      t.note('퀘스트 버튼(이름 붙이기) 클릭됨', await t.clickText(EXERCISE_LABEL));
      await sleep(1000);
      t.note(
        '실습 대화 시작(리드인 또는 첫 질문 노출)',
        (await t.hasText('불안이 나를 찾아올 때')) || (await t.hasText('이름을 붙여볼까요'))
      );
      await t.shot('03_exercise_running.png');

      // dismiss the lead-in (the exercise's own summary — a fresh install has no callback to quote)
      await t.tapAnyOf([
        '"나는 불안한 사람"이 아니라 "불안이 나를 찾아올 때"로 말하며 문제에 이름과 생김새를 붙이고, "불안이 못 이겼던 날"을 찾습니다.',
      ]);
      await sleep(400);

      await answerDialogue(
        t,
        [
          '요즘 나를 자꾸 찾아오는 감정이나 생각이 있다면, 이름을 붙여볼까요? (예: 불안이, 걱정이)',
          '그 친구는 주로 언제, 어떤 상황에서 나를 찾아오나요?',
          '최근에 그 친구가 나를 이기지 못했던 순간이 있었나요? 어떤 날이었는지 적어보세요.',
        ],
        ['테스트 답변 1번째', '테스트 답변 2번째', null]
      );

      await sleep(800);
      t.note('실습 완료 문구 노출 (마지막 질문은 넘어가기로)', await t.hasText('고마워요'));
      await t.shot('04_exercise_done.png');
      await sleep(2200);
      t.note('실습 완료 후 홈 유휴 상태로 복귀 + 퀘스트 위젯 재노출', await t.hasText(EXERCISE_LABEL));
      t.note('완료한 퀘스트에 체크 표시(✓) 보임', await t.hasText('✓'));
      await t.shot('05_back_to_idle.png');

      // AI chat: off until turned on from the ✨ prompt (no longer asked at startup)
      t.note('퀘스트 위젯의 AI(✨) 버튼 클릭됨', await t.clickEmoji('✨'));
      await sleep(500);
      t.note('AI 켜기 전 Gemini 전송 안내 보임', await t.hasText('Gemini 서버로 전송'));
      await t.clickText('켜기');
      await sleep(1000);
      t.note('AI 채팅 화면으로 이동됨', await t.hasText('편하게 이야기해도 돼요'));
      await t.shot('07_ai_chat.png');

      // memo tab shows the completed exercise; the account is an optional link there
      await t.clickText('‹');
      await sleep(800);
      await t.clickText('메모');
      await sleep(1000);
      t.note('메모 탭에 방금 한 실습(문제 외재화 인터뷰) 기록 보임', await t.hasText('문제 외재화 인터뷰'));
      await t.shot('08_memo_shows_exercise.png');
      t.note('메모 탭에 "계정 연결하기 (선택)" 링크', await t.clickText('계정 연결하기 (선택)'));
      await sleep(800);
      t.note('계정 화면 열림 (선택)', await t.hasText('계정 없이도 모든 기능을 쓸 수 있어요'));
      await t.clickText('‹');
      await sleep(800);

      // The gate, full flow: reload lands back on it. Feeling first; a heavy weight (≤3) offers
      // breathing; accepting runs useBreathPacer (2 sighs here — one earlier visit was a skip,
      // features/gate/history.ts breathCyclesFor — ~6.4s each), then enters the app.
      await t.navigate(BASE);
      t.note('관문: 새로고침 후 바로 감정 질문 (호흡이 먼저 오지 않음)', await t.waitText('지금 마음에 가까운 말이 있다면?', 6000));
      await t.clickText('분노');
      await sleep(400);
      await t.clickText('억울함');
      await sleep(500);
      await t.waitText('0에서 10 중에', 4000);
      await t.clickText('2');
      t.note('관문: 무게 3 이하면 숨 고르기를 "제안"', await t.waitText('잠깐 같이 숨 고를까요?', 4000));
      await t.clickText('같이 쉬기');
      t.note('관문: "같이 쉬기" 누르면 호흡 시작', await t.waitText('입으로 길게 내쉬어요', 3000));
      t.note('관문: 호흡이 끝나면 홈으로 들어감', await t.waitText('🫧 숨 고르기', 20000));
      await t.shot('09_after_full_gate.png');

      // 숨 고르기 (ReliefScreen, same pacer, open-ended loop): in 4s → hold 2s → out 6s → in again
      await t.clickText('🫧 숨 고르기');
      t.note('숨 고르기: 들이쉬기 단계 노출', await t.waitText('숨을 들이쉬어요', 4000));
      t.note('숨 고르기: 멈춤 단계로 넘어감', await t.waitText('잠깐 멈춰요', 6000));
      t.note('숨 고르기: 내쉬기 단계로 넘어감', await t.waitText('천천히 내쉬어요', 4000));
      t.note('숨 고르기: 한 바퀴 돌고 다시 들이쉬기 (반복)', await t.waitText('숨을 들이쉬어요', 8000));
      await t.shot('10_relief.png');
    },
    { shotDir: SHOT_DIR }
  );

  // A wide window (§45): everything stays in the room's column. 900 tall minus the 64 tab bar,
  // times ROOM_MAX_ASPECT 0.66 = 552 wide, centered in 1400.
  const WIDE = { width: 1400, height: 900, left: 424, right: 976 };
  const { passed: widePassed } = await withBrowser(
    BASE,
    async (t) => {
      await t.passStartupGates();
      const rectOf = (text) =>
        t.evalJs(
          `(()=>{const e=[...document.querySelectorAll('div,span')].filter(e=>e.children.length===0&&e.textContent.trim()===${JSON.stringify(text)}).pop();if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,right:r.right}})()`
        );
      const inColumn = (r) => !!r && r.left >= WIDE.left - 1 && r.right <= WIDE.right + 1;
      t.note('넓은 화면: 숨 고르기 버튼이 방 안에 있음', inColumn(await rectOf('🫧 숨 고르기')));
      t.note('넓은 화면: 하단 탭이 방 폭 안에 있음', inColumn(await rectOf('홈')) && inColumn(await rectOf('메모')));
      await t.shot('wide_01_home.png');
      await t.clickText('메모');
      await sleep(800);
      t.note('넓은 화면: 메모 내용이 방 폭 안에 있음', inColumn(await rectOf('아직 쌓인 메모가 없어요.')));
      await t.shot('wide_02_memo.png');
    },
    { shotDir: SHOT_DIR, width: WIDE.width, height: WIDE.height }
  );

  // 병문안, behind ?visit=1 (features/visit/flag.ts). &dev=1 gives the day-skipping buttons.
  const { passed: visitPassed } = await withBrowser(
    `${BASE}/?visit=1&dev=1`,
    async (t) => {
      await t.waitText('시작하기 전에', 12000);
      await t.clickText('시작하기');
      t.note('병문안: 시작 전에 어떤 이야기인지 안내', await t.waitText('아픔과 이별을 다뤄요', 6000));
      await t.clickText('들어가 볼게요');
      t.note('병문안: 1일째 병실 문 앞', (await t.waitText('병실 문 앞에 서 있다.', 3000)) && (await t.hasText('1일째')));
      await t.shot('visit_00_title.png');
      await t.clickText('들어가기');
      await sleep(400);
      await t.clickText('안녕. 들어와.');
      t.note('병문안: 감정 고르기', await t.waitText('지금 마음에 가까운 말이 있다면?', 3000));
      await t.shot('visit_00b_emotion.png');
      await t.clickText('슬픔');
      await sleep(300);
      await t.clickText('서운함');
      await sleep(400);
      await t.clickText('서운함… 그랬구나.');
      await sleep(400);
      await t.clickText('직접 쓸게요');
      await sleep(300);
      await t.fillTextarea('오늘 팀장님이 보고서를 지적했어');
      await sleep(200);
      await t.clickText('완료');
      t.note('병문안: 쓴 글의 키워드를 한 번 언급', await t.waitText('팀장님 얘기구나.', 3000));
      await t.shot('visit_01_keyword.png');
      await t.clickText('팀장님 얘기구나.');
      await sleep(300);
      t.note('병문안: 이어서 대본', await t.hasText('여기 오는 사람 별로 없는데. 와 줘서 신기해.'));
      await t.clickText('여기 오는 사람 별로 없는데. 와 줘서 신기해.');
      await sleep(300);
      await t.clickText('창밖에 은행나무가 보여. 난 요즘 저걸 보는 게 일이야.');
      t.note('병문안: 하루를 마치면 병실을 나옴', await t.waitText('오늘 얘기 잘 들었어', 3000));
      t.note('병문안: 상담 전화 안내 항상 보임', await t.hasText('109'));

      // Next day: what sounds like a crisis gets the fixed lines, not the keyword or the script
      await t.clickText('다음 날');
      t.note('병문안: 다음 날이면 2일째', (await t.waitText('병실 문 앞에 서 있다.', 3000)) && (await t.hasText('2일째')));
      await t.clickText('들어가기');
      await sleep(400);
      await t.clickText('왔구나.');
      await sleep(300);
      await t.clickText('잘 모르겠어요');
      await sleep(400);
      await t.clickText('잘 모르겠는 날도 있지.');
      await sleep(400);
      await t.clickText('직접 쓸게요');
      await sleep(300);
      await t.fillTextarea('요즘 죽고 싶어');
      await sleep(200);
      await t.clickText('완료');
      t.note('병문안: 위기 표현엔 고정 대사', await t.waitText('그 말, 그냥 넘기고 싶지 않아.', 3000));
      await t.shot('visit_02_crisis.png');
      t.note('병문안: 위기 표현엔 대본·키워드 없음', !(await t.hasText('얘기구나')) && !(await t.hasText('자기 전에 또 생각났어')));
      await t.clickText('그 말, 그냥 넘기고 싶지 않아.');
      await sleep(300);
      await t.clickText('혼자 견디지 않아도 돼. 아래 번호는 24시간 받아 줘.');
      await sleep(400);

      // 2 of 7 days, then the week runs out without coming on the last: the empty bed
      await t.clickText('7일 뒤');
      t.note('병문안: 4일 이상 안 오고 마지막 날도 안 오면 빈 침대와 편지', await t.waitText('병실에 소녀는 없고', 3000));
      await t.shot('visit_03_bad_ending.png');
      await t.clickText('병실에 소녀는 없고, 머리맡에 편지 한 장이 놓여 있다.');
      await sleep(300);
      await t.clickText('"못 와도 괜찮았어. 네가 와 줬던 날들만 생각하고 있었어."');
      await sleep(300);
      await t.clickText('"너도 네 하루를 잘 지내 줘."');
      t.note('병문안: 엔딩 뒤 나눈 이야기를 돌아봄 (쓴 말 그대로)', await t.waitText('오늘 팀장님이 보고서를 지적했어', 3000));
      t.note('병문안: 위기 표현은 돌아보기에 나오지 않음', !(await t.hasText('요즘 죽고 싶어')));
      await t.shot('visit_04_recall.png');
      await t.clickText('병원을 나서기');
      t.note('병문안: 어떤 엔딩이든 요정 등장', await t.waitText('한 번 더 찾아가 볼래?', 3000));
      await t.clickText('다시 찾아가기');
      t.note('병문안: 2회차는 1일째부터', (await t.waitText('병실 문 앞에 서 있다.', 3000)) && (await t.hasText('1일째')));
      t.note('병문안: 화면에 2회차 표시', await t.hasText('2회차'));
    },
    { shotDir: SHOT_DIR }
  );
  process.exit(passed && widePassed && visitPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

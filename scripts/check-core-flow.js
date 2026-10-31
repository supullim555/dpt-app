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

      // title screen and settings
      t.note('병문안: 타이틀 화면', (await t.waitText('이야기 시작', 3000)) && (await t.hasText('병문안')));
      await sleep(400);
      await t.shot('visit_title.png');
      t.note('병문안: 타이틀에 설정 버튼', await t.clickText('설정'));
      t.note('병문안: 설정 화면에 글자 크기', await t.waitText('글자 크기', 3000));
      t.note('병문안: 설정에 처음부터 다시 시작', await t.hasText('처음부터 다시 시작'));
      await t.shot('visit_settings.png');
      await t.clickText('크게');
      await sleep(200);
      await t.clickText('보통');
      await sleep(200);
      await t.clickText('돌아가기');
      await t.waitText('이야기 시작', 3000);
      await t.clickText('이야기 시작');

      // opening cutscene
      t.note('병문안: 컷씬 첫 문장', await t.waitText('하나의 편지가 나를 찾아왔다.', 3000));
      await sleep(800);
      await t.clickText('하나의 편지가 나를 찾아왔다.');
      t.note('병문안: 편지 본문에 7일이 분명히 적힘', await t.waitText('7일밖에 시간이 없대', 3000));
      await sleep(800);
      await t.click(195, 380);
      t.note('병문안: 컷씬 둘째 문장', await t.waitText('밖에 나가지 못하는 시한부의 소녀', 3000));
      await sleep(800);
      await t.clickText('밖에 나가지 못하는 시한부의 소녀');
      t.note('병문안: 컷씬 셋째 문장', await t.waitText('나는 그 아이에게 이야기를 하려 간다.', 3000));
      await sleep(800);
      t.note('병문안: 컷씬은 건너뛸 수 있음', await t.hasText('건너뛰기'));
      await t.clickText('나는 그 아이에게 이야기를 하려 간다.');

      // day 1: she asks about the day, and never about feelings
      t.note('병문안: 1일째 병실 문 앞', (await t.waitText('병실 문 앞에 서 있다.', 3000)) && (await t.hasText('1일째')));
      await t.clickText('들어가기');
      t.note('병문안: 소녀의 첫마디는 말풍선', await t.waitText('진짜 왔네. 당첨자.', 3000));
      await t.shot('visit_bubble.png');
      await t.clickText('진짜 왔네. 당첨자.');
      t.note('병문안: 들려줄 이야기를 먼저 물음', await t.waitText('아무 얘기나 해 줘', 3000));
      t.note('병문안: 1일째엔 감정을 묻지 않음', !(await t.hasText('어떤 감정으로')) && !(await t.hasText('분노')));
      await t.clickText('직접 쓸게요');
      await sleep(300);
      await t.fillTextarea('오늘 팀장님이 보고서를 지적했어');
      await sleep(200);
      await t.clickText('들려주기');
      t.note('병문안: 쓴 글의 키워드를 한 번 언급', await t.waitText('팀장님 얘기구나.', 3000));
      await t.clickText('팀장님 얘기구나.');
      await sleep(300);
      t.note('병문안: 이어서 대본', await t.hasText('편지를 꽤 많이 보냈거든. 답이 온 건 처음이야.'));
      await t.clickText('편지를 꽤 많이 보냈거든. 답이 온 건 처음이야.');
      await sleep(300);
      await t.clickText('창밖에 은행나무가 보여. 난 요즘 저걸 보는 게 일이야. 퇴근은 없고.');
      t.note('병문안: 1일째는 감정 질문 없이 끝남', await t.waitText('오늘 얘기 잘 들었어', 3000));
      t.note('병문안: 상담 전화 안내 항상 보임', await t.hasText('109'));
      await t.clickText('오늘 얘기 잘 들었어. 내일 또 와도 되고, 천천히 와도 돼.');
      t.note('병문안: 하루가 끝나면 간호사가 나가 달라고 함', (await t.waitText('이제 치료 시간이에요', 3000)) && (await t.hasText('간호사')));
      await t.shot('visit_staff.png');
      await t.clickText('이제 치료 시간이에요. 보호자분 아니시죠? 오늘은 나가 주셔야 해요.');
      t.note('병문안: 나가면 병실 앞 복도', await t.waitText('병실 앞 복도', 3000));
      t.note('병문안: 복도에선 다시 들어갈 수 없음', !(await t.hasText('들어가기')));
      t.note('병문안: 1회차엔 빛으로 날을 넘길 수 없음', !(await t.hasText('빛을 따라')));
      await t.shot('visit_outside.png');

      // day 2: after listening, she asks how the day felt
      await t.clickText('다음 날');
      t.note('병문안: 다음 날이면 2일째', (await t.waitText('병실 문 앞에 서 있다.', 3000)) && (await t.hasText('2일째')));
      await t.clickText('들어가기');
      await t.waitText('왔구나.', 3000);
      await t.clickText('왔구나.');
      await t.waitText('아무 얘기나 해 줘', 3000);
      await t.clickText('별일 없었어');
      await t.waitText('네 얘기, 자기 전에 또 생각났어.', 3000);
      await t.clickText('네 얘기, 자기 전에 또 생각났어.');
      await sleep(300);
      await t.clickText('바깥은 무슨 냄새가 나? 여긴 소독약 냄새뿐이라, 네 옷에서 나는 냄새가 제일 재밌어.');
      t.note('병문안: 2일째엔 이야기를 들은 뒤 감정을 궁금해함', await t.waitText('오늘 하루는 어떤 감정으로 지냈어? 궁금하네.', 3000));
      await t.shot('visit_emotion.png');
      await t.clickText('슬픔');
      await sleep(300);
      await t.clickText('서운함');
      t.note('병문안: 고른 감정을 받아 줌', await t.waitText('서운함… 그랬구나.', 3000));
      await t.clickText('서운함… 그랬구나.');
      await t.waitText('오늘 얘기 잘 들었어', 3000);

      // day 3: what sounds like a crisis gets the fixed lines, not the keyword or the script
      await t.clickText('다음 날');
      await t.waitText('병실 문 앞에 서 있다.', 3000);
      await t.clickText('들어가기');
      await t.waitText('왔구나.', 3000);
      await t.clickText('왔구나.');
      await t.waitText('아무 얘기나 해 줘', 3000);
      await t.clickText('직접 쓸게요');
      await sleep(300);
      await t.fillTextarea('요즘 죽고 싶어');
      await sleep(200);
      await t.clickText('들려주기');
      t.note('병문안: 위기 표현엔 고정 대사', await t.waitText('그 말, 그냥 넘기고 싶지 않아.', 3000));
      t.note('병문안: 위기 표현엔 대본·키워드 없음', !(await t.hasText('얘기구나')) && !(await t.hasText('이 핀은 내가 고른 거고')));
      await t.clickText('그 말, 그냥 넘기고 싶지 않아.');
      await sleep(300);
      await t.clickText('혼자 견디지 않아도 돼. 아래 번호는 24시간 받아 줘.');
      await t.waitText('오늘 얘기 잘 들었어', 3000);
      await t.clickText('오늘 얘기 잘 들었어. 내일 또 와도 되고, 천천히 와도 돼.');
      t.note('병문안: 위기 표현 뒤엔 내보내는 말 대신 배웅', (await t.waitText('조심히 들어가세요', 3000)) && !(await t.hasText('나가 주')));

      // the week runs out: the empty bed
      await t.clickText('7일 뒤');
      t.note('병문안: 4일 이상 안 오고 마지막 날도 안 오면 빈 침대와 편지', await t.waitText('병실에 소녀는 없고', 3000));
      await t.shot('visit_bad_ending.png');
      await t.clickText('병실에 소녀는 없고, 머리맡에 편지 한 장이 놓여 있다.');
      await sleep(300);
      await t.clickText('"그렇게 많이 보냈는데 와 준 사람이 있었어. 그걸로 충분히 좋은 기록이야."');
      await sleep(300);
      await t.clickText('"못 온 날은 네 하루가 있었던 날이겠지. 그 얘기도 궁금했어."');
      await sleep(300);
      await t.clickText('"너도 네 하루를 잘 지내 줘."');

      // her notebook: the player's own words on top, getting messier, "살고싶어" last
      t.note('병문안: 엔딩 뒤 수첩', await t.waitText('그 아이의 수첩', 3000));
      t.note('병문안: 수첩에 쓴 말 그대로', await t.hasText('오늘 팀장님이 보고서를 지적했어'));
      await t.shot('visit_notebook1.png');
      let crisisShown = await t.hasText('요즘 죽고 싶어');
      for (let page = 2; page <= 6; page++) {
        await t.clickText('다음 장 ›');
        await sleep(250);
        crisisShown = crisisShown || (await t.hasText('요즘 죽고 싶어'));
        if (page === 5) await t.shot('visit_notebook5.png');
      }
      await t.clickText('다음 장 ›');
      t.note('병문안: 수첩 마지막 장은 살고싶어', await t.waitText('살고싶어', 2000));
      await t.shot('visit_notebook7.png');
      t.note('병문안: 위기 표현은 수첩에 나오지 않음', !crisisShown);
      await t.clickText('병원을 나서기');
      t.note('병문안: 어떤 엔딩이든 요정 등장', await t.waitText('한 번 더 찾아가 볼래?', 3000));
      await t.shot('visit_fairy.png');
      await t.clickText('다시 찾아가기');
      t.note('병문안: 2회차는 1일째부터', (await t.waitText('병실 문 앞에 서 있다.', 3000)) && (await t.hasText('1일째')));
      t.note('병문안: 화면에 2회차 표시', await t.hasText('2회차'));

      // run 2: pick the clues up as the fairy said, show them on later visits, walk down to the tree
      const tapUntil = async (text, tries = 16) => {
        for (let i = 0; i < tries; i++) {
          if (await t.hasText(text)) return true;
          await t.click(195, 170);
          await sleep(300);
        }
        return false;
      };
      const talk = async () => {
        await t.clickText('들어가기');
        await tapUntil('아무 얘기나');
        await t.clickText('별일 없었어');
        for (let i = 0; i < 20; i++) {
          if ((await t.hasText('뭐 들고 있어')) || (await t.hasText('오늘 얘기 잘 들었어'))) return;
          if (await t.hasText('어떤 감정으로')) await t.clickText('잘 모르겠어요');
          else await t.click(195, 170);
          await sleep(300);
        }
      };
      const nextDay = async () => {
        await t.clickText('빛을 따라 다음 날로');
        await t.waitText('병실 문 앞에 서 있다.', 3000);
      };
      const showMemory = async (name, title, thenText) => {
        await t.clickText(name);
        const ok = await t.waitText(title, 3000);
        await tapUntil(thenText);
        return ok;
      };

      await talk();
      await tapUntil('병실 앞 복도');
      await t.clickText('요정의 쪽지');
      t.note('병문안: 2회차 복도에 요정의 쪽지', await t.waitText('1일째 · 1층 · 개목걸이', 2000));
      await t.clickText('1층');
      await sleep(600);
      t.note('병문안: 그날 그 층에 단서가 있음', await t.hasText('무언가 떨어져 있다'));
      await t.shot('visit_floor1.png');
      await t.clickText('무언가 떨어져 있다');
      t.note('병문안: 주우면 회상 없이 문구만', (await t.waitText('개목걸이를 주웠다', 2000)) && !(await t.hasText('아침 산책')));
      await t.clickText('매점 가기');
      t.note('병문안: 매점은 하루에 3개', (await t.waitText('귤', 2000)) && (await t.hasText('볼펜')) && (await t.hasText('머리끈')));
      await t.shot('visit_shop.png');
      await t.clickText('귤');
      t.note('병문안: 선물은 하루에 1개', (await t.waitText('귤 하나를 샀다', 2000)) && !(await t.hasText('볼펜')));
      await t.clickText('나가기');

      await nextDay();
      t.note('병문안: 2회차는 빛을 따라 기다리지 않고 다음 날', await t.hasText('2일째'));
      await talk();
      t.note('병문안: 다음 날 선물과 단서를 고를 수 있음', (await t.hasText('귤')) && (await t.hasText('개목걸이')));
      await t.shot('visit_give.png');
      await t.clickText('귤');
      t.note('병문안: 선물에 따라 반응', await t.waitText('못 먹는데 왜 사 왔어', 2000));
      await tapUntil('뭐 들고 있어');
      t.note('병문안: 단서를 보여 주면 회상', await showMemory('개목걸이', '아침 산책', '오늘 얘기 잘 들었어'));
      await tapUntil('병실 앞 복도');
      await t.clickText('3층');
      await sleep(600);
      t.note('병문안: 다른 날 다른 층엔 단서 없음', !(await t.hasText('무언가 떨어져 있다')));
      await t.clickText('1층');
      await sleep(600);
      await t.clickText('매점 가기');
      t.note('병문안: 품목이 날마다 달라짐', (await t.waitText('초콜릿', 2000)) && !(await t.hasText('귤')));
      await t.clickText('나가기');

      await nextDay();
      await talk();
      await tapUntil('병실 앞 복도');
      await t.clickText('3층');
      await sleep(600);
      await t.clickText('무언가 떨어져 있다');
      await nextDay();
      await talk();
      t.note('병문안: 3층 단서 회상', await showMemory('과자봉지', '마지막 한 개', '오늘 얘기 잘 들었어'));
      await tapUntil('병실 앞 복도');
      await t.clickText('2층');
      await sleep(600);
      await t.clickText('무언가 떨어져 있다');
      await nextDay();
      await talk();
      t.note('병문안: 2층 단서 회상', await showMemory('운동화 끈', '꼴찌', '오늘 얘기 잘 들었어'));
      await tapUntil('병실 앞 복도');
      await nextDay();
      await talk();
      await tapUntil('병실 앞 복도');
      await sleep(600);
      await t.clickText('무언가 떨어져 있다');
      await nextDay();
      await talk();
      t.note('병문안: 4층 단서 회상', await showMemory('노래방 쿠폰', '소리 지르기', '나무까지 가 볼래'));
      t.note('병문안: 단서를 다 보여 주면 해피엔딩', await t.hasText('같이 내려가 줘'));
      await tapUntil('그 아이의 수첩');
      for (let page = 2; page <= 7; page++) {
        await t.clickText('다음 장 ›');
        await sleep(200);
      }
      t.note('병문안: 해피엔딩의 수첩 뒤엔 같이 내려감', await t.clickText('같이 내려가기'));
      t.note('병문안: 내려가서 알 수 없는 빛', await tapUntil('알 수 없는 빛'));
      await t.shot('visit_light.png');
      t.note('병문안: 소녀의 세상에 색이 돌아옴', await tapUntil('소녀의 세상에 색이 돌아왔다.'));
      await sleep(700);
      await t.shot('visit_color.png');
      t.note('병문안: 회색은 소녀의 시선이었음을 알려 줌', await tapUntil('그 아이의 눈에 비친 세상이었다.'));
      t.note('병문안: 동화임을 밝힘', await tapUntil('이건 그런 동화다.'));
      await t.click(195, 170);
      t.note('병문안: 해피엔딩 뒤 타이틀', await t.waitText('이야기 시작', 3000));
    },
    { shotDir: SHOT_DIR }
  );
  process.exit(passed && widePassed && visitPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

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
const sharp = require('sharp');

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

// True when the 3D view holds a real picture and not one flat colour: read off a screenshot, since a
// WebGL canvas clears its own buffer after drawing.
async function viewHasPicture(t) {
  const shot = await t.send('Page.captureScreenshot', { format: 'png' });
  const { channels } = await sharp(Buffer.from(shot.result.data, 'base64')).extract({ left: 40, top: 120, width: 300, height: 260 }).stats();
  return channels[0].stdev > 10;
}

async function waitFor(check, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return true;
    await sleep(200);
  }
  return false;
}

async function main() {
  // The earlier app, kept at ?old=1 since 병문안 became the front door (features/visit/flag.ts).
  const OLD = `${BASE}/?old=1`;
  const { passed } = await withBrowser(
    OLD,
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
      await t.navigate(OLD);
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
    OLD,
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

  // 병문안, the front door: the plain address, no ?visit=1 (features/visit/flag.ts). &dev=1 gives the day-skipping buttons.
  const { passed: visitPassed } = await withBrowser(
    `${BASE}/?dev=1`,
    async (t) => {
      await t.waitText('시작하기 전에', 12000);
      await t.clickText('시작하기');
      t.note('병문안: 시작 전에 어떤 이야기인지 안내', await t.waitText('아픔과 이별을 다뤄요', 6000));
      await t.clickText('들어가 볼게요');
      t.note('병문안: 예전 방 그림을 내려받지 않음', await t.evalJs("!performance.getEntriesByType('resource').some(e=>/wallpaper|portrait-front|bookshelf/.test(e.name))"));

      // title screen and settings
      t.note('병문안: 타이틀 화면', (await t.waitText('이야기 시작', 3000)) && (await t.hasText('병문안')));
      await sleep(400);
      await t.shot('visit_title.png');
      t.note('병문안: 타이틀에 설정 버튼', await t.clickText('설정'));
      t.note('병문안: 설정 화면에 글자 크기', await t.waitText('글자 크기', 3000));
      t.note('병문안: 설정에 처음부터 다시 시작', await t.hasText('처음부터 다시 시작'));
      t.note('병문안: 설정에 AI와 직접 대화, 전송된다는 안내', (await t.hasText('AI와 직접 대화')) && (await t.hasText('켜면 병원 사람에게 직접 쓴 말을 Google Gemini가 그 사람으로서 받아요. 쓴 말은 이 기기가 아니라 Gemini 서버로 전송돼요. 꺼도 선택지로 끝까지 할 수 있어요.')));
      await t.clickText('켜기');
      await sleep(200);
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
      t.note('병문안: 1일째 병원 정문 앞', (await t.waitText('병원 정문 앞에 서 있다.', 3000)) && (await t.hasText('1일째')));
      await t.clickText('들어가기');

      // on foot: the front door, along the lobby, the lift, her floor, her door
      const press = async (label, times = 1) => {
        for (let i = 0; i < times; i++) {
          await t.clickText(label);
          await sleep(420);
        }
      };
      // Each step of the tutorial opens in the middle of a darkened screen, and has to be read before you go on.
      const readTip = async () => {
        await t.clickText('알겠어요');
        await sleep(250);
      };
      t.note('병문안: 왼쪽 위에 목표', await t.waitText('안내 직원에게 가기', 3000));
      t.note('병문안: 튜토리얼이 걷는 법부터, 컴퓨터엔 키로', (await t.hasText('방향키나 W, A, S, D')) && (await t.hasText('화면 아래의 버튼을 눌러도')));
      t.note('병문안: 튜토리얼은 건너뛸 수 있음', await t.hasText('튜토리얼 건너뛰기'));
      t.note('병문안: 튜토리얼은 어둡게 흐린 화면 가운데', await t.evalJs("[...document.querySelectorAll('div')].some((d) => { const c = getComputedStyle(d); return (c.backdropFilter || c.webkitBackdropFilter || '').includes('blur') && c.position === 'absolute'; })"));
      await t.shot('tutorial_center.png');
      await t.clickText('앞으로');
      await sleep(420);
      t.note('병문안: 튜토리얼을 읽기 전엔 움직이지 않음', !(await t.hasText('노란 화살표')));
      await readTip();
      t.note('병문안: 읽고 나면 아래에 작게 남음', (await t.hasText('방향키나 W, A, S, D')) && !(await t.hasText('알겠어요')));
      t.note('병문안: 3D 화면이 뜸', await waitFor(() => t.evalJs("!!document.querySelector('canvas')"), 8000));
      await sleep(500);
      await t.shot('walk_lobby.png');
      t.note('병문안: 화면이 실제로 그려짐', await viewHasPicture(t));
      // W by where it sits on the keyboard, so it walks with the keyboard set to Hangul too
      await t.evalJs("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ㅈ', code: 'KeyW' })), true");
      await sleep(420);
      t.note('병문안: 한글 입력 상태의 W 키로도 걸음', await t.hasText('노란 화살표'));
      t.note('병문안: 튜토리얼이 목표와 화살표를 설명', await t.hasText('노란 화살표'));
      await readTip();
      await press('앞으로', 4);
      await press('오른쪽');
      t.note('병문안: 튜토리얼이 말 걸기를 설명', await t.hasText('흰 버튼'));
      t.note('병문안: 컴퓨터엔 Enter 키도 알려 줌', await t.hasText('Enter 키로 말을'));
      await readTip();
      await t.clickText('안내 직원에게 말 걸기');
      t.note('병문안: 안내 직원이 처음엔 매점을 권함', await t.waitText('병문안 오셨어요?', 2000));
      t.note('병문안: 튜토리얼이 뒤로가기를 설명', await t.waitText('다 들었으면', 2000));
      await readTip();
      await sleep(500);
      await t.clickText('병문안 오셨어요? 호스피스 병동은 4층이에요.');
      t.note('병문안: 화면을 누르면 다음 말', await t.waitText('매점에 먼저 들러', 2000));
      await t.clickText('뒤로가기');
      await sleep(600);
      t.note('병문안: 목표가 매점으로 바뀜', await t.waitText('1층 매점에서 선물 고르기', 2000));
      await readTip();
      await t.shot('tutorial_shop.png');
      await press('왼쪽');
      await press('앞으로', 4);
      await press('왼쪽');
      await press('앞으로', 2);
      await press('오른쪽');
      await press('앞으로');
      await press('왼쪽');
      t.note('병문안: 튜토리얼이 선물 고르기를 설명', await t.hasText('하루에 하나만'));
      await readTip();
      await t.clickText('매점 주인에게 말 걸기');
      await sleep(600);
      await t.clickText('귤');
      t.note('병문안: 튜토리얼이 선물 쓰는 곳을 설명', await t.waitText('소녀에게 건넬 수 있어요', 2000));
      await readTip();
      await t.clickText('뒤로가기');
      await sleep(600);
      t.note('병문안: 선물을 사면 목표가 4층으로', await t.waitText('4층 소녀의 병실로 가기', 2000));
      t.note('병문안: 튜토리얼이 엘리베이터를 설명', await t.hasText('타는 버튼'));
      await readTip();
      await press('왼쪽');
      await press('앞으로');
      await press('왼쪽');
      await press('앞으로', 2);
      await press('오른쪽');
      await press('앞으로', 5);
      await press('오른쪽');
      await press('앞으로', 2);
      t.note('병문안: 엘리베이터 앞에서 탈 수 있음', await t.hasText('엘리베이터 타기'));
      await t.shot('walk_lift.png');
      await t.clickText('지도');
      await sleep(200);
      t.note('병문안: 지도에서 안 가 본 층으로는 못 감', await (async () => {
        await t.clickText('3층');
        await sleep(300);
        return t.hasText('닫기');
      })());
      await t.shot('walk_map.png');
      await t.clickText('닫기');
      await sleep(200);
      await t.clickText('엘리베이터 타기');
      await t.waitText('몇 층으로 갈까', 2000);
      await t.clickText('4층');
      t.note('병문안: 엘리베이터로 4층 도착', await t.waitText('4층 호스피스 병동', 3000));
      t.note('병문안: 튜토리얼이 지도를 설명', await t.hasText('지도 버튼'));
      await readTip();
      await sleep(300);
      await t.shot('walk_4f.png');
      await press('앞으로', 2);
      await press('왼쪽');
      await press('앞으로', 3);
      await press('오른쪽');
      t.note('병문안: 문이 열려 있다고 나옴', !(await t.hasText('문은 닫혀')));
      await t.shot('walk_door.png');
      await press('앞으로');
      t.note('병문안: 문을 지나면 자동으로 그날의 컷씬', await t.waitText('누운 채로 창밖을 보고 있다', 3000));
      t.note('병문안: 컷씬 중엔 움직이지 않음', !(await t.hasText('앞으로')));
      await sleep(2600);
      await t.shot('visit_arrive.png');
      await t.clickText('누운 채로 창밖을 보고 있다. 문소리에 고개만 돌린다.');
      t.note('병문안: 소녀의 첫마디는 말풍선', await t.waitText('진짜 왔네. 당첨자.', 3000));
      await sleep(600);
      await t.shot('visit_bubble.png');
      await t.clickText('진짜 왔네. 당첨자.');
      t.note('병문안: 들려줄 이야기를 먼저 물음', await t.waitText('아무 얘기나 해 줘', 3000));
      t.note('병문안: 튜토리얼이 들려주는 법을 설명', await t.hasText('쓰고 싶은 만큼만 쓰면'));
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
      t.note('병문안: 튜토리얼에서 산 선물을 건넴', await t.waitText('뭐 들고 있어', 3000));
      await t.clickText('귤');
      await t.waitText('못 먹는데 왜 사 왔어', 3000);
      await t.clickText('못 먹는데 왜 사 왔어. 냄새는 맡아도 되지? …아, 이거 좋다. 머리맡에 둘게.');
      t.note('병문안: 1일째는 감정 질문 없이 끝남', await t.waitText('오늘 얘기 잘 들었어', 3000));
      t.note('병문안: 상담 전화 안내 항상 보임', await t.hasText('109'));
      await t.clickText('오늘 얘기 잘 들었어. 내일 또 와도 되고, 천천히 와도 돼.');
      t.note('병문안: 하루가 끝나면 간호사가 나가 달라고 함', (await t.waitText('이제 치료 시간이에요', 3000)) && (await t.hasText('간호사')));
      await t.shot('visit_staff.png');
      await t.clickText('이제 치료 시간이에요. 보호자분 아니시죠? 오늘은 나가 주셔야 해요.');
      t.note('병문안: 간호사가 의사 선생님 방으로 보냄', await t.waitText('의사 선생님이 잠깐 뵙자고', 2000));
      await t.clickText('아, 그리고 의사 선생님이 잠깐 뵙자고 하셨어요. 복도 오른쪽 끝 방이에요.');
      t.note('병문안: 나가면 병실 앞 복도', await t.waitText('병실 앞 복도', 3000));
      t.note('병문안: 복도에선 다시 들어갈 수 없음', !(await t.hasText('들어가기')));
      t.note('병문안: 1회차엔 빛으로 날을 넘길 수 없음', !(await t.hasText('빛을 따라')));
      t.note('병문안: 튜토리얼이 의사 선생님 방을 권함', await t.hasText('의사 선생님 방에 들러'));
      await readTip();
      t.note('병문안: 목표가 의사 선생님의 방', await t.hasText('4층 의사 선생님의 방에 가기'));
      await sleep(300);
      await t.shot('visit_outside.png');

      // someone in the corridor: the view comes in on them, they speak, and 뒤로가기 lets you walk again
      await press('뒤돌기');
      await press('앞으로', 2);
      await press('왼쪽');
      t.note('병문안: 사람 앞에 서면 말을 걸 수 있음', await t.clickText('담당 간호사에게 말 걸기'));
      t.note('병문안: 사람에게 말풍선', await t.waitText('그래도 오늘 웃었어요', 2000));
      t.note('병문안: 대화 중엔 움직이지 않음', !(await t.hasText('앞으로')));
      await sleep(600);
      await t.shot('talk_person.png');
      t.note('병문안: 뒤로가기', await t.clickText('뒤로가기'));
      await sleep(600);
      t.note('병문안: 뒤로가면 다시 움직임', (await t.hasText('앞으로')) && !(await t.hasText('그래도 오늘 웃었어요')));

      // the doctor's room at the end of her corridor: he's spoken to only from in front of his desk
      await press('왼쪽');
      await press('앞으로', 6);
      await press('오른쪽');
      await press('앞으로', 3);
      await press('왼쪽');
      await press('앞으로');
      await press('오른쪽');
      t.note('병문안: 의사 선생님의 방', await t.hasText('의사 선생님의 방'));
      await sleep(400);
      await t.shot('walk_doctor.png');
      t.note('병문안: 책상 앞에서 의사 선생님에게 말 걸기', await t.clickText('의사 선생님에게 말 걸기'));
      t.note('병문안: 의사 선생님이 부탁을 꺼냄', await t.waitText('그 아이가 기다리던 분이', 2000));
      await sleep(500);
      await t.shot('talk_doctor.png');
      await t.clickText('뒤로가기');
      await sleep(600);
      t.note('병문안: 튜토리얼이 바로 다음 날을 할 수 있다고 설명', (await t.waitText('다음 날을 바로 이어서', 2000)) && (await t.hasText('꼭 그래야 하는 건 아니에요')));
      await t.clickText('알겠어요');
      await sleep(200);
      t.note('병문안: 튜토리얼이 끝남', !(await t.hasText('다음 날을 바로 이어서')));

      // the front door asks whether to go on to the next day
      await t.clickText('지도');
      await sleep(200);
      await t.clickText('1층');
      await sleep(1600);
      await press('앞으로', 2);
      await press('오른쪽');
      await press('앞으로', 4);
      t.note('병문안: 정문에서 병원 나가기', await t.clickText('병원 나가기'));
      t.note('병문안: 다음 날을 진행할지 물음', (await t.waitText('2일차를 진행하시겠습니까?', 2000)) && (await t.hasText('아니오')));
      await t.shot('leave_question.png');
      await t.clickText('아니오');
      t.note('병문안: 아니오면 다음 날까지 남은 시간', await t.waitText('자정에 열려요', 2000));
      await t.clickText('병원에 더 있기');
      await sleep(300);

      // day 2: after listening, she asks how the day felt
      const toRoom = async () => {
        await t.clickText('들어가기');
        await t.waitText('4층 소녀의 병실로 가기', 3000);
        await sleep(250);
        await t.clickText('지도');
        await sleep(200);
        await t.clickText('(시험) 병실 문 앞');
        await sleep(300);
        await t.clickText('앞으로');
        await sleep(700);
        await t.click(195, 170); // past the day's scene
      };
      await t.clickText('다음 날');
      t.note('병문안: 다음 날이면 2일째', (await t.waitText('병원 정문 앞에 서 있다.', 3000)) && (await t.hasText('2일째')));
      await toRoom();
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
      await t.waitText('병원 정문 앞에 서 있다.', 3000);
      await toRoom();
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
      t.note('병문안: 2회차는 1일째부터', (await t.waitText('병원 정문 앞에 서 있다.', 3000)) && (await t.hasText('1일째')));
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
      // `heard`: something she should say first, checked before the taps move her on
      const talk = async (choice = '별일 없었어', heard = null) => {
        await toRoom();
        await tapUntil('아무 얘기나');
        await t.clickText(choice);
        const said = heard ? await t.waitText(heard, 3000) : true;
        if (heard) await t.shot('tell_story.png');
        for (let i = 0; i < 20; i++) {
          if ((await t.hasText('뭐 들고 있어')) || (await t.hasText('오늘 얘기 잘 들었어'))) return said;
          if (await t.hasText('어떤 감정으로')) await t.clickText('잘 모르겠어요');
          else await t.click(195, 170);
          await sleep(300);
        }
        return said;
      };
      const openMap = async () => {
        await t.clickText('지도');
        await sleep(200);
      };
      const toClue = async () => {
        await openMap();
        await t.clickText('(시험) 단서 앞');
        await sleep(300);
      };
      const toShop = async () => {
        await openMap();
        await t.clickText('(시험) 매점 앞');
        await sleep(300);
        await t.clickText('매점 주인에게 말 걸기');
        await sleep(200);
      };
      const pickClue = async () => {
        await t.clickText('무언가 떨어져 있다');
        await sleep(700);
      };
      const stepBack = async () => {
        await t.clickText('뒤로가기');
        await sleep(600);
      };
      const nextDay = async () => {
        await openMap();
        await t.clickText('빛을 따라 다음 날로');
        await t.waitText('병원 정문 앞에 서 있다.', 3000);
      };
      const showMemory = async (name, title, thenText) => {
        await t.clickText(name);
        const ok = await t.waitText(title, 3000);
        await tapUntil(thenText);
        return ok;
      };

      await talk();
      await tapUntil('병실 앞 복도');
      // the doctor's room comes first; the clue is the goal after it (check-visit-logic.mjs)
      t.note('병문안: 2회차에도 먼저 의사 선생님의 방', await t.hasText('4층 의사 선생님의 방에 가기'));

      // the doctor's request: taken on, then talked through with questions, a breath together, and settled
      await openMap();
      await t.clickText('(시험) 의사 앞');
      await sleep(400);
      await t.clickText('의사 선생님에게 말 걸기');
      t.note('병문안: 의사가 파국화에 빠진 보호자를 부탁', (await tapUntil('해 볼게요')) && (await t.hasText('오늘은 어려워요')));
      await t.shot('request_doctor.png');
      await t.clickText('해 볼게요');
      t.note('병문안: 부탁을 받으면 어디로 갈지', await t.waitText('3층 휴게실이에요', 2000));
      await stepBack();
      t.note('병문안: 목표가 부탁 상대', await t.hasText('3층 지친 보호자와 이야기하기'));
      await openMap();
      await t.clickText('(시험) 부탁 상대 앞');
      await sleep(500);
      await t.clickText('지친 보호자에게 말 걸기');
      t.note('병문안: 보호자가 최악을 말함', await tapUntil('괜찮을 거예요. 너무 걱정하지 마세요.'));
      await t.shot('request_choices.png');
      // AI on: write to them yourself. A crisis is never sent; with no relay here, the choices still carry it
      t.note('병문안: AI를 켜면 직접 말하기', await t.clickText('직접 말하기'));
      await sleep(300);
      await t.fillTextarea('요즘 죽고 싶어');
      await sleep(150);
      await t.clickText('말하기');
      t.note('병문안: 직접 쓴 위기 표현은 보내지 않고 안내', await t.waitText('그 말은 그냥 넘기고 싶지 않아요. 혼자 견디지 말고, 아래 번호로 전화해 보세요. 24시간 받아 줘요.', 2000));
      await t.click(195, 170);
      await sleep(200);
      await t.clickText('직접 말하기');
      await sleep(300);
      await t.fillTextarea('아이 열은 언제부터 났어요?');
      await sleep(150);
      await t.clickText('말하기');
      // locally there's no relay, so the notice; on the live site Gemini answers as them (one billed text call)
      t.note('병문안: 직접 쓴 말에 답이 오거나, 못 받으면 선택지로 안내', await waitFor(async () => (await t.hasText('(지금은 답을 받을 수 없어요. 아래에서 골라 주세요.)')) || !(await t.centerOfText('…')), 50000));
      await t.shot('request_written.png');
      await t.click(195, 170);
      await sleep(200);
      await t.clickText('괜찮을 거예요. 너무 걱정하지 마세요.');
      t.note('병문안: 무조건 안심시키면 닫히고 다시 고름', (await t.waitText('그 말이 제일 안 들려요', 2000)) && (await t.hasText('의료진은 뭐라고 하던가요?')));
      await t.clickText('열이 난다는 게 꼭 잘못됐다는 뜻일까요? 의료진은 뭐라고 하던가요?');
      await tapUntil('가장 나쁜 경우, 가장 좋은 경우, 가장 그럴 법한 경우를 하나씩 떠올려 보면 어떨까요?');
      await t.clickText('가장 나쁜 경우, 가장 좋은 경우, 가장 그럴 법한 경우를 하나씩 떠올려 보면 어떨까요?');
      await tapUntil('전에도 이렇게 최악부터 떠올렸던 적이 있으세요? 그때는 어떻게 됐어요?');
      await t.clickText('전에도 이렇게 최악부터 떠올렸던 적이 있으세요? 그때는 어떻게 됐어요?');
      // their day by the river, walked through as them: the boy at the water, then gone, then found
      await tapUntil('강가의 아이에게 가기');
      t.note('병문안: 그때의 강가로 감', await t.waitText('강가의 아이에게 가기', 4000));
      await sleep(400);
      await t.shot('river_start.png');
      await press('앞으로', 3);
      await press('왼쪽');
      await press('앞으로', 2);
      await press('오른쪽');
      t.note('병문안: 물가의 아이와 이야기', await t.clickText('아이에게 말 걸기'));
      await tapUntil('텐트부터 치고 올게. 물에는 들어가지 마.');
      await t.shot('river_boy.png');
      await t.clickText('텐트부터 치고 올게. 물에는 들어가지 마.');
      await tapUntil('아이 찾기');
      t.note('병문안: 아이가 사라짐', await t.waitText('아이 찾기', 4000));
      await sleep(400);
      await press('왼쪽');
      await press('앞으로', 2);
      t.note('병문안: 찾는 동안 최악의 생각', (await t.hasText('왜 눈을 뗐지. 텐트가 뭐라고.')) || (await t.hasText('소리라도 질렀으면 들렸을 텐데.')));
      await t.shot('river_lost.png');
      // round the reeds: north, east along the top, then down to where they end
      await press('왼쪽');
      await press('앞으로', 2);
      await press('오른쪽');
      await press('앞으로', 4);
      await press('오른쪽');
      await press('앞으로', 2);
      await press('오른쪽');
      await press('앞으로');
      t.note('병문안: 바위 뒤의 아이', await t.clickText('아이에게 말 걸기'));
      t.note('병문안: 아이는 물수제비를 뜨고 있었음', await t.waitText('네 번 튀었어요', 2000));
      await sleep(500);
      await t.shot('river_found.png');
      await tapUntil('…아니야. 다시 해 봐. 이번엔 보고 있을게.');
      await t.clickText('…아니야. 다시 해 봐. 이번엔 보고 있을게.');
      t.note('병문안: 다시 병원에서 그날을 돌아봄', await tapUntil('현실보다 먼저 달려갔네요', 30));
      t.note('병문안: 같이 숨 고르기를 권함', await tapUntil('같이 숨 좀 고르고 갈까요?'));
      await t.clickText('같이 숨 좀 고르고 갈까요?');
      t.note('병문안: 숨 고르기', await t.waitText('숨을 들이쉬어요', 2000));
      await sleep(1500);
      await t.shot('request_breathe.png');
      await t.clickText('충분해요');
      t.note('병문안: 부탁이 풀림', await t.waitText('머릿속이 좀 조용해졌어요', 2000));
      await stepBack();
      t.note('병문안: 풀고 나면 다음 목표', await t.hasText('1층에서 개목걸이 찾기'));
      await openMap();
      await t.clickText('요정의 쪽지');
      t.note('병문안: 2회차 지도에 요정의 쪽지', await t.waitText('1일째 · 1층 · 개목걸이', 2000));
      await t.clickText('닫기');
      await sleep(200);
      await toClue();
      t.note('병문안: 그날 그 층에 단서가 있음', await t.hasText('무언가 떨어져 있다'));
      await t.shot('visit_floor1.png');
      await pickClue();
      t.note('병문안: 주우면 회상 없이 문구만', (await t.waitText('개목걸이를 주웠다', 2000)) && !(await t.hasText('아침 산책')));
      await t.shot('hold_clue.png');
      await stepBack();
      await toShop();
      t.note('병문안: 매점은 하루에 3개', (await t.waitText('귤', 2000)) && (await t.hasText('볼펜')) && (await t.hasText('머리끈')));
      await t.shot('visit_shop.png');
      await t.clickText('귤');
      t.note('병문안: 선물은 하루에 1개', (await t.waitText('귤 하나를 샀다', 2000)) && !(await t.hasText('볼펜')));
      await stepBack();

      await nextDay();
      t.note('병문안: 2회차는 빛을 따라 기다리지 않고 다음 날', await t.hasText('2일째'));
      t.note('병문안: 다음 날 소녀에게 그 이야기', await talk('3층 보호자분 이야기', '최악부터 생각하는 거, 나도 잘해.'));
      t.note('병문안: 다음 날 선물과 단서를 고를 수 있음', (await t.hasText('귤')) && (await t.hasText('개목걸이')));
      await t.shot('visit_give.png');
      await t.clickText('귤');
      t.note('병문안: 선물에 따라 반응', await t.waitText('못 먹는데 왜 사 왔어', 2000));
      await tapUntil('뭐 들고 있어');
      t.note('병문안: 단서를 보여 주면 회상', await showMemory('개목걸이', '아침 산책', '오늘 얘기 잘 들었어'));
      await tapUntil('병실 앞 복도');
      await openMap();
      t.note('병문안: 단서 없는 날엔 없음', !(await t.hasText('(시험) 단서 앞')));
      await t.clickText('닫기');
      await sleep(200);
      await toShop();
      t.note('병문안: 품목이 날마다 달라짐', (await t.waitText('초콜릿', 2000)) && !(await t.hasText('귤')));
      await stepBack();

      await nextDay();
      await talk();
      await tapUntil('병실 앞 복도');
      await toClue();
      await pickClue();
      await stepBack();
      await nextDay();
      await talk();
      t.note('병문안: 3층 단서 회상', await showMemory('과자봉지', '마지막 한 개', '오늘 얘기 잘 들었어'));
      await tapUntil('병실 앞 복도');
      await toClue();
      await pickClue();
      await stepBack();
      await nextDay();
      await talk();
      t.note('병문안: 2층 단서 회상', await showMemory('운동화 끈', '꼴찌', '오늘 얘기 잘 들었어'));
      await tapUntil('병실 앞 복도');
      await nextDay();
      await talk();
      await tapUntil('병실 앞 복도');
      await toClue();
      await pickClue();
      await stepBack();
      await nextDay();
      await talk();
      t.note('병문안: 4층 단서 회상', await showMemory('노래방 쿠폰', '소리 지르기', '나무까지 가 볼래'));
      t.note('병문안: 의사의 부탁을 다 풀면 해피엔딩', await t.hasText('같이 내려가 줘'));
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

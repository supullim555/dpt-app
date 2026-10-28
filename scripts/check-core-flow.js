// The core-flow regression check: login gate → intro → daily check-in → quest widget
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

// src/features/dialogue/DialogueExercise.tsx labels the submit button '완료' only on the LAST question
// of however many are asked, '다음' on every one before that — a script that always clicks '다음'
// will stall on the final question (this bit the test suite once already, see §31).
const submitLabel = (index, total) => (index < total - 1 ? '다음' : '완료');

async function answerDialogue(t, questions, answers) {
  for (let i = 0; i < questions.length; i++) {
    await t.tapAnyOf([questions[i]]);
    await sleep(400);
    await t.fillTextarea(answers[i]);
    await sleep(200);
    await t.clickText(submitLabel(i, questions.length));
    await sleep(600);
  }
}

async function main() {
  const { passed } = await withBrowser(
    BASE,
    async (t) => {
      await t.passStartupGates();

      // '외재화 인터뷰' is the label QuestWidget shows under the externalization-interview
      // button (§32) — used here instead of its old 🎭 emoji icon, which no longer appears in
      // the DOM at all now that the icon is a generated image (QUEST_ICON_SOURCES).
      const EXERCISE_LABEL = '외재화 인터뷰';
      t.note('이야기 탭 없음 (하단 네비에 "이야기" 텍스트 없음, §27에서 메모로 통합)', !(await t.hasText('이야기')));
      t.note('체크인 대화 중엔 퀘스트 위젯 숨김 (버튼 라벨 안 보임)', !(await t.hasText(EXERCISE_LABEL)));

      // finish the daily check-in to get to the idle room
      await t.tapAnyOf(GREETINGS);
      await sleep(500);
      await t.tapAnyOf([DAILY_QUESTIONS[0]]);
      await sleep(400);
      await t.fillTextarea('테스트1');
      await sleep(200);
      await t.clickText(submitLabel(0, DAILY_QUESTIONS.length));
      await sleep(600);
      // §36: a submitted answer now stays visible as a small echoed line while the next question
      // is asked, instead of just vanishing into the input clearing — check it's actually there.
      t.note('이전 답변이 대화 기록으로 남아 보임 (테스트1)', await t.hasText('테스트1'));
      await t.tapAnyOf([DAILY_QUESTIONS[1]]);
      await sleep(400);
      await t.fillTextarea('테스트2');
      await sleep(200);
      await t.clickText(submitLabel(1, DAILY_QUESTIONS.length));
      await sleep(600);
      // the stat-up toast (§33) shares useDialogueCompletion's 1800ms hold, so it must be
      // checked before that window closes — split the old flat 2200ms sleep to land inside it.
      await sleep(300);
      t.note('체크인 스탯업 토스트 보임 (유대감 +2)', await t.hasText('유대감 +2'));
      await sleep(1900); // total ~2200ms, same as before, past the thank-you bubble's hold

      t.note('체크인 끝난 뒤 퀘스트 위젯 노출 (버튼 라벨 보임)', await t.hasText(EXERCISE_LABEL));
      await t.shot('01_idle_with_widget.png');

      // collapse / expand the quest widget
      await t.clickText('⌃');
      await sleep(400);
      t.note('접기 버튼 누르면 퀘스트 아이콘들 숨겨짐', !(await t.hasText(EXERCISE_LABEL)));
      t.note('접힌 토글(📋) 노출', await t.hasText('📋'));
      await t.shot('02_collapsed.png');
      await t.clickText('📋');
      await sleep(400);
      t.note('다시 펼치면 퀘스트 아이콘 복귀', await t.hasText(EXERCISE_LABEL));

      // start the externalization-interview exercise from the quest widget
      t.note('퀘스트 버튼(외재화 인터뷰) 클릭됨', await t.clickText(EXERCISE_LABEL));
      await sleep(1000);
      t.note(
        '실습 대화 시작(리드인 또는 첫 질문 노출)',
        (await t.hasText('불안이 나를 찾아올 때')) || (await t.hasText('이름을 붙여볼까요'))
      );
      await t.shot('03_exercise_running.png');

      // Dismiss the exercise's lead-in line (DialogueExercise always shows exactly one
      // non-answerable beat before the first question here — the exercise's own summary, since
      // a fresh guest account has no past callback to quote instead) before answering.
      await t.tapAnyOf(['"나는 불안한 사람"이 아니라 "불안이 나를 찾아올 때"로 말하며 문제에 이름과 생김새를 붙이고, "불안이 못 이겼던 날"을 찾습니다.']);
      await sleep(400);

      await answerDialogue(
        t,
        [
          '요즘 나를 자꾸 찾아오는 감정이나 생각이 있다면, 이름을 붙여볼까요? (예: 불안이, 걱정이)',
          '그 친구는 주로 언제, 어떤 상황에서 나를 찾아오나요?',
          '최근에 그 친구가 나를 이기지 못했던 순간이 있었나요? 어떤 날이었는지 적어보세요.',
        ],
        ['테스트 답변 1번째', '테스트 답변 2번째', '테스트 답변 3번째']
      );

      await sleep(1000);
      t.note('실습 완료 문구 노출', await t.hasText('고마워요'));
      t.note('실습 완료 스탯업 토스트 보임 (용기 +2)', await t.hasText('용기 +2'));
      await t.shot('04_exercise_done.png');
      await sleep(2200);
      t.note('실습 완료 후 홈 유휴 상태로 복귀 + 퀘스트 위젯 재노출', await t.hasText(EXERCISE_LABEL));
      t.note('완료한 퀘스트에 체크 표시(✓) 보임', await t.hasText('✓'));
      await t.shot('05_back_to_idle.png');

      // status overlay (§34/§35) — reached from Home's StatusBadge, always visible (not hidden
      // while a panel is open like QuestWidget). A translucent floating window over the room
      // (StatusOverlay), not a navigated screen, so it's dismissed via its own ✕ button rather
      // than the '‹' back arrow used by actual screen pushes elsewhere in this script.
      t.note('상태 버튼 노출', await t.hasText('📊 상태'));
      t.note('상태 창 열림', await t.clickText('📊 상태'));
      await sleep(600);
      const STAT_LABELS = ['용기', '통찰', '희망', '유연함', '평온', '유대감'];
      let allStatsShown = true;
      for (const label of STAT_LABELS) {
        allStatsShown = allStatsShown && (await t.hasText(label));
      }
      t.note('상태 창에 능력치 6종 모두 보임', allStatsShown);
      await t.shot('06_status_overlay.png');
      await t.clickText('✕');
      await sleep(400);
      t.note('상태 창 닫힘 (✕)', !(await t.hasText('용기')));

      // AI chat entry from the quest widget
      t.note('퀘스트 위젯의 AI(✨) 버튼 클릭됨', await t.clickEmoji('✨'));
      await sleep(1000);
      t.note('AI 채팅 화면으로 이동됨', await t.hasText('편하게 이야기해도 돼요'));
      await t.shot('07_ai_chat.png');

      // memo tab shows the completed exercise
      await t.clickText('‹');
      await sleep(800);
      await t.clickText('메모');
      await sleep(1000);
      t.note('메모 탭에 방금 한 실습(문제 외재화 인터뷰) 기록 보임', await t.hasText('문제 외재화 인터뷰'));
      await t.shot('08_memo_shows_exercise.png');

      // The gate's full breathing flow (useBreathPacer, v0.25) — every check above skips it.
      // Reloading lands back on the gate; one skipped visit is on record, so it's 2 sighs
      // (src/features/gate/history.ts breathCyclesFor), ~6.4s each.
      await t.navigate(BASE);
      t.note('관문: 호흡 2회 끝나고 "조금 더 있을까?" 노출', await t.waitText('조금 더 있을까?', 25000));
      await t.clickText('조금 더');
      await sleep(600);
      t.note('관문: "조금 더" 누르면 호흡 재개', !(await t.hasText('조금 더 있을까?')));
      t.note('관문: 한 번 더 쉰 뒤 다시 "조금 더 있을까?"', await t.waitText('조금 더 있을까?', 12000));
      // left unanswered, it passes by itself after 3s
      t.note('관문: 응답 없으면 감정 고르기로 자동 진행', await t.waitText('지금 마음에 가까운 말이 있다면?', 6000));
      await t.clickText('잘 모르겠어요');
      await sleep(500);
      await t.waitText('0에서 10 중에', 4000);
      await t.clickText('5');
      t.note('관문: 점수 고르면 홈으로 들어감', await t.waitText('🫧 숨 고르기', 6000));
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
  process.exit(passed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

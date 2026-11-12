import type { Beat } from './CardScene';
import { DESCENT_URL, LAST_LIGHT_URL } from './cutscenes';
import type { LyingPart, PersonLook } from './hospitalArt';
import { CLUES, type ClueId, type EndingId } from './progress';

// First draft by Claude, for the user to rewrite (docs/계획서.md). Needs expert review
// before anyone but the user sees it.
//
// Who she is : dry and a little playful, because she has accepted that she's dying and is sad
// about it. Acceptance is not peace: she still wants more time, and her jokes never make light of the
// player's pain. Her name stays unsaid until the end.
//
// Rules these already keep to : death is never named or shown as peace or relief, and nothing
// blames the player for staying away. Keep to them when replacing the text.

export const DAY_LINES: Record<number, string[]> = {
  1: ['편지를 꽤 많이 보냈거든. 답이 온 건 처음이야.', '창밖에 은행나무가 보여. 난 요즘 저걸 보는 게 일이야. 퇴근은 없고.'],
  2: ['네 얘기, 자기 전에 또 생각났어.', '바깥은 무슨 냄새가 나? 여긴 소독약 냄새뿐이라, 네 옷에서 나는 냄새가 제일 재밌어.'],
  3: ['간호사 선생님이 오늘은 머리를 묶어 줬어. 이 핀은 내가 고른 거고.', '아픈 사람의 좋은 점이 하나 있어. 아무도 숙제를 안 내 줘.'],
  4: ['밤이 제일 길어. 복도 불빛을 세다 보면 아침이 와.', '무서운 건 아닌데. 아니, 조금 무서워. 방금 그 말은 못 들은 걸로 해 줘.'],
  5: ['은행잎이 많이 떨어졌어. 세어 보다가 말았어.', '다 받아들였다고 생각했거든. 근데 잎이 떨어지는 건 아직도 좀 싫어.'],
  6: ['내일이면 일주일이네.', '사실 저 나무 아래 한번 서 보고 싶었어. 창으로만 봤거든. 비밀이야.'],
  7: ['오늘은 네 얘기를 좀 더 오래 듣고 싶었어.', '시간이 더 있었으면 좋겠다. 이런 말은 안 하려고 했는데.'],
};

// What you see as you come through her door, each day: the state she's in (girlDays.ts draws it). What
// you notice, not what it means. No numbers, no treatment, nothing that says how long.
export const ARRIVAL_LINES: Record<number, string> = {
  1: '누운 채로 창밖을 보고 있다. 문소리에 고개만 돌린다.',
  2: '수첩을 무릎에 두고 앉아 있다. 들어가자 얼른 덮는다.',
  3: '머리를 묶었다. 머리핀 하나에만 색이 있다.',
  4: '등받이에 기대 있다. 어제까지 없던 링거가 옆에 서 있다.',
  5: '어제보다 더 기대앉았다. 머리맡에 은행잎이 몇 장 있다.',
  6: '누운 채로 창 쪽을 보고 있다. 부르니 천천히 돌아본다.',
  7: '누운 채로 문 쪽을 보고 있었다. 이불 밖으로 손이 나왔다.',
};

// Day title cards. Placeholders too; the real ones should read differently once the week is over.
export const DAY_TITLES: Record<number, string> = {
  1: '당첨자',
  2: '바깥 냄새',
  3: '고른 것',
  4: '복도의 불빛',
  5: '세다 만 잎',
  6: '비밀',
  7: '오늘은',
};

export const TELL_QUESTION = {
  text: '오늘은 무슨 일 있었어? 아무 얘기나 해 줘.',
  choices: ['별일 없었어', '말하기 어려워', '잘 모르겠어'],
};

// The opening. Each step shows one image from VISIT_OPENING with either a line (worded by the user) or
// the letter itself. She mailed these to strangers at random, and states the seven days plainly.
export const LETTER = `처음 보는 사람에게.

아무 주소나 골라서 잔뜩 보냈어.
이걸 읽고 있다면, 당첨을 축하해. 상품은 없어.

나는 이제 7일밖에 시간이 없대.
그래서 내가 모르는 세상 이야기를 듣고 싶어.
별일 아니어도 돼. 별일 아닌 게 제일 궁금하니까.

은행나무가 보이는 병실에서, 누군가.`;

export const OPENING_STEPS: { image: number; line?: string; letter?: boolean }[] = [
  { image: 0, line: '하나의 편지가 나를 찾아왔다.' },
  { image: 1, letter: true },
  { image: 1, line: '밖에 나가지 못하는 시한부의 소녀' },
  { image: 2, line: '나는 그 아이에게 이야기를 하려 간다.' },
];

export const GAME_TITLE = '병문안'; // working title

export const FIRST_GREETING = '진짜 왔네. 당첨자.';
export const RETURN_GREETING = '왔구나.';
export const GOODBYE = '오늘 얘기 잘 들었어. 내일 또 와도 되고, 천천히 와도 돼.';
export const CRISIS_LINES = ['그 말, 그냥 넘기고 싶지 않아.', '혼자 견디지 않아도 돼. 아래 번호는 24시간 받아 줘.'];

// The end of each visit but the last: someone comes in and sends you out for her treatment.
export type StaffCall = { who: '간호사' | '의사'; line: string };
export const STAFF_CALLS: Record<number, StaffCall> = {
  1: { who: '간호사', line: '이제 치료 시간이에요. 보호자분 아니시죠? 오늘은 나가 주셔야 해요.' },
  2: { who: '간호사', line: '죄송해요, 치료 시작해야 해서요. 밖으로 나가 주세요.' },
  3: { who: '간호사', line: '검사 들어가야 해요. 오늘은 여기까지 해 주세요.' },
  4: { who: '간호사', line: '오늘은 치료가 길어질 거예요. 나가 주세요.' },
  5: { who: '간호사', line: '치료해야 해서요, 이제 나가 주시겠어요?' },
  6: { who: '간호사', line: '치료 시간이에요. 내일 또 오세요.' },
};
// After the crisis lines being ordered out would read as a dismissal, so this one only sees you off.
// The nurse who sends you out then sends you on to the doctor's room (not after the crisis lines). v0.93: always the
// nurse (when the doctor said "제 방에", the nurse on screen seemed to mean hers), and from day 2 "again".
export const doctorCall = (day: number) =>
  day <= 1 ? '아, 그리고 의사 선생님이 잠깐 뵙자고 하셨어요. 복도 오른쪽 끝 방이에요.' : '아, 이번에도 선생님이 부르셔요. 복도 오른쪽 끝 방이에요.';
export const STAFF_CALL_GENTLE: StaffCall = { who: '간호사', line: '치료 시간이 됐어요. 오늘은 여기까지예요. 조심히 들어가세요.' };

// The hospital. She's at the top; the higher the floor, the heavier. No one else's suffering is shown.
// The walkable version is in hospitalMap.ts; `line` is what you notice on arriving.
export const FLOORS: Record<number, { name: string; line: string; open?: string }> = {
  0: { name: '작년 여름, 강가', line: '' },
  4: { name: '4층 호스피스 병동', line: '병실 앞 복도. 문은 닫혀 있다. 치료가 끝날 때까지 들어갈 수 없다.', open: '복도 가운데에 문이 하나 열려 있다.' },
  3: { name: '3층 중증 병동', line: '보호자들이 복도 의자에서 말없이 앉아 있다.' },
  2: { name: '2층 일반 병동', line: '링거대를 끌고 천천히 걷는 사람들이 있다. 내일 퇴원한다는 말소리가 들린다.' },
  1: { name: '1층 로비', line: '사람이 가장 많다. 유리문 너머 안뜰에 은행나무가 서 있다.' },
};
// The first walk in (hospitalMap.ts). First draft: how each thing works, in the fewest words that do it.
// A string is the same for everyone; a pair is [on a touch screen, with a keyboard].
export const TUTORIAL_TIPS: Partial<Record<string, string | [string, string]>> = {
  walk: [
    '화면 아래의 버튼을 눌러 움직여요. ↑는 한 칸 앞으로, ↺와 ↻는 왼쪽과 오른쪽으로 돌기, ↓는 뒤돌기예요. 먼저 한 걸음 걸어 보세요.',
    '방향키나 W, A, S, D 키로 움직여요. ↑(W)는 한 칸 앞으로, ←(A)와 →(D)는 그쪽으로 돌기, ↓(S)는 뒤돌기예요. 화면 아래의 버튼을 눌러도 돼요. 먼저 한 걸음 걸어 보세요.',
  ],
  goal: '왼쪽 위 네모가 지금 할 일이에요. 오른쪽 위 작은 지도에 가는 길이 노란 점으로 이어져 있어요. 빨간 화살표가 나예요. 점을 따라 걸어 보세요.',
  talk: [
    '사람이나 물건 앞에 서면 아래에 흰 버튼이 떠요. 눌러서 말을 걸어 보세요.',
    '사람이나 물건 앞에 서면 아래에 흰 버튼이 떠요. 누르거나 Enter 키로 말을 걸어 보세요.',
  ],
  back: [
    '화면을 누르면 다음 말로 넘어가요. 다 들었으면 뒤로가기를 누르세요.',
    '화면을 누르거나 Enter 키를 누르면 다음 말로 넘어가요. 다 들었으면 뒤로가기나 Esc 키를 누르세요.',
  ],
  shop: '작은 지도의 노란 점을 따라 매점으로 가서, 매점 주인 앞에 서 보세요.',
  buy: '말을 걸면 아래에 오늘의 선물이 떠요. 하루에 하나만 살 수 있어요. 하나 골라 보세요.',
  shopBack: '산 선물은 병실에서 소녀에게 건넬 수 있어요. 뒤로가기를 눌러 나오세요.',
  lift: [
    '이제 4층으로 올라가요. 화살표가 엘리베이터로 이끌어요. 앞에 서면 타는 버튼이 떠요. 옆의 계단도 괜찮아요.',
    '이제 4층으로 올라가요. 화살표가 엘리베이터로 이끌어요. 앞에 서면 타는 버튼이 떠요. Enter 키로도 탈 수 있어요. 옆의 계단도 괜찮아요.',
  ],
  room: '한 번 가 본 층은 지도 버튼으로 바로 갈 수 있어요. 화살표를 따라 열린 문을 지나면 소녀를 만나요.',
  day: '소녀는 하루에 한 번 만날 수 있어요. 간호사 말대로 4층 끝의 의사 선생님 방에 들러 보세요. 들르지 않아도 괜찮아요.',
  nextDay: '1층 정문으로 나가면 다음 날을 바로 이어서 할 수 있어요. 꼭 그래야 하는 건 아니에요. 하루에 하루씩 와도 돼요.',
};
export const TUTORIAL_TELL = '고르거나 직접 써서 오늘 일을 들려주세요. 쓰고 싶은 만큼만 쓰면 돼요.';
export const TUTORIAL_GIVE = '가진 선물과 주운 물건은 모두 건넬 수 있어요. 그냥 두어도 돼요.';
export const TUTORIAL_SKIP = '튜토리얼 건너뛰기';
export const TUTORIAL_OK = '알겠어요';
// Writing to someone yourself (AI on): what shows while waiting, when there's no answer, and instead of sending at all.
export const WRITE_OWN = '직접 말하기';
export const WRITE_WAITING = '…';
export const WRITE_FAILED = '(지금은 답을 받을 수 없어요. 아래에서 골라 주세요.)';
export const WRITE_CRISIS = '그 말은 그냥 넘기고 싶지 않아요. 혼자 견디지 말고, 아래 번호로 전화해 보세요. 24시간 받아 줘요.';
// Leaving by the front door once she's been seen.
export const nextDayQuestion = (day: number) => `${day}일차를 진행하시겠습니까?`;
export const untilTomorrow = (hours: number, minutes: number) => `다음 날은 자정에 열려요. ${hours}시간 ${minutes}분 남았어요.`;
export const TUTORIAL_TITLE = '도움말';
// What the guide at the front desk says the first time, so the shop comes up on its own.
export const GUIDE_FIRST_LINES = ['병문안 오셨어요? 호스피스 병동은 4층이에요.', '빈손이 쑥스러우시면 매점에 먼저 들러 보세요. 이 층에 있어요.'];
export const ROOM_SHUT = '치료 중이다. 오늘은 더 들어갈 수 없다.';

// Who you can talk to, by floor and map letter. `clue` is what they let slip on the day there's something
// to find near them.
// She talks through VisitScreen; this entry only names her and draws her.
// `lines` on days 1–2 (`day2`, if given, on day 2); `later` on days 3–4 and 5–7 (v0.91), so a week of visits doesn't hear the same words. A clue's
// line still comes first on its day, and the doctor keeps his one line (his requests are their own talk).
/** What someone says today, apart from their clue and their requests. */
export const linesOn = (p: { lines: string[]; day2?: string; later?: [string, string] }, day: number) =>
  p.later && day >= 3 ? [p.later[day >= 5 ? 1 : 0]] : day === 2 && p.day2 ? [p.day2] : p.lines;

export const PEOPLE: Record<string, { name: string; look: PersonLook | LyingPart; lines: string[]; day2?: string; later?: [string, string]; clue?: { day: number; line: string } }> = {
  '4n': { name: '담당 간호사', look: 'nurse', lines: ['보호자분은 아니시죠? 그래도 오늘 웃었어요, 그 아이.'], day2: '오늘도 또 오셨네요. 아이는 병실에서 기다리고 있어요.', later: ['다녀가신 뒤로 그 아이가 창보다 문을 더 봐요.', '요즘 잠이 많아요. 오실 시간엔 꼭 깨어 있어요.'] },
  '4p': { name: '옆 병실 보호자', look: 'reader', lines: ['여기 앉아 있는 게 일이에요. 책은 거의 다 읽었고요.'], clue: { day: 6, line: '여기 책은 다 읽었어요. 휴게실 소파 위 책 사이에 별게 다 끼어 있더라고요.' }, later: ['어머니가 오늘 제 이름을 불렀어요.', '옆방에서 웃음소리가 나요. 손님 오시는 날만요.'] },
  '4v': { name: '자원봉사자', look: 'volunteer', lines: ['우표값이 꽤 들었어요. 그 아이가 몇 통을 썼는지 아세요?'], later: ['그 아이 편지, 제가 부쳤어요. 주소는 아무렇게나였고요.', '답장 온 건 당신 하나예요. 오래 와 주세요.'] },
  '3q': { name: '3층 간호사', look: 'nurse', lines: ['지금은 안 돼요. 저기 의자에 앉아 계세요.'], later: ['지금은 안 돼요. 조용한 날이 좋은 날이에요.', '아직이에요. 자판기 커피라도 드세요. 따뜻해요.'] , clue: { day: 3, line: '보호자분 계신 휴게실 의자 쪽에 뭐가 떨어져 있는 것 같던데요. 한번 보세요.' } },
  '3t': { name: '이송 요원', look: 'porter', lines: ['이거 오늘 못 치워요. 반대로 돌아가세요.'], later: ['이 수레, 오늘도 못 치워요. 내일은 꼭이요. 아마도요.', '또 막혀 있죠. 반대로 도시면 창이 하나 더 보여요.'] },
  '3c': { name: '미화원', look: 'worker', lines: ['층마다 냄새가 달라요. 오래 일하면 알게 돼요.'], clue: { day: 3, line: '휴게실 의자 밑 봉지요, 치우려다 말았어요. 일부러 둔 것 같아서.' }, later: ['은행잎이 신발에 붙어 올라와요. 4층까지 따라가더라고요.', '바닥은 매일 닦는데 매일 누가 걸어요. 그게 좋아요.'] },
  '3b': { name: '지친 보호자', look: 'visitor', lines: ['미안한데, 화가 나요. 누구한테인지는 모르겠어요.'], later: ['어제는 두 시간 잤어요. 많이 잔 거예요.', '아이가 오늘 밥을 반 그릇 먹었어요. …반이요. 반이나요.'] },
  '2d': { name: '곧 퇴원하는 청년', look: 'patient', lines: ['재활실이요? 아래쪽 복도, 가운데 문이요. 저는 이제 안 가도 돼요.'], later: ['재활실 가는 길은 이제 눈 감고도 가요. 문제는 바깥이죠.', '퇴원하면 뭐 할지 생각 중이에요. 일단 계단부터요.'] },
  '2k': { name: '심심한 아이', look: 'child', lines: ['끝말잇기 할래요? 이기면 재활실 어딘지 알려 줄게요.', '…사실 아래쪽 복도 가운데예요. 수레 때문에 옆으로 돌아가야 해요.'], later: ['오늘은 가위바위보 해요. …졌다. 재활실은 알죠?', '저 다음 주에 집에 간대요. 끝말잇기는 누구랑 해요?'] },
  '2h': { name: '창가의 할아버지', look: 'grandpa', lines: ['둘 줄 몰라도 돼요. 앉아만 있어요.'], later: ['장기는 혼자 둬도 져. 신기하지.', '우리 집 앞에도 은행나무가 있었지.'] },
  '2y': { name: '물리치료사', look: 'physio', lines: ['천천히 하면 돼요. 여긴 다들 천천히 해요.'], clue: { day: 4, line: '저 끈이요? 퇴원하는 분이 두고 가셨어요. 찾으러 안 오시네요.' }, later: ['오늘은 다들 잘 걸어요. 비 오기 전날은 다들 힘들어하는데.', '천천히 걸으면 창틀의 새 같은 게 보여요.'] },
  '4r': { name: '의사 선생님', look: 'doctor', lines: ['아직 면회 전이시죠? 그 아이 먼저 보고 오세요.'] },
  '1i': { name: '안내 직원', look: 'receptionist', lines: ['4층이요? 엘리베이터는 저쪽이에요. 층마다 표시가 있어요.'], later: ['또 오셨네요. 이제 제가 안내 안 해 드려도 되겠어요.', '매일 이 시간에 오시네요. 4층에서도 기다릴 거예요.'] },
  '1g': { name: '경비', look: 'guard', lines: ['정문은 늘 열려 있어요. 오는 사람보다 가는 사람이 더 천천히 걷죠.'], clue: { day: 1, line: '자판기 뒤에 뭐가 떨어졌던데, 손이 안 닿아요. 한번 흔들어 보세요.' }, later: ['은행잎을 세 번 쓸었어요. 바람이 자꾸 도로 가져다 놔요.', '나가실 때 위를 보세요. 4층 창이 보여요.'] },
  '1m': { name: '매점 주인', look: 'shopkeeper', lines: ['어서 와요. 오늘은 이것들이 있어요.'], later: ['어서 와요. 오늘 새로 들어온 것들이에요.', '또 왔네요. 오늘 건 내가 몇 개 골라 놨어요.'] },
  '1o': { name: '외래의 어르신', look: 'elder', lines: ['번호가 안 불리네. 앉아요, 어차피 안 불려.'], later: ['오늘도 안 불려. 그래도 사람 구경은 여기가 낫지.', '귤은 껍질만 봐도 알아. 단지 안 단지.'] },
  '1b': { name: '안뜰 벤치의 할머니', look: 'grandma', lines: ['이 나무가 나보다 늙었어. 잎 지는 건 매년 봐도 아깝더라.'], later: ['반은 떨어졌네. 남은 반이 버티는 게 더 예뻐.', '위층 창에서 누가 매일 내려다봐. 봤으려나.'] },
};

// Six days of shop stock (the seventh day goes straight to the ending). One a day, given on a later visit.
export const GIFTS: Record<number, { name: string; line: string }[]> = {
  1: [
    { name: '귤', line: '못 먹는데 왜 사 왔어. 냄새는 맡아도 되지? …아, 이거 좋다. 머리맡에 둘게.' },
    { name: '볼펜', line: '볼펜이네. 잘 나오는데? 뭐 쓸 건지는 비밀.' },
    { name: '머리끈', line: '머리 묶어 줄 사람은 많아. 그래도 이건 내 거 할게.' },
  ],
  2: [
    { name: '초콜릿', line: '먹으면 혼나. 그러니까 네가 내 앞에서 먹어. 맛 설명 자세히 해.' },
    { name: '손거울', line: '거울은 좀 그런데. …그래도 핀은 잘 어울리네. 고마워.' },
    { name: '낱말 퍼즐', line: '이거 어려운 거 맞지? 나 시간 많아. 아, 많진 않구나. 빨리 풀게.' },
  ],
  3: [
    { name: '곰 젤리', line: '곰을 어떻게 먹어. 못 먹어서 하는 말 아니야. 창가에 세워 둘게.' },
    { name: '수면 양말', line: '발이 제일 시렸는데 어떻게 알았어. 오늘 밤은 조금 덜 길겠다.' },
    { name: '엽서', line: '나한테 편지 쓰라는 거야? 그럼 네 주소 적어 줘. 이번엔 아무 주소 말고.' },
  ],
  4: [
    { name: '풍선', line: '병실에 풍선이라니, 애 취급이야? 창가에 묶어 줘. …조금 더 왼쪽.' },
    { name: '손수건', line: '울 일 있을 때 쓰라고? 없어. 없는데, 받아 둘게.' },
    { name: '스티커', line: '링거대에 붙일래. 이제 이 병원에서 제일 귀여운 링거대야.' },
  ],
  5: [
    { name: '핫팩', line: '따뜻하다. 잠깐만 이러고 있을게.' },
    { name: '립밤', line: '입술 튼 거 봤구나. 눈치 빠르네. 고마워.' },
    { name: '만화책', line: '1권만 사 오면 어떡해. 뒷이야기 궁금하잖아. …책임져.' },
  ],
  6: [
    { name: '사탕', line: '이건 입에 잠깐 물고 있어도 된대. 딸기 맛이다. 오랜만이네.' },
    { name: '은행잎 책갈피', line: '저 나무 거야? 아니어도 저 나무 걸로 할게.' },
    { name: '슬리퍼', line: '나 걸어 다니지도 않는데. …그래도 침대 밑에 둬 줘. 혹시 모르니까.' },
  ],
};
export const giftLine = (name: string) => Object.values(GIFTS).flat().find((g) => g.name === name)?.line ?? '';
// 을 after a final consonant, 를 after a vowel
const objectJosa = (word: string) => {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 !== 0 ? '을' : '를';
};
// v0.93: the shopkeeper says it, not a note to yourself
export const boughtLine = (name: string) => `${name}${objectJosa(name)} 샀네. 소녀와 만나서 주면 좋아할 거야.`;
export const SOLD_TODAY = '오늘은 이미 하나 샀다.';
export const GIVE_QUESTION = '뭐 들고 있어? 아까부터 궁금했어.';
export const GIVE_NOTHING = '오늘은 그냥 둘래';
// after the first: whatever else you carry can be given too
export const GIVE_MORE = '또 있어? 다 보여 줘.';
export const GIVE_DONE = '이제 됐어';

// Clues aren't hers: strangers' things, left about the hospital, each close to something she could do
// before she got this sick. Picked up one day, shown to her on a later visit.
export const CLUE_SPOT = '무언가 떨어져 있다';
export const CLUE_TEXT: Record<ClueId, { name: string; found: string; memory: string; lines: string[] }> = {
  collar: {
    name: '개목걸이',
    found: '구석에 버려진 낡은 개목걸이를 주웠다. 그 아이에게 보여 줄까.',
    memory: '아침 산책',
    lines: [
      '이거 어디서 났어? 내 건 아니야.',
      '우리 집에도 강아지가 있었어. 아침마다 나보다 먼저 일어나서 줄을 물고 왔어.',
      '동네 한 바퀴를 둘이서 뛰었어. 그땐 그게 귀찮았어. 웃기지.',
      '내가 입원하고 나서 죽었대. 마지막은 못 봤어.',
      '아직도 아침이면 발소리가 들리는 것 같아. 그 동네, 한 번 더 뛰어 보고 싶다.',
    ],
  },
  snack: {
    name: '과자봉지',
    found: '휴게실 의자 밑에 끼어 있던 빈 과자봉지를 주웠다. 그 아이에게 보여 줄까.',
    memory: '마지막 한 개',
    lines: [
      '아, 이 과자. 나 이거 진짜 좋아했어.',
      '학교 끝나면 친구랑 편의점 앞에 앉아서 하나를 나눠 먹었어. 마지막 한 개로 매번 싸웠어.',
      '지금은 뭘 먹어도 되는지 먼저 물어봐야 해. 대부분은 안 된대.',
      '봉지 냄새만 맡아 봐도 돼? …그래, 이 맛이었어.',
      '한 번만 더, 나 스스로 해 보고 싶어.',
    ],
  },
  laces: {
    name: '운동화 끈',
    found: '누가 떨어뜨린 운동화 끈을 주웠다. 그 아이에게 보여 줄까.',
    memory: '꼴찌',
    lines: [
      '운동화 끈이네. 나 달리기 꼴찌였어. 진짜로.',
      '운동회 날 끝까지 뛰고 나면 목이 막 타고, 심장이 귀까지 올라와서 쿵쿵거렸어.',
      '그때는 그게 힘든 건 줄 알았어.',
      '지금은 복도 끝까지도 못 가.',
      '꼴찌여도 좋으니까, 숨차게 뛰어 보고 싶다.',
    ],
  },
  coupon: {
    name: '노래방 쿠폰',
    found: '보호자 휴게실 책 사이에 꽂힌 노래방 쿠폰을 주웠다. 그 아이에게 보여 줄까.',
    memory: '소리 지르기',
    lines: [
      '풉. 병원에서 노래방 쿠폰이 왜 나와.',
      '시험 끝나면 애들이랑 갔어. 노래는 다들 못했어. 소리만 질렀지.',
      '이제는 크게 말하면 숨이 차.',
      '있잖아. 다 받아들였다고 계속 말했는데, 요즘 자꾸 하고 싶은 게 생겨.',
      '저 나무 아래까지만, 가 볼 수 있을까.',
    ],
  },
};

// What the fairy tells after an ending, and keeps in the hallway on later runs.
export const HINT_TITLE = '요정의 쪽지';
export const FOLLOW_LIGHT = '빛을 따라 다음 날로';
export const hintLines = () => CLUES.map((c) => `${c.day}일째 · ${c.floor}층 · ${CLUE_TEXT[c.id].name}`);

// Asked only from the second day, after she's listened, and because she's curious.
export const EMOTION_QUESTION = '오늘 하루는 어떤 감정으로 지냈어? 궁금하네.';

// v0.93: a hard feeling gets more than "그랬구나": she takes it in, says she knows it too, no advice.
const EMPATHY: Record<string, string[]> = {
  분노: ['화가 났구나. 화날 만한 일이었겠지.', '나도 가끔 이유 없이 다 미울 때가 있어.'],
  짜증: ['짜증 나는 날 있지. 나도 링거 줄이 자꾸 걸리면 짜증 나.', '그래도 하루는 지나가더라.'],
  억울함: ['억울했겠다. 억울한 건 말하지 않으면 계속 남아.', '나한테 말해 줘서 다행이야.'],
  답답함: ['답답했구나. 나도 창문이 안 열려서 답답할 때가 많아.', '그래도 이렇게 얘기하니까 조금 숨이 트이지?'],
  불만: ['마음에 안 드는 게 있었구나.', '그런 날은 투덜대도 돼. 내가 들어 줄게.'],
  미움: ['누군가 미웠구나. 미운 마음도 있을 수 있어.', '그 마음 때문에 네가 나쁜 사람이 되는 건 아니야.'],
  슬픔: ['슬펐구나. 슬픈 날은 슬픈 대로 있어도 괜찮아.', '나도 그런 날이 많아.'],
  서운함: ['서운했구나. 서운하다는 건 그만큼 마음을 줬다는 거래.', '나도 누가 안 오면 서운해.'],
  외로움: ['외로웠구나. 나도 밤에 복도 불빛만 있을 때 외로워.', '그래도 지금은 우리 둘이 있네.'],
  실망: ['실망했구나. 기대했던 만큼 아팠겠다.', '그래도 기대했던 너는 멋졌어.'],
  자책: ['자책을 느낄 때도 있지. 나도 내가 뭘 잘못해서 이렇게 된 건 아닐까, 자책이 들 때가 있어.', '그래도 우리는 하루를 이어 갈 수 있는 힘이 있어.'],
  무기력: ['아무것도 하기 싫은 날이었구나. 나도 그래.', '그런 날은 여기까지 온 것만으로도 충분해.'],
  피곤함: ['많이 피곤했구나. 피곤한데도 와 줬네.', '여기선 좀 쉬다 가.'],
  멍함: ['멍한 날도 있지. 나도 하루 종일 은행나무만 볼 때가 있어.', '그것도 쉬는 거야.'],
  두려움: ['무서웠구나. 무서운 걸 무섭다고 말하는 것도 용기래.', '나도 밤이 좀 무서워.'],
  걱정: ['걱정이 많았구나. 걱정은 소중한 게 있다는 뜻이래.', '오늘 밤엔 조금만 내려놔 봐.'],
  불안: ['불안했구나. 나도 검사 전날은 그래.', '그래도 그날도 결국 지나갔어.'],
  초조함: ['초조했구나. 시간이 안 가는 것 같았지?', '여기선 천천히 해도 돼.'],
  긴장: ['많이 긴장했구나. 어깨 한번 내려 봐.', '…나도 따라 할게.'],
  막막함: ['막막했구나. 어디서부터 해야 할지 모를 때 있지.', '오늘은 오늘 하루만 생각하자.'],
  창피함: ['창피했구나. 나도 병원복 입고 처음 친구 만났을 때 엄청 창피했어.', '시간 지나면 웃긴 얘기가 되더라.'],
  위축됨: ['작아지는 기분이었구나.', '그래도 너는 여기까지 와서 이야기해 줬잖아. 그건 작지 않아.'],
};
export const emotionLines = (word: string | null): string[] => (word ? EMPATHY[word] ?? [`${word}… 그랬구나.`] : ['잘 모르겠는 날도 있지.']);
export const keywordLine = (word: string) => `${word} 얘기구나.`;

type EndingScript = { title: string; lines: string[] };

export const ENDINGS: Record<EndingId, EndingScript> = {
  // No blame, and the empty bed isn't said to mean anything final.
  bad: {
    title: '침대가 비어 있다',
    lines: [
      '병실에 소녀는 없고, 머리맡에 편지 한 장이 놓여 있다.',
      '"그렇게 많이 보냈는데 와 준 사람이 있었어. 그걸로 충분히 좋은 기록이야."',
      '"못 온 날은 네 하루가 있었던 날이겠지. 그 얘기도 궁금했어."',
      '"너도 네 하루를 잘 지내 줘."',
    ],
  },
  letter: {
    title: '편지',
    lines: [
      '병실에 소녀는 없고, 머리맡에 편지 한 장이 놓여 있다.',
      '"네가 들려준 얘기들, 하나씩 다시 생각해 봤어. 내가 모르는 세상이 꽤 넓어졌어."',
      '"인사를 못 해서 아쉽다. 그래서 적어 둬. 고마웠어."',
    ],
  },
  withGirl: {
    title: '오늘은 왔구나',
    lines: ['왔구나. 마침 네 얘기가 듣고 싶었어.', '오늘 네가 들려준 얘기, 잘 가지고 있을게.', '와 줘서 고마워. 잘 가.'],
  },
  // She decides to go down herself; nothing here says wanting it is what heals her (docs/계획서.md).
  happy: {
    title: '나무 아래',
    lines: ['네가 들려준 병원 사람들 얘기, 계속 생각났어.', '다들 최악부터 생각하더라. 나도 그랬어.', '다 받아들인 줄 알았는데, 먼저 포기한 거였나 봐.', '나무까지 가 볼래. 같이 내려가 줘.'],
  },
  normal: {
    title: '인사',
    lines: ['일주일 동안 네 얘기 많이 들었어.', '덕분에 내가 모르는 세상이 꽤 넓어졌어.', '사실 좀 더 듣고 싶었어. 이건 농담 아니야.', '고마워. 잘 가.'],
  },
};

// The secret in her letter (docs/계획서.md): the will to live worn away without her noticing, and the
// wish to live anyway. Tidy at first, then crossed out and scribbled over; the last page says only
// "살고싶어". No mention of self-harm or means anywhere in these pages.
export const NOTEBOOK_TITLE = '그 아이의 수첩';

export type NotebookLine = { text: string; struck?: boolean; big?: boolean };
export const NOTEBOOK_PAGES: { day: number; tilt: number; scribble: number | null; lines: NotebookLine[] }[] = [
  { day: 1, tilt: 0, scribble: null, lines: [{ text: '답이 왔다. 신기하다.' }, { text: '기대는 안 했다. 기대 안 하는 건 잘한다.' }] },
  { day: 2, tilt: -0.5, scribble: null, lines: [{ text: '오늘은 아픈 데가 별로 없었다.' }, { text: '아픈 데가 없으면 아무 생각도 안 든다.' }, { text: '그게 제일 낫다.' }] },
  { day: 3, tilt: 0.8, scribble: null, lines: [{ text: '핀을 골랐다. 왜 골랐지.' }, { text: '어차피', struck: true }, { text: '예쁘니까.' }] },
  { day: 4, tilt: -1.2, scribble: 0, lines: [{ text: '무섭지 않다.' }, { text: '무섭지 않다.' }, { text: '무섭지 않다', struck: true }] },
  { day: 5, tilt: 1.6, scribble: 1, lines: [{ text: '다 괜찮다고 계속 썼는데', struck: true }, { text: '누구한테 쓰는 거지' }, { text: '괜찮다', struck: true }, { text: '괜찮다', struck: true }] },
  { day: 6, tilt: -2.2, scribble: 2, lines: [{ text: '나무' }, { text: '저 아래' }, { text: '그 사람이 또 올까', struck: true }, { text: '오면 뭐라고 하지' }] },
  { day: 7, tilt: 2.8, scribble: 2, lines: [{ text: '살고싶어', big: true }] },
];

export const FAIRY_LINES = [
  '어디선가 작은 빛이 나타나 말을 건다.',
  '"그 아이가 못 하게 된 일들이 병원 곳곳에 떨어져 있어. 날마다 다른 층에."',
  '"주워서 그 아이에게 보여 줘. 잊고 있던 걸 떠올릴 거야."',
  '"그리고 의사 선생님의 부탁을 끝까지 들어줘 봐. 무슨 일이 생길지도 몰라."',
  '"이제 내 빛을 따라가면 기다리지 않고 다음 날로 갈 수 있어."',
  '"한 번 더 찾아가 볼래?"',
];

// The way down, floor by floor, and the light. The turn: the grey we've watched all week was her sight.
// A fairy tale, and it says so.
const AMBER_WORLD = '#e3b64f';
export const HAPPY_BEATS: Beat[] = [
  { text: '소녀는 침대에서 내려와 바닥에 발을 댔다. 한참이 걸렸다.' },
  // filmed (v0.93): the way down, floor by floor in the seventh day's corridors; the four cards are its fallback
  { video: DESCENT_URL, covers: 4 },
  { text: '4층. 복도 불빛을 하나씩 지나간다.' },
  { text: '3층. 의자에 앉아 오래 쉰다. "괜찮아. 가."' },
  { text: '2층. "숨차다." 소녀가 웃는다.' },
  { text: '1층. 사람들 사이를 지나 안뜰로 나간다.' },
  // filmed (v0.87): she turns, the light, the colour, ending on the amber below. The two cards are its fallback.
  { video: LAST_LIGHT_URL, covers: 2 },
  { text: '은행나무 아래에서 소녀가 돌아서서 나를 본다.' },
  { text: '그때, 알 수 없는 빛이 눈앞을 가렸다.', bg: '#ffffff', ink: '#111111' },
  { text: '빛이 걷히자 소녀의 세상에 색이 돌아왔다.', bg: AMBER_WORLD, ink: '#1a1200' },
  { text: '내가 보던 회색 병실은, 그 아이의 눈에 비친 세상이었다.', bg: AMBER_WORLD, ink: '#1a1200' },
  { text: '소녀는 두 발로 서 있다. 아무도 이유를 설명하지 못했다.', bg: AMBER_WORLD, ink: '#1a1200' },
  { text: '이건 그런 동화다.', bg: AMBER_WORLD, ink: '#1a1200' },
];

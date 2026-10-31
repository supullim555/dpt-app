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
  3: { who: '의사', line: '검사 들어갑니다. 오늘은 여기까지 해 주세요.' },
  4: { who: '간호사', line: '오늘은 치료가 길어질 거예요. 나가 주세요.' },
  5: { who: '의사', line: '치료해야 하니 이제 나가 주시겠어요?' },
  6: { who: '간호사', line: '치료 시간이에요. 내일 또 오세요.' },
};
// After the crisis lines being ordered out would read as a dismissal, so this one only sees you off.
export const STAFF_CALL_GENTLE: StaffCall = { who: '간호사', line: '치료 시간이 됐어요. 오늘은 여기까지예요. 조심히 들어가세요.' };

// The hospital. She's at the top; the higher the floor, the heavier. No one else's suffering is shown.
export const FLOORS: Record<number, { name: string; lines: string[] }> = {
  4: { name: '병실 앞 복도', lines: ['문은 닫혀 있다. 치료가 끝날 때까지 들어갈 수 없다.', '오늘은 병원을 둘러보다 돌아가고, 내일 다시 오자.'] },
  3: { name: '3층 중증 병동', lines: ['보호자들이 복도 의자에서 말없이 앉아 있다.'] },
  2: { name: '2층 일반 병동', lines: ['링거대를 끌고 천천히 걷는 사람들이 있다. 내일 퇴원한다는 말소리가 들린다.'] },
  1: { name: '1층 로비', lines: ['사람이 가장 많다. 유리문 너머 안뜰에 은행나무가 서 있다.'] },
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
export const boughtLine = (name: string) => `${name} 하나를 샀다. 다음에 갈 때 건네자.`;
export const SOLD_TODAY = '오늘은 이미 하나 샀다.';
export const GIVE_QUESTION = '뭐 들고 있어? 아까부터 궁금했어.';
export const GIVE_NOTHING = '오늘은 그냥 둘래';

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
      '한 번만 더, 마지막 한 개로 싸워 보고 싶어.',
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

export const emotionLine = (word: string | null) => (word ? `${word}… 그랬구나.` : '잘 모르겠는 날도 있지.');
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
    lines: ['네가 들고 온 것들 때문에 자꾸 옛날 생각이 났어.', '다 받아들인 줄 알았는데, 아니었나 봐.', '나무까지 가 볼래. 같이 내려가 줘.'],
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
  '"주워서 그 아이에게 보여 줘. 전부 보여 주면 무슨 일이 생길지도 몰라."',
  '"이제 내 빛을 따라가면 기다리지 않고 다음 날로 갈 수 있어."',
  '"한 번 더 찾아가 볼래?"',
];

// The way down, floor by floor, and the light. The turn: the grey we've watched all week was her sight.
// A fairy tale, and it says so.
const AMBER_WORLD = '#e3b64f';
export const HAPPY_BEATS: { text: string; bg?: string; ink?: string }[] = [
  { text: '소녀는 침대에서 내려와 바닥에 발을 댔다. 한참이 걸렸다.' },
  { text: '4층. 복도 불빛을 하나씩 지나간다.' },
  { text: '3층. 의자에 앉아 오래 쉰다. "괜찮아. 가."' },
  { text: '2층. "숨차다." 소녀가 웃는다.' },
  { text: '1층. 사람들 사이를 지나 안뜰로 나간다.' },
  { text: '은행나무 아래에서 소녀가 돌아서서 나를 본다.' },
  { text: '그때, 알 수 없는 빛이 눈앞을 가렸다.', bg: '#ffffff', ink: '#111111' },
  { text: '빛이 걷히자 소녀의 세상에 색이 돌아왔다.', bg: AMBER_WORLD, ink: '#1a1200' },
  { text: '내가 보던 회색 병실은, 그 아이의 눈에 비친 세상이었다.', bg: AMBER_WORLD, ink: '#1a1200' },
  { text: '소녀는 두 발로 서 있다. 아무도 이유를 설명하지 못했다.', bg: AMBER_WORLD, ink: '#1a1200' },
  { text: '이건 그런 동화다.', bg: AMBER_WORLD, ink: '#1a1200' },
];

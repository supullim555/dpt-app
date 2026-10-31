import type { EndingId } from './progress';

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
export const ALREADY_TOLD = '오늘 얘기 잘 들었어. 내일 또 와도 되고, 천천히 와도 돼.';
export const CRISIS_LINES = ['그 말, 그냥 넘기고 싶지 않아.', '혼자 견디지 않아도 돼. 아래 번호는 24시간 받아 줘.'];

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
  '"그 아이는 창으로만 나무를 봤어. 그 아래 서 보는 게 소원이래."',
  '"도울 방법이 있을지도 몰라. 한 번 더 찾아가 볼래?"',
];

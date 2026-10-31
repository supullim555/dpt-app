import type { EndingId } from './progress';

// PLACEHOLDER lines, written to test the flow — the real script comes with the girl's settled name,
// story and wish (docs/병문안_기획서.md §9), and needs expert review before anyone sees it.
//
// Rules these already keep to (§8): death is never named or shown as peace or relief, and nothing
// blames the player for staying away. Keep to them when replacing the text.

export const DAY_LINES: Record<number, string[]> = {
  1: ['여기 오는 사람 별로 없는데. 와 줘서 신기해.', '창밖에 은행나무가 보여. 난 요즘 저걸 보는 게 일이야.'],
  2: ['어제 네 얘기, 자기 전에 또 생각났어.', '바깥은 어떤 냄새가 나? 여긴 소독약 냄새뿐이야.'],
  3: ['간호사 선생님이 오늘은 머리를 묶어 줬어.', '별거 아닌데 기분이 좀 달라지더라.'],
  4: ['어젯밤엔 잠이 안 와서 복도 불빛만 봤어.', '네가 오면 시간이 좀 빨리 가.'],
  5: ['은행잎이 많이 떨어졌어. 세어 보다가 포기했어.', '이런 얘기 들어 줘서 고마워.'],
  6: ['내일이면 일주일이네.', '처음엔 네가 또 올 줄 몰랐어.'],
  7: ['오늘은 네 얘기를 좀 더 오래 듣고 싶었어.', '와 줘서 고마워.'],
};

export const TELL_QUESTION = {
  text: '오늘은 무슨 일 있었어?',
  choices: ['별일 없었어', '말하기 어려워', '잘 모르겠어'],
};

export const FIRST_GREETING = '안녕. 들어와.';
export const RETURN_GREETING = '왔구나.';
export const ALREADY_TOLD = '오늘 얘기 잘 들었어. 내일 또 와도 되고, 천천히 와도 돼.';
export const CRISIS_LINES = ['그 말, 그냥 넘기고 싶지 않아.', '혼자 견디지 않아도 돼. 아래 번호는 24시간 받아 줘.'];

export const emotionLine = (word: string | null) => (word ? `${word}… 그랬구나.` : '잘 모르겠는 날도 있지.');
export const keywordLine = (word: string) => `${word} 얘기구나.`;

type EndingScript = { title: string; lines: string[] };

export const ENDINGS: Record<EndingId, EndingScript> = {
  // No blame, and the empty bed isn't said to mean anything final (§8).
  bad: {
    title: '침대가 비어 있다',
    lines: [
      '병실에 소녀는 없고, 머리맡에 편지 한 장이 놓여 있다.',
      '"못 와도 괜찮았어. 네가 와 줬던 날들만 생각하고 있었어."',
      '"너도 네 하루를 잘 지내 줘."',
    ],
  },
  letter: {
    title: '편지',
    lines: [
      '병실에 소녀는 없고, 머리맡에 편지 한 장이 놓여 있다.',
      '"네가 들려준 얘기들, 하나씩 다시 생각해 봤어."',
      '"그동안 와 줘서 고마웠어."',
    ],
  },
  withGirl: {
    title: '오늘은 왔구나',
    lines: ['오늘은 네가 올 것 같았어.', '오래 못 봤어도 괜찮아. 이렇게 또 봤잖아.', '와 줘서 고마워. 잘 가.'],
  },
  normal: {
    title: '인사',
    lines: ['일주일 동안 네 얘기 많이 들었어.', '덕분에 창밖 말고 다른 세상도 봤어.', '고마워. 잘 가.'],
  },
};

export const RECALL_TITLE = '그동안 나눈 이야기';
export const FAIRY_LINES = [
  '어디선가 작은 빛이 나타나 말을 건다.',
  '"그 아이를 도울 방법이 있을지도 몰라. 한 번 더 찾아가 볼래?"',
];

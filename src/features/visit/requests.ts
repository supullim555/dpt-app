// The doctor's requests (docs/의사의_부탁.md): someone in the hospital caught in one way of thinking, and a few
// questions that might help them out of it a little. Optional; all of them done by day 7 opens the happy ending.
// No imports, so scripts/check-visit-logic.mjs can run this file directly. The words are Claude's first draft,
// for the expert review with the rest.

/** One stretch of a conversation: its lines, then a choice, or straight on to `then`, or the end. */
export type TalkNode = {
  lines: string[];
  choices?: { label: string; to: string }[];
  then?: string;
  /** What entering this stretch does: take the request on, breathe together, or settle it. */
  effect?: 'accept' | 'breathe' | 'solve';
};
export type Talk = Record<string, TalkNode>;

type Goal = { text: string; floor: 1 | 2 | 3 | 4; cell: { x: number; y: number }; face: 0 | 1 | 2 | 3 };

export type Request = {
  /** The day the doctor first asks; also its id. */
  day: number;
  /** Floor and map letter of whoever it's about. */
  who: string;
  name: string;
  distortion: string;
  goal: Goal;
  doctor: Talk;
  person: Talk;
  /** What they say once it's settled. */
  after: string[];
  /** On a later visit, something to tell her about it, and what she says. */
  girl: { choice: string; lines: string[] };
};

// The questions come back after a reply that didn't help, so another can be tried. Nothing fails.
const Q1 = [
  { label: '열이 난다는 게 꼭 잘못됐다는 뜻일까요? 의료진은 뭐라고 하던가요?', to: 'evidence' },
  { label: '괜찮을 거예요. 너무 걱정하지 마세요.', to: 'reassured' },
  { label: '그렇게 생각하시면 더 힘들어지세요.', to: 'corrected' },
];
const Q2 = [
  { label: '가장 나쁜 경우, 가장 좋은 경우, 가장 그럴 법한 경우를 하나씩 떠올려 보면 어떨까요?', to: 'three' },
  { label: '최악 같은 건 생각하지 마세요.', to: 'pushed' },
];
const Q3 = [
  { label: '전에도 이렇게 최악부터 떠올렸던 적이 있으세요? 그때는 어떻게 됐어요?', to: 'story' },
  { label: '그럼 이제 괜찮으신 거죠?', to: 'rushed' },
];

export const REQUESTS: Request[] = [
  {
    day: 1,
    who: '3b',
    name: '3층 지친 보호자',
    distortion: '파국화',
    goal: { text: '3층 지친 보호자와 이야기하기', floor: 3, cell: { x: 7, y: 9 }, face: 1 },
    doctor: {
      start: {
        lines: [
          '앉으세요. 그 아이가 기다리던 분이 당신이군요.',
          '저는 이 층 담당이에요. 하루 종일 병실을 돌아도, 보호자분들 마음까지 챙길 시간은 없어요.',
          '부탁 하나 드려도 될까요? 3층 휴게실에 계신 보호자분이요.',
          '아이 수술 뒤로 생각이 자꾸 최악으로만 달려가세요. 파국화라고 하죠.',
          '답을 드리지는 말고, 질문을 몇 개 해 주세요. 스스로 조금이라도 빠져나오실 수 있게요. 안 하셔도 괜찮아요.',
        ],
        choices: [
          { label: '해 볼게요', to: 'yes' },
          { label: '오늘은 어려워요', to: 'no' },
        ],
      },
      yes: { effect: 'accept', lines: ['고마워요. 3층 휴게실이에요. 이동식 침대가 막고 있으면 반대로 돌아가세요.'] },
      no: { lines: ['괜찮아요. 마음이 생기면 언제든 들러 주세요.'] },
    },
    person: {
      start: {
        lines: ['…의사 선생님이 보내셨어요? 앉으세요. 말할 기운은 별로 없지만.', '우리 애가 수술 끝나고 열이 나요. 그건 뭔가 잘못됐다는 거예요.', '이제 다 끝난 거예요. 저는 알아요.'],
        choices: Q1,
      },
      reassured: { lines: ['…다들 그렇게 말해요. 괜찮을 거라고. 그 말이 제일 안 들려요.'], choices: Q1 },
      corrected: { lines: ['그럼 어떻게 생각해요. 안 하려고 해서 안 되는 거면 벌써 안 했죠.'], choices: Q1 },
      evidence: {
        lines: ['…수술 뒤에는 열이 날 수 있대요. 지켜보자고 했어요.', '근데 그 말이 귀에 안 들어와요. 제 머릿속은 벌써 최악까지 가 있어요.'],
        choices: Q2,
      },
      pushed: { lines: ['생각하지 말라고 하면 더 생각나요.'], choices: Q2 },
      three: {
        lines: ['가장 나쁜 건… 말 못 하겠어요.', '가장 좋은 건 내일 아침에 열이 내리는 거.', '가장 그럴 법한 건… 며칠 지켜보는 거겠죠. 선생님 말처럼.'],
        choices: Q3,
      },
      rushed: { lines: ['괜찮은 건 아니에요. 그렇게 빨리는 안 돼요.'], choices: Q3 },
      story: {
        lines: [
          '…있어요. 작년 여름에 애랑 강으로 캠핑을 갔어요.',
          '텐트를 치는 사이에 애가 안 보였어요. 십 분쯤이요.',
          '그 십 분 동안 저는 물에 빠진 애를 몇 번이나 봤어요. 머릿속에서요.',
          '애는 바위 뒤에서 물수제비를 뜨고 있었어요. 네 번 튀었다고 자랑하더라고요.',
        ],
        then: 'again',
      },
      again: {
        lines: ['그때도 제 머릿속이 현실보다 먼저 달려갔네요.', '지금도 그런 걸까요. 열은… 지켜보자고 했으니까.'],
        choices: [{ label: '같이 숨 좀 고르고 갈까요?', to: 'breathe' }],
      },
      breathe: { effect: 'breathe', lines: ['천천히요. 들이쉬고, 내쉬고.'], then: 'done' },
      done: { effect: 'solve', lines: ['…조금 낫네요. 머릿속이 좀 조용해졌어요.', '애 얼굴 보러 가 볼게요. 고마워요.'] },
    },
    after: ['열이 조금 내렸어요. 아직 지켜봐야 하지만요.', '네 번 튄 물수제비 얘기, 애한테 다시 해 달라고 했어요.'],
    girl: {
      choice: '3층 보호자분 이야기',
      lines: ['최악부터 생각하는 거, 나도 잘해.', '근데 그 집 애는 물수제비를 네 번 튀겼다며. 나는 세 번이 최고였어.', '…머릿속이 먼저 달려간다는 말, 기억해 둘게.'],
    },
  },
];

const say = (...lines: string[]): Talk => ({ start: { lines } });

/** The first request not yet settled whose day has come. */
export const openRequest = (day: number, solved: readonly number[]) => REQUESTS.find((r) => r.day <= day && !solved.includes(r.day)) ?? null;

/** What the doctor says, once she's been seen today. */
export function doctorTalk(day: number, asked: readonly number[], solved: readonly number[]): Talk {
  const open = openRequest(day, solved);
  if (open && !asked.includes(open.day)) return open.doctor;
  if (open) return say(`${open.name}분은 만나 보셨어요? 서두르지 않으셔도 돼요.`);
  if (solved.length) return say('얘기 들었어요. 조금 편해 보이시더라고요. 고마워요.', '오늘은 더 드릴 부탁이 없네요. 그 아이 곁에 있어 주셔서 고마워요.');
  return say('오늘은 드릴 부탁이 없네요. 그 아이 곁에 있어 주셔서 고마워요.');
}

/** What someone a request is about says: the request's conversation while it's open, after that their thanks. */
export function personTalk(id: string, asked: readonly number[], solved: readonly number[]): Talk | null {
  const r = REQUESTS.find((q) => q.who === id);
  if (!r) return null;
  if (solved.includes(r.day)) return say(...r.after);
  return asked.includes(r.day) ? r.person : null;
}

/** Where to go for the request you've taken on and not yet settled. */
export function requestGoal(asked: readonly number[], solved: readonly number[]): Goal | null {
  return REQUESTS.find((r) => asked.includes(r.day) && !solved.includes(r.day))?.goal ?? null;
}

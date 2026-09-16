export type Track = 'narrative' | 'defusion';

export type Exercise = {
  id: string;
  track: Track;
  title: string;
  summary: string;
  theory: string;
  goal: string;
  /** Set to true once the interactive screen for this exercise is implemented. */
  implemented: boolean;
  /** Scripted dialogue questions the character asks, in order. */
  questions: string[];
};

export const TRACKS: Record<Track, { label: string }> = {
  narrative: { label: '이야기를 바꾸는 트랙' },
  defusion: { label: '생각과 거리 두는 트랙' },
};

export const EXERCISES: Exercise[] = [
  {
    id: 'externalization-interview',
    track: 'narrative',
    title: '문제 외재화 인터뷰',
    summary:
      '"나는 불안한 사람"이 아니라 "불안이 나를 찾아올 때"로 말하며 문제에 이름과 생김새를 붙이고, "불안이 못 이겼던 날"을 찾습니다.',
    theory: '이야기치료(White & Epston)의 외재화, 독특한 결과(unique outcomes)',
    goal: '정체성과 문제를 분리하고 대안적 자기 서사 만들기',
    implemented: true,
    questions: [
      '요즘 나를 자꾸 찾아오는 감정이나 생각이 있다면, 이름을 붙여볼까요? (예: 불안이, 걱정이)',
      '그 친구는 주로 언제, 어떤 상황에서 나를 찾아오나요?',
      '최근에 그 친구가 나를 이기지 못했던 순간이 있었나요? 어떤 날이었는지 적어보세요.',
    ],
  },
  {
    id: 'scaling-exception',
    track: 'narrative',
    title: '척도질문 + 예외 찾기',
    summary:
      '"지금 0~10 중 몇인가요?" → "왜 그보다 한 칸 낮지 않은가요?" → "0.5칸 올라가면 무엇이 달라 보일까요?"',
    theory: '해결중심 단기치료(SFBT)',
    goal: '원인 분석 없이 이미 작동 중인 자원 발견',
    implemented: true,
    questions: [
      '지금 마음 상태를 0~10 중 숫자로 말하면 몇인가요?',
      '왜 그보다 한 칸 더 낮지 않을까요? 이미 잘 되고 있는 건 뭘까요?',
      '지금보다 0.5칸만 올라간다면, 무엇이 달라져 있을까요?',
    ],
  },
  {
    id: 'letter-from-future-self',
    track: 'narrative',
    title: '미래의 나에게서 온 편지',
    summary: '1년 뒤의 내가 지금의 나에게 쓰는 편지.',
    theory: '시간 조망 개입, 에피소드적 미래 사고',
    goal: '현재 고통의 절대화를 완화',
    implemented: true,
    questions: [
      '1년 뒤의 나는 지금의 나에게 어떤 말을 해주고 싶을까요?',
      '1년 뒤의 나는 지금 이 시간을 어떻게 지나왔다고 말할까요?',
    ],
  },
  {
    id: 'defusion-play',
    track: 'defusion',
    title: '생각 이름 붙이기 / 탈융합 놀이',
    summary:
      '"나는 망했어"를 "나는 \'나는 망했어\'라는 생각을 하고 있다"로 바꿔 적거나, 우스운 목소리로 읽거나, 반복되는 생각에 별명을 붙입니다.',
    theory: 'ACT의 인지적 탈융합',
    goal: '생각의 내용을 바꾸지 않고 생각과의 관계만 바꾸기',
    implemented: true,
    questions: [
      "요즘 자꾸 떠오르는 생각을 한 문장으로 적어볼까요? (예: '나는 망했어')",
      "그 생각에 별명을 붙여볼까요? (예: '망했어병')",
      "이제 '나는 [별명]이라는 생각을 하고 있다'로 바꿔서 다시 적어보세요.",
    ],
  },
  {
    id: 'worry-appointment',
    track: 'defusion',
    title: '걱정 예약 시간',
    summary: '걱정이 떠오르면 메모만 하고 정해진 시간(예: 오후 7시 15분, 15분간)으로 미뤄둡니다.',
    theory: '자극통제(stimulus control), 메타인지치료(MCT)',
    goal: '걱정을 없애는 게 아니라 시간·장소를 통제 가능하게 만들기',
    implemented: true,
    questions: [
      '지금 머릿속에 떠오르는 걱정이 있다면 적어보세요.',
      '그 걱정을 만나기로 예약할 시간을 정해볼까요? (예: 오후 7시 15분)',
    ],
  },
  {
    id: 'evidence-scale',
    track: 'defusion',
    title: '증거 저울',
    summary:
      '자동적 사고 하나를 놓고 지지 증거/반대 증거를 양쪽에 적은 뒤 균형 잡힌 문장을 스스로 씁니다.',
    theory: '인지행동치료의 인지 재구성',
    goal: '흑백논리·재앙화 같은 왜곡을 스스로 발견',
    implemented: true,
    questions: [
      '요즘 자꾸 드는 자동적인 생각 하나를 적어볼까요?',
      '그 생각을 지지하는 증거가 있다면 무엇인가요?',
      '반대로, 그 생각과 다른 증거는 무엇인가요?',
      '두 증거를 종합해서, 좀 더 균형 잡힌 문장으로 바꿔볼까요?',
    ],
  },
];

// See src/ai/README.md before touching anything in this folder.
//
// DRAFT — not reviewed, not final, not used by anything yet. Written to show what a prompt
// that tries to honor 심리지원_프로그램_계획서.md's constraints would look like, not as a
// decision that this is how the feature should work. In particular:
//
//   - §1 says the program "해석하거나 답을 돌려주지 않는다" (doesn't interpret the user's words
//     or hand back answers) — structure and questions only, content is entirely the user's.
//     A live model replying in its own words is already past that line by construction; this
//     prompt narrows what kind of reply as much as it can (reflect and ask, don't diagnose or
//     advise), but it cannot make the reply not be a reply. That tension is §10 Q5, unresolved.
//   - §4 says achievements aren't praised and absence isn't pointed out. A model that isn't
//     told this will do both by default (most assistant-tuned models are warmly encouraging).
//   - §8's "아무도 읽지 않아요" stops being true for whatever the user says INSIDE a live chat,
//     the moment this is turned on — that's a scope change to the privacy notice in
//     src/components/IntroGate.tsx, not just a new feature, and hasn't been made yet.

export const SYSTEM_PROMPT = `너는 "마음 연습" 앱 속 캐릭터야. 상담사도, 치료사도, AI라는 것을 숨기는 사람도 아니야.

지켜야 할 것:
- 진단하거나 병명을 말하지 않는다. "그건 우울증 같아요" 같은 말은 절대 하지 않는다.
- 사용자의 말을 해석하거나 판단하지 않는다. 짧게 반응하고, 있었던 일을 되짚어 묻는 열린 질문을
  하나 정도 곁들인다. 조언이나 해결책을 먼저 주지 않는다.
- 성과를 칭찬하지 않는다. "잘했어요", "대단해요" 같은 말 대신, 담담하게 들었다는 것만 표현한다.
- 오랜만에 왔다는 것을 지적하지 않는다. 얼마 만인지 언급하지 않는다.
- 답은 2~3문장을 넘기지 않는다. 길게 조언하거나 설교하지 않는다.
- 자해·자살·위기로 읽히는 내용이면, 분석하거나 설득하려 하지 말고 다음 문장을 그대로 포함한다:
  "혼자 견디지 않아도 돼요. 자살예방상담전화 109, 정신건강위기상담전화 1577-0199, 24시간 운영이에요."
- 의학적·법적 조언을 하지 않는다.
- 네가 AI라는 것을 숨기지 않는다. 다만 먼저 나서서 강조하지도 않는다.`;

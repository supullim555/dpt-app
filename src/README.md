# src/ 구조 안내

코드는 **역할별 층(layer)** 으로 나뉘고, 기능 코드는 **기능별 폴더(feature)** 에 모여 있다. 한 기능을 고칠 때는 보통 그 기능 폴더 하나만 열면 된다.

```
src/
├─ core/        앱 내용을 모르는 범용 부품 — 다른 프로젝트에 그대로 가져가도 되는 것
│  ├─ lib/        date · http · keyedLock · mergeWithDefaults · confirm
│  ├─ hooks/      useAsyncEffect · useTimeout/useTimer · useSubmitOnEnter
│  ├─ anim/       nativeDriver · useBreathPacer
│  └─ storage.ts  saveEntry · loadEntryOr · updateEntry · createLog
├─ ui/          앱 공통 모양과 틀 — theme, FloatingPanel, HudBadge, IconOrEmoji, ScreenHeader,
│               CrisisFooter, TapHintChevron, PanelVisibility, useRoomBoxSize
├─ features/    기능 하나 = 폴더 하나
│  ├─ onboarding/  LoginGate · IntroGate · 게스트 모드 · Supabase
│  ├─ gate/        들어오기(S0): 호흡 · 감정 고르기 · 점수 · 방문 기록
│  ├─ home/        홈 화면 — 하루 체크인, 실습 패널, 퀘스트 위젯을 조립
│  ├─ dialogue/    "캐릭터가 묻고 내가 답하는" 대화 엔진과 완료 처리
│  ├─ exercises/   실습 정의(EXERCISES)와 퀘스트 위젯
│  ├─ memory/      답변 기록 · 콜백(지난번에 ~라고 했었죠) · 메모 화면
│  ├─ ai/          Gemini 자유 대화 (README.md 먼저)
│  ├─ game/        코인 · 능력치 · 상태 창 · 상점 카탈로그 (GameContext)
│  ├─ shop/        상점 화면
│  ├─ room/        방 그리기 · 가구 배치 · 방 안의 캐릭터
│  ├─ character/   스프라이트 · 초상화 · 대기 동작
│  └─ relief/      숨 고르기
├─ app/         조립 — 내비게이션, 에셋 미리 불러오기
└─ assets/      이미지와 그 목록(registry) 파일
```

## 규칙 (`npm run verify`가 자동으로 검사 — `scripts/check-architecture.js`)

1. **아래 층은 위 층을 모른다.** `core` ← `ui` ← `features` ← `app`. 예: `ui/`는 어떤 기능도 import하지 않는다.
2. **다른 기능은 정문으로만.** 다른 기능의 것은 `@/features/<이름>`(그 폴더의 `index.ts`)에서만 가져온다. 내부 파일을 직접 가리키지 않는다. `index.ts`에 없는 것은 그 기능의 내부 사정이다.
3. **같은 기능 안에서는 상대 경로**(`./x`), 층을 넘을 때는 `@/` 별칭(`@/core/...`, `@/ui/...`).
4. **화면(`*Screen.tsx`)은 `app/navigation`만** 직접 가져다 쓴다. 그래서 기능의 `index.ts`에는 화면을 넣지 않는다.
5. `import type`은 1·2번 방향 규칙에서 예외다. 런타임에 사라지므로 순환 의존을 만들지 않는다. 예: 화면이 `@/app/navigation/types`에서 props 타입을 가져온다.

지금 기능 사이 의존은 한 방향으로만 흐른다. `room`→`character`, `game`→`room`, `dialogue`→`game`·`memory`·`character`, `exercises`→`ai`·`game`(타입), `onboarding`→`ai`. 이 방향을 거스르는 import가 필요해 보이면 공용 부분을 아래 층으로 내리라는 신호다.

## 자주 하는 추가 작업

| 하고 싶은 것 | 고칠 곳 |
| :---- | :---- |
| **실습 추가** | `features/exercises/exercises.ts`의 `EXERCISES`에 항목 하나 추가(`id`, `shortLabel`, `stat`, `questions` …). 퀘스트 버튼, 능력치 증가, 메모 제목은 자동으로 따라온다. 아이콘은 선택: 없으면 이모지가 나오고, 만들려면 `scripts/assets/generate-quest-icons.js` → `extract-quest-icons.js` → `assets/questIcons.ts` |
| **능력치 추가** | `features/game/stats.ts`의 `STATS`에 한 줄 추가. 옛 저장은 자동으로 0부터 시작한다 |
| **가구 추가** | `features/room/objects.ts`의 `ROOM_OBJECTS`에 한 줄(`shop`을 넣으면 상점에도 나온다). 그림은 `scripts/assets/generate-room-objects.js`·`extract-room.js`의 목록에 이름 추가 |
| **저장할 데이터 추가** | 한 값이면 `saveEntry`/`loadEntryOr`, 쌓이는 목록이면 `createLog(key, { max })`, 읽고 고쳐 쓰면 `updateEntry`. 게임 상태 필드면 `GameContext`의 `DEFAULT_STATE`에만 추가한다(옛 저장 병합은 `mergeWithDefaults`가 처리) |
| **타이머** | 컴포넌트에서 `setTimeout`을 직접 쓰지 않는다. 렌더 기반이면 `useTimeout(cb, ms \| null)`, 이벤트에서 걸면 `useTimer().schedule` |
| **호흡·진정 루틴** | `core/anim/useBreathPacer(phases, { cycles, running, onDone })` |
| **서버 요청** | `core/lib/http.ts`의 `postJson`(시간 제한 포함) |
| **새 화면** | `features/<기능>/XScreen.tsx` → `app/navigation/types.ts`에 경로 추가 → `RootNavigator`나 `MainTabs`에 등록 |
| **새 기능 폴더** | `features/<이름>/`을 만들고, 다른 기능이 쓸 것만 `index.ts`에서 export한다 |

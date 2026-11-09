# src/ 구조 안내

이 앱은 **병문안** 하나다(v0.91에서 예전 앱의 방, 퀘스트, 운동, 탭, 로그인, 자유 AI 대화를 지웠다. git 기록에는 남아 있다). 코드는 **역할별 층(layer)** 으로 나뉘고, 기능 코드는 **기능별 폴더(feature)** 에 모여 있다.

```text
src/
├─ core/        앱 내용을 모르는 범용 부품
│  ├─ lib/        date · http · keyedLock · mergeWithDefaults · confirm
│  ├─ hooks/      useAsyncEffect · useTimeout/useTimer · useSubmitOnEnter
│  ├─ anim/       nativeDriver · useBreathPacer
│  └─ storage.ts  saveEntry · loadEntryOr · updateEntry
├─ ui/          공통 모양과 틀 — theme, CrisisFooter(상담 전화 줄), RoomColumn, useRoomBoxSize
├─ features/
│  ├─ ai/          병원 인물의 AI 대답(서버 api/chat.ts를 거침)과 켜고 끄는 설정 (README.md 먼저)
│  └─ visit/       병문안 전부: 7일 진행과 엔딩, 3D 병원(hospitalScene), 대사(script.ts), 의사의 부탁(requests.ts),
│                  회상 공간(places.ts), 키워드, 위험 표현 검사, 컷씬(CardScene, cutscenes.ts)
├─ app/         조립 — 그림 미리 불러오기
└─ assets/      화면에 쓰는 종이·오프닝 그림과 그 목록(visitUi.ts). 병원 그림은 public/hospital/sheets.webp
```

## 규칙 (`npm run verify`가 자동으로 검사 — `scripts/check-architecture.js`)

1. **아래 층은 위 층을 모른다.** `core` ← `ui` ← `features` ← `app`. 예: `ui/`는 어떤 기능도 import하지 않는다.
2. **다른 기능은 정문으로만.** 다른 기능의 것은 `@/features/<이름>`(그 폴더의 `index.ts`)에서만 가져온다.
3. **같은 기능 안에서는 상대 경로**(`./x`), 층을 넘을 때는 `@/` 별칭(`@/core/...`, `@/ui/...`).
4. `import type`은 1·2번 방향 규칙에서 예외다. 런타임에 사라지므로 순환 의존을 만들지 않는다.

## 자주 하는 작업

| 하고 싶은 것 | 고칠 곳 |
| :---- | :---- |
| **대사** | `features/visit/script.ts` (소녀, 병원 사람, 선물 반응, 회상, 엔딩). 병원 사람은 `lines`(1~2일째)와 `later`(3~4일째, 5~7일째) |
| **의사의 부탁과 그 인물** | `features/visit/requests.ts` (대화 흐름, AI에 주는 인물 설명 `personaPrompt`) |
| **병원 지도** | `features/visit/hospitalMap.ts`, 설명은 `docs/병원_지도.md` |
| **그림** | `scripts/assets/`의 생성·보정·시트 스크립트. 시트를 바꾸면 `pack-hospital-sheets.js`가 주소의 해시까지 바꾼다 |
| **영상 컷씬** | `scripts/assets/build-cutscenes.js`와 `scripts/assets/cutscenes/*.jsx`(EffectCraft) |
| **저장할 데이터** | `features/visit/VisitScreen.tsx`의 `VisitState`와 `INITIAL`(옛 저장 병합은 `mergeWithDefaults`) |
| **타이머** | 컴포넌트에서 `setTimeout`을 직접 쓰지 않는다. `useTimeout(cb, ms \| null)` 또는 `useTimer().schedule` |
| **서버 요청** | `core/lib/http.ts`의 `postJson`(시간 제한 포함) |

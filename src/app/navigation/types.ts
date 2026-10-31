import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Three tabs (§27, 2026-10-17) — down from four. The old "이야기" tab (a list of exercises that
// each pushed to a separate detail screen) is gone: exercises now run inline on Home via a quest
// widget, and "이야기" the standalone screen was really a second, parallel history view next to
// 메모 — merged into 메모 rather than keeping two tabs that showed similar-looking logs.
export type MainTabParamList = {
  Home: undefined;
  Memo: undefined; // "메모" — now the one place to look back at anything said, exercise or AI chat
  // (Shop was removed in v0.28 along with coins — §40.)
};

// Gate (first-run gate, no chrome) lives outside the tabs; Main is the tab navigator itself.
// ExerciseDetail is gone along with it (§27) — exercises run inside Home's own FloatingPanel now
// (src/features/home/HomeScreen.tsx's ActiveExerciseDialogue), not a separate pushed screen.
export type RootStackParamList = {
  Gate: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  // The quick-relief tool (§8's "사용자 직접 요청 버튼") — reached from a floating button that
  // sits above every tab, not tucked inside any one of them, so it's never more than one tap
  // away regardless of which tab the user is on when they need it.
  Relief: undefined;
  // §25's free-chat screen (Gemini-backed) — reached from Home's quest widget (§27; used to be
  // a card at the top of the now-removed "이야기" tab), shown there only when AI is turned on.
  AiChat: undefined;
  // Optional email account (v0.28). Was a gate in front of the whole app (§28/§29); now reached
  // from the 메모 tab only by someone who wants it — accounts don't sync anything yet.
  Account: undefined;
  // 병문안 (docs/계획서.md). The first screen only at ?visit=1 (features/visit/flag.ts).
  Visit: undefined;
};

export type GateScreenProps = NativeStackScreenProps<RootStackParamList, 'Gate'>;
export type ReliefScreenProps = NativeStackScreenProps<RootStackParamList, 'Relief'>;
export type AiChatScreenProps = NativeStackScreenProps<RootStackParamList, 'AiChat'>;
export type AccountScreenProps = NativeStackScreenProps<RootStackParamList, 'Account'>;
export type VisitScreenProps = NativeStackScreenProps<RootStackParamList, 'Visit'>;

// A screen inside a tab whose "navigate" needs to reach a root-stack screen (not one of its own
// tab siblings — e.g. Home reaching AiChat) needs both navigators' prop types composed — the
// standard React Navigation pattern for a stack-screen-inside-a-tab-inside-a-stack shape.
type TabProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
export type HomeScreenProps = TabProps<'Home'>;
export type MemoScreenProps = TabProps<'Memo'>;

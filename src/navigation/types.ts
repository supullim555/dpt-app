import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// The four tabs of the main app. Kept in one file with the root stack below so every screen
// imports its prop type from the same place instead of re-deriving it.
export type MainTabParamList = {
  Home: undefined;
  Talk: undefined; // "이야기" — was the separate "실습" list screen
  Memo: undefined; // "메모" — was JournalScreen
  Shop: undefined;
};

// Gate (first-run gate, no chrome) and ExerciseDetail (a drill-in screen that covers the tab
// bar, the one place still reached from inside a tab) both live outside the tabs; Main is the
// tab navigator itself.
export type RootStackParamList = {
  Gate: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ExerciseDetail: { exerciseId: string };
  // The quick-relief tool (§8's "사용자 직접 요청 버튼") — reached from a floating button that
  // sits above every tab, not tucked inside any one of them, so it's never more than one tap
  // away regardless of which tab the user is on when they need it.
  Relief: undefined;
};

export type GateScreenProps = NativeStackScreenProps<RootStackParamList, 'Gate'>;
export type ExerciseDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'ExerciseDetail'>;
export type ReliefScreenProps = NativeStackScreenProps<RootStackParamList, 'Relief'>;

// A screen inside a tab whose "navigate" needs to reach ExerciseDetail (a root-stack screen,
// not one of its own tab siblings) needs both navigators' prop types composed — the standard
// React Navigation pattern for a stack-screen-inside-a-tab-inside-a-stack shape.
type TabProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
export type HomeScreenProps = TabProps<'Home'>;
export type TalkScreenProps = TabProps<'Talk'>;
export type MemoScreenProps = TabProps<'Memo'>;
export type ShopScreenProps = TabProps<'Shop'>;

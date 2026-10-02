import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ExerciseListScreen from '../screens/ExerciseListScreen';
import MemoScreen from '../screens/MemoScreen';
import ShopScreen from '../screens/ShopScreen';
import type { MainTabParamList, RootStackParamList } from './types';
import { PanelVisibilityProvider, useBottomPanelOpen } from './PanelVisibility';
import { BORDER, INK, OVERLAY_LIGHT, TAB_INACTIVE } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Plain emoji rather than an icon font: no new asset pipeline or font file for four glyphs,
// and it already matches how the app shows coins (🪙) elsewhere.
const ICON: Record<keyof MainTabParamList, string> = {
  Home: '🏠',
  Talk: '💬',
  Memo: '📝',
  Shop: '🛍️',
};
// "실습" (practice/exercise) and "지난 이야기" (past stories) read clinical/formal; renamed to
// match how the feature actually feels to use — talking with her, and notes that pile up.
const LABEL: Record<keyof MainTabParamList, string> = {
  Home: '홈',
  Talk: '이야기',
  Memo: '메모',
  Shop: '상점',
};

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

// The persistent bottom nav every screen shares, replacing the ad-hoc "buttons floating inside
// the dialogue bar" Home used to have and the "홈 / 상점" row each list screen repeated. One
// place to reach every section of the app, always in the same spot — the single biggest thing
// that was missing to make this feel like an installed app rather than a stack of web pages.
export default function MainTabs({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  // Tab bar height was a hardcoded 58 with no allowance for the home indicator / gesture bar —
  // fine on the web viewport this was checked in, but would sit the tab bar (and labels) under
  // it on a real notched phone. Folds the bottom inset into the bar instead of guessing a value.
  const tabBarHeight = 58 + insets.bottom;

  return (
    <PanelVisibilityProvider>
      <View style={styles.fill}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: INK,
            tabBarInactiveTintColor: TAB_INACTIVE,
            tabBarStyle: {
              borderTopColor: BORDER,
              borderTopWidth: 1,
              height: tabBarHeight,
              paddingTop: 6,
              paddingBottom: 6 + insets.bottom,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>{ICON[route.name]}</Text>,
            tabBarLabel: LABEL[route.name],
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Talk" component={ExerciseListScreen} />
          <Tab.Screen name="Memo" component={MemoScreen} />
          <Tab.Screen name="Shop" component={ShopScreen} />
        </Tab.Navigator>

        <ReliefButton onPress={() => navigation.navigate('Relief')} tabBarHeight={tabBarHeight} />
      </View>
    </PanelVisibilityProvider>
  );
}

// §8's user-initiated safety/relief button. Floats above the tab bar rather than living inside
// one tab, so it's reachable in one tap regardless of which tab is open — the "obvious, never
// buried" quick-relief pattern MindShift CBT and mental-health UI research both point to (§22).
// Deliberately plain text, no red, no siren icon: noticeable, not alarming, matching
// CrisisFooter's tone.
//
// A fixed corner turned out not to be safe everywhere: Talk/Memo/Shop are plain scrolling lists
// (a bottom-right FAB is the standard, expected place there), but Home docks its own
// FloatingPanel — dialogue + CrisisFooter — flush to the bottom edge while checking in, and a
// bottom-right chip ended up sitting right on top of the crisis phone numbers (caught in a
// click-through screenshot, not by reading the code). Rather than guess a position that avoids
// every screen's content at once, it reads whether that panel is actually open right now
// (useBottomPanelOpen, reported by HomeScreen) and moves up out of its way only then.
function ReliefButton({ onPress, tabBarHeight }: { onPress: () => void; tabBarHeight: number }) {
  const panelOpen = useBottomPanelOpen();
  return (
    <TouchableOpacity
      style={[styles.relief, panelOpen ? styles.reliefHigh : { bottom: tabBarHeight + 12 }]}
      onPress={onPress}
      accessibilityLabel="숨 고르기 — 지금 바로 진정하기"
    >
      <Text style={styles.reliefText}>🫧 숨 고르기</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  relief: {
    position: 'absolute',
    right: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: OVERLAY_LIGHT,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.15)' },
      default: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
    }),
  },
  // Clear of Home's FloatingPanel (which only ever covers the lower portion of the screen)
  // without needing to measure the panel's actual height, which varies with its content.
  reliefHigh: { top: '46%' },
  reliefText: { fontSize: 13, fontWeight: '600', color: INK },
});

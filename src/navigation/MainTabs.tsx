import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import ExerciseListScreen from '../screens/ExerciseListScreen';
import MemoScreen from '../screens/MemoScreen';
import ShopScreen from '../screens/ShopScreen';
import type { MainTabParamList } from './types';
import { BORDER, INK, TAB_INACTIVE } from '../theme';

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

// The persistent bottom nav every screen shares, replacing the ad-hoc "buttons floating inside
// the dialogue bar" Home used to have and the "홈 / 상점" row each list screen repeated. One
// place to reach every section of the app, always in the same spot — the single biggest thing
// that was missing to make this feel like an installed app rather than a stack of web pages.
export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: INK,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarStyle: { borderTopColor: BORDER, borderTopWidth: 1, height: 58, paddingTop: 6, paddingBottom: 6 },
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
  );
}

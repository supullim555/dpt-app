import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GateScreen from '../screens/GateScreen';
import MainTabs from './MainTabs';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import ReliefScreen from '../screens/ReliefScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Gate" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Gate" component={GateScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        {/* The one screen still reached by pushing from inside a tab (Talk -> an exercise) —
            covers the tab bar while open, which is the point: a focused single task, not
            another section of the app to jump between. */}
        <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
        {/* Slides up over whatever's underneath rather than replacing it — reachable from any
            tab, and dismissing it returns to exactly where the user was. */}
        <Stack.Screen name="Relief" component={ReliefScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

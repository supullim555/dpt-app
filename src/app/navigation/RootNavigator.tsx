import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GateScreen from '@/features/gate/GateScreen';
import MainTabs from './MainTabs';
import ReliefScreen from '@/features/relief/ReliefScreen';
import AiChatScreen from '@/features/ai/AiChatScreen';
import AccountScreen from '@/features/onboarding/AccountScreen';
import { VISIT_ENABLED } from '@/features/visit';
import VisitScreen from '@/features/visit/VisitScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={VISIT_ENABLED ? 'Visit' : 'Gate'} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Gate" component={GateScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        {/* Slides up over whatever's underneath rather than replacing it — reachable from any
            tab, and dismissing it returns to exactly where the user was. */}
        <Stack.Screen name="Relief" component={ReliefScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="AiChat" component={AiChatScreen} />
        <Stack.Screen name="Account" component={AccountScreen} />
        <Stack.Screen name="Visit" component={VisitScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

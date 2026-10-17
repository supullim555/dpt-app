import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GateScreen from '../screens/GateScreen';
import MainTabs from './MainTabs';
import ReliefScreen from '../screens/ReliefScreen';
import AiChatScreen from '../screens/AiChatScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Gate" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Gate" component={GateScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        {/* Slides up over whatever's underneath rather than replacing it — reachable from any
            tab, and dismissing it returns to exactly where the user was. */}
        <Stack.Screen name="Relief" component={ReliefScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="AiChat" component={AiChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

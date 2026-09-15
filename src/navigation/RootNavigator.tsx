import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ExerciseListScreen from '../screens/ExerciseListScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import ShopScreen from '../screens/ShopScreen';

export type RootStackParamList = {
  Home: undefined;
  ExerciseList: undefined;
  ExerciseDetail: { exerciseId: string };
  Shop: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="ExerciseList"
          component={ExerciseListScreen}
          options={{ title: '마음 연습' }}
        />
        <Stack.Screen
          name="ExerciseDetail"
          component={ExerciseDetailScreen}
          options={{ title: '' }}
        />
        <Stack.Screen name="Shop" component={ShopScreen} options={{ title: '상점' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

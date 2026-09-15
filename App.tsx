import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { GameProvider } from './src/game/GameContext';

export default function App() {
  return (
    <GameProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </GameProvider>
  );
}

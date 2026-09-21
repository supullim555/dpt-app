import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import IntroGate from './src/components/IntroGate';
import { GameProvider } from './src/game/GameContext';

export default function App() {
  return (
    <GameProvider>
      <IntroGate>
        <RootNavigator />
      </IntroGate>
      <StatusBar style="auto" />
    </GameProvider>
  );
}

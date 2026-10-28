import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from '@/app/navigation/RootNavigator';
import { LoginGate, IntroGate } from '@/features/onboarding';
import ArtPreloader from '@/app/ArtPreloader';
import { GameProvider } from '@/features/game';

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        {/* §28: the very first screen — "게스트로 시작" or (not yet functional) "로그인" — sits
            outside IntroGate's disclaimer, same ordering a real app would use (auth before
            onboarding). */}
        <LoginGate>
          <IntroGate>
            <RootNavigator />
          </IntroGate>
        </LoginGate>
        <ArtPreloader />
        <StatusBar style="auto" />
      </GameProvider>
    </SafeAreaProvider>
  );
}

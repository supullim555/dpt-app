import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from '@/app/navigation/RootNavigator';
import { IntroGate } from '@/features/onboarding';
import ArtPreloader from '@/app/ArtPreloader';
import { ProgressProvider } from '@/features/progress';

export default function App() {
  return (
    <SafeAreaProvider>
      <ProgressProvider>
        {/* v0.28: no login screen in front any more (it's optional, in the 메모 tab) — first launch
            is one disclaimer tap, then straight into the gate's first question. */}
        <IntroGate>
          <RootNavigator />
        </IntroGate>
        <ArtPreloader />
        <StatusBar style="auto" />
      </ProgressProvider>
    </SafeAreaProvider>
  );
}

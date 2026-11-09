import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ArtPreloader from '@/app/ArtPreloader';
import VisitScreen from '@/features/visit/VisitScreen';

// 병문안 is the whole app (v0.91: the earlier app, its navigation and its login are gone). VisitScreen opens with its
// own notice of what the story is about.
export default function App() {
  return (
    <SafeAreaProvider>
      <VisitScreen />
      <ArtPreloader />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

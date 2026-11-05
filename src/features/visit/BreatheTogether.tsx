import { Animated, StyleSheet, Text, View } from 'react-native';
import { useBreathPacer } from '@/core/anim/useBreathPacer';
import PaperButton from './PaperButton';

// The same pace as 숨 고르기 elsewhere in the app: in for four, hold for two, out for six.
const PHASE = [
  { label: '숨을 들이쉬어요', ms: 4000, toValue: 1.5 },
  { label: '잠깐 멈춰요', ms: 2000, toValue: 1.7 },
  { label: '천천히 내쉬어요', ms: 6000, toValue: 1 },
];
// Tensing and letting go (progressive relaxation, shortened): fists and shoulders up, then all at once, down.
const MUSCLE = [
  { label: '주먹을 쥐고, 어깨를 귀 쪽으로 올려요', ms: 5000, toValue: 1.55 },
  { label: '툭, 한 번에 내려놓아요', ms: 7000, toValue: 1 },
];
const CYCLES = 3;
const AMBER = '#d9a441';

// Unwinding with someone in the hospital (docs/의사의_부탁.md): three slow breaths, or three times tensing and
// letting go; stop whenever.
export default function BreatheTogether({ onDone, fontScale, mode = 'breath' }: { onDone: () => void; fontScale: number; mode?: 'breath' | 'muscle' }) {
  const phases = mode === 'muscle' ? MUSCLE : PHASE;
  const { value, phaseIndex, cyclesDone } = useBreathPacer(phases, { cycles: CYCLES, onDone });
  return (
    <View style={styles.shade} accessibilityViewIsModal>
      <Text style={[styles.title, { fontSize: 13 * fontScale }]}>{mode === 'muscle' ? '같이 힘 빼기' : '같이 숨 고르기'}</Text>
      <View style={styles.ring}>
        <Animated.View style={[styles.circle, { transform: [{ scale: value }] }]} />
      </View>
      <Text style={[styles.label, { fontSize: 17 * fontScale }]}>{phases[phaseIndex].label}</Text>
      <Text style={[styles.count, { fontSize: 13 * fontScale }]}>
        {Math.min(cyclesDone + 1, CYCLES)} / {CYCLES}
      </Text>
      <PaperButton label="충분해요" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  shade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24 },
  title: { color: AMBER, fontFamily: 'serif', letterSpacing: 2 },
  ring: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: AMBER, backgroundColor: 'rgba(217,164,65,0.18)' },
  label: { color: '#fff', fontFamily: 'serif' },
  count: { color: 'rgba(255,255,255,0.6)', fontFamily: 'serif' },
});

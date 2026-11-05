import { useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
// Noticing what's here, one sense at a time (grounding, 5-4-3-2-1): stepped through by hand, not timed.
const GROUND = ['눈에 보이는 것 다섯 가지를 천천히 찾아봐요.', '들리는 소리 네 가지에 귀를 기울여요.', '손에 닿는 것 세 가지를 느껴 봐요.', '냄새 두 가지를 맡아 봐요.', '그리고 숨을 한 번, 길게.'];
const CYCLES = 3;
const AMBER = '#d9a441';

// Unwinding with someone in the hospital (docs/의사의_부탁.md): three slow breaths, three times tensing and letting
// go, or noticing what's around one sense at a time; stop whenever.
export default function BreatheTogether({ onDone, fontScale, mode = 'breath' }: { onDone: () => void; fontScale: number; mode?: 'breath' | 'muscle' | 'ground' }) {
  if (mode === 'ground') return <GroundTogether onDone={onDone} fontScale={fontScale} />;
  return <PacedTogether onDone={onDone} fontScale={fontScale} mode={mode} />;
}

function GroundTogether({ onDone, fontScale }: { onDone: () => void; fontScale: number }) {
  const [step, setStep] = useState(0);
  const last = step === GROUND.length - 1;
  return (
    <View style={styles.shade} accessibilityViewIsModal>
      <Text style={[styles.title, { fontSize: 13 * fontScale }]}>같이 둘러보기</Text>
      <Text style={[styles.count, { fontSize: 28 * fontScale }]}>{GROUND.length - step}</Text>
      <Text style={[styles.label, styles.groundText, { fontSize: 17 * fontScale, lineHeight: 26 * fontScale }]}>{GROUND[step]}</Text>
      <PaperButton label={last ? '마치기' : '다음'} onPress={() => (last ? onDone() : setStep(step + 1))} />
      {!last && (
        <TouchableOpacity onPress={onDone}>
          <Text style={[styles.count, { fontSize: 13 * fontScale }]}>충분해요</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PacedTogether({ onDone, fontScale, mode }: { onDone: () => void; fontScale: number; mode: 'breath' | 'muscle' }) {
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
  groundText: { textAlign: 'center', paddingHorizontal: 12 },
  count: { color: 'rgba(255,255,255,0.6)', fontFamily: 'serif' },
});

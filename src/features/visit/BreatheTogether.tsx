import { useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View, type ImageSourcePropType } from 'react-native';
import { useBreathPacer } from '@/core/anim/useBreathPacer';
import PaperButton from './PaperButton';

// The same pace as 숨 고르기 elsewhere in the app: in for four, hold for two, out for six.
const PHASE = [
  { label: '숨을 들이쉬어요', ms: 4000, toValue: 1.5 },
  { label: '잠깐 멈춰요', ms: 2000, toValue: 1.7 },
  { label: '천천히 내쉬어요', ms: 6000, toValue: 1 },
];
// Tensing and letting go (progressive relaxation), v0.93: one part of the body at a time, each once and none twice,
// from the hands up to the face, the breath, then down to the feet; a picture of how for each (scripts/assets/build-relax.js).
const TENSE_MS = 5000;
const LET_GO_MS = 8000;
const BODY: [string, string, ImageSourcePropType, ImageSourcePropType][] = [
  ['두 손을 꽉 주먹 쥐어요', '손을 펴고, 무릎 위에 툭 내려놓아요', require('@/assets/visit/relax/hands-tense.jpg'), require('@/assets/visit/relax/hands-calm.jpg')],
  ['팔꿈치를 굽혀 팔에 힘을 줘요', '팔을 아래로 축 늘어뜨려요', require('@/assets/visit/relax/arms-tense.jpg'), require('@/assets/visit/relax/arms-calm.jpg')],
  ['어깨를 귀 쪽으로 끌어올려요', '어깨를 툭 떨어뜨려요', require('@/assets/visit/relax/shoulders-tense.jpg'), require('@/assets/visit/relax/shoulders-calm.jpg')],
  ['눈을 꼭 감고 얼굴을 찡그려요', '눈은 살며시 감은 채로, 얼굴을 풀어요', require('@/assets/visit/relax/face-tense.jpg'), require('@/assets/visit/relax/face-calm.jpg')],
  ['배에 손을 얹고, 숨을 깊이 들이쉬어요', '입으로 길게 내쉬며 몸을 풀어요', require('@/assets/visit/relax/breath-tense.jpg'), require('@/assets/visit/relax/breath-calm.jpg')],
  ['다리를 앞으로 쭉 들어 힘을 줘요', '발을 바닥에 내려놓고 다리를 풀어요', require('@/assets/visit/relax/legs-tense.jpg'), require('@/assets/visit/relax/legs-calm.jpg')],
  ['발가락을 꽉 오므려요', '발가락을 펴고, 발을 무겁게 내려놓아요', require('@/assets/visit/relax/feet-tense.jpg'), require('@/assets/visit/relax/feet-calm.jpg')],
];
const MUSCLE = BODY.flatMap(([tense, letGo]) => [
  { label: tense, ms: TENSE_MS, toValue: 1.55 },
  { label: letGo, ms: LET_GO_MS, toValue: 1 },
]);
const MUSCLE_PICTURES = BODY.flatMap(([, , tense, calm]) => [tense, calm]);
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
  const muscle = mode === 'muscle';
  const phases = muscle ? MUSCLE : PHASE;
  // the body once through, part by part; the breath three times round
  const cycles = muscle ? 1 : CYCLES;
  const { value, phaseIndex, cyclesDone } = useBreathPacer(phases, { cycles, onDone });
  return (
    <View style={styles.shade} accessibilityViewIsModal>
      <Text style={[styles.title, { fontSize: 13 * fontScale }]}>{mode === 'muscle' ? '같이 힘 빼기' : '같이 숨 고르기'}</Text>
      {muscle ? (
        <Image source={MUSCLE_PICTURES[phaseIndex]} style={styles.picture} resizeMode="contain" accessibilityLabel={phases[phaseIndex].label} />
      ) : (
        <View style={styles.ring}>
          <Animated.View style={[styles.circle, { transform: [{ scale: value }] }]} />
        </View>
      )}
      <Text style={[styles.label, styles.groundText, { fontSize: 17 * fontScale, lineHeight: 25 * fontScale }]}>{phases[phaseIndex].label}</Text>
      <Text style={[styles.count, { fontSize: 13 * fontScale }]}>
        {muscle ? `${Math.floor(phaseIndex / 2) + 1} / ${BODY.length}` : `${Math.min(cyclesDone + 1, CYCLES)} / ${CYCLES}`}
      </Text>
      <PaperButton label="충분해요" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  shade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24 },
  title: { color: AMBER, fontFamily: 'serif', letterSpacing: 2 },
  ring: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  picture: { width: 220, height: 260, borderRadius: 6 },
  circle: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: AMBER, backgroundColor: 'rgba(217,164,65,0.18)' },
  label: { color: '#fff', fontFamily: 'serif' },
  groundText: { textAlign: 'center', paddingHorizontal: 12 },
  count: { color: 'rgba(255,255,255,0.6)', fontFamily: 'serif' },
});

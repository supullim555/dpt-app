import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, type ImageSourcePropType } from 'react-native';
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
const BODY: [string, string, string, ImageSourcePropType, ImageSourcePropType][] = [
  ['hands', '두 손을 꽉 주먹 쥐어요', '손을 펴고, 무릎 위에 툭 내려놓아요', require('@/assets/visit/relax/hands-tense.png'), require('@/assets/visit/relax/hands-calm.png')],
  ['arms', '팔꿈치를 굽혀 팔에 힘을 줘요', '팔을 아래로 축 늘어뜨려요', require('@/assets/visit/relax/arms-tense.png'), require('@/assets/visit/relax/arms-calm.png')],
  ['shoulders', '어깨를 귀 쪽으로 끌어올려요', '어깨를 툭 떨어뜨려요', require('@/assets/visit/relax/shoulders-tense.png'), require('@/assets/visit/relax/shoulders-calm.png')],
  ['face', '눈을 꼭 감고 얼굴을 찡그려요', '눈은 살며시 감은 채로, 얼굴을 풀어요', require('@/assets/visit/relax/face-tense.png'), require('@/assets/visit/relax/face-calm.png')],
  ['breath', '배에 손을 얹고, 숨을 깊이 들이쉬어요', '입으로 길게 내쉬며 몸을 풀어요', require('@/assets/visit/relax/breath-tense.png'), require('@/assets/visit/relax/breath-calm.png')],
  ['legs', '다리를 앞으로 쭉 들어 힘을 줘요', '발을 바닥에 내려놓고 다리를 풀어요', require('@/assets/visit/relax/legs-tense.png'), require('@/assets/visit/relax/legs-calm.png')],
  ['feet', '발가락을 꽉 오므려요', '발가락을 펴고, 발을 무겁게 내려놓아요', require('@/assets/visit/relax/feet-tense.png'), require('@/assets/visit/relax/feet-calm.png')],
];
// v0.96: only the parts someone carries it in (requests.ts `parts`), not the whole body every time
const bodyOf = (parts?: string[]) => (parts?.length ? BODY.filter(([id]) => parts.includes(id)) : BODY);
const muscleOf = (parts?: string[]) =>
  bodyOf(parts).flatMap(([, tense, letGo]) => [
    { label: tense, ms: TENSE_MS, toValue: 1.55 },
    { label: letGo, ms: LET_GO_MS, toValue: 1 },
  ]);
const picturesOf = (parts?: string[]) => bodyOf(parts).flatMap(([, , , tense, calm]) => [tense, calm]);
const CROSSFADE_MS = 700;

// v0.96: one picture dissolving into the next, as games and slideshows do, instead of a cut: the old one stays under
// the new one while it fades in, both in the same place, the new one easing up from a touch smaller.
function Crossfade({ source, label }: { source: ImageSourcePropType; label: string }) {
  const [shown, setShown] = useState({ now: source, before: source });
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (source === shown.now) return;
    setShown((s) => ({ now: source, before: s.now }));
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: CROSSFADE_MS, useNativeDriver: false }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);
  const scale = fade.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });
  return (
    <View style={styles.picture} accessibilityLabel={label}>
      <Animated.Image source={shown.before} style={[styles.layer, { opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} resizeMode="contain" />
      <Animated.Image source={shown.now} style={[styles.layer, { opacity: fade, transform: [{ scale }] }]} resizeMode="contain" />
    </View>
  );
}
// Noticing what's here, one sense at a time (grounding, 5-4-3-2-1): stepped through by hand, not timed.
const GROUND = ['눈에 보이는 것 다섯 가지를 천천히 찾아봐요.', '들리는 소리 네 가지에 귀를 기울여요.', '손에 닿는 것 세 가지를 느껴 봐요.', '냄새 두 가지를 맡아 봐요.', '그리고 숨을 한 번, 길게.'];
const CYCLES = 3;
const AMBER = '#d9a441';

// Unwinding with someone in the hospital (docs/의사의_부탁.md): three slow breaths, three times tensing and letting
// go, or noticing what's around one sense at a time; stop whenever.
export default function BreatheTogether({ onDone, fontScale, mode = 'breath', parts }: { onDone: () => void; fontScale: number; mode?: 'breath' | 'muscle' | 'ground'; parts?: string[] }) {
  if (mode === 'ground') return <GroundTogether onDone={onDone} fontScale={fontScale} />;
  return <PacedTogether onDone={onDone} fontScale={fontScale} mode={mode} parts={parts} />;
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

function PacedTogether({ onDone, fontScale, mode, parts }: { onDone: () => void; fontScale: number; mode: 'breath' | 'muscle'; parts?: string[] }) {
  const muscle = mode === 'muscle';
  const muscleSteps = useRef(muscleOf(parts)).current;
  const pictures = useRef(picturesOf(parts)).current;
  const phases = muscle ? muscleSteps : PHASE;
  // the body once through, part by part; the breath three times round
  const cycles = muscle ? 1 : CYCLES;
  const { value, phaseIndex, cyclesDone } = useBreathPacer(phases, { cycles, onDone });
  return (
    <View style={styles.shade} accessibilityViewIsModal>
      <Text style={[styles.title, { fontSize: 13 * fontScale }]}>{mode === 'muscle' ? '같이 힘 빼기' : '같이 숨 고르기'}</Text>
      {muscle ? (
        <Crossfade source={pictures[phaseIndex]} label={phases[phaseIndex].label} />
      ) : (
        <View style={styles.ring}>
          <Animated.View style={[styles.circle, { transform: [{ scale: value }] }]} />
        </View>
      )}
      <Text style={[styles.label, styles.groundText, { fontSize: 17 * fontScale, lineHeight: 25 * fontScale }]}>{phases[phaseIndex].label}</Text>
      <Text style={[styles.count, { fontSize: 13 * fontScale }]}>
        {muscle ? `${Math.floor(phaseIndex / 2) + 1} / ${muscleSteps.length / 2}` : `${Math.min(cyclesDone + 1, CYCLES)} / ${CYCLES}`}
      </Text>
      <PaperButton label="충분해요" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  shade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24 },
  title: { color: AMBER, fontFamily: 'serif', letterSpacing: 2 },
  ring: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  picture: { width: 220, height: 260 },
  layer: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  circle: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: AMBER, backgroundColor: 'rgba(217,164,65,0.18)' },
  label: { color: '#fff', fontFamily: 'serif' },
  groundText: { textAlign: 'center', paddingHorizontal: 12 },
  count: { color: 'rgba(255,255,255,0.6)', fontFamily: 'serif' },
});

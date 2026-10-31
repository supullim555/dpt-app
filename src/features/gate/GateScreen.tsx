import { useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GateScreenProps } from '@/app/navigation/types';
import { RoomBackdrop, RoomStander } from '@/features/room';
import CrisisFooter from '@/ui/CrisisFooter';
import FloatingPanel from '@/ui/FloatingPanel';
import { useBreathPacer, type BreathPhase } from '@/core/anim/useBreathPacer';
import EmotionPicker from './EmotionPicker';
import type { EmotionFamilyId } from './emotions';
import { useProgress } from '@/features/progress';
import { useAsyncEffect } from '@/core/hooks/useAsyncEffect';
import {
  appendGateEntry,
  breathCyclesFor,
  loadGateHistory,
  needsSafetyNote,
} from './history';

// S0 — the gate ("들어오기", plan §6). Each visit: one word for the feeling, one number for its
// weight — and only if it's heavy, an offer to breathe together. Nothing here is required; the
// skip is there from the first moment.
//
// v0.28: the breathing used to come FIRST, every visit (~20s before any question), with the skip
// only appearing after 10s. For "열고 10초 안에 첫 질문" (§2 SG1) the feeling question now comes
// first, and breathing is offered — not imposed — when the weight is OFFER_BREATH_AT or lower.
type Step = 'loading' | 'label' | 'scale' | 'offer' | 'breath' | 'care';

/** At or below this (0 = very heavy, 10 = at ease) the gate offers to breathe together. */
const OFFER_BREATH_AT = 3;

// One sigh: breathe in, a second short sip on top, then a long breath out.
const SIGH: BreathPhase[] = [
  { toValue: 1.5, ms: 2000 },
  { toValue: 1.85, ms: 800 },
  { toValue: 1, ms: 3600 },
];

export default function GateScreen({ navigation }: GateScreenProps) {
  const { state, loaded } = useProgress();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('loading');
  const [cycles, setCycles] = useState(0); // sighs, if breathing is chosen
  const [label, setLabel] = useState<string | null>(null);
  const [family, setFamily] = useState<EmotionFamilyId | null>(null);
  const [recorded, setRecorded] = useState(false); // this visit's entry is saved
  const enterApp = () => navigation.replace('Main');
  const { value: circle, cyclesDone: done } = useBreathPacer(SIGH, {
    cycles,
    running: step === 'breath',
    onDone: enterApp,
  });

  useAsyncEffect(async (isCancelled) => {
    const history = await loadGateHistory();
    if (isCancelled()) return;
    setCycles(breathCyclesFor(history));
    setStep('label');
  }, []);

  const skip = async () => {
    if (!recorded) await appendGateEntry({ date: new Date().toISOString(), label: null, score: null, skipped: true });
    enterApp();
  };

  const finish = async (score: number) => {
    const history = await appendGateEntry({
      date: new Date().toISOString(),
      label,
      family,
      score,
      skipped: false,
    });
    setRecorded(true);
    if (needsSafetyNote(history)) setStep('care');
    else if (score <= OFFER_BREATH_AT) setStep('offer');
    else enterApp();
  };

  return (
    <View style={styles.container}>
      {/* wait for the saved state so bought furniture doesn't pop in after the room appears */}
      {loaded && (
        <RoomBackdrop items={state.roomItems}>
          <RoomStander />
        </RoomBackdrop>
      )}
      {step !== 'loading' && step !== 'care' && (
        <TouchableOpacity
          style={[styles.skip, { top: insets.top + 10 }]}
          onPress={skip}
          accessibilityLabel="건너뛰기"
        >
          <Text style={styles.skipText}>건너뛰기</Text>
        </TouchableOpacity>
      )}

      <FloatingPanel style={styles.panel}>
        {step === 'breath' && (
          <View style={styles.center}>
            <Text style={styles.hint}>
              코로 들이쉬고, 한 번 더 짧게 들이쉬고, 입으로 길게 내쉬어요.
            </Text>
            <View style={styles.circleBox}>
              <Animated.View style={[styles.circle, { transform: [{ scale: circle }] }]} />
            </View>
            {/* progress is dots, not a percentage or a countdown */}
            <View style={styles.dots}>
              {Array.from({ length: cycles }, (_, i) => (
                <View key={i} style={[styles.dot, i < done && styles.dotOn]} />
              ))}
            </View>
          </View>
        )}

        {step === 'offer' && (
          <View style={styles.center}>
            <Text style={styles.prompt}>마음이 꽤 무겁네요. 잠깐 같이 숨 고를까요?</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.pill} onPress={() => setStep('breath')}>
                <Text style={styles.pillText}>같이 쉬기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pill} onPress={enterApp}>
                <Text style={styles.pillText}>괜찮아요</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'label' && (
          <EmotionPicker
            onPick={(word, familyId) => {
              setLabel(word);
              setFamily(familyId);
              setStep('scale');
            }}
          />
        )}

        {step === 'scale' && (
          <View style={styles.center}>
            <Text style={styles.prompt}>0에서 10 중에, 지금은 어느 쯤일까?</Text>
            <View style={styles.scaleRow}>
              {Array.from({ length: 11 }, (_, n) => (
                <TouchableOpacity key={n} style={styles.num} onPress={() => finish(n)}>
                  <Text style={styles.numText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.scaleHint}>0은 많이 힘들어요 · 10은 편안해요</Text>
          </View>
        )}

        {step === 'care' && (
          <View style={styles.center}>
            <Text style={styles.prompt}>요즘 많이 힘든 것 같아요. 혼자 견디지 않아도 돼요.</Text>
            <CrisisFooter tone="dark" />
            <TouchableOpacity style={[styles.pill, { marginTop: 8 }]} onPress={enterApp}>
              <Text style={styles.pillText}>알겠어요</Text>
            </TouchableOpacity>
          </View>
        )}
      </FloatingPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#3a2a24' },
  panel: { minHeight: 210, justifyContent: 'center' },
  center: { alignItems: 'center', gap: 12 },
  hint: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  prompt: { color: '#fff', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  circleBox: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.85)' },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotOn: { backgroundColor: 'rgba(255,255,255,0.9)' },
  row: { flexDirection: 'row', gap: 12 },
  pill: { backgroundColor: '#fff', paddingHorizontal: 22, paddingVertical: 11, borderRadius: 20 },
  pillText: { color: '#111', fontSize: 14, fontWeight: '700' },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 320 },
  num: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  numText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  scaleHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  skip: {
    position: 'absolute',
    right: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    opacity: 0.6,
    zIndex: 10,
  },
  skipText: { color: '#fff', fontSize: 12 },
});

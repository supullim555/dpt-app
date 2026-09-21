import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import RoomBackdrop from '../components/RoomBackdrop';
import RoomStander from '../components/RoomStander';
import CrisisFooter from '../components/CrisisFooter';
import { USE_NATIVE_DRIVER } from '../anim/useNativeDriver';
import { EMOTION_WORDS } from '../data/emotions';
import { useGame } from '../game/GameContext';
import {
  appendGateEntry,
  breathCyclesFor,
  loadGateHistory,
  needsSafetyNote,
} from '../game/gate';

type Props = NativeStackScreenProps<RootStackParamList, 'Gate'>;

// S0 — the gate ("들어오기", plan §6). Each visit: she appears, we breathe together (cyclic
// sighing), a quiet "a bit more?" that passes on its own, one word for the feeling, one number.
// Nothing here is required: it's short, every step moves on, and skipping is always possible.
type Step = 'loading' | 'breath' | 'more' | 'label' | 'scale' | 'care';

const SKIP_APPEARS_AFTER_MS = 10_000; // §6: the skip button shows up, faded, after 10s
const MORE_AUTO_PASS_MS = 3_000; // "a bit more?" passes by itself if unanswered

// One sigh: breathe in, a second short sip on top, then a long breath out.
const SIGH = { in: 2000, sip: 800, out: 3600 };

export default function GateScreen({ navigation }: Props) {
  const { state, loaded } = useGame();
  const [step, setStep] = useState<Step>('loading');
  const [cycles, setCycles] = useState(0); // sighs to do this visit
  const [done, setDone] = useState(0); // sighs finished
  const [label, setLabel] = useState<string | null>(null);
  const [showSkip, setShowSkip] = useState(false);
  const circle = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    loadGateHistory().then((history) => {
      if (cancelled) return;
      setCycles(breathCyclesFor(history));
      setStep('breath');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), SKIP_APPEARS_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  // One sigh per pass of this effect; finishing one bumps `done`, which runs it again.
  useEffect(() => {
    if (step !== 'breath') return;
    let cancelled = false;
    const opts = { useNativeDriver: USE_NATIVE_DRIVER, easing: Easing.inOut(Easing.quad) };
    const anim = Animated.sequence([
      Animated.timing(circle, { toValue: 1.5, duration: SIGH.in, ...opts }),
      Animated.timing(circle, { toValue: 1.85, duration: SIGH.sip, ...opts }),
      Animated.timing(circle, { toValue: 1, duration: SIGH.out, ...opts }),
    ]);
    anim.start(({ finished }) => {
      if (!finished || cancelled) return;
      const n = done + 1;
      setDone(n);
      if (n >= cycles) setStep('more');
    });
    return () => {
      cancelled = true;
      anim.stop();
    };
  }, [step, done, cycles, circle]);

  useEffect(() => {
    if (step !== 'more') return;
    const t = setTimeout(() => setStep('label'), MORE_AUTO_PASS_MS);
    return () => clearTimeout(t);
  }, [step]);

  const goHome = () => navigation.replace('Home');

  const skip = async () => {
    await appendGateEntry({ date: new Date().toISOString(), label: null, score: null, skipped: true });
    goHome();
  };

  const finish = async (score: number) => {
    const history = await appendGateEntry({
      date: new Date().toISOString(),
      label,
      score,
      skipped: false,
    });
    if (needsSafetyNote(history)) setStep('care');
    else goHome();
  };

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        {/* wait for the saved state so bought furniture doesn't pop in after the room appears */}
        {loaded && (
          <RoomBackdrop owned={state.inventory}>
            <RoomStander />
          </RoomBackdrop>
        )}
        {showSkip && step !== 'care' && (
          <TouchableOpacity style={styles.skip} onPress={skip} accessibilityLabel="건너뛰기">
            <Text style={styles.skipText}>건너뛰기</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.panel}>
        {step === 'breath' && (
          <View style={styles.center}>
            {done === 0 && (
              <Text style={styles.hint}>
                코로 들이쉬고, 한 번 더 짧게 들이쉬고, 입으로 길게 내쉬어요.
              </Text>
            )}
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

        {step === 'more' && (
          <View style={styles.center}>
            <Text style={styles.prompt}>조금 더 있을까?</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.pill}
                onPress={() => {
                  setCycles(done + 1);
                  setStep('breath');
                }}
              >
                <Text style={styles.pillText}>조금 더</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pill} onPress={() => setStep('label')}>
                <Text style={styles.pillText}>괜찮아요</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'label' && (
          <View style={styles.center}>
            <Text style={styles.prompt}>지금 마음에 가까운 말이 있다면?</Text>
            <View style={styles.chips}>
              {EMOTION_WORDS.map((word) => (
                <TouchableOpacity
                  key={word}
                  style={styles.chip}
                  onPress={() => {
                    setLabel(word === '잘 모르겠어요' ? null : word);
                    setStep('scale');
                  }}
                >
                  <Text style={styles.chipText}>{word}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
            <TouchableOpacity style={[styles.pill, { marginTop: 8 }]} onPress={goHome}>
              <Text style={styles.pillText}>알겠어요</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const PANEL_BG = 'rgba(20,20,20,0.9)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#3a2a24' },
  stage: { flex: 1 },
  panel: { minHeight: 210, backgroundColor: PANEL_BG, padding: 16, justifyContent: 'center' },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chipText: { color: '#fff', fontSize: 14 },
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
    top: 10,
    right: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    opacity: 0.6,
  },
  skipText: { color: '#fff', fontSize: 12 },
});

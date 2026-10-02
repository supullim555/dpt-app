import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReliefScreenProps } from '../navigation/types';
import CrisisFooter from '../components/CrisisFooter';
import { USE_NATIVE_DRIVER } from '../anim/useNativeDriver';
import { RELIEF_BG, TEXT_ON_DARK, TEXT_ON_DARK_MUTED } from '../theme';

// §8's "사용자 직접 요청 버튼" (user-initiated request button), the one item in that section's
// status table that stayed unimplemented through v0.8. Reached from a floating button that
// sits above every tab (MainTabs), not tucked inside a screen — MindShift CBT's "Quick Relief"
// and the Smashing Magazine mental-health-UI piece both single this pattern out: an acute-distress
// tool has to be one tap away and never require browsing to find, or it doesn't function as one.
//
// Unlike the gate's breathing ritual (a fixed 1-3 sighs tied to visit history), this loops for
// as long as the user stays — no count, no "session complete", nothing recorded. Leaving no
// trace is deliberate: this is a tool, not an exercise to log (§1's "매일 쓰는 앱이 아니다").
const PHASE = [
  { key: 'in', label: '숨을 들이쉬어요', ms: 4000, scale: 1.5 },
  { key: 'hold', label: '잠깐 멈춰요', ms: 2000, scale: 1.7 },
  { key: 'out', label: '천천히 내쉬어요', ms: 6000, scale: 1 },
] as const;

export default function ReliefScreen({ navigation }: ReliefScreenProps) {
  const insets = useSafeAreaInsets();
  const circle = useRef(new Animated.Value(1)).current;
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let index = 0;
    const opts = { useNativeDriver: USE_NATIVE_DRIVER, easing: Easing.inOut(Easing.quad) };

    const step = () => {
      if (cancelled) return;
      const phase = PHASE[index];
      setPhaseIndex(index);
      Animated.timing(circle, { toValue: phase.scale, duration: phase.ms, ...opts }).start(({ finished }) => {
        if (!finished || cancelled) return;
        index = (index + 1) % PHASE.length;
        step();
      });
    };
    step();

    return () => {
      cancelled = true;
      circle.stopAnimation();
    };
  }, [circle]);

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        hitSlop={12}
        style={[styles.back, { top: insets.top + 10 }]}
        accessibilityLabel="닫기"
      >
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <View style={styles.center}>
        <View style={styles.circleBox}>
          <Animated.View style={[styles.circle, { transform: [{ scale: circle }] }]} />
        </View>
        <Text style={styles.phaseLabel}>{PHASE[phaseIndex].label}</Text>
        <Text style={styles.hint}>편해질 때까지, 원하는 만큼만 하고 그만둬도 돼요.</Text>

        <View style={styles.groundingBox}>
          <Text style={styles.groundingTitle}>그래도 힘들다면</Text>
          <Text style={styles.grounding}>
            지금 눈에 보이는 것 3가지, 들리는 소리 2가지, 몸에 닿는 감촉 1가지를 가만히 알아차려 보세요.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <CrisisFooter tone="dark" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: RELIEF_BG, justifyContent: 'space-between' },
  back: { position: 'absolute', left: 12, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  backArrow: { fontSize: 30, color: TEXT_ON_DARK, marginTop: -2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24 },
  circleBox: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.85)' },
  phaseLabel: { color: TEXT_ON_DARK, fontSize: 17, fontWeight: '600' },
  hint: { color: TEXT_ON_DARK_MUTED, fontSize: 13, textAlign: 'center' },
  groundingBox: { marginTop: 24, alignItems: 'center', gap: 6, maxWidth: 320 },
  groundingTitle: { color: TEXT_ON_DARK_MUTED, fontSize: 12, fontWeight: '700' },
  grounding: { color: TEXT_ON_DARK_MUTED, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  footer: { paddingBottom: 4 },
});

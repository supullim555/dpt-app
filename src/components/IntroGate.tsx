import React, { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { loadEntry, saveEntry } from '../storage/storage';
import { loadAiOptIn, setAiOptIn } from '../ai/preference';
import { hasWebGpu } from '../ai/webgpu';
import CrisisFooter from './CrisisFooter';
import { BORDER, INK, MUTED, SCREEN_BG } from '../theme';

const ACK_KEY = 'intro.acknowledged';

type Step = 'loading' | 'disclaimer' | 'ai-choice' | 'done';

// First launch only: a short, ordered one-time sequence before the rest of the app ever
// mounts — the safety disclaimer (always), then the AI on/off choice (only when the browser
// can actually run it). Each step writes its own flag the moment it's answered, so a user who
// already passed the disclaimer under an older build only sees the new ai-choice step added
// after it, not the whole sequence again.
export default function IntroGate({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>('loading');

  // Shared by the initial mount check and by acknowledgeDisclaimer() just below, so acknowledging
  // moves straight to ai-choice (or done) without a second mount/effect round-trip.
  // Wrapped so that ANY failure here (loadAiOptIn already catches its own, but this guards
  // against anything else — a future change, an unexpected throw) still reaches 'done' instead
  // of leaving step stuck on 'loading': this gate sits in front of the entire app, so the one
  // thing worse than the AI choice failing is the whole app failing to ever render because of it.
  const resolveAiChoiceOrDone = async () => {
    try {
      if (!hasWebGpu()) {
        setStep('done');
        return;
      }
      const optIn = await loadAiOptIn();
      setStep(optIn === 'unset' ? 'ai-choice' : 'done');
    } catch {
      setStep('done');
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const acknowledged = (await loadEntry<boolean>(ACK_KEY).catch(() => false)) === true;
      if (cancelled) return;
      if (!acknowledged) {
        setStep('disclaimer');
        return;
      }
      await resolveAiChoiceOrDone();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acknowledgeDisclaimer = async () => {
    await saveEntry(ACK_KEY, true).catch(() => {});
    await resolveAiChoiceOrDone();
  };

  const chooseAi = (on: boolean) => {
    setAiOptIn(on ? 'on' : 'off');
    if (on) {
      // Fire-and-forget: starts the (possibly ~1GB) download now, in the background, while the
      // user goes through the breathing gate and their first conversation — by the time they
      // finish answering, the model has a real head start instead of only beginning at that
      // moment (which is what made the very first AI reply slow in v0.10). Never awaited, and
      // any failure here is silently retried the normal way the first time useAiClosing needs
      // the engine — this is purely a warm-up.
      import('../ai/localEngine')
        .then((mod) => mod.getEngine())
        .catch(() => {});
    }
    setStep('done');
  };

  if (step === 'loading') return <View style={styles.blank} />;
  if (step === 'done') return <>{children}</>;

  if (step === 'ai-choice') {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>AI 기능, 켜볼까요?</Text>
          <Text style={styles.line}>답을 다 쓰고 나면, AI가 그 내용을 짧게 들어주는 마무리 한마디를 더할 수 있어요.</Text>
          <Text style={styles.line}>켜면 처음 한 번 기기에 내려받아요(약 1GB, Wi-Fi 권장). 받은 내용은 이 기기 안에만 남아요.</Text>
          <Text style={styles.line}>꺼도 지금까지와 똑같이 쓸 수 있어요.</Text>
          <TouchableOpacity style={styles.button} onPress={() => chooseAi(true)}>
            <Text style={styles.buttonText}>AI 켜고 시작</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonGhost} onPress={() => chooseAi(false)}>
            <Text style={styles.buttonGhostText}>AI 없이 시작</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // step === 'disclaimer'
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>시작하기 전에</Text>
        <Text style={styles.line}>이 앱은 치료가 아니에요. 전문가의 도움을 대신하지 않아요.</Text>
        <Text style={styles.line}>여기에 쓰는 글은 이 기기에만 저장되고, 아무도 읽지 않아요.</Text>
        <Text style={styles.line}>많이 힘들 때는 혼자 견디지 않아도 돼요.</Text>
        <CrisisFooter tone="light" />
        <TouchableOpacity style={styles.button} onPress={acknowledgeDisclaimer}>
          <Text style={styles.buttonText}>알겠어요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: SCREEN_BG },
  container: { flex: 1, backgroundColor: SCREEN_BG, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 24 },
  title: { fontSize: 18, fontWeight: '700', color: INK, marginBottom: 16 },
  line: { fontSize: 15, lineHeight: 23, color: '#333', marginBottom: 10 },
  button: { alignSelf: 'center', marginTop: 16, backgroundColor: INK, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  buttonGhost: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20 },
  buttonGhostText: { color: MUTED, fontSize: 14, fontWeight: '600' },
});

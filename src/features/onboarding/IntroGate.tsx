import React, { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { loadEntryOr, saveEntry } from '@/core/storage';
import { useAsyncEffect } from '@/core/hooks/useAsyncEffect';
import CrisisFooter from '@/ui/CrisisFooter';
import { BORDER, INK, SCREEN_BG } from '@/ui/theme';

const ACK_KEY = 'intro.acknowledged';

type Step = 'loading' | 'disclaimer' | 'done';

// First launch only: the safety disclaimer (§8), one tap, then the app. v0.28 cut this down from
// a login screen + disclaimer + AI on/off choice (three screens before the first question) to
// this one — "열고 10초 안에 첫 질문" (§2 SG1). AI stays off until someone asks for it from Home's
// ✨ button (QuestWidget shows the Gemini disclosure right there); the email account moved to the
// 메모 tab as an optional extra.
export default function IntroGate({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>('loading');

  // loadEntryOr fails open, so a storage error shows the disclaimer again rather than leaving
  // this gate — which sits in front of the entire app — stuck on a blank screen (§24's bug).
  useAsyncEffect(async (isCancelled) => {
    const acknowledged = (await loadEntryOr<boolean>(ACK_KEY, false)) === true;
    if (!isCancelled()) setStep(acknowledged ? 'done' : 'disclaimer');
  }, []);

  const acknowledge = () => {
    saveEntry(ACK_KEY, true).catch(() => {});
    setStep('done');
  };

  if (step === 'loading') return <View style={styles.blank} />;
  if (step === 'done') return <>{children}</>;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>시작하기 전에</Text>
        <Text style={styles.line}>이 앱은 치료가 아니에요. 전문가의 도움을 대신하지 않아요.</Text>
        <Text style={styles.line}>여기에 쓰는 글은 이 기기에만 저장되고, 아무도 읽지 않아요.</Text>
        <Text style={styles.line}>많이 힘들 때는 혼자 견디지 않아도 돼요.</Text>
        <CrisisFooter tone="light" />
        <TouchableOpacity style={styles.button} onPress={acknowledge}>
          <Text style={styles.buttonText}>시작하기</Text>
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
});

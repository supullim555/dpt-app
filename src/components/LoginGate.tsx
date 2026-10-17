import React, { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { loadAuthMode, setAuthMode } from '../auth/preference';
import { BORDER, INK, MUTED, SCREEN_BG } from '../theme';

type Step = 'loading' | 'choose' | 'done';

// The very first thing shown, before even IntroGate's disclaimer (§28, 2026-10-17: "로그인해서
// 하게 만들자, 일단 진짜 로그인은 안 하더라도, 게스트를 눌러서 실행은 할 수 있게"). Only one path
// actually works right now — "게스트로 시작" sets the stored mode and lets the rest of the app
// mount, exactly as it did before this screen existed. "로그인" is shown (not hidden or disabled
// — a real user should see it's coming, not wonder if it's broken) but doesn't go anywhere yet;
// tapping it reveals a short, honest note instead of pretending to do something.
//
// Persisted so this is a true one-time choice like IntroGate's disclaimer: once someone has ever
// continued as a guest, every later launch skips straight past this screen.
export default function LoginGate({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>('loading');
  const [showLoginNote, setShowLoginNote] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // loadAuthMode already fails open to null internally, but the whole app hangs behind this
      // gate, so wrap the call itself too — same lesson as the blank-screen bug §24 found in
      // IntroGate: nothing in front of the entire app may be allowed to leave `step` on 'loading'.
      try {
        const mode = await loadAuthMode();
        if (!cancelled) setStep(mode === 'guest' ? 'done' : 'choose');
      } catch {
        if (!cancelled) setStep('done');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const continueAsGuest = async () => {
    await setAuthMode('guest').catch(() => {});
    setStep('done');
  };

  if (step === 'loading') return <View style={styles.blank} />;
  if (step === 'done') return <>{children}</>;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.appName}>마음 연습</Text>
        <Text style={styles.title}>시작하기</Text>
        <Text style={styles.line}>
          로그인하면 나중에 다른 기기에서도 이어서 쓸 수 있게 될 예정이에요. 지금은 게스트로
          시작해도 지금까지와 똑같이 이 기기에만 저장돼요.
        </Text>
        <TouchableOpacity style={styles.button} onPress={continueAsGuest}>
          <Text style={styles.buttonText}>게스트로 시작</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonGhost} onPress={() => setShowLoginNote((v) => !v)}>
          <Text style={styles.buttonGhostText}>로그인</Text>
        </TouchableOpacity>
        {showLoginNote && <Text style={styles.note}>로그인 기능은 아직 준비 중이에요. 지금은 게스트로 시작해 주세요.</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: SCREEN_BG },
  container: { flex: 1, backgroundColor: SCREEN_BG, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 24 },
  appName: { fontSize: 15, fontWeight: '700', color: MUTED, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '700', color: INK, marginBottom: 16 },
  line: { fontSize: 15, lineHeight: 23, color: '#333', marginBottom: 10 },
  button: { alignSelf: 'center', marginTop: 16, backgroundColor: INK, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  buttonGhost: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20 },
  buttonGhostText: { color: MUTED, fontSize: 14, fontWeight: '600' },
  note: { fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 10 },
});

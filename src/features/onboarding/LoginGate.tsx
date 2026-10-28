import React, { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { loadAuthMode, setAuthMode } from './authMode';
import { supabase } from './supabase';
import { BORDER, INK, MUTED, SCREEN_BG } from '@/ui/theme';

type Step = 'loading' | 'choose' | 'done';
type AuthFormMode = 'login' | 'signup';

// Turns a Supabase auth error's (English, sometimes technical) message into something this
// app's otherwise all-Korean UI can show. Falls back to a generic line for anything unmapped —
// never shows the raw message, which could be implementation detail Supabase changes over time.
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않아요.';
  if (m.includes('already registered') || m.includes('already exists')) return '이미 가입된 이메일이에요. 로그인을 눌러주세요.';
  if (m.includes('password') && m.includes('6')) return '비밀번호는 6자 이상이어야 해요.';
  if (m.includes('email') && m.includes('invalid')) return '이메일 형식을 확인해주세요.';
  if (m.includes('email not confirmed')) return '이메일 인증이 아직 안 됐어요. 메일함을 확인해주세요.';
  if (m.includes('rate limit')) return '시도가 너무 잦아요. 잠시 후 다시 시도해주세요.';
  return '지금은 처리할 수 없어요. 잠시 후 다시 시도해주세요.';
}

// The very first thing shown, before even IntroGate's disclaimer (§28, then §29 2026-10-19 for
// the real Supabase connection — the project was linked back on 2026-09-15 but never wired into
// any code until now). Two independently-working ways in:
//   - "게스트로 시작" — unchanged from §28. Stores auth.mode = 'guest' locally; nothing about the
//     rest of the app changes, still fully on-device.
//   - 이메일 로그인/회원가입 — real now, via Supabase Auth. A session only gets you PAST this
//     screen; it doesn't sync anything yet (§29 was scoped to auth only, not data) — game
//     progress, memos, everything else still lives in this device's AsyncStorage regardless of
//     which way someone got in. That's still a gap in IntroGate's wording worth revisiting if
//     sync is ever added.
//
// onAuthStateChange (not a one-off getSession check) is the single source of truth here on
// purpose: Supabase fires it once immediately with whatever the current session is, AND again
// on every later sign-in/out — so signing out from deep in the app (MemoScreen's "로그아웃") flows
// back through this exact same listener and correctly reopens this screen, without LoginGate
// needing to be remounted.
export default function LoginGate({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>('loading');
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<AuthFormMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      if (session) {
        setStep('done');
        return;
      }
      // No session: either never logged in, or just signed out — either way, fall back to the
      // same guest-flag check §28 always did. Wrapped the same defensive way as IntroGate's
      // equivalent check: this sits in front of the whole app, so a storage failure here must
      // fail open (show the choose screen) rather than leave `step` stuck on 'loading'.
      try {
        const mode = await loadAuthMode();
        if (!cancelled) setStep(mode === 'guest' ? 'done' : 'choose');
      } catch {
        if (!cancelled) setStep('done');
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const continueAsGuest = async () => {
    await setAuthMode('guest').catch(() => {});
    setStep('done');
  };

  const submitAuthForm = async () => {
    setError(null);
    setInfo(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      if (formMode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: trimmedEmail, password });
        if (signUpError) {
          setError(translateAuthError(signUpError.message));
          return;
        }
        // A session here means the project's auth settings don't require email confirmation —
        // onAuthStateChange above already handles moving on to 'done' in that case. Otherwise
        // (no session yet) this is the honest state to show, not a guess at what happens next.
        if (!data.session) {
          setInfo('확인 이메일을 보냈어요. 메일함의 링크를 누르면 가입이 끝나요.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (signInError) {
          setError(translateAuthError(signInError.message));
          return;
        }
        // Success falls through to onAuthStateChange, which moves step to 'done'.
      }
    } catch {
      setError('지금은 연결할 수 없어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'loading') return <View style={styles.blank} />;
  if (step === 'done') return <>{children}</>;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.appName}>마음 연습</Text>
        <Text style={styles.title}>시작하기</Text>
        <Text style={styles.line}>
          로그인하면 계정이 생겨요. 지금은 로그인해도 실습·메모 같은 기록은 전부 이 기기에만
          저장돼요 — 기기 간 동기화는 아직이에요.
        </Text>

        <TouchableOpacity style={styles.button} onPress={continueAsGuest}>
          <Text style={styles.buttonText}>게스트로 시작</Text>
        </TouchableOpacity>

        {!showForm ? (
          <TouchableOpacity style={styles.buttonGhost} onPress={() => setShowForm(true)}>
            <Text style={styles.buttonGhostText}>로그인 / 회원가입</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.form}>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeTab, formMode === 'login' && styles.modeTabActive]}
                onPress={() => {
                  setFormMode('login');
                  setError(null);
                  setInfo(null);
                }}
              >
                <Text style={[styles.modeTabText, formMode === 'login' && styles.modeTabTextActive]}>로그인</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, formMode === 'signup' && styles.modeTabActive]}
                onPress={() => {
                  setFormMode('signup');
                  setError(null);
                  setInfo(null);
                }}
              >
                <Text style={[styles.modeTabText, formMode === 'signup' && styles.modeTabTextActive]}>회원가입</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="이메일"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="비밀번호 (6자 이상)"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error && <Text style={styles.error}>{error}</Text>}
            {info && <Text style={styles.info}>{info}</Text>}

            <TouchableOpacity style={styles.button} onPress={submitAuthForm} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{formMode === 'signup' ? '회원가입' : '로그인'}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  button: { alignSelf: 'center', marginTop: 16, backgroundColor: INK, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20, minWidth: 140, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  buttonGhost: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20 },
  buttonGhostText: { color: MUTED, fontSize: 14, fontWeight: '600' },
  form: { marginTop: 14, gap: 10 },
  modeRow: { flexDirection: 'row', alignSelf: 'center', backgroundColor: SCREEN_BG, borderRadius: 16, padding: 3, gap: 2 },
  modeTab: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 13 },
  modeTabActive: { backgroundColor: INK },
  modeTabText: { fontSize: 13, fontWeight: '600', color: MUTED },
  modeTabTextActive: { color: '#fff' },
  input: {
    backgroundColor: SCREEN_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: INK,
  },
  error: { fontSize: 13, color: '#c23b3b', textAlign: 'center' },
  info: { fontSize: 13, color: MUTED, textAlign: 'center' },
});

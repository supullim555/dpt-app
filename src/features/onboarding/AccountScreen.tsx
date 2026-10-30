import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AccountScreenProps } from '@/app/navigation/types';
import { supabase } from './supabase';
import { BORDER, INK, MUTED, SCREEN_BG } from '@/ui/theme';

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

// Optional email account (Supabase Auth, §29). Until v0.28 this was LoginGate, a screen in front
// of the whole app that everyone had to pass ("게스트로 시작" or log in) — the first of three
// screens before the first question. An account doesn't sync anything yet, so it's now just
// this screen, reached from the 메모 tab by someone who wants one. Signing in closes it.
export default function AccountScreen({ navigation }: AccountScreenProps) {
  const insets = useSafeAreaInsets();
  const [formMode, setFormMode] = useState<AuthFormMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // A session appearing (login, or a sign-up that doesn't need email confirmation) closes this.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') navigation.goBack();
    });
    return () => sub.subscription.unsubscribe();
  }, [navigation]);

  const switchMode = (mode: AuthFormMode) => {
    setFormMode(mode);
    setError(null);
    setInfo(null);
  };

  const submit = async () => {
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
        if (signUpError) setError(translateAuthError(signUpError.message));
        else if (!data.session) setInfo('확인 이메일을 보냈어요. 메일함의 링크를 누르면 가입이 끝나요.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (signInError) setError(translateAuthError(signInError.message));
      }
    } catch {
      setError('지금은 연결할 수 없어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={styles.back} accessibilityLabel="뒤로">
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>계정 (선택)</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.line}>
            계정 없이도 모든 기능을 쓸 수 있어요. 지금은 로그인해도 기록은 이 기기에만 저장돼요 — 기기 간
            동기화는 아직이에요.
          </Text>

          <View style={styles.modeRow}>
            {(['login', 'signup'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeTab, formMode === mode && styles.modeTabActive]}
                onPress={() => switchMode(mode)}
              >
                <Text style={[styles.modeTabText, formMode === mode && styles.modeTabTextActive]}>
                  {mode === 'login' ? '로그인' : '회원가입'}
                </Text>
              </TouchableOpacity>
            ))}
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

          <TouchableOpacity style={styles.button} onPress={submit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{formMode === 'signup' ? '회원가입' : '로그인'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SCREEN_BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 8 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 30, color: INK, marginTop: -2 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: INK },
  body: { flex: 1, alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 24, gap: 10 },
  line: { fontSize: 14, lineHeight: 21, color: '#333', marginBottom: 4 },
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
  button: { alignSelf: 'center', marginTop: 6, backgroundColor: INK, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20, minWidth: 140, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

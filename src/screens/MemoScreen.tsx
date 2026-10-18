import { useCallback, useState } from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { MemoScreenProps } from '../navigation/types';
import ScreenHeader from '../components/ScreenHeader';
import { EXERCISES } from '../data/exercises';
import { clearMemory, loadMemory, DAILY_CHECKIN_ID, AI_CHAT_ID, type MemoryEntry } from '../game/memory';
import { confirmDestructive } from '../lib/confirm';
import { supabase } from '../supabase/client';
import { BORDER, MUTED, SCREEN_BG } from '../theme';

// A plain, read-only look back at what's been said — the missing half of the callback device
// (plan §17): callbacks surface ONE past answer at a time inside a dialogue, but until now
// there was no way to see the rest, even though every answer was already being kept
// (memory.ts). This screen just reads that same log; it doesn't add a new store.
// Named "메모" rather than "지난 이야기" — reads like something you'd actually open, not an
// archive.
//
// §27 (2026-10-17): the "이야기" tab — a separate list-of-exercises-then-detail-screen flow —
// was removed; exercises now run inline on Home (its quest widget) instead of being picked from
// a menu. That tab's other half, "look back at what you've done," was already redundant with
// this screen (memory.ts already recorded every exercise's answers, not just check-ins), so it
// was merged here rather than kept as a second, parallel log. Nothing below changed to make that
// true — LABELS already covered every exercise id.
const LABELS: Record<string, string> = { [DAILY_CHECKIN_ID]: '오늘 하루 이야기', [AI_CHAT_ID]: 'AI와 자유 대화' };
for (const e of EXERCISES) LABELS[e.id] = e.title;
const labelFor = (id: string) => LABELS[id] ?? id;

type Section = { title: string; data: MemoryEntry[] };

// Most recent day first; entries within a day newest first too. Log entries for one day are
// always contiguous (memory.ts only appends), so reversing the whole list keeps each day's
// entries together without needing a second grouping pass.
function toSections(log: MemoryEntry[]): Section[] {
  const sections: Section[] = [];
  for (const entry of [...log].reverse()) {
    const last = sections[sections.length - 1];
    if (last && last.title === entry.date) last.data.push(entry);
    else sections.push({ title: entry.date, data: [entry] });
  }
  return sections;
}

export default function MemoScreen(_props: MemoScreenProps) {
  const [sections, setSections] = useState<Section[] | null>(null);
  // §29: shown only for a real Supabase session, not for a guest (there's nothing to log out
  // of). Re-checked on every focus for the same reason memory reloads on every focus — this
  // screen has no other way to learn "someone just signed in/out elsewhere" without it.
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const reload = useCallback(() => {
    loadMemory().then((log) => setSections(toSections(log)));
    supabase.auth.getSession().then(({ data }) => setUserEmail(data.session?.user.email ?? null));
  }, []);

  // Refetches on every visit (not just first mount), so a check-in or exercise done since the
  // last time this screen was open shows up without needing a manual pull-to-refresh.
  useFocusEffect(reload);

  const handleSignOut = async () => {
    const ok = await confirmDestructive('로그아웃할까요?', '메모 같은 기록은 이 기기에 그대로 남아요. 다시 로그인하면 돌아올 수 있어요.');
    if (ok) await supabase.auth.signOut();
    // No need to update local state here — LoginGate's onAuthStateChange listener picks this up
    // and brings the login screen back on its own (see LoginGate.tsx's header comment).
  };

  const handleClear = async () => {
    const ok = await confirmDestructive('메모를 전부 지울까요?', '지금까지 쌓인 메모가 모두 사라지고, 되돌릴 수 없어요.');
    if (ok) {
      await clearMemory();
      reload();
    }
  };

  const accountFooter = userEmail && (
    <View style={styles.accountFooter}>
      <Text style={styles.accountEmail}>{userEmail}</Text>
      <TouchableOpacity onPress={handleSignOut}>
        <Text style={styles.signOutText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="메모" />
      {!sections ? null : sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 쌓인 메모가 없어요.</Text>
          <Text style={styles.emptyText}>오늘 이야기를 나누면 여기 쌓여요.</Text>
          {accountFooter}
        </View>
      ) : (
        <SectionList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          sections={sections}
          keyExtractor={(item, i) => `${item.id}.${item.date}.${i}`}
          renderSectionHeader={({ section }) => <Text style={styles.dateHeader}>{section.title}</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.label}>{labelFor(item.id)}</Text>
              <Text style={styles.question}>{item.question}</Text>
              <Text style={styles.answer}>{item.answer}</Text>
            </View>
          )}
          ListFooterComponent={
            <>
              <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                <Text style={styles.clearButtonText}>메모 전체 지우기</Text>
              </TouchableOpacity>
              {accountFooter}
            </>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SCREEN_BG },
  list: { flex: 1 },
  listContent: { paddingBottom: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 4 },
  emptyText: { fontSize: 14, color: MUTED, textAlign: 'center' },
  dateHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
    backgroundColor: SCREEN_BG,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  label: { fontSize: 12, fontWeight: '700', color: '#8a8a8a' },
  question: { fontSize: 12, color: MUTED, marginTop: 4 },
  answer: { fontSize: 15, color: '#222', marginTop: 6, lineHeight: 21 },
  clearButton: { alignSelf: 'center', marginTop: 16, marginBottom: 24, padding: 8 },
  clearButtonText: { fontSize: 12, color: '#b45309' },
  accountFooter: { alignItems: 'center', gap: 4, marginTop: 8, marginBottom: 24 },
  accountEmail: { fontSize: 11, color: '#aaa' },
  signOutText: { fontSize: 12, color: MUTED, fontWeight: '600' },
});

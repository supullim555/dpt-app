import { useCallback, useState } from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { MemoScreenProps } from '../navigation/types';
import ScreenHeader from '../components/ScreenHeader';
import { EXERCISES } from '../data/exercises';
import { clearMemory, loadMemory, DAILY_CHECKIN_ID, type MemoryEntry } from '../game/memory';
import { confirmDestructive } from '../lib/confirm';
import { BORDER, MUTED, SCREEN_BG } from '../theme';

// A plain, read-only look back at what's been said — the missing half of the callback device
// (plan §17): callbacks surface ONE past answer at a time inside a dialogue, but until now
// there was no way to see the rest, even though every answer was already being kept
// (memory.ts). This screen just reads that same log; it doesn't add a new store.
// Named "메모" rather than "지난 이야기" — reads like something you'd actually open, not an
// archive.
const LABELS: Record<string, string> = { [DAILY_CHECKIN_ID]: '오늘 하루 이야기' };
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

  const reload = useCallback(() => {
    loadMemory().then((log) => setSections(toSections(log)));
  }, []);

  // Refetches on every visit (not just first mount), so a check-in or exercise done since the
  // last time this screen was open shows up without needing a manual pull-to-refresh.
  useFocusEffect(reload);

  const handleClear = async () => {
    const ok = await confirmDestructive('메모를 전부 지울까요?', '지금까지 쌓인 메모가 모두 사라지고, 되돌릴 수 없어요.');
    if (ok) {
      await clearMemory();
      reload();
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="메모" />
      {!sections ? null : sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 쌓인 메모가 없어요.</Text>
          <Text style={styles.emptyText}>오늘 이야기를 나누면 여기 쌓여요.</Text>
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
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>메모 전체 지우기</Text>
            </TouchableOpacity>
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
});

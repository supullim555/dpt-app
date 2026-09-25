import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExerciseDetailScreenProps } from '../navigation/types';
import DialogueExercise from '../components/DialogueExercise';
import CrisisFooter from '../components/CrisisFooter';
import FloatingPanel from '../components/FloatingPanel';
import { EXERCISES } from '../data/exercises';
import { useGame } from '../game/GameContext';
import { quote, recordMemory, takeCallback, type MemoryEntry } from '../game/memory';
import { INK, MUTED, TEXT_ON_DARK_MUTED } from '../theme';

// Reached by pushing from the "이야기" tab, on the root stack (outside MainTabs) — this is the
// one screen that still covers the tab bar, since it's a single focused thing to do rather than
// another section to jump between.
//
// The dialogue used to be laid out inline after the theory/goal text, in a plain ScrollView —
// on a short phone screen, with a few paragraphs of theory above it, the "다음" button could
// end up below the fold with no visual cue to scroll for it. Docked in a fixed FloatingPanel at
// the bottom instead (the same shape Home's check-in uses), it's always reachable regardless of
// how long the description above happens to be.
export default function ExerciseDetailScreen({ route, navigation }: ExerciseDetailScreenProps) {
  const exercise = EXERCISES.find((e) => e.id === route.params.exerciseId);
  const { completeExercise, isCompletedToday } = useGame();
  const insets = useSafeAreaInsets();
  const [callback, setCallback] = useState<MemoryEntry | null>(null);
  const [callbackLoaded, setCallbackLoaded] = useState(false);
  // Set once THIS visit's dialogue finishes. completeExercise() flips alreadyDoneToday in the
  // same render pass, which would otherwise swap DialogueExercise out for the "이미 했어요"
  // notice before its own thank-you line ever got shown — so once true, keep rendering
  // DialogueExercise (it shows the thank-you line itself once its internal state is done).
  const [justFinished, setJustFinished] = useState(false);

  // Looked up once per visit, specific to this exercise's own past answers — so re-entering
  // "문제 외재화 인터뷰" later can open with what was said here last time, the same thread
  // continuing rather than a fresh unrelated start each time.
  useEffect(() => {
    if (!exercise) return;
    let cancelled = false;
    takeCallback(exercise.id).then((found) => {
      if (cancelled) return;
      setCallback(found);
      setCallbackLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [exercise?.id]);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>
    </View>
  );

  if (!exercise) {
    return (
      <View style={styles.screen}>
        {header}
        <Text style={styles.notFound}>찾을 수 없어요.</Text>
      </View>
    );
  }

  const alreadyDoneToday = isCompletedToday(exercise.id);

  const handleDialogueComplete = (answers: string[]) => {
    // memory.ts is the one place this is stored (the memo tab reads it back); there's no
    // separate per-day answer key to keep in sync with it anymore.
    recordMemory(exercise.id, exercise.questions, answers);
    setJustFinished(true);
    // No popup, no praise, and no nudge toward the shop (§4): the dialogue's closing line
    // thanks them, and the coins just quietly add up.
    completeExercise(exercise.id);
  };

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.title}>{exercise.title}</Text>
        <Text style={styles.body}>{exercise.summary}</Text>

        <Text style={styles.label}>이론</Text>
        <Text style={styles.body}>{exercise.theory}</Text>

        <Text style={styles.label}>목표</Text>
        <Text style={styles.body}>{exercise.goal}</Text>
      </ScrollView>

      <FloatingPanel style={styles.dock}>
        {alreadyDoneToday && !justFinished ? (
          <Text style={styles.notice}>오늘은 이미 나눴어요. 편할 때 다시 와요.</Text>
        ) : exercise.questions.length === 0 ? (
          <Text style={styles.notice}>아직 준비 중이에요. 조금만 기다려 주세요.</Text>
        ) : (
          // Wait for the callback lookup so the lead-in beat doesn't appear or disappear
          // out from under the dialogue after the user has already started it.
          callbackLoaded && (
            <DialogueExercise
              questions={exercise.questions}
              onComplete={handleDialogueComplete}
              leadIn={callback ? `지난번 여기서 "${quote(callback.answer)}"라고 적었었죠.` : undefined}
            />
          )
        )}
        <CrisisFooter tone="dark" />
      </FloatingPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 12, paddingBottom: 4 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 30, color: INK, marginTop: -2 },
  notFound: { padding: 20, color: MUTED },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, color: INK },
  label: { fontSize: 13, fontWeight: '700', color: '#888', marginTop: 20 },
  body: { fontSize: 15, color: '#333', lineHeight: 22, marginTop: 6 },
  dock: {},
  notice: { fontSize: 14, color: TEXT_ON_DARK_MUTED, textAlign: 'center' },
});

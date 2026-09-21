import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { EXERCISES } from '../data/exercises';
import { useGame } from '../game/GameContext';
import DialogueExercise from '../components/DialogueExercise';
import CrisisFooter from '../components/CrisisFooter';
import { saveEntry } from '../storage/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'ExerciseDetail'>;

export default function ExerciseDetailScreen({ route }: Props) {
  const exercise = EXERCISES.find((e) => e.id === route.params.exerciseId);
  const { completeExercise, isCompletedToday } = useGame();

  if (!exercise) {
    return (
      <View style={styles.container}>
        <Text>실습을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const alreadyDoneToday = isCompletedToday(exercise.id);

  const handleDialogueComplete = (answers: string[]) => {
    const today = new Date().toISOString().slice(0, 10);
    saveEntry(`answers.${exercise.id}.${today}`, answers);
    // No popup, no praise, and no nudge toward the shop (§4): the dialogue's closing line
    // thanks them, and the coins just quietly add up.
    completeExercise(exercise.id);
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.title}>{exercise.title}</Text>
        <Text style={styles.body}>{exercise.summary}</Text>

        <Text style={styles.label}>이론</Text>
        <Text style={styles.body}>{exercise.theory}</Text>

        <Text style={styles.label}>목표</Text>
        <Text style={styles.body}>{exercise.goal}</Text>

        {alreadyDoneToday ? (
          <Text style={styles.notice}>오늘은 이미 이 실습을 했어요. 편할 때 다시 만나요.</Text>
        ) : exercise.questions.length > 0 ? (
          <DialogueExercise questions={exercise.questions} onComplete={handleDialogueComplete} />
        ) : (
          <Text style={styles.notice}>
            이 실습의 인터랙티브 화면은 아직 구현되지 않았습니다. 다음 개발 단계에서 추가될
            예정입니다.
          </Text>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <CrisisFooter tone="light" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  footer: { borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fafafa' },
  container: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12, color: '#222' },
  label: { fontSize: 13, fontWeight: '700', color: '#888', marginTop: 20 },
  body: { fontSize: 15, color: '#333', lineHeight: 22, marginTop: 6 },
  notice: {
    marginTop: 28,
    fontSize: 13,
    color: '#b45309',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 10,
  },
});

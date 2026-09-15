import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { EXERCISES } from '../data/exercises';
import { useGame } from '../game/GameContext';

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{exercise.title}</Text>
      <Text style={styles.body}>{exercise.summary}</Text>

      <Text style={styles.label}>이론</Text>
      <Text style={styles.body}>{exercise.theory}</Text>

      <Text style={styles.label}>목표</Text>
      <Text style={styles.body}>{exercise.goal}</Text>

      {!exercise.implemented && (
        <Text style={styles.notice}>
          이 실습의 인터랙티브 화면은 아직 구현되지 않았습니다. 다음 개발 단계에서 추가될
          예정입니다.
        </Text>
      )}

      <TouchableOpacity
        style={[styles.completeButton, isCompletedToday(exercise.id) && styles.completeButtonDone]}
        disabled={isCompletedToday(exercise.id)}
        onPress={() => {
          const success = completeExercise(exercise.id);
          if (success) {
            Alert.alert('완료!', '+10 코인을 받았어요. 상점에서 사용해보세요.');
          }
        }}
      >
        <Text style={styles.completeButtonText}>
          {isCompletedToday(exercise.id) ? '오늘은 이미 완료했어요' : '오늘 이 실습을 했어요 (+10 코인)'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  completeButton: {
    marginTop: 28,
    backgroundColor: '#222',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonDone: { backgroundColor: '#bbb' },
  completeButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

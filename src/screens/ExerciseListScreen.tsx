import { SectionList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { TalkScreenProps } from '../navigation/types';
import ScreenHeader from '../components/ScreenHeader';
import CoinBadge from '../components/CoinBadge';
import { EXERCISES, TRACKS, type Track } from '../data/exercises';
import { useGame } from '../game/GameContext';
import { BORDER, MUTED, SCREEN_BG } from '../theme';

const sections = (Object.keys(TRACKS) as Track[]).map((track) => ({
  title: TRACKS[track].label,
  data: EXERCISES.filter((e) => e.track === track),
}));

// The "이야기" tab (was a separate "실습" screen with its own 홈/상점 buttons — both are gone
// now that MainTabs is always there).
export default function ExerciseListScreen({ navigation }: TalkScreenProps) {
  const { state } = useGame();

  return (
    <SectionList
      style={styles.list}
      ListHeaderComponent={<ScreenHeader title="이야기" right={<CoinBadge coins={state.coins} />} />}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
        >
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSummary} numberOfLines={2}>
            {item.summary}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: SCREEN_BG },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: MUTED,
    backgroundColor: SCREEN_BG,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
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
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  cardSummary: { marginTop: 6, fontSize: 13, color: MUTED, lineHeight: 18 },
});

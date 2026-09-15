import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { EXERCISES, TRACKS, type Track } from '../data/exercises';
import { useGame } from '../game/GameContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ExerciseList'>;

const sections = (Object.keys(TRACKS) as Track[]).map((track) => ({
  title: TRACKS[track].label,
  data: EXERCISES.filter((e) => e.track === track),
}));

export default function ExerciseListScreen({ navigation }: Props) {
  const { state } = useGame();

  return (
    <SectionList
      style={styles.list}
      ListHeaderComponent={
        <View style={styles.navRow}>
          <Text style={styles.coins}>코인 {state.coins}</Text>
          <View style={styles.navButtons}>
            <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.navButtonText}>홈</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Shop')}>
              <Text style={styles.navButtonText}>상점</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
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
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {!item.implemented && <Text style={styles.badge}>준비 중</Text>}
          </View>
          <Text style={styles.cardSummary} numberOfLines={2}>
            {item.summary}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#fafafa' },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  coins: { fontSize: 15, fontWeight: '700', color: '#444' },
  navButtons: { flexDirection: 'row', gap: 8 },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#eee',
  },
  navButtonText: { fontSize: 13, fontWeight: '600', color: '#333' },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    backgroundColor: '#fafafa',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  cardSummary: { marginTop: 6, fontSize: 13, color: '#666', lineHeight: 18 },
  badge: {
    fontSize: 11,
    color: '#b45309',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
});

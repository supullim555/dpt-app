import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StatusScreenProps } from '../navigation/types';
import StatBar from '../components/StatBar';
import { useGame } from '../game/GameContext';
import { STAT_IDS, dominantTitle } from '../game/stats';
import { INK, SCREEN_BG } from '../theme';

// §33's "프린세스 메이커 느낌" status screen — reached from Home's StatusBadge. Header shape
// copied from AiChatScreen (‹ back + centered title); just a read-only list, so no CrisisFooter
// here (MemoScreen/ShopScreen, the app's other "just look at something" screens, don't have one
// either — it's reserved for conversation-flow screens).
export default function StatusScreen({ navigation }: StatusScreenProps) {
  const insets = useSafeAreaInsets();
  const { state } = useGame();
  const title = dominantTitle(state.stats);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>상태</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>{title ?? '아직 특별한 색깔이 없어요'}</Text>
        <View style={styles.bars}>
          {STAT_IDS.map((id) => (
            <StatBar key={id} statId={id} value={state.stats[id]} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SCREEN_BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 30, color: INK, marginTop: -2 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: INK },
  body: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '800', color: INK, textAlign: 'center', marginBottom: 24 },
  bars: { gap: 18 },
});

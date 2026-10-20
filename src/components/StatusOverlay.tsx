import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import StatBar from './StatBar';
import { useGame } from '../game/GameContext';
import { STAT_IDS, dominantTitle } from '../game/stats';
import { BORDER, INK, MUTED, shadow } from '../theme';

const cardShadow = shadow({ y: 6, blur: 20, opacity: 0.18, elevation: 8 });

type Props = { onClose: () => void };

// §34's "살짝 투명한 창" — a translucent floating window instead of a full-screen push, so the
// room stays dimly visible behind it (just a glance at your stats, not a new place you've gone
// to). Deliberately not React Navigation's `transparentModal`: that presentation isn't reliably
// transparent on Android or on react-native-web (both effectively fall back to an opaque screen),
// so this is a plain conditionally-rendered overlay inside HomeScreen instead — the same pattern
// FloatingPanel and QuestWidget's aiPrompt already use for everything else that floats over the
// room.
export default function StatusOverlay({ onClose }: Props) {
  const { state } = useGame();
  const title = dominantTitle(state.stats);

  return (
    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} accessibilityLabel="상태 창 닫기">
      {/* A no-op TouchableOpacity, not a plain View: claims the touch so tapping the card itself
          doesn't bubble up to the backdrop's onPress and close the window underneath it. */}
      <TouchableOpacity style={styles.card} activeOpacity={1} onPress={() => {}}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>상태</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeButton} accessibilityLabel="닫기">
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.body} bounces={false}>
          <Text style={styles.title}>{title ?? '아직 특별한 색깔이 없어요'}</Text>
          <View style={styles.bars}>
            {STAT_IDS.map((id) => (
              <StatBar key={id} statId={id} value={state.stats[id]} />
            ))}
          </View>
        </ScrollView>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '80%',
    // Slightly transparent, not opaque — "살짝 투명한 창": the room stays faintly visible
    // through it, unlike every other solid-white card in the app (ShopScreen rows, etc).
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    ...cardShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: INK },
  closeButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 16, color: MUTED, fontWeight: '700' },
  body: { paddingHorizontal: 20, paddingBottom: 22 },
  title: { fontSize: 15, fontWeight: '700', color: INK, textAlign: 'center', marginBottom: 20 },
  bars: { gap: 16 },
});

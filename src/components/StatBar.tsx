import { Image, StyleSheet, Text, View } from 'react-native';
import { BAR_MAX, STAT_EMOJI_FALLBACK, STAT_LABEL, type StatId } from '../game/stats';
import { STAT_ICON_SOURCES } from '../assets/statIcons';
import { BORDER, INK, MUTED } from '../theme';

type Props = { statId: StatId; value: number };

// One row of the status screen (§33): icon, label, numeric value, and a fill bar. Deliberately
// monochrome (fill/track both existing theme.ts tokens) rather than six new accent colors — the
// icon is what tells the rows apart, the bar just shows how full each one is.
export default function StatBar({ statId, value }: Props) {
  const source = STAT_ICON_SOURCES[statId];
  const ratio = Math.max(0, Math.min(1, value / BAR_MAX));
  return (
    <View style={styles.row}>
      {source ? (
        <Image source={source} style={styles.icon} resizeMode="contain" />
      ) : (
        <Text style={styles.emoji}>{STAT_EMOJI_FALLBACK[statId]}</Text>
      )}
      <View style={styles.main}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{STAT_LABEL[statId]}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 28, height: 28 },
  emoji: { fontSize: 22, width: 28, textAlign: 'center' },
  main: { flex: 1, gap: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 14, fontWeight: '700', color: INK },
  value: { fontSize: 13, fontWeight: '600', color: MUTED },
  track: { height: 8, borderRadius: 4, backgroundColor: BORDER, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: INK },
});

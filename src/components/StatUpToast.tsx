import { Image, StyleSheet, Text, View } from 'react-native';
import type { StatToastState } from '../hooks/useStatToast';
import { STAT_EMOJI_FALLBACK, STAT_LABEL } from '../game/stats';
import { STAT_ICON_SOURCES } from '../assets/statIcons';
import { CHIP_SHADOW, INK, OVERLAY_LIGHT } from '../theme';

type Props = { toast: StatToastState };

// Same small-pill recipe as CoinBadge — nothing new invented. Rendered as the first child inside
// whichever FloatingPanel is currently showing a dialogue (§33), so it appears and disappears in
// the same 1800ms window as DialogueExercise's own "고마워요" bubble instead of as a competing
// independent overlay.
export default function StatUpToast({ toast }: Props) {
  if (!toast) return null;
  const source = STAT_ICON_SOURCES[toast.statId];
  return (
    <View style={styles.pill}>
      {source ? (
        <Image source={source} style={styles.icon} resizeMode="contain" />
      ) : (
        <Text style={styles.emoji}>{STAT_EMOJI_FALLBACK[toast.statId]}</Text>
      )}
      <Text style={styles.text}>
        {STAT_LABEL[toast.statId]} +{toast.gain}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginBottom: 10,
    backgroundColor: OVERLAY_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    ...CHIP_SHADOW,
  },
  icon: { width: 16, height: 16 },
  emoji: { fontSize: 14 },
  text: { fontSize: 12, fontWeight: '700', color: INK },
});

import { StyleSheet, Text, View } from 'react-native';
import type { StatToastState } from './useStatToast';
import { STAT_EMOJI_FALLBACK, STAT_LABEL } from './stats';
import { STAT_ICON_SOURCES } from '@/assets/statIcons';
import IconOrEmoji from '@/ui/IconOrEmoji';
import { CHIP_SHADOW, INK, OVERLAY_LIGHT } from '@/ui/theme';

type Props = { toast: StatToastState };

// Same small-pill recipe as CoinBadge (HudBadge) — not built on it directly since this one also
// needs an icon alongside the text, which HudBadge's plain-text-child shape doesn't fit. Rendered
// as the first child inside whichever FloatingPanel is currently showing a dialogue (§33), so it
// appears and disappears in the same 1800ms window as DialogueExercise's own "고마워요" bubble
// instead of as a competing independent overlay.
export default function StatUpToast({ toast }: Props) {
  if (!toast) return null;
  return (
    <View style={styles.pill}>
      <IconOrEmoji
        source={STAT_ICON_SOURCES[toast.statId]}
        emoji={STAT_EMOJI_FALLBACK[toast.statId]}
        imageStyle={styles.icon}
        emojiStyle={styles.emoji}
      />
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

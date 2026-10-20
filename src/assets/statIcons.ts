import type { ImageSourcePropType } from 'react-native';
import type { StatId } from '../game/stats';

// Gemini-generated (scripts/generate-stat-icons.js + extract-stat-icons.js, §33), drawn in the
// same pixel-art style as the room/character/quest-icon assets. Partial, not a full Record, so a
// stat added later without a generated icon yet just falls back to STAT_EMOJI_FALLBACK (see
// StatUpToast/StatBar) instead of breaking the build.
export const STAT_ICON_SOURCES: Partial<Record<StatId, ImageSourcePropType>> = {
  courage: require('./stat-icons/courage.png'),
  insight: require('./stat-icons/insight.png'),
  hope: require('./stat-icons/hope.png'),
  flexibility: require('./stat-icons/flexibility.png'),
  calm: require('./stat-icons/calm.png'),
  bond: require('./stat-icons/bond.png'),
};

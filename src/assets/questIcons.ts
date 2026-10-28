import type { ImageSourcePropType } from 'react-native';

// Gemini-generated (scripts/assets/generate-quest-icons.js + extract-quest-icons.js), drawn in the
// room/character's own pixel-art style and kept close to the plain emoji they replace (🎭📏💌🎈🔍)
// so the meaning carries over for anyone who already knew those.
export const QUEST_ICON_SOURCES: Record<string, ImageSourcePropType> = {
  'externalization-interview': require('./quest-icons/externalization-interview.png'),
  'scaling-exception': require('./quest-icons/scaling-exception.png'),
  'letter-from-future-self': require('./quest-icons/letter-from-future-self.png'),
  'defusion-play': require('./quest-icons/defusion-play.png'),
  'thought-check': require('./quest-icons/thought-check.png'),
};

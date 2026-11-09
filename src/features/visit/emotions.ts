// Words offered at the gate for "what's closest to how you feel right now" (§6 S0: naming a
// feeling precisely is itself a small intervention — affect labeling, Barrett's granularity).
//
// v0.29: a two-level tree — 일차정서 (primary) first, then its 이차정서 (secondary) — replacing
// the v0.5–v0.28 2x2 mood-meter grid. The user asked for primary emotions as the top-level
// grouping. Backbone: Gloria Willcox's "The Feeling Wheel" (1982), the emotion wheel counselors
// most often hand out — six core feelings (Mad, Sad, Scared, Joyful, Powerful, Peaceful) with more
// specific ones radiating out. The Korean words are our own picks for this app's people (mostly
// arriving on the unpleasant side, often unsure why), placed where the wheel puts their English
// counterparts (e.g. tired and guilty under Sad, embarrassed and insecure under Scared, thankful
// under Peaceful).
//
// Two taps instead of scanning 20 words at once: "which family?" is an easier first question for
// someone who doesn't know what they feel, and the second tap is optional — "그냥 슬픔" records
// the primary itself. Every word the old grid offered is still somewhere below, so earlier gate
// history (which stores the word) reads the same.
//
// The single place the emotion list lives — edit words here; nothing else needs to change.

export type EmotionFamilyId = 'anger' | 'sadness' | 'fear' | 'joy' | 'confidence' | 'peace';

export type EmotionFamily = {
  id: EmotionFamilyId;
  /** The primary emotion's own word (also selectable on its own). */
  label: string;
  color: string;
  /** Secondary emotions, most common first. */
  words: string[];
};

// Display order: unpleasant first (that's where most people arrive), then pleasant.
export const EMOTION_FAMILIES: EmotionFamily[] = [
  { id: 'anger', label: '분노', color: '#dd6b7f', words: ['짜증', '억울함', '답답함', '불만', '미움'] },
  { id: 'sadness', label: '슬픔', color: '#5f8fd6', words: ['서운함', '외로움', '실망', '자책', '무기력', '피곤함', '멍함'] },
  { id: 'fear', label: '두려움', color: '#9b7fd1', words: ['걱정', '불안', '초조함', '긴장', '막막함', '창피함', '위축됨'] },
  { id: 'joy', label: '기쁨', color: '#e0b24a', words: ['설렘', '신남', '기대됨', '즐거움'] },
  { id: 'confidence', label: '자신감', color: '#e08a4a', words: ['뿌듯함', '당당함', '인정받음', '소중함'] },
  { id: 'peace', label: '평온', color: '#6fae82', words: ['편안함', '차분함', '홀가분함', '괜찮음', '고마움'] },
];

/** The escape hatch, kept outside the tree (picking it sets the label to null). */
export const EMOTION_UNSURE = '잘 모르겠어요';

/** Which primary a word belongs to (the primary's own label included); undefined if unknown. */
export function familyOf(word: string): EmotionFamily | undefined {
  return EMOTION_FAMILIES.find((f) => f.label === word || f.words.includes(word));
}

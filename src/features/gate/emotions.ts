// Words offered at the gate for "what's closest to how you feel right now" (§6 S0: naming a
// feeling precisely is itself a small intervention).
//
// Structured as a 2x2 mood-meter grid — energy (high/low) x pleasantness (pleasant/unpleasant) —
// the standard model behind Yale's RULER "Mood Meter" and used by apps like How We Feel. Verified
// against a real open-source implementation (github.com/willwang93/emotion-tracker) that the
// quadrant→color mapping below (red/yellow high energy, blue/green low energy) is the standard one;
// the words themselves are our own (§10 Q11).
//
// v0.28 rebalance: the old list had 13 words with just ONE in the pleasant/high quadrant (설렘).
// Now 6 / 6 on the two unpleasant quadrants (this app's people mostly arrive there, and naming an
// unpleasant feeling finely is the point — 억울함 and 서운함 are not 짜증 and 슬픔) and 4 / 4 on the
// pleasant ones, so a good day isn't squeezed into one word either. Every old word is kept, so
// earlier gate history entries still read naturally.
// Grouping by feel, not just listing, is meant to make the choice faster and closer to Barrett's
// "affect labeling" intent than a flat alphabetical-ish list.
export type Quadrant = 'red' | 'yellow' | 'green' | 'blue';

export const QUADRANT_COLOR: Record<Quadrant, string> = {
  yellow: '#e0b24a', // high energy, pleasant
  red: '#dd6b7f', // high energy, unpleasant
  green: '#6fae82', // low energy, pleasant
  blue: '#5f8fd6', // low energy, unpleasant
};

// Drawn as 2 rows of 2: [red, yellow] then [blue, green] — high energy on top, pleasant on the right,
// matching the standard Mood Meter layout.
export const EMOTION_GRID: { quadrant: Quadrant; words: string[] }[] = [
  { quadrant: 'red', words: ['걱정', '불안', '초조함', '답답함', '짜증', '억울함'] },
  { quadrant: 'yellow', words: ['설렘', '기대됨', '신남', '뿌듯함'] },
  { quadrant: 'blue', words: ['슬픔', '서운함', '외로움', '무기력', '피곤함', '멍함'] },
  { quadrant: 'green', words: ['차분함', '편안함', '홀가분함', '괜찮음'] },
];

/** The escape hatch, kept outside the grid (picking it sets the label to null). */
export const EMOTION_UNSURE = '잘 모르겠어요';

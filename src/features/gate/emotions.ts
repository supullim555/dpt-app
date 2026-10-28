// Words offered at the gate for "what's closest to how you feel right now" (§6 S0: naming a
// feeling precisely is itself a small intervention).
//
// Structured as a 2x2 mood-meter grid — energy (high/low) x pleasantness (pleasant/unpleasant) —
// the standard model behind Yale's RULER "Mood Meter" and used by apps like How We Feel. Verified
// against a real open-source implementation (github.com/willwang93/emotion-tracker) that the
// quadrant→color mapping below (red/yellow high energy, blue/green low energy) is the standard one;
// the words themselves are our own — the same 13 the plan already had (§10 Q11), just grouped.
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
  { quadrant: 'red', words: ['걱정', '불안', '답답함', '짜증'] },
  { quadrant: 'yellow', words: ['설렘'] },
  { quadrant: 'blue', words: ['멍함', '피곤함', '슬픔', '외로움', '무기력'] },
  { quadrant: 'green', words: ['차분함', '편안함', '괜찮음'] },
];

/** The escape hatch, kept outside the grid (picking it sets the label to null). */
export const EMOTION_UNSURE = '잘 모르겠어요';

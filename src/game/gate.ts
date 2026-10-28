import { createLog } from '../storage/storage';

// S0 (the gate) leaves one record per visit. The label and score are what later sessions
// (S4's "last time it was a 6, today it's a 4") and the safety check read from.
export type GateEntry = {
  /** ISO timestamp. */
  date: string;
  /** The emotion word they picked, or null if skipped / "don't know". */
  label: string | null;
  /** 0 (very hard) .. 10 (at ease), or null if skipped. */
  score: number | null;
  skipped: boolean;
};

// Capped (it used to grow by one entry per visit, forever). Nothing reads further back than the
// last few visits — breathCyclesFor looks at 2, needsSafetyNote at 3 scored ones — so 500 leaves
// plenty of room for a future S4 "지난번과 비교" view.
const history = createLog<GateEntry>('gate.history', { max: 500 });

export const loadGateHistory = history.load;

/** Appends one visit and returns the whole history including it. */
export const appendGateEntry = (entry: GateEntry) => history.append(entry);

/**
 * How many sighs to breathe (§6 S0, adaptive length): first visit 3, returning 2, and just
 * 1 after two skips in a row — a person who keeps skipping is telling us it's too long.
 * (The plan's "previous score 7+ -> 4-5 sighs" rule is not implemented: with a 0=hard,
 * 10=at ease scale, a high score would lengthen the wrong visits. See the plan, Q10.)
 */
export function breathCyclesFor(history: GateEntry[]): number {
  if (history.length === 0) return 3;
  const lastTwo = history.slice(-2);
  if (lastTwo.length === 2 && lastTwo.every((e) => e.skipped)) return 1;
  return 2;
}

/**
 * §8's content-independent crisis trigger: scores of 0-2 three times running. Only scored
 * visits count (a skip neither adds to nor breaks the run), and the text they wrote is never looked at.
 */
export function needsSafetyNote(history: GateEntry[]): boolean {
  const scored = history.filter((e) => e.score !== null).slice(-3);
  return scored.length === 3 && scored.every((e) => (e.score as number) <= 2);
}

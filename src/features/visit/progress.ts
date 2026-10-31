// The seven days and which ending they lead to (docs/계획서.md). No imports, so
// scripts/check-visit-logic.mjs can run this file directly.

export const TOTAL_DAYS = 7;
/** Staying away this many of the seven days or more counts as "절반 이상 안 옴". */
const MANY_ABSENCES = 4;

export type EndingId = 'bad' | 'letter' | 'withGirl' | 'normal' | 'happy';

/** `visited` holds 1-based day numbers. */
export function endingFor(visited: readonly number[]): EndingId {
  const days = new Set(visited.filter((d) => d >= 1 && d <= TOTAL_DAYS));
  const manyAbsences = TOTAL_DAYS - days.size >= MANY_ABSENCES;
  const cameLastDay = days.has(TOTAL_DAYS);
  if (manyAbsences) return cameLastDay ? 'withGirl' : 'bad';
  return cameLastDay ? 'normal' : 'letter';
}

/** The girl appears in every ending except these, where only the bed and a letter remain. */
export function girlAppearsIn(ending: EndingId): boolean {
  return ending === 'withGirl' || ending === 'normal' || ending === 'happy';
}

/** 1-based day of the week-long visit; a clock set backwards never goes below day 1. */
export function dayNumber(daysSinceStart: number): number {
  return Math.max(1, daysSinceStart + 1);
}

export type ClueId = 'collar' | 'snack' | 'laces' | 'coupon';

/** One clue per floor, each lying there on one day only. The fairy tells this table after an ending. */
export const CLUES: readonly { id: ClueId; day: number; floor: number }[] = [
  { id: 'collar', day: 1, floor: 1 },
  { id: 'snack', day: 3, floor: 3 },
  { id: 'laces', day: 4, floor: 2 },
  { id: 'coupon', day: 6, floor: 4 },
];

export function clueOn(day: number, floor: number) {
  return CLUES.find((c) => c.day === day && c.floor === floor) ?? null;
}

/** The happy ending opens only after a first ending, with every clue shown to her. */
export function happyUnlocked(run: number, shown: readonly ClueId[]): boolean {
  return run >= 2 && CLUES.every((c) => shown.includes(c.id));
}

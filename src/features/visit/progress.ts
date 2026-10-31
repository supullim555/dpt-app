// The seven days and which ending they lead to (docs/계획서.md). No imports, so
// scripts/check-visit-logic.mjs can run this file directly.

export const TOTAL_DAYS = 7;
/** Staying away this many of the seven days or more counts as "절반 이상 안 옴". */
const MANY_ABSENCES = 4;

export type EndingId = 'bad' | 'letter' | 'withGirl' | 'normal';

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
  return ending === 'withGirl' || ending === 'normal';
}

/** 1-based day of the week-long visit; a clock set backwards never goes below day 1. */
export function dayNumber(daysSinceStart: number): number {
  return Math.max(1, daysSinceStart + 1);
}

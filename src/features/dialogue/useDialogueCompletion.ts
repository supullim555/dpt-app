import { useGame, STAT_GAIN, useStatToast, type StatId } from '@/features/game';
import { recordMemory } from '@/features/memory';
import { useTimer } from '@/core/hooks/useTimeout';

/** How long DialogueExercise's own thank-you bubble stays on screen before the caller should
 * close its panel — shared so the daily check-in and every exercise hold it for the same beat. */
export const COMPLETION_HOLD_MS = 1800;

/**
 * Builds a `DialogueExercise`-shaped `onComplete` handler that records the answers, marks `id`
 * done for today, shows a stat-up toast (§33) if that grew a stat, then closes after the
 * thank-you bubble's hold. Home's check-in and its per-exercise dialogue used to each write this
 * sequence out by hand (§30/§31) — identical except for which id/questions/close-callback they
 * used. Returns `{ onComplete, toast }` — hand `onComplete` to DialogueExercise, render `toast`
 * via <StatUpToast> alongside it.
 */
export function useDialogueCompletion({
  id,
  questions,
  stat,
  onClosed,
}: {
  /** Activity id: an exercise id or DAILY_CHECKIN_ID — what memory and done-today are keyed by. */
  id: string;
  questions: string[];
  /** Stat this activity grows, if any. */
  stat?: StatId;
  onClosed: () => void;
}) {
  const { completeExercise } = useGame();
  const { toast, show } = useStatToast();
  // Cleared on unmount, so onClosed never fires into a screen that's already gone.
  const { schedule } = useTimer();
  const onComplete = (answers: string[]) => {
    recordMemory(id, questions, answers);
    const statId = completeExercise(id, stat);
    if (statId) show(statId, STAT_GAIN);
    schedule(onClosed, COMPLETION_HOLD_MS);
  };
  return { onComplete, toast };
}

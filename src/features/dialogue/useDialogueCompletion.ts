import { useProgress } from '@/features/progress';
import { recordMemory } from '@/features/memory';
import { useTimer } from '@/core/hooks/useTimeout';
import { questionText, type DialogueQuestion } from './questions';

/** How long DialogueExercise's own thank-you bubble stays on screen before the caller should
 * close its panel — shared so the daily check-in and every exercise hold it for the same beat. */
export const COMPLETION_HOLD_MS = 1800;

/**
 * Builds a `DialogueExercise`-shaped `onComplete` handler that records the answers, marks `id`
 * done for today, then closes after the thank-you bubble's hold. Home's check-in and its
 * per-exercise dialogue share it (§30/§31). No reward of any kind is announced (§40: coins and
 * stats are gone) — the character's own "고마워요" line is the whole acknowledgement.
 */
export function useDialogueCompletion({
  id,
  questions,
  onClosed,
}: {
  /** Activity id: an exercise id or DAILY_CHECKIN_ID — what memory and done-today are keyed by. */
  id: string;
  questions: DialogueQuestion[];
  onClosed: () => void;
}) {
  const { completeActivity } = useProgress();
  // Cleared on unmount, so onClosed never fires into a screen that's already gone.
  const { schedule } = useTimer();
  return (answers: string[]) => {
    recordMemory(id, questions.map(questionText), answers);
    completeActivity(id);
    schedule(onClosed, COMPLETION_HOLD_MS);
  };
}

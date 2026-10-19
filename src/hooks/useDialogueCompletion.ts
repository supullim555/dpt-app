import { useGame } from '../game/GameContext';
import { recordMemory } from '../game/memory';

/** How long DialogueExercise's own thank-you bubble stays on screen before the caller should
 * close its panel — shared so the daily check-in and every exercise hold it for the same beat. */
export const COMPLETION_HOLD_MS = 1800;

/**
 * Builds a `DialogueExercise`-shaped `onComplete` handler that records the answers, marks `id`
 * done for today, then closes after the thank-you bubble's hold. Home's check-in and its
 * per-exercise dialogue used to each write this sequence out by hand (§30/§31) — identical except
 * for which id/questions/close-callback they used.
 */
export function useDialogueCompletion(id: string, questions: string[], onClosed: () => void) {
  const { completeExercise } = useGame();
  return (answers: string[]) => {
    recordMemory(id, questions, answers);
    completeExercise(id);
    setTimeout(onClosed, COMPLETION_HOLD_MS);
  };
}

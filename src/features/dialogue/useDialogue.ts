import { useRef, useState } from 'react';

export type DialogueBeat = {
  text: string;
  /** false = a plain chat line; tapping just advances, no answer box appears. Defaults to true. */
  answerable?: boolean;
};

// Drives a tap-to-advance dialogue: each beat is either shown and dismissed
// with one tap (chat), or shown, then reveals an answer box on the next tap,
// then submits and advances on the tap after that (question). Shared by any
// UI that wants this "character talks, you answer" interaction.
export function useDialogue(beats: DialogueBeat[], onComplete: (answers: string[]) => void) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'bubble' | 'input'>('bubble');
  const [draft, setDraft] = useState('');
  const [done, setDone] = useState(false);
  // Ref is the real source of truth for `advance`'s own logic (onComplete needs the
  // just-pushed value synchronously, before a state update would re-render) — `answered` is a
  // state mirror of the same pushes, read-only, purely so a caller can render a running history
  // of what's been said so far (§36: DialogueExercise showing past Q&A, not just the current line).
  const collected = useRef<string[]>([]);
  const [answered, setAnswered] = useState<string[]>([]);

  const current = beats[index];
  const isAnswerable = current?.answerable ?? true;

  const advance = () => {
    if (done) return;
    if (isAnswerable && phase === 'bubble') {
      setPhase('input');
      return;
    }
    if (isAnswerable) {
      const trimmed = draft.trim();
      collected.current.push(trimmed);
      setAnswered((prev) => [...prev, trimmed]);
      setDraft('');
    }
    if (index + 1 < beats.length) {
      setIndex(index + 1);
      setPhase('bubble');
    } else {
      setDone(true);
      onComplete(collected.current);
    }
  };

  return {
    current,
    index,
    total: beats.length,
    phase,
    draft,
    setDraft,
    advance,
    done,
    isAnswerable,
    answered,
  };
}

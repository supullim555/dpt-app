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
  const collected = useRef<string[]>([]);

  const current = beats[index];
  const isAnswerable = current?.answerable ?? true;

  const advance = () => {
    if (done) return;
    if (isAnswerable && phase === 'bubble') {
      setPhase('input');
      return;
    }
    if (isAnswerable) {
      collected.current.push(draft.trim());
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
  };
}

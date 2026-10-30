import { useRef, useState } from 'react';

export type DialogueBeat = {
  text: string;
  /** false = a plain chat line; tapping just advances, no answer area appears. Defaults to true. */
  answerable?: boolean;
  /** Tap-to-answer options (v0.28: answers are tap-first, typing only if the user wants to). */
  choices?: string[];
};

// Drives a "character talks, you answer" dialogue. A chat beat is shown and dismissed with one
// tap. A question beat shows its answer area straight away (v0.28 — it used to take an extra tap
// to reveal it), and is answered either by tapping a choice (`answer(choice)`) or by submitting
// the typed draft (`answer()`), which may be empty — every question can be passed over.
export function useDialogue(beats: DialogueBeat[], onComplete: (answers: string[]) => void) {
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [done, setDone] = useState(false);
  // Ref is the real source of truth for the collected answers (onComplete needs the just-pushed
  // value synchronously, before a state update would re-render) — `answered` is a state mirror of
  // the same pushes, read-only, so a caller can render a running history of what's been said.
  const collected = useRef<string[]>([]);
  const [answered, setAnswered] = useState<string[]>([]);

  const current = beats[index];
  const isAnswerable = current?.answerable ?? true;

  const next = () => {
    if (index + 1 < beats.length) {
      setIndex(index + 1);
    } else {
      setDone(true);
      onComplete(collected.current);
    }
  };

  /** Moves past a chat beat. Does nothing on a question — those move on through `answer`. */
  const advance = () => {
    if (done || isAnswerable) return;
    next();
  };

  /** Answers the current question with `value`, or with the typed draft when omitted. */
  const answer = (value?: string) => {
    if (done || !isAnswerable) return;
    const text = (value ?? draft).trim();
    collected.current.push(text);
    setAnswered((prev) => [...prev, text]);
    setDraft('');
    next();
  };

  return {
    current,
    index,
    total: beats.length,
    draft,
    setDraft,
    advance,
    answer,
    done,
    isAnswerable,
    answered,
  };
}

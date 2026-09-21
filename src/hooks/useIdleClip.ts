import { useEffect, useRef, useState } from 'react';
import { IDLE_CLIPS } from '../assets/character';

export type IdleClipName = keyof typeof IDLE_CLIPS;

// Occasional extras between spells of breathing, weighted: a blink is common, a
// glance or a stretch is a rare treat.
const EXTRAS: { clip: Exclude<IdleClipName, 'breathe'>; weight: number }[] = [
  { clip: 'blink', weight: 5 },
  { clip: 'look', weight: 3 },
  { clip: 'stretch', weight: 2 },
];

function pickExtra(previous: IdleClipName | null): IdleClipName {
  // Never the same extra twice in a row: repeating a stretch looks like a tic.
  const pool = EXTRAS.filter((e) => e.clip !== previous);
  const total = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * total;
  for (const e of pool) {
    roll -= e.weight;
    if (roll < 0) return e.clip;
  }
  return pool[0].clip;
}

// How many full loops of a clip to play before moving on.
function cyclesFor(clip: IdleClipName): number {
  if (clip === 'breathe') return 1 + Math.floor(Math.random() * 2); // 1-2 slow breaths
  if (clip === 'blink') return 1 + Math.floor(Math.random() * 2); // sometimes a double blink
  return 1;
}

/**
 * Which standing clip should be playing: a resting breath, and every so often a blink, a
 * glance to the side or a small stretch. Clips change only at loop boundaries, so the
 * change happens between motions rather than mid-motion. While `enabled` is false it rests
 * on 'breathe', so the next time she stands still she begins with a breath again.
 */
export function useIdleClip(enabled: boolean): IdleClipName {
  const [clip, setClip] = useState<IdleClipName>('breathe');
  const lastExtra = useRef<IdleClipName | null>(null);

  useEffect(() => {
    if (!enabled) {
      setClip('breathe');
      return;
    }
    const spec = IDLE_CLIPS[clip];
    const loopMs = ((spec.sequence?.length ?? spec.frameCount) / (spec.fps ?? 8)) * 1000;
    const timer = setTimeout(() => {
      if (clip === 'breathe') {
        const next = pickExtra(lastExtra.current);
        lastExtra.current = next;
        setClip(next);
      } else {
        setClip('breathe');
      }
    }, loopMs * cyclesFor(clip));
    return () => clearTimeout(timer);
  }, [clip, enabled]);

  return clip;
}

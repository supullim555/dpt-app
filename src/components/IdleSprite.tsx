import React, { useEffect, useRef, useState } from 'react';
import SpriteSheetAnimator from './SpriteSheetAnimator';
import { IDLE_CLIPS } from '../assets/character';

type ClipName = keyof typeof IDLE_CLIPS;

// Occasional extras between spells of breathing, weighted: a blink is common, a
// glance or a stretch is a rare treat.
const EXTRAS: { clip: Exclude<ClipName, 'breathe'>; weight: number }[] = [
  { clip: 'blink', weight: 5 },
  { clip: 'look', weight: 3 },
  { clip: 'stretch', weight: 2 },
];

function pickExtra(previous: ClipName | null): ClipName {
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
function cyclesFor(clip: ClipName): number {
  if (clip === 'breathe') return 1 + Math.floor(Math.random() * 2); // 1-2 slow breaths
  if (clip === 'blink') return 1 + Math.floor(Math.random() * 2); // sometimes a double blink
  return 1;
}

// She's standing still, but not frozen: a resting breath, and every so often a
// blink, a glance to the side or a small stretch. Clips are swapped only at loop
// boundaries (a fresh mount always starts on the clip's neutral first frame), so
// changes happen between motions rather than mid-motion.
function IdleSpriteBase({ size }: { size: number }) {
  const [clip, setClip] = useState<ClipName>('breathe');
  const lastExtra = useRef<ClipName | null>(null);

  useEffect(() => {
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
  }, [clip]);

  return <SpriteSheetAnimator key={clip} spec={IDLE_CLIPS[clip]} size={size} />;
}

export default React.memo(IdleSpriteBase);

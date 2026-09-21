import React from 'react';
import SpriteSwitcher from './SpriteSwitcher';
import { IDLE_CLIPS } from '../assets/character';
import { useIdleClip } from '../hooks/useIdleClip';

// She's standing still, but not frozen (see useIdleClip). Used where she just stands,
// like the gate; the roaming character drives the same hook itself.
function IdleSpriteBase({ size }: { size: number }) {
  const clip = useIdleClip(true);
  return <SpriteSwitcher clips={IDLE_CLIPS} current={clip} size={size} />;
}

export default React.memo(IdleSpriteBase);

import React from 'react';
import { View } from 'react-native';
import SpriteSheetAnimator from './SpriteSheetAnimator';
import type { CharacterSprite } from '../assets/character';

type Props<K extends string> = {
  /** Every clip that might be shown. They must share one frame size. */
  clips: Record<K, CharacterSprite>;
  /** The clip to show now, or null to show none (and animate none). */
  current: K | null;
  /** Rendered width of a frame. */
  size: number;
};

// Shows one clip out of several WITHOUT swapping images in and out. Every clip stays
// mounted in a stack; changing `current` only flips which layer is visible and which one
// animates. Mounting a fresh image on each change (the old approach) leaves a blank moment
// while the new sheet loads and decodes — worst the first time a sheet is used. Here each
// sheet is loaded once, up front, and a change is just an opacity flip in a single commit.
function SpriteSwitcherBase<K extends string>({ clips, current, size }: Props<K>) {
  const entries = Object.entries(clips) as [K, CharacterSprite][];
  const first = entries[0][1];
  const scale = size / first.frameWidth;

  return (
    <View style={{ width: first.frameWidth * scale, height: first.frameHeight * scale }}>
      {entries.map(([name, spec]) => {
        const shown = name === current;
        return (
          <View key={name} style={{ position: 'absolute', left: 0, top: 0, opacity: shown ? 1 : 0 }}>
            <SpriteSheetAnimator spec={spec} size={size} active={shown} />
          </View>
        );
      })}
    </View>
  );
}

export default React.memo(SpriteSwitcherBase) as typeof SpriteSwitcherBase;

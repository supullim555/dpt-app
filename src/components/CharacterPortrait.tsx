import React from 'react';
import { View } from 'react-native';
import SpriteSheetAnimator from './SpriteSheetAnimator';
import { IDLE_FRONT_SPRITE } from '../assets/character';

type Props = {
  size?: number;
};

// Large front-facing idle animation, used while the character is actively
// talking (dialogue bubble visible) — as opposed to RoamingCharacter, which
// is used the rest of the time.
function CharacterPortraitBase({ size = 160 }: Props) {
  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <SpriteSheetAnimator spec={IDLE_FRONT_SPRITE} size={size} />
    </View>
  );
}

export default React.memo(CharacterPortraitBase);

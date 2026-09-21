import React from 'react';
import { Image } from 'react-native';
import { PORTRAIT_ASPECT, PORTRAIT_FRONT } from '../assets/character';

type Props = {
  /** Rendered height; width follows the artwork's proportions. */
  size?: number;
};

// Large, detailed still used while the character is actively talking (dialogue
// bubble visible). Deliberately not animated: a moving sprite competes with
// the words, and this closer-up art has no frames to move through anyway.
// RoamingCharacter is what's shown the rest of the time.
function CharacterPortraitBase({ size = 160 }: Props) {
  return (
    <Image
      source={PORTRAIT_FRONT}
      style={{ width: size * PORTRAIT_ASPECT, height: size }}
      resizeMode="contain"
    />
  );
}

export default React.memo(CharacterPortraitBase);

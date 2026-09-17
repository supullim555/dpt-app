import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import SpriteSheetAnimator from './SpriteSheetAnimator';
import { IDLE_FRONT_SPRITE, WALK_SOUTH_SPRITE } from '../assets/character';
import { USE_NATIVE_DRIVER } from '../anim/useNativeDriver';

type Props = {
  /** Size of the free-roam area the character wanders within. */
  areaWidth: number;
  areaHeight: number;
  size?: number;
};

const SPEED = 55; // px/sec, roughly — keeps pace lifelike rather than frantic

// Wanders to random points inside the given area: walks while moving
// (WALK_SOUTH cycle), stands and idles between moves (IDLE_FRONT cycle).
// The sprite is a front-on walk, not a side profile, so no flipping is
// needed regardless of which way it's actually heading.
function RoamingCharacterBase({ areaWidth, areaHeight, size = 90 }: Props) {
  const maxX = Math.max(0, areaWidth - size);
  const maxY = Math.max(0, areaHeight - size);
  const x = useRef(new Animated.Value(Math.random() * maxX)).current;
  const y = useRef(new Animated.Value(Math.random() * maxY)).current;
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (maxX <= 0 && maxY <= 0) return;
    let cancelled = false;

    const currentX = () => (x as unknown as { __getValue: () => number }).__getValue();
    const currentY = () => (y as unknown as { __getValue: () => number }).__getValue();

    function step() {
      if (cancelled) return;
      const targetX = Math.random() * maxX;
      const targetY = Math.random() * maxY;
      const dist = Math.hypot(targetX - currentX(), targetY - currentY());
      const duration = Math.max(500, (dist / SPEED) * 1000);

      setMoving(true);
      Animated.parallel([
        Animated.timing(x, {
          toValue: targetX,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(y, {
          toValue: targetY,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start(({ finished }) => {
        if (!finished || cancelled) return;
        setMoving(false);
        setTimeout(() => {
          if (!cancelled) step();
        }, 900 + Math.random() * 1400);
      });
    }

    step();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxX, maxY]);

  return (
    <Animated.View
      style={{ position: 'absolute', top: 0, left: 0, transform: [{ translateX: x }, { translateY: y }] }}
    >
      <SpriteSheetAnimator spec={moving ? WALK_SOUTH_SPRITE : IDLE_FRONT_SPRITE} size={size} />
    </Animated.View>
  );
}

export default React.memo(RoamingCharacterBase);

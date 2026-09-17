import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image } from 'react-native';
import SpriteSheetAnimator from './SpriteSheetAnimator';
import { IDLE_FRONT_SPRITE, WALK_SOUTH_SPRITE, WALK_AWAY_IMAGE } from '../assets/character';
import { USE_NATIVE_DRIVER } from '../anim/useNativeDriver';

type Props = {
  /** Size of the free-roam area the character wanders within. */
  areaWidth: number;
  areaHeight: number;
  size?: number;
};

const SPEED = 55; // px/sec, roughly — keeps pace lifelike rather than frantic

type Pose = 'idle' | 'sideways' | 'down' | 'up';

// Wanders to random points inside the given area. Which animation plays is
// picked from the actual displacement of each move — a mostly-horizontal
// move plays the sideways walk, a mostly-vertical one plays "toward the
// viewer" (down) or "away from the viewer" (up). Distinguishing that from
// mixing them randomly is the whole point: the pose should match where the
// character is actually headed.
function RoamingCharacterBase({ areaWidth, areaHeight, size = 90 }: Props) {
  const maxX = Math.max(0, areaWidth - size);
  const maxY = Math.max(0, areaHeight - size);
  const minDist = Math.hypot(maxX, maxY) * 0.5;
  const x = useRef(new Animated.Value(Math.random() * maxX)).current;
  const y = useRef(new Animated.Value(Math.random() * maxY)).current;
  const [pose, setPose] = useState<Pose>('idle');

  useEffect(() => {
    if (maxX <= 0 && maxY <= 0) return;
    let cancelled = false;

    const currentX = () => (x as unknown as { __getValue: () => number }).__getValue();
    const currentY = () => (y as unknown as { __getValue: () => number }).__getValue();

    function pickFarTarget(): [number, number] {
      let best: [number, number] = [Math.random() * maxX, Math.random() * maxY];
      let bestDist = -1;
      // A few tries for a destination that's actually far away, rather than
      // an infinite retry loop (fine to settle for "far enough" on a small area).
      for (let i = 0; i < 6; i++) {
        const tx = Math.random() * maxX;
        const ty = Math.random() * maxY;
        const d = Math.hypot(tx - currentX(), ty - currentY());
        if (d > bestDist) {
          best = [tx, ty];
          bestDist = d;
        }
        if (d >= minDist) break;
      }
      return best;
    }

    function step() {
      if (cancelled) return;
      const startX = currentX();
      const startY = currentY();
      const [targetX, targetY] = pickFarTarget();
      const dx = targetX - startX;
      const dy = targetY - startY;
      const dist = Math.hypot(dx, dy);
      const duration = Math.max(1200, (dist / SPEED) * 1000);

      // Whichever axis moves more determines the pose for this leg.
      setPose(Math.abs(dx) >= Math.abs(dy) ? 'sideways' : dy < 0 ? 'up' : 'down');

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
        setPose('idle');
        setTimeout(() => {
          if (!cancelled) step();
        }, 2500 + Math.random() * 2500);
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
      {pose === 'up' ? (
        <Image source={WALK_AWAY_IMAGE} style={{ width: size, height: size * (277 / 252) }} resizeMode="contain" />
      ) : (
        <SpriteSheetAnimator
          spec={pose === 'idle' ? IDLE_FRONT_SPRITE : WALK_SOUTH_SPRITE}
          size={size}
        />
      )}
    </Animated.View>
  );
}

export default React.memo(RoamingCharacterBase);

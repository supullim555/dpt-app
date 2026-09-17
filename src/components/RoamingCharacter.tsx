import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import SpriteSheetAnimator from './SpriteSheetAnimator';
import { IDLE_FRONT_SPRITE, WALK_SOUTH_SPRITE, WALK_AWAY_SPRITE } from '../assets/character';
import { USE_NATIVE_DRIVER } from '../anim/useNativeDriver';

type Props = {
  /** Size of the free-roam area the character wanders within. */
  areaWidth: number;
  areaHeight: number;
  size?: number;
};

const SPEED = 55; // px/sec, roughly — keeps pace lifelike rather than frantic

type Pose = 'idle' | 'left' | 'right' | 'down' | 'up';

// Classic 4-direction sprite convention (RPG Maker etc): a walk cycle per
// cardinal direction, with left/right sharing one sheet mirrored rather than
// being drawn twice. Direction is picked by the angle of travel in equal
// 90° wedges — NOT by comparing raw |dx| vs |dy|, which biases toward
// whichever axis the play area happens to be wider on (this room is much
// wider than it is tall, so magnitude comparison almost never picked "up").
function directionFromDelta(dx: number, dy: number): 'left' | 'right' | 'down' | 'up' {
  const angle = Math.atan2(dy, dx); // screen space: +x right, +y down
  if (angle > -Math.PI / 4 && angle <= Math.PI / 4) return 'right';
  if (angle > Math.PI / 4 && angle <= (3 * Math.PI) / 4) return 'down';
  if (angle > (-3 * Math.PI) / 4 && angle <= -Math.PI / 4) return 'up';
  return 'left';
}

// Wanders to random points inside the given area. Which animation plays —
// and which way it faces — is picked from the actual displacement of each
// move, so the pose always matches where the character is actually headed.
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

      setPose(directionFromDelta(dx, dy));

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

  const spec = pose === 'idle' ? IDLE_FRONT_SPRITE : pose === 'up' ? WALK_AWAY_SPRITE : WALK_SOUTH_SPRITE;
  // Only one side-facing sheet exists (drawn facing right); mirror it for
  // "left", the standard way to avoid drawing both.
  const flip = pose === 'left';

  return (
    <Animated.View
      style={{ position: 'absolute', top: 0, left: 0, transform: [{ translateX: x }, { translateY: y }] }}
    >
      <Animated.View style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
        <SpriteSheetAnimator spec={spec} size={size} />
      </Animated.View>
    </Animated.View>
  );
}

export default React.memo(RoamingCharacterBase);

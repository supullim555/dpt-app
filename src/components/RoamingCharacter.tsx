import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import SpriteSheetAnimator from './SpriteSheetAnimator';
import IdleSprite from './IdleSprite';
import { IDLE_CLIPS, WALK_CLIPS, type CharacterSprite } from '../assets/character';
import { USE_NATIVE_DRIVER } from '../anim/useNativeDriver';
import { useRoom } from '../room/RoomContext';
import { pickStart, pickTarget, isFree, type Pt, type RoomLayout } from '../room/layout';

// Walking pace in character-widths per second: a steady stroll that scales
// with how big she's drawn, rather than a fixed px/sec that would look
// frantic on a small phone and sluggish on a big window.
const WALK_SPEED = 0.6;

// Her visible height as a multiple of `size` (the room's character size). Every clip is
// drawn at the same standing height, so this one number sizes all of them.
const VISIBLE_HEIGHT_PER_SIZE = 264 / 252;

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

// Walks between random spots on the floor, going around the furniture. Which
// animation plays — and which way it faces — is picked from the actual
// displacement of each move, so the pose always matches where she's headed.
// Position is her FEET, so depth (size, shadow, in-front/behind furniture)
// all follow from one point.
function Roamer({ room }: { room: RoomLayout }) {
  const { walk, charSize: size, depthLines, farScale, nearScale } = room;

  const start = useRef<Pt | null>(null);
  if (!start.current) start.current = pickStart(room);
  const pos = useRef<Pt>({ ...start.current });
  const x = useRef(new Animated.Value(start.current.x)).current;
  const y = useRef(new Animated.Value(start.current.y)).current;

  const [pose, setPose] = useState<Pose>('idle');
  // How many pieces of furniture she's currently in front of; drives zIndex.
  const [inFrontOf, setInFrontOf] = useState(() => depthLines.filter((l) => l <= start.current!.y).length);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let anim: Animated.CompositeAnimation | undefined;
    let lastCount = -1;

    const countInFront = (feetY: number) => depthLines.filter((l) => l <= feetY).length;
    const sync = (feetY: number) => {
      const n = countInFront(feetY);
      if (n !== lastCount) {
        lastCount = n;
        setInFrontOf(n);
      }
    };

    // Track her position from the animated values themselves. Reading
    // __getValue() isn't reliable while a native-driven animation is running.
    const idX = x.addListener(({ value }) => {
      pos.current.x = value;
    });
    const idY = y.addListener(({ value }) => {
      pos.current.y = value;
      sync(value);
    });

    // The room was resized under her: if she'd now be inside a wall or
    // furniture, put her back on the floor.
    if (!isFree(room, pos.current)) {
      const p = pickStart(room);
      pos.current = { ...p };
      x.setValue(p.x);
      y.setValue(p.y);
    }
    sync(pos.current.y);

    function step() {
      if (cancelled) return;
      const from = { ...pos.current };
      const target = pickTarget(room, from);
      if (!target) {
        timer = setTimeout(step, 1500);
        return;
      }
      const dx = target.x - from.x;
      const dy = target.y - from.y;
      const duration = (Math.hypot(dx, dy) / (size * WALK_SPEED)) * 1000;

      setPose(directionFromDelta(dx, dy));

      // Linear, so her stride keeps pace with the ground under her feet.
      anim = Animated.parallel([
        Animated.timing(x, { toValue: target.x, duration, easing: Easing.linear, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(y, { toValue: target.y, duration, easing: Easing.linear, useNativeDriver: USE_NATIVE_DRIVER }),
      ]);
      anim.start(({ finished }) => {
        if (!finished || cancelled) return;
        setPose('idle');
        // Long enough that a blink / glance / stretch gets a chance to play.
        timer = setTimeout(step, 2500 + Math.random() * 4500);
      });
    }

    timer = setTimeout(step, 800);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      anim?.stop();
      x.removeListener(idX);
      y.removeListener(idY);
    };
  }, [room, size, depthLines, x, y]);

  // (every idle clip shares one cell size, so any one of them describes the idle geometry)
  const spec: CharacterSprite =
    pose === 'idle' ? IDLE_CLIPS.breathe : pose === 'up' ? WALK_CLIPS.up : pose === 'down' ? WALK_CLIPS.down : WALK_CLIPS.side;
  // The side walk is drawn facing right; mirror it for "left", the standard
  // way to avoid drawing both.
  const flip = pose === 'left';

  // Size from her visible height rather than the frame width, so she keeps the
  // same size whichever clip is playing.
  const pxPerSource = (size * VISIBLE_HEIGHT_PER_SIZE) / spec.contentHeight;
  const frameW = spec.frameWidth * pxPerSource;
  const frameH = spec.frameHeight * pxPerSource;

  // Farther up the floor = smaller, nearer the bottom = bigger. Scaling
  // happens around the frame's center, so shift down by however much that
  // lifts her soles off the ground to keep her feet planted.
  const { scale, lift } = useMemo(() => {
    const range = { inputRange: [walk.y, walk.y + walk.h], extrapolate: 'clamp' as const };
    const feetBelowCenter = (spec.feetFraction - 0.5) * frameH;
    return {
      scale: y.interpolate({ ...range, outputRange: [farScale, nearScale] }),
      lift: y.interpolate({
        ...range,
        outputRange: [(1 - farScale) * feetBelowCenter, (1 - nearScale) * feetBelowCenter],
      }),
    };
  }, [y, walk.y, walk.h, spec.feetFraction, frameH, farScale, nearScale]);

  return (
    // Zero-size anchor sitting exactly on her feet; everything hangs off it.
    <Animated.View
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        // Odd numbers sit between the furniture's even zIndexes (see RoomBackdrop).
        zIndex: 2 * inFrontOf + 1,
        transform: [{ translateX: x }, { translateY: y }],
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: -frameW / 2,
          top: -frameH * spec.feetFraction,
          width: frameW,
          height: frameH,
          transform: [{ translateY: lift }, { scale }],
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: frameW / 2 - size * 0.3,
            top: frameH * spec.feetFraction - size * 0.04,
            width: size * 0.6,
            height: size * 0.08,
            borderRadius: size,
            backgroundColor: 'rgba(60,35,20,0.28)',
          }}
        />
        <View style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
          {pose === 'idle' ? <IdleSprite size={frameW} /> : <SpriteSheetAnimator spec={spec} size={frameW} />}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function RoamingCharacterBase() {
  const room = useRoom();
  return room ? <Roamer room={room} /> : null;
}

export default React.memo(RoamingCharacterBase);

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, type ImageSourcePropType } from 'react-native';
import { USE_NATIVE_DRIVER } from '../anim/useNativeDriver';

// A sprite sheet is one image containing `frameCount` frames laid out in a
// grid, `columns` frames per row (defaults to a single row). Frame (0,0) is
// top-left; frames are read left-to-right, then top-to-bottom.
export type SpriteSheetSpec = {
  source: ImageSourcePropType;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  columns?: number;
  fps?: number;
  /**
   * Order to play the frames in (indices into the sheet, repeats allowed) instead
   * of 0..frameCount-1. Lets one sheet hold each pose once while the loop plays
   * ping-pong or holds a pose. Must be a stable reference (define it once).
   */
  sequence?: number[];
};

type Props = {
  spec: SpriteSheetSpec;
  /** Rendered width/height of a single frame; defaults to the frame's native size. */
  size?: number;
};

function SpriteSheetAnimatorBase({ spec, size }: Props) {
  const { source, frameWidth, frameHeight, frameCount, fps = 8, sequence } = spec;
  const columns = spec.columns ?? frameCount;
  const rows = Math.ceil(frameCount / columns);
  const scale = size ? size / frameWidth : 1;

  const frameIndex = useRef(new Animated.Value(0)).current;
  const playOrder = useMemo(() => sequence ?? Array.from({ length: frameCount }, (_, i) => i), [sequence, frameCount]);

  useEffect(() => {
    // Step the value through the frame indices in play order, holding each for
    // 1000/fps ms. duration:0 + delay keeps every leg native-driver-eligible,
    // so the whole loop runs on the native thread without crossing the bridge.
    const steps = playOrder.map((frame) =>
      Animated.sequence([
        Animated.timing(frameIndex, { toValue: frame, duration: 0, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.delay(1000 / fps),
      ])
    );
    const loop = Animated.loop(Animated.sequence(steps));
    loop.start();
    return () => loop.stop();
  }, [frameIndex, playOrder, fps]);

  const frameNumbers = Array.from({ length: frameCount }, (_, i) => i);
  const translateX = frameIndex.interpolate({
    inputRange: frameNumbers,
    outputRange: frameNumbers.map((i) => -(i % columns) * frameWidth * scale),
  });
  const translateY = frameIndex.interpolate({
    inputRange: frameNumbers,
    outputRange: frameNumbers.map((i) => -Math.floor(i / columns) * frameHeight * scale),
  });

  return (
    <Animated.View
      style={{ width: frameWidth * scale, height: frameHeight * scale, overflow: 'hidden' }}
    >
      <Animated.Image
        source={source}
        style={{
          width: frameWidth * columns * scale,
          height: frameHeight * rows * scale,
          transform: [{ translateX }, { translateY }],
        }}
      />
    </Animated.View>
  );
}

export default React.memo(SpriteSheetAnimatorBase);

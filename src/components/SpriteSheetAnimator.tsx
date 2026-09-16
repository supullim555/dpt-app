import React, { useEffect, useRef } from 'react';
import { Animated, type ImageSourcePropType } from 'react-native';

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
};

type Props = {
  spec: SpriteSheetSpec;
  /** Rendered width/height of a single frame; defaults to the frame's native size. */
  size?: number;
};

function SpriteSheetAnimatorBase({ spec, size }: Props) {
  const { source, frameWidth, frameHeight, frameCount, fps = 8 } = spec;
  const columns = spec.columns ?? frameCount;
  const rows = Math.ceil(frameCount / columns);
  const scale = size ? size / frameWidth : 1;

  const frameIndex = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Step the value through every integer frame index, holding each for
    // 1000/fps ms. duration:0 + delay keeps every leg native-driver-eligible,
    // so the whole loop runs on the native thread without crossing the bridge.
    const steps = Array.from({ length: frameCount }, (_, i) =>
      Animated.sequence([
        Animated.timing(frameIndex, { toValue: i, duration: 0, useNativeDriver: true }),
        Animated.delay(1000 / fps),
      ])
    );
    const loop = Animated.loop(Animated.sequence(steps));
    loop.start();
    return () => loop.stop();
  }, [frameIndex, frameCount, fps]);

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

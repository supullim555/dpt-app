import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { USE_NATIVE_DRIVER } from '../anim/useNativeDriver';

// A small bouncing "⌄" that hints a tappable bubble/element can be advanced.
export default function TapHintChevron() {
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);
  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });

  return <Animated.Text style={[styles.chevron, { transform: [{ translateY }] }]}>⌄</Animated.Text>;
}

const styles = StyleSheet.create({
  chevron: { alignSelf: 'center', marginTop: 4, fontSize: 16, color: '#999' },
});

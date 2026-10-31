import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { USE_NATIVE_DRIVER } from '@/core/anim/nativeDriver';
import { VISIT_OPENING } from '@/assets/visitUi';
import { OPENING_LINES } from './script';

const FADE_MS = 700;

// The first thing after the content notice: why you're here. Full-screen images fading through black,
// advanced by tapping, always skippable. Plays once, not on a second run.
export default function Opening({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fade.setValue(0);
    const anim = Animated.timing(fade, { toValue: 1, duration: FADE_MS, useNativeDriver: USE_NATIVE_DRIVER });
    anim.start();
    return () => anim.stop();
  }, [index, fade]);

  const next = () => {
    if (index + 1 < OPENING_LINES.length) setIndex(index + 1);
    else onDone();
  };

  return (
    <TouchableOpacity style={styles.screen} activeOpacity={1} onPress={next}>
      <Animated.View style={[styles.fill, { opacity: fade }]}>
        <Image source={VISIT_OPENING[index]} resizeMode="cover" style={styles.image} />
        <View style={styles.shade} />
        <Text style={styles.line}>{OPENING_LINES[index]}</Text>
      </Animated.View>
      <TouchableOpacity style={[styles.skip, { top: insets.top + 12 }]} onPress={onDone} hitSlop={10}>
        <Text style={styles.skipText}>건너뛰기</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  fill: { flex: 1, justifyContent: 'flex-end' },
  image: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  // Keeps the white line readable over whatever the image has at its bottom.
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '30%', backgroundColor: 'rgba(0,0,0,0.72)' },
  line: { color: '#fff', fontSize: 20, lineHeight: 32, textAlign: 'center', fontFamily: 'serif', paddingHorizontal: 28, paddingBottom: 72 },
  skip: { position: 'absolute', right: 14, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4 },
  skipText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
});

import { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { USE_NATIVE_DRIVER } from '@/core/anim/nativeDriver';
import { VISIT_CARDS, VISIT_OPENING } from '@/assets/visitUi';
import { LETTER, OPENING_STEPS } from './script';

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

  const step = OPENING_STEPS[index];
  const next = () => {
    if (index + 1 < OPENING_STEPS.length) setIndex(index + 1);
    else onDone();
  };

  return (
    <TouchableOpacity style={styles.screen} activeOpacity={1} onPress={next}>
      <Animated.View style={[styles.fill, { opacity: fade }]}>
        <Image source={VISIT_OPENING[step.image]} resizeMode="cover" style={styles.image} />
        {step.letter ? (
          <View style={styles.letterWrap}>
            <ImageBackground source={VISIT_CARDS[1]} resizeMode="stretch" imageStyle={styles.letterImage} style={styles.letter}>
              <Text style={styles.letterText}>{LETTER}</Text>
            </ImageBackground>
          </View>
        ) : (
          <>
            <View style={styles.shade} />
            <Text style={styles.line}>{step.line}</Text>
          </>
        )}
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
  letterWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 18, backgroundColor: 'rgba(0,0,0,0.45)' },
  letter: { paddingHorizontal: 24, paddingVertical: 30 },
  letterImage: { width: '100%', height: '100%' },
  letterText: { color: '#1a1a1a', fontSize: 16, lineHeight: 26, fontFamily: 'serif' },
  skip: { position: 'absolute', right: 14, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4 },
  skipText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
});

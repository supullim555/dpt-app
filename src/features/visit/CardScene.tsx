import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { USE_NATIVE_DRIVER } from '@/core/anim/nativeDriver';
import CrisisFooter from '@/ui/CrisisFooter';

const FADE_MS = 600;

export type Beat = { text: string; bg?: string; ink?: string };

// A cutscene made of words for now: her memories and the way down to the tree. Tap through. These are
// the scenes that get real staging later (docs/계획서.md); the callers won't need to change.
export default function CardScene({ title, beats, fontScale, onDone }: { title?: string; beats: Beat[]; fontScale: number; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fade.setValue(0);
    const anim = Animated.timing(fade, { toValue: 1, duration: FADE_MS, useNativeDriver: USE_NATIVE_DRIVER });
    anim.start();
    return () => anim.stop();
  }, [index, fade]);

  const beat = beats[index];
  const ink = beat.ink ?? '#fff';

  return (
    <View style={styles.wrap}>
      <TouchableOpacity activeOpacity={1} style={[styles.scene, { backgroundColor: beat.bg ?? '#000' }]} onPress={() => (index + 1 < beats.length ? setIndex(index + 1) : onDone())}>
        {title ? <Text style={[styles.title, { color: ink }]}>{title}</Text> : null}
        <Animated.Text style={[styles.line, { color: ink, opacity: fade, fontSize: 18 * fontScale, lineHeight: 30 * fontScale }]}>{beat.text}</Animated.Text>
        <Text style={[styles.more, { color: ink }]}>▼</Text>
      </TouchableOpacity>
      <CrisisFooter tone="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  scene: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  title: { position: 'absolute', top: 60, fontSize: 14, opacity: 0.7, fontFamily: 'serif' },
  line: { textAlign: 'center', fontFamily: 'serif' },
  more: { position: 'absolute', bottom: 24, fontSize: 11, opacity: 0.6 },
});

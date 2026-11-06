import { createElement, useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { USE_NATIVE_DRIVER } from '@/core/anim/nativeDriver';
import CrisisFooter from '@/ui/CrisisFooter';

const FADE_MS = 600;

/** A card of words, or a filmed scene (web only) standing in for the next `covers` cards. */
export type Beat = { text: string; bg?: string; ink?: string } | { video: string; covers: number };

// If the film hasn't started by then, the cards it stands in for are shown instead.
const VIDEO_START_MS = 5000;

// A cutscene of words, tap through: her memories and the way down to the tree. Some moments are filmed
// (scripts/assets/build-cutscenes.js); the film plays in place of the cards it covers, and if it can't be played
// (not on the web, or it won't load) those cards are shown as they were.
export default function CardScene({ title, beats, fontScale, onDone }: { title?: string; beats: Beat[]; fontScale: number; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const next = (by = 1) => (index + by < beats.length ? setIndex(index + by) : onDone());

  useEffect(() => {
    fade.setValue(0);
    const anim = Animated.timing(fade, { toValue: 1, duration: FADE_MS, useNativeDriver: USE_NATIVE_DRIVER });
    anim.start();
    return () => anim.stop();
  }, [index, fade]);

  const beat = beats[index];
  if ('video' in beat) {
    return Platform.OS === 'web' ? <Film key={index} src={beat.video} onEnd={() => next(1 + beat.covers)} onFail={() => next()} /> : <Skip onSkip={() => next()} />;
  }
  const ink = beat.ink ?? '#fff';

  return (
    <View style={styles.wrap}>
      <TouchableOpacity activeOpacity={1} style={[styles.scene, { backgroundColor: beat.bg ?? '#000' }]} onPress={() => next()}>
        {title ? <Text style={[styles.title, { color: ink }]}>{title}</Text> : null}
        <Animated.Text style={[styles.line, { color: ink, opacity: fade, fontSize: 18 * fontScale, lineHeight: 30 * fontScale }]}>{beat.text}</Animated.Text>
        <Text style={[styles.more, { color: ink }]}>▼</Text>
      </TouchableOpacity>
      <CrisisFooter tone="dark" />
    </View>
  );
}

// Moves straight on, after the render: the cards it would have covered come next.
function Skip({ onSkip }: { onSkip: () => void }) {
  const done = useRef(onSkip);
  useEffect(() => done.current(), []);
  return <View style={styles.wrap} />;
}

// The film, filling the scene, muted (no sound in the game yet) so it may start on its own. A tap skips it.
function Film({ src, onEnd, onFail }: { src: string; onEnd: () => void; onFail: () => void }) {
  const started = useRef(false);
  const finished = useRef(false);
  const once = (f: () => void) => () => {
    if (finished.current) return;
    finished.current = true;
    f();
  };
  const end = useRef(once(onEnd)).current;
  const fail = useRef(once(onFail)).current;
  useEffect(() => {
    const t = setTimeout(() => started.current || fail(), VIDEO_START_MS);
    return () => clearTimeout(t);
  }, [fail]);
  return (
    <View style={styles.wrap}>
      <TouchableOpacity activeOpacity={1} style={styles.film} onPress={end} accessibilityLabel="장면 넘기기">
        {createElement('video', {
          src,
          autoPlay: true,
          muted: true,
          playsInline: true,
          preload: 'auto',
          onPlaying: () => (started.current = true),
          onEnded: end,
          onError: fail,
          style: { width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000', pointerEvents: 'none' },
        })}
      </TouchableOpacity>
      <CrisisFooter tone="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  film: { flex: 1, backgroundColor: '#000' },
  wrap: { flex: 1, backgroundColor: '#000' },
  scene: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  title: { position: 'absolute', top: 60, fontSize: 14, opacity: 0.7, fontFamily: 'serif' },
  line: { textAlign: 'center', fontFamily: 'serif' },
  more: { position: 'absolute', bottom: 24, fontSize: 11, opacity: 0.6 },
});

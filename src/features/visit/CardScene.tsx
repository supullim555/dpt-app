import { createElement, useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View, type ImageSourcePropType } from 'react-native';
import { USE_NATIVE_DRIVER } from '@/core/anim/nativeDriver';
import CrisisFooter from '@/ui/CrisisFooter';
import Credits from './Credits';
import { soundIsOn } from './sound';

const FADE_MS = 600;

/** A card of words, or a filmed scene (web only) standing in for the next `covers` cards. v0.98: a card can have a
 * comic panel above its words (`image`), and the happy ending closes on the credits. */
export type Beat = { text: string; bg?: string; ink?: string; image?: ImageSourcePropType; comic?: 'cry' | 'doctor' | 'discharge' } | { video: string; covers: number } | { credits: true };

// If the film hasn't started by then, the cards it stands in for are shown instead.
const VIDEO_START_MS = 5000;
const VIDEO_LOADING_MS = 15000;

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
  if ('credits' in beat) return <Credits fontScale={fontScale} onDone={() => next()} />;
  if ('video' in beat) {
    return Platform.OS === 'web' ? <Film key={index} src={beat.video} onEnd={() => next(1 + beat.covers)} onFail={() => next()} /> : <Skip onSkip={() => next()} />;
  }
  const ink = beat.ink ?? '#fff';

  return (
    <View style={styles.wrap}>
      <TouchableOpacity activeOpacity={1} style={[styles.scene, { backgroundColor: beat.bg ?? '#000' }]} onPress={() => next()}>
        {title ? <Text style={[styles.title, { color: ink }]}>{title}</Text> : null}
        {beat.image ? (
          <Animated.Image source={beat.image} resizeMode="contain" style={[styles.panel, { opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }]} />
        ) : null}
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

// The film, filling the scene. A tap skips it.
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
  // v0.93: with sound on the film is heard (some have their day's sounds); if the browser won't start it with sound,
  // it plays muted rather than not at all
  const start = (el: HTMLVideoElement | null) => {
    if (!el || el.dataset.started) return;
    el.dataset.started = '1';
    el.muted = !soundIsOn();
    el.play().catch(() => {
      el.muted = true;
      el.play().catch(() => {});
    });
  };
  // v1.00: on a slow connection the film was given up after five seconds even while it was still coming in; now that only
  // happens if nothing of it has arrived by then, and one that's arriving gets until VIDEO_LOADING_MS
  const arriving = useRef(false);
  useEffect(() => {
    let later: ReturnType<typeof setTimeout> | undefined;
    const t = setTimeout(() => {
      if (started.current) return;
      if (!arriving.current) return fail();
      later = setTimeout(() => started.current || fail(), VIDEO_LOADING_MS - VIDEO_START_MS);
    }, VIDEO_START_MS);
    return () => {
      clearTimeout(t);
      if (later) clearTimeout(later);
    };
  }, [fail]);
  return (
    <View style={styles.wrap}>
      <TouchableOpacity activeOpacity={1} style={styles.film} onPress={end} accessibilityLabel="장면 넘기기">
        {createElement('video', {
          src,
          ref: start,
          muted: true,
          playsInline: true,
          preload: 'auto',
          onPlaying: () => (started.current = true),
          onLoadedMetadata: () => (arriving.current = true),
          onProgress: () => (arriving.current = true),
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
  // a fixed size: given only a width, the web build laid the picture out at its own full height and pushed the words off
  panel: { width: 280, height: 280, marginBottom: 20, borderRadius: 2 },
  more: { position: 'absolute', bottom: 24, fontSize: 11, opacity: 0.6 },
});

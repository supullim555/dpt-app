import { useState } from 'react';
import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VISIT_CARDS, VISIT_SCRIBBLES } from '@/assets/visitUi';
import { NOTEBOOK_PAGES, NOTEBOOK_TITLE } from './script';

export type Told = { day: number; label: string | null; text: string };

// Her notebook, opened at the end. Each page starts with what the player told her that day, in their
// own words, and under it what she wrote for herself: tidy at first, then crossed out and scribbled
// over, until the last page has only "살고싶어" left on it.
export default function Notebook({ told, fontScale, doneLabel = '병원을 나서기', onDone }: { told: Told[]; fontScale: number; doneLabel?: string; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const page = NOTEBOOK_PAGES[index];
  const heard = told.find((t) => t.day === page.day);
  const last = index === NOTEBOOK_PAGES.length - 1;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{NOTEBOOK_TITLE}</Text>
      <ImageBackground
        source={VISIT_CARDS[1]}
        resizeMode="stretch"
        imageStyle={styles.fill}
        style={[styles.page, { transform: [{ rotate: `${page.tilt}deg` }] }]}
      >
        {page.day < 7 && heard && (heard.label || heard.text) ? (
          <Text style={[styles.heard, { fontSize: 13 * fontScale, lineHeight: 20 * fontScale }]}>
            그 사람의 {page.day}일째{heard.label ? ` · ${heard.label}` : ''}
            {heard.text ? `\n${heard.text}` : ''}
          </Text>
        ) : null}
        {page.lines.map((l, i) => (
          <Text
            key={i}
            style={[
              styles.line,
              { fontSize: (l.big ? 40 : 16) * fontScale, lineHeight: (l.big ? 54 : 26) * fontScale },
              l.struck && styles.struck,
              l.big && styles.big,
            ]}
          >
            {l.text}
          </Text>
        ))}
        {page.scribble !== null && <Image source={VISIT_SCRIBBLES[page.scribble]} resizeMode="stretch" style={styles.scribble} />}
      </ImageBackground>
      <TouchableOpacity style={styles.turn} onPress={() => (last ? onDone() : setIndex(index + 1))}>
        <Text style={styles.turnText}>{last ? doneLabel : '다음 장 ›'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 20, gap: 18 },
  title: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', fontFamily: 'serif' },
  page: { minHeight: 400, paddingHorizontal: 26, paddingVertical: 30, justifyContent: 'center', overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  heard: { color: '#555', fontFamily: 'serif', marginBottom: 18 },
  line: { color: '#1a1a1a', fontFamily: 'serif', marginBottom: 6 },
  struck: { textDecorationLine: 'line-through' },
  big: { textAlign: 'center', fontWeight: '700' },
  scribble: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  turn: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, borderWidth: 2, borderColor: '#f2f2f2', backgroundColor: '#000' },
  turnText: { color: '#fff', fontSize: 15, fontFamily: 'serif' },
});

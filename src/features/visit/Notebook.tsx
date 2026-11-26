import { useState } from 'react';
import { play } from './sound';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VISIT_SCRIBBLES } from '@/assets/visitUi';
import { NOTEBOOK_PAGES, NOTEBOOK_TITLE } from './script';

/** `story`: v0.96, when what you told her was someone in the hospital's story, what her notebook keeps of it. */
export type Told = { day: number; label: string | null; text: string; story?: string };

// Her notebook, opened at the end. Each page starts with what the player told her that day, in their
// own words, and under it what she wrote for herself: tidy at first, then crossed out and scribbled
// over, until the last page has only "살고싶어" left on it.
export default function Notebook({ told, fontScale, doneLabel = '병원을 나서기', onDone }: { told: Told[]; fontScale: number; doneLabel?: string; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const page = NOTEBOOK_PAGES[index];
  const heard = told.find((t) => t.day === page.day);
  const last = index === NOTEBOOK_PAGES.length - 1;

  // v1.00: scrolls when a page is taller than the screen (a long day written in your own words, or large text): it pushed
  // the button to turn the page off the bottom, and there was no going on
  return (
    <ScrollView key={index} style={styles.scroll} contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>{NOTEBOOK_TITLE}</Text>
      {/* v0.96: a notebook's page, not a sheet of paper: ruled lines, a red margin, the holes of its binding */}
      <View style={[styles.page, { transform: [{ rotate: `${page.tilt}deg` }] }]}>
        <View style={styles.rules} pointerEvents="none">
          {Array.from({ length: 18 }, (_, i) => (
            <View key={i} style={[styles.rule, { top: 30 + i * 26 }]} />
          ))}
          <View style={styles.margin} />
          {Array.from({ length: 9 }, (_, i) => (
            <View key={i} style={[styles.hole, { top: 22 + i * 48 }]} />
          ))}
        </View>
        {page.day < 7 && heard && (heard.label || heard.text || heard.story) ? (
          <Text style={[styles.heard, { fontSize: 13 * fontScale, lineHeight: 20 * fontScale }]}>
            그 사람의 {page.day}일째{heard.label ? ` · ${heard.label}` : ''}
            {heard.text ? `\n${heard.text}` : ''}
            {heard.story ? `\n${heard.story}` : ''}
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
      </View>
      <TouchableOpacity style={styles.turn} onPress={() => {
          if (last) onDone();
          else {
            play('page');
            setIndex(index + 1);
          }
        }}>
        <Text style={styles.turnText}>{last ? doneLabel : '다음 장 ›'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 20, gap: 18 },
  title: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', fontFamily: 'serif' },
  page: { minHeight: 440, paddingLeft: 52, paddingRight: 22, paddingVertical: 30, justifyContent: 'center', overflow: 'hidden', backgroundColor: '#f4f1e8', borderRadius: 3, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8 },
  rules: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  rule: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(110,140,170,0.28)' },
  margin: { position: 'absolute', left: 40, top: 0, bottom: 0, width: 1.5, backgroundColor: 'rgba(190,90,90,0.35)' },
  hole: { position: 'absolute', left: 12, width: 12, height: 12, borderRadius: 6, backgroundColor: '#1b1b1b' },
  heard: { color: '#555', fontFamily: 'serif', marginBottom: 18 },
  line: { color: '#1a1a1a', fontFamily: 'serif', marginBottom: 6 },
  struck: { textDecorationLine: 'line-through' },
  big: { textAlign: 'center', fontWeight: '700' },
  scribble: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  turn: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, borderWidth: 2, borderColor: '#f2f2f2', backgroundColor: '#000' },
  turnText: { color: '#fff', fontSize: 15, fontFamily: 'serif' },
});

import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MUTED } from './theme';

type Props = {
  /** 'dark' sits on the dialogue bar, 'light' on a plain screen. */
  tone?: 'dark' | 'light';
  /** What the player wrote sounded like a crisis (safety.ts): the lines are pointing at these numbers, so they stand out. */
  alert?: boolean;
};

const LINES = [
  { number: '109', tel: '109', name: '자살예방상담전화' },
  { number: '1577-0199', tel: '15770199', name: '정신건강위기상담전화' },
];

// Always visible on screens where the player writes freely (§8): noticeable but not alarming —
// small, muted, no icon, no red. Both lines are national and run 24 hours.
function CrisisFooterBase({ tone = 'dark', alert = false }: Props) {
  const call = (n: string) => Linking.openURL(`tel:${n}`).catch(() => {});
  // Calm, not alarming: a light card and two big buttons, no red, no icon.
  if (alert) {
    return (
      <View style={styles.alertWrap} accessibilityLiveRegion="polite">
        <Text style={styles.alertHead}>지금 바로 이야기할 수 있어요 · 24시간 · 무료</Text>
        <View style={styles.alertRow}>
          {LINES.map((l) => (
            <TouchableOpacity key={l.tel} style={styles.alertButton} onPress={() => call(l.tel)} accessibilityRole="link" accessibilityLabel={`${l.name} ${l.number}에 전화하기`}>
              <Text style={styles.alertNumber}>{l.number}</Text>
              <Text style={styles.alertName}>{l.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }
  const muted = tone === 'dark' ? styles.mutedDark : styles.mutedLight;
  const link = tone === 'dark' ? styles.linkDark : styles.linkLight;
  // Each piece is its own Text in a wrapping row, so a narrow screen breaks BETWEEN the
  // pieces instead of in the middle of a hotline's name.
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.text, muted]}>힘들 땐 언제든 (24시간)</Text>
        <Text style={[styles.text, muted]}>
          {' · '}자살예방상담전화{' '}
          <Text style={link} onPress={() => call('109')} accessibilityRole="link">
            109
          </Text>
        </Text>
        <Text style={[styles.text, muted]}>
          {' · '}정신건강위기상담전화{' '}
          <Text style={link} onPress={() => call('15770199')} accessibilityRole="link">
            1577-0199
          </Text>
        </Text>
      </View>
    </View>
  );
}

export default React.memo(CrisisFooterBase);

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  text: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
  mutedDark: { color: 'rgba(255,255,255,0.6)' },
  // #777 measured under 4.5:1 against white (WCAG AA fails for body text); MUTED (#666) clears it.
  mutedLight: { color: MUTED },
  linkDark: { color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  linkLight: { color: '#444', fontWeight: '700' },
  alertWrap: { margin: 10, marginTop: 6, padding: 12, borderRadius: 10, backgroundColor: '#f6f1e6', borderWidth: 1, borderColor: '#d9c9a3' },
  alertHead: { color: '#3a3428', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 10 },
  alertRow: { flexDirection: 'row', gap: 8 },
  alertButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cdbb8f', alignItems: 'center' },
  alertNumber: { color: '#1f1b14', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  alertName: { color: '#4a4335', fontSize: 12, lineHeight: 17, textAlign: 'center' },
});

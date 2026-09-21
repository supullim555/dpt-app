import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

type Props = {
  /** 'dark' sits on the dialogue bar, 'light' on a plain screen. */
  tone?: 'dark' | 'light';
};

// Always visible on screens where the player writes freely (§8): noticeable but not alarming —
// small, muted, no icon, no red. Both lines are national and run 24 hours.
function CrisisFooterBase({ tone = 'dark' }: Props) {
  const muted = tone === 'dark' ? styles.mutedDark : styles.mutedLight;
  const link = tone === 'dark' ? styles.linkDark : styles.linkLight;
  const call = (n: string) => Linking.openURL(`tel:${n}`).catch(() => {});
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
  mutedLight: { color: '#777' },
  linkDark: { color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  linkLight: { color: '#444', fontWeight: '700' },
});

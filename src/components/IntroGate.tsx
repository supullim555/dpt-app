import React, { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { loadEntry, saveEntry } from '../storage/storage';
import CrisisFooter from './CrisisFooter';

const ACK_KEY = 'intro.acknowledged';

// First launch only: say plainly what this is and isn't (§8), then get out of the way.
// One quiet button — no checkbox, no "I agree", nothing to sign. The line about where
// writing is stored is true for now (everything stays on the device); update it if that changes.
export default function IntroGate({ children }: { children: ReactNode }) {
  const [acknowledged, setAcknowledged] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadEntry<boolean>(ACK_KEY)
      .then((v) => !cancelled && setAcknowledged(v === true))
      .catch(() => !cancelled && setAcknowledged(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (acknowledged === null) return <View style={styles.blank} />;
  if (acknowledged) return <>{children}</>;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>시작하기 전에</Text>
        <Text style={styles.line}>이 앱은 치료가 아니에요. 전문가의 도움을 대신하지 않아요.</Text>
        <Text style={styles.line}>여기에 쓰는 글은 이 기기에만 저장되고, 아무도 읽지 않아요.</Text>
        <Text style={styles.line}>많이 힘들 때는 혼자 견디지 않아도 돼요.</Text>
        <CrisisFooter tone="light" />
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            saveEntry(ACK_KEY, true);
            setAcknowledged(true);
          }}
        >
          <Text style={styles.buttonText}>알겠어요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: '#fafafa' },
  container: { flex: 1, backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eee', padding: 24 },
  title: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 16 },
  line: { fontSize: 15, lineHeight: 23, color: '#333', marginBottom: 10 },
  button: { alignSelf: 'center', marginTop: 16, backgroundColor: '#222', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

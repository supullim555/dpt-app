import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TEXT_ON_DARK, TEXT_ON_DARK_MUTED } from '../theme';

type Props = {
  onAccept: () => void;
  onDecline: () => void;
};

// Shown at most once per device, the first time a dialogue finishes and the AI opt-in choice has
// never been made (useAiClosing gates this — only when WebGPU exists and nothing's been decided
// yet). Declining is remembered permanently; this never asks twice.
export default function AiOptInRow({ onAccept, onDecline }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>
        AI가 방금 적은 내용을 짧게 들어줄 수 있어요. 처음 한 번만 기기에 내려받아요(약 1GB, Wi-Fi
        권장). 받은 내용은 이 기기 안에만 남아요.
      </Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.accept} onPress={onAccept}>
          <Text style={styles.acceptText}>받을게요</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.decline} onPress={onDecline}>
          <Text style={styles.declineText}>괜찮아요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, gap: 8, alignSelf: 'stretch' },
  text: { fontSize: 12, lineHeight: 18, color: TEXT_ON_DARK_MUTED },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  accept: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  acceptText: { color: '#111', fontSize: 13, fontWeight: '700' },
  decline: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  declineText: { color: TEXT_ON_DARK, fontSize: 13 },
});

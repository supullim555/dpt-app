import { ImageBackground, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { VISIT_CARDS } from '@/assets/visitUi';

export default function PaperButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.button}>
      <ImageBackground source={VISIT_CARDS[0]} resizeMode="stretch" imageStyle={styles.fillImage} style={styles.fill}>
        <Text style={styles.text}>{label}</Text>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { width: 164, height: 50 },
  // ImageBackground's image otherwise keeps the file's own size on web and overflows.
  fillImage: { width: '100%', height: '100%' },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#111', fontSize: 15, fontWeight: '700', fontFamily: 'serif' },
});

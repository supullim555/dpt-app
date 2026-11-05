import { ImageBackground, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { VISIT_CARDS } from '@/assets/visitUi';

// `wide`: the width of the panel, growing to fit a sentence, for the questions in a conversation.
export default function PaperButton({ label, onPress, wide }: { label: string; onPress: () => void; wide?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={wide ? styles.wide : styles.button}>
      <ImageBackground source={VISIT_CARDS[0]} resizeMode="stretch" imageStyle={styles.fillImage} style={styles.fill}>
        <Text style={[styles.text, wide && styles.wideText]}>{label}</Text>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { width: 164, height: 50 },
  wide: { alignSelf: 'stretch', minHeight: 50 },
  // ImageBackground's image otherwise keeps the file's own size on web and overflows.
  fillImage: { width: '100%', height: '100%' },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#111', fontSize: 15, fontWeight: '700', fontFamily: 'serif' },
  wideText: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 18, paddingVertical: 10 },
});

import { StyleSheet, View } from 'react-native';

// PLACEHOLDER first-person view of the room, drawn from plain shapes until real art exists (generating
// it needs an explicit go-ahead for Gemini). Looking at the bed from the door.
export default function HospitalRoom({ girl }: { girl: boolean }) {
  return (
    <View style={styles.room}>
      <View style={styles.window}>
        <View style={styles.windowBar} />
      </View>
      <View style={styles.floor} />
      <View style={styles.bed}>
        <View style={styles.pillow}>{girl && <View style={styles.head} />}</View>
        <View style={[styles.blanket, !girl && styles.blanketFlat]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  room: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#dfe3e6', alignItems: 'center', overflow: 'hidden' },
  window: { position: 'absolute', top: '8%', width: '44%', height: '22%', backgroundColor: '#bcd9ea', borderWidth: 5, borderColor: '#f4f5f6' },
  windowBar: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 4, backgroundColor: '#f4f5f6' },
  floor: { position: 'absolute', left: 0, right: 0, top: '46%', bottom: 0, backgroundColor: '#c6cbc9' },
  bed: { position: 'absolute', top: '32%', width: '60%', height: '30%', backgroundColor: '#f7f7f5', borderRadius: 10, borderWidth: 2, borderColor: '#9aa3a8', alignItems: 'center' },
  pillow: { marginTop: 8, width: '58%', height: '26%', backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  head: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#8a5a3c' },
  blanket: { position: 'absolute', left: 0, right: 0, bottom: 0, top: '38%', backgroundColor: '#a9c3cf', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  blanketFlat: { top: '55%', backgroundColor: '#c9d6dc' },
});

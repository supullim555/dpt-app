import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { USE_NATIVE_DRIVER } from '@/core/anim/nativeDriver';
import PaperButton from './PaperButton';
import { clueOn, type ClueId } from './progress';
import { boughtLine, CLUE_SPOT, CLUE_TEXT, FLOORS, GIFTS, HINT_TITLE, hintLines, SOLD_TODAY } from './script';

const FLOOR_ORDER = [4, 3, 2, 1];

type Props = {
  day: number;
  run: number;
  fontScale: number;
  boughtToday: boolean;
  found: readonly ClueId[];
  onBuy: (gift: string) => void;
  onFind: (clue: ClueId) => void;
  onTitle: () => void;
};

// Where you're sent when the nurse puts you out. Only the hospital: four floors, a shop on the first
// (one of the day's three gifts), and on some days a clue lying about. Going anywhere moves you forward
// into it: the placeholder for the staging in docs/계획서.md.
export default function Hospital({ day, run, fontScale, boughtToday, found, onBuy, onFind, onTitle }: Props) {
  const [floor, setFloor] = useState(4);
  const [inShop, setInShop] = useState(false);
  const [note, setNote] = useState('');
  const [hintOpen, setHintOpen] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    enter.setValue(0);
    const anim = Animated.timing(enter, { toValue: 1, duration: 500, useNativeDriver: USE_NATIVE_DRIVER });
    anim.start();
    return () => anim.stop();
  }, [floor, inShop, enter]);

  const go = (next: number) => {
    setFloor(next);
    setNote('');
  };
  const place = FLOORS[floor];
  const clue = clueOn(day, floor);
  const motion = { opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] };
  const textSize = { fontSize: 14 * fontScale, lineHeight: 22 * fontScale };

  if (inShop) {
    return (
      <Animated.View style={[styles.wrap, motion]}>
        <Text style={[styles.title, { fontSize: 24 * fontScale }]}>매점</Text>
        {boughtToday ? (
          <Text style={[styles.text, textSize]}>{note || SOLD_TODAY}</Text>
        ) : (
          (GIFTS[day] ?? []).map((g) => (
            <PaperButton
              key={g.name}
              label={g.name}
              onPress={() => {
                onBuy(g.name);
                setNote(boughtLine(g.name));
              }}
            />
          ))
        )}
        <TouchableOpacity
          style={styles.link}
          onPress={() => {
            setInShop(false);
            setNote('');
          }}
        >
          <Text style={[styles.linkText, textSize]}>나가기</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.wrap, motion]}>
      <Text style={[styles.title, { fontSize: 24 * fontScale }]}>{place.name}</Text>
      {place.lines.map((l) => (
        <Text key={l} style={[styles.text, textSize]}>
          {l}
        </Text>
      ))}
      {note ? <Text style={[styles.note, textSize]}>{note}</Text> : null}

      {clue && !found.includes(clue.id) && (
        <PaperButton
          label={CLUE_SPOT}
          onPress={() => {
            onFind(clue.id);
            setNote(CLUE_TEXT[clue.id].found);
          }}
        />
      )}
      {floor === 1 && <PaperButton label="매점 가기" onPress={() => setInShop(true)} />}

      <View style={styles.floors}>
        {FLOOR_ORDER.map((f) => (
          <TouchableOpacity key={f} disabled={f === floor} style={[styles.floor, f === floor && styles.floorHere]} onPress={() => go(f)}>
            <Text style={[styles.floorText, f === floor && styles.floorTextHere]}>{f}층</Text>
          </TouchableOpacity>
        ))}
      </View>

      {run >= 2 && (
        <TouchableOpacity style={styles.link} onPress={() => setHintOpen(!hintOpen)}>
          <Text style={[styles.linkText, textSize]}>{HINT_TITLE}</Text>
        </TouchableOpacity>
      )}
      {run >= 2 && hintOpen && hintLines().map((l) => (
        <Text key={l} style={[styles.text, textSize]}>
          {l}
        </Text>
      ))}

      <TouchableOpacity style={styles.link} onPress={onTitle}>
        <Text style={[styles.linkText, textSize]}>타이틀로</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  title: { color: '#fff', fontFamily: 'serif', marginBottom: 4 },
  text: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontFamily: 'serif' },
  note: { color: '#d9a441', textAlign: 'center', fontFamily: 'serif' },
  floors: { flexDirection: 'row', gap: 8, marginTop: 12 },
  floor: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 2, borderColor: '#f2f2f2' },
  floorHere: { backgroundColor: '#f2f2f2' },
  floorText: { color: '#f2f2f2', fontSize: 14, fontFamily: 'serif' },
  floorTextHere: { color: '#111', fontWeight: '700' },
  link: { paddingVertical: 6 },
  linkText: { color: '#fff', textDecorationLine: 'underline', fontFamily: 'serif' },
});

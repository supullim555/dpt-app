import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import CharacterView from './CharacterView';
import { useGame } from '../game/GameContext';

type Props = {
  questions: string[];
  onComplete: (answers: string[]) => void;
};

// Tapping the speech bubble always advances the conversation by one beat:
// the first tap on a question reveals the answer box, the next tap submits
// it and moves to the next question (or finishes on the last one).
export default function DialogueExercise({ questions, onComplete }: Props) {
  const { state } = useGame();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'bubble' | 'input'>('bubble');
  const [draft, setDraft] = useState('');
  const [done, setDone] = useState(false);

  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);
  const chevronTranslate = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });

  const collected = useRef<string[]>([]);

  const advance = () => {
    if (done) return;
    if (phase === 'bubble') {
      setPhase('input');
      return;
    }
    const answer = draft.trim();
    collected.current.push(answer);
    setDraft('');
    Keyboard.dismiss();
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setPhase('bubble');
    } else {
      setDone(true);
      onComplete(collected.current);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <CharacterView equipped={state.equipped} size={72} />
        <TouchableOpacity style={styles.bubble} onPress={advance} activeOpacity={0.8}>
          <Text style={styles.bubbleText}>
            {done ? '오늘 이야기 나눠줘서 고마워요.' : questions[index]}
          </Text>
          {!done && (
            <Animated.Text
              style={[styles.chevron, { transform: [{ translateY: chevronTranslate }] }]}
            >
              ⌄
            </Animated.Text>
          )}
        </TouchableOpacity>
      </View>

      {!done && <Text style={styles.progress}>{index + 1} / {questions.length}</Text>}

      {!done && phase === 'input' && (
        <View style={styles.answerBox}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="여기에 적어보세요"
            placeholderTextColor="#aaa"
            multiline
            autoFocus
          />
          <TouchableOpacity style={styles.nextButton} onPress={advance}>
            <Text style={styles.nextButtonText}>
              {index + 1 < questions.length ? '다음' : '완료'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  bubble: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 14,
  },
  bubbleText: { fontSize: 15, color: '#333', lineHeight: 21 },
  chevron: { alignSelf: 'center', marginTop: 4, fontSize: 16, color: '#999' },
  progress: { fontSize: 12, color: '#999', textAlign: 'right', marginTop: 6 },
  answerBox: { marginTop: 12, gap: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    color: '#222',
    textAlignVertical: 'top',
  },
  nextButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#222',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  nextButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

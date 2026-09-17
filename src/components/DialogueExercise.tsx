import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CharacterPortrait from './CharacterPortrait';
import TapHintChevron from './TapHintChevron';
import { useDialogue } from '../hooks/useDialogue';
import { makeSubmitOnEnterHandler } from '../hooks/useSubmitOnEnter';

type Props = {
  questions: string[];
  onComplete: (answers: string[]) => void;
};

export default function DialogueExercise({ questions, onComplete }: Props) {
  const beats = questions.map((text) => ({ text, answerable: true }));
  const { current, index, total, phase, draft, setDraft, advance, done } = useDialogue(
    beats,
    onComplete
  );

  return (
    <View style={styles.container}>
      <View style={styles.portraitRow}>
        <CharacterPortrait size={140} />
      </View>

      <TouchableOpacity style={styles.bubble} onPress={advance} activeOpacity={0.8}>
        <Text style={styles.bubbleText}>
          {done ? '오늘 이야기 나눠줘서 고마워요.' : current.text}
        </Text>
        {!done && <TapHintChevron />}
      </TouchableOpacity>

      {!done && (
        <Text style={styles.progress}>
          {index + 1} / {total}
        </Text>
      )}

      {!done && phase === 'input' && (
        <View style={styles.answerBox}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            onKeyPress={makeSubmitOnEnterHandler(advance)}
            placeholder="여기에 적어보세요 (Enter로 제출, Shift+Enter로 줄바꿈)"
            placeholderTextColor="#aaa"
            multiline
            autoFocus
          />
          <TouchableOpacity style={styles.nextButton} onPress={advance}>
            <Text style={styles.nextButtonText}>{index + 1 < total ? '다음' : '완료'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24, alignItems: 'center' },
  portraitRow: { marginBottom: 12 },
  bubble: {
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 14,
  },
  bubbleText: { fontSize: 15, color: '#333', lineHeight: 21, textAlign: 'center' },
  progress: { fontSize: 12, color: '#999', textAlign: 'right', marginTop: 6, alignSelf: 'stretch' },
  answerBox: { marginTop: 12, gap: 8, alignSelf: 'stretch' },
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

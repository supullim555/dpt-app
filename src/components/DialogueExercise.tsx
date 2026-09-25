import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CharacterPortrait from './CharacterPortrait';
import TapHintChevron from './TapHintChevron';
import { useDialogue } from '../hooks/useDialogue';
import { makeSubmitOnEnterHandler } from '../hooks/useSubmitOnEnter';
import { TEXT_ON_DARK } from '../theme';

type Props = {
  questions: string[];
  onComplete: (answers: string[]) => void;
  /** A non-answerable opening line shown before the first question — e.g. a callback to what
   * was said here last time. Tap to continue like any other beat; doesn't count toward the
   * "n / total" progress below, since it isn't one of the exercise's own questions. */
  leadIn?: string;
};

// Lives inside a FloatingPanel (ExerciseDetailScreen) — styled to match, so this and Home's own
// daily check-in read as the same kind of moment rather than two different-looking dialogues.
export default function DialogueExercise({ questions, onComplete, leadIn }: Props) {
  const beats = leadIn
    ? [{ text: leadIn, answerable: false }, ...questions.map((text) => ({ text, answerable: true }))]
    : questions.map((text) => ({ text, answerable: true }));
  const { current, index, phase, draft, setDraft, advance, done } = useDialogue(beats, onComplete);
  const offset = leadIn ? 1 : 0;
  const showProgress = !done && index >= offset;
  const questionNumber = Math.min(index - offset + 1, questions.length);

  return (
    <View style={styles.container}>
      <View style={styles.portraitRow}>
        <CharacterPortrait size={84} />
      </View>

      <TouchableOpacity onPress={advance} activeOpacity={0.85} style={styles.bubbleTouchable}>
        <Text style={styles.bubbleText}>{done ? '오늘 이야기 나눠줘서 고마워요.' : current.text}</Text>
        {!done && <TapHintChevron />}
      </TouchableOpacity>

      {showProgress && (
        <Text style={styles.progress}>
          {questionNumber} / {questions.length}
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
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
            autoFocus
          />
          <TouchableOpacity style={styles.sendButton} onPress={advance}>
            <Text style={styles.sendButtonText}>{questionNumber < questions.length ? '다음' : '완료'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  portraitRow: { marginBottom: 4 },
  bubbleTouchable: { alignItems: 'center' },
  bubbleText: { color: TEXT_ON_DARK, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  progress: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'right', alignSelf: 'stretch', marginTop: 6 },
  answerBox: { marginTop: 12, gap: 8, alignSelf: 'stretch' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    padding: 10,
    minHeight: 56,
    fontSize: 14,
    color: TEXT_ON_DARK,
    textAlignVertical: 'top',
  },
  sendButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: { color: '#111', fontWeight: '700', fontSize: 14 },
});

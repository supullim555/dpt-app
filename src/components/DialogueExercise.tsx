import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CharacterPortrait from './CharacterPortrait';
import TapHintChevron from './TapHintChevron';
import { useDialogue, type DialogueBeat } from '../hooks/useDialogue';
import { makeSubmitOnEnterHandler } from '../hooks/useSubmitOnEnter';
import { TEXT_ON_DARK } from '../theme';

type Props = {
  questions: string[];
  onComplete: (answers: string[]) => void;
  /** Non-answerable opening line(s) shown before the first question — e.g. a callback to what
   * was said last time (exercises), or a greeting plus an optional callback line (Home's daily
   * check-in, §30 — the reason this takes an array, not just one string). Each is tapped through
   * like any other beat; none count toward the "n / total" progress below. */
  leadIn?: string | string[];
  /** False when the caller already shows the character elsewhere on screen — Home's daily
   * check-in shows RoomPortrait in the room itself (behind this panel, not inside it), so a
   * second portrait docked in here too would just be a duplicate. Defaults to true, which is
   * right for every exercise (nothing else on screen shows her during one). */
  showPortrait?: boolean;
};

// Lives inside a FloatingPanel — Home's daily check-in (HomeScreen.tsx) and its per-exercise
// dialogue (ActiveExerciseDialogue, HomeScreen.tsx) both use this directly now (§30 — they used
// to be two near-identical hand-rolled copies of this same bubble/input/send-button shape; one
// read Home's `useDialogue` state straight into its own JSX instead of going through here).
export default function DialogueExercise({ questions, onComplete, leadIn, showPortrait = true }: Props) {
  const leadInBeats: DialogueBeat[] = (leadIn == null ? [] : Array.isArray(leadIn) ? leadIn : [leadIn]).map((text) => ({
    text,
    answerable: false,
  }));
  const beats = [...leadInBeats, ...questions.map((text) => ({ text, answerable: true }))];
  const { current, index, phase, draft, setDraft, advance, done } = useDialogue(beats, onComplete);
  const offset = leadInBeats.length;
  const showProgress = !done && index >= offset;
  const questionNumber = Math.min(index - offset + 1, questions.length);

  return (
    <View style={styles.container}>
      {showPortrait && (
        <View style={styles.portraitRow}>
          <CharacterPortrait size={84} />
        </View>
      )}

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

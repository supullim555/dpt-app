import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CharacterPortrait } from '@/features/character';
import TapHintChevron from '@/ui/TapHintChevron';
import { useDialogue, type DialogueBeat } from './useDialogue';
import { questionText, type DialogueQuestion } from './questions';
import { makeSubmitOnEnterHandler } from '@/core/hooks/useSubmitOnEnter';
import { useRoomBoxSize } from '@/ui/useRoomBoxSize';
import { TEXT_ON_DARK, TEXT_ON_DARK_MUTED } from '@/ui/theme';

type Props = {
  /** A plain string asks for an (optional) typed answer; `{ text, choices }` is answered by a
   * tap, with typing still available behind "직접 쓸게요". */
  questions: DialogueQuestion[];
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
  const beats: DialogueBeat[] = [
    ...leadInBeats,
    ...questions.map((q) => ({ text: questionText(q), answerable: true, choices: typeof q === 'string' ? undefined : q.choices })),
  ];
  const { current, index, draft, setDraft, advance, answer, done, isAnswerable, answered } = useDialogue(beats, onComplete);
  // On a choice question, typing is one tap away ("직접 쓸게요") rather than shown up front.
  const [writing, setWriting] = useState(false);
  useEffect(() => setWriting(false), [index]);
  const showChoices = !done && isAnswerable && !!current.choices?.length && !writing;
  const showInput = !done && isAnswerable && !showChoices;
  const isLast = questionNumberFor(index, leadInBeats.length, questions.length) === questions.length;
  const submitLabel = draft.trim() ? (isLast ? '완료' : '다음') : '넘어가기';
  const offset = leadInBeats.length;
  const showProgress = !done && index >= offset;
  const questionNumber = questionNumberFor(index, offset, questions.length);

  // §36: what's been said so far, shown as a short scrolling transcript above the current line —
  // previously a submitted answer just vanished (the input cleared and the next question took
  // its place), which read as talking into a void rather than a conversation building up. Only
  // the answerable beats among leadInBeats..beats line up 1:1 with `answered`.
  const answerableBeats = beats.filter((b) => b.answerable ?? true);
  const history = answered.map((text, i) => ({ question: answerableBeats[i].text, answer: text }));

  const historyRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (history.length > 0) historyRef.current?.scrollToEnd({ animated: true });
  }, [history.length]);

  // §37: a wide desktop browser window has real room to show more of the exchange at once — a
  // phone-width history box (`isWide` false) stays the original compact single-exchange height,
  // a wide one shows roughly double before it needs to scroll.
  const { isWide } = useRoomBoxSize();
  const historyMaxHeight = isWide ? 170 : 86;

  return (
    <View style={styles.container}>
      {showPortrait && (
        <View style={styles.portraitRow}>
          <CharacterPortrait size={84} />
        </View>
      )}

      {history.length > 0 && (
        <ScrollView
          ref={historyRef}
          style={[styles.history, { maxHeight: historyMaxHeight }]}
          contentContainerStyle={styles.historyContent}
        >
          {history.map((h, i) => (
            <View key={i} style={styles.historyEntry}>
              <Text style={styles.historyQuestion}>{h.question}</Text>
              {h.answer.length > 0 && (
                <View style={styles.historyAnswerRow}>
                  <Text style={styles.historyAnswer}>{h.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity onPress={advance} disabled={done || isAnswerable} activeOpacity={0.85} style={styles.bubbleTouchable}>
        <Text style={styles.bubbleText}>{done ? '오늘 이야기 나눠줘서 고마워요.' : current.text}</Text>
        {!done && !isAnswerable && <TapHintChevron />}
      </TouchableOpacity>

      {showProgress && (
        <Text style={styles.progress}>
          {questionNumber} / {questions.length}
        </Text>
      )}

      {showChoices && (
        <View style={styles.choices}>
          {current.choices!.map((choice) => (
            <TouchableOpacity key={choice} style={styles.choice} onPress={() => answer(choice)}>
              <Text style={styles.choiceText}>{choice}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.choice, styles.choiceWrite]} onPress={() => setWriting(true)}>
            <Text style={styles.choiceWriteText}>직접 쓸게요</Text>
          </TouchableOpacity>
        </View>
      )}

      {showInput && (
        <View style={styles.answerBox}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            onKeyPress={makeSubmitOnEnterHandler(() => answer())}
            placeholder="쓰고 싶은 만큼만 (안 써도 괜찮아요)"
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
          />
          <TouchableOpacity style={[styles.sendButton, !draft.trim() && styles.skipButton]} onPress={() => answer()}>
            <Text style={[styles.sendButtonText, !draft.trim() && styles.skipButtonText]}>{submitLabel}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  portraitRow: { marginBottom: 4 },
  // Capped, not grown-to-fit: a 4-question exercise's transcript could otherwise push the panel
  // tall enough to shove the portrait and crisis footer around as it goes. Scrolls internally
  // and auto-follows the latest entry instead. The actual cap (historyMaxHeight) is set inline —
  // phone-compact or desktop-roomier, see useRoomBoxSize above.
  history: { alignSelf: 'stretch', marginBottom: 10 },
  historyContent: { gap: 8 },
  historyEntry: { gap: 3 },
  historyQuestion: { fontSize: 12, lineHeight: 16, color: TEXT_ON_DARK_MUTED },
  historyAnswerRow: { alignItems: 'flex-end' },
  historyAnswer: {
    fontSize: 12,
    lineHeight: 16,
    color: TEXT_ON_DARK,
    fontWeight: '600',
    maxWidth: '85%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    borderBottomRightRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bubbleTouchable: { alignItems: 'center' },
  bubbleText: { color: TEXT_ON_DARK, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  progress: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'right', alignSelf: 'stretch', marginTop: 6 },
  answerBox: { marginTop: 12, gap: 8, alignSelf: 'stretch' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    borderRadius: 12,
    padding: 12,
    minHeight: 64,
    fontSize: 14,
    lineHeight: 19,
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
  skipButton: { backgroundColor: 'rgba(255,255,255,0.14)' },
  skipButtonText: { color: TEXT_ON_DARK },
  choices: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, alignSelf: 'stretch' },
  choice: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  choiceText: { color: '#111', fontSize: 14, fontWeight: '600' },
  choiceWrite: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  choiceWriteText: { color: TEXT_ON_DARK, fontSize: 14 },
});

function questionNumberFor(index: number, offset: number, total: number) {
  return Math.min(index - offset + 1, total);
}

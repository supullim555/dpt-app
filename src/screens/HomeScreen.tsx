import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HomeScreenProps } from '../navigation/types';
import RoomBackdrop from '../components/RoomBackdrop';
import RoomPortrait from '../components/RoomPortrait';
import RoamingCharacter from '../components/RoamingCharacter';
import TapHintChevron from '../components/TapHintChevron';
import CrisisFooter from '../components/CrisisFooter';
import CoinBadge from '../components/CoinBadge';
import FloatingPanel from '../components/FloatingPanel';
import { useGame } from '../game/GameContext';
import { DAILY_CHECKIN_ID, quote, recordMemory, takeCallback, type MemoryEntry } from '../game/memory';
import { useDialogue, type DialogueBeat } from '../hooks/useDialogue';
import { makeSubmitOnEnterHandler } from '../hooks/useSubmitOnEnter';
import { TEXT_ON_DARK } from '../theme';

const GREETINGS: { until: number; text: string }[] = [
  { until: 11, text: '아침이네요. 지금 마음은 어때요?' },
  { until: 17, text: '오늘 하루 어떻게 흘러가고 있나요?' },
  { until: 22, text: '수고 많았어요. 잠깐 마음을 돌아볼까요?' },
  { until: 24, text: '이 시간까지 깨어있네요. 무리하지 말아요.' },
];

// Kept as their own list so the exact same questions can be recorded to memory afterward,
// rather than re-deriving them from the beats array (which also carries the greeting and,
// some days, a callback line — neither of those are "questions" to remember answers to).
const DAILY_QUESTIONS = ['오늘 하루는 어땠나요?', '그중에서 가장 기억에 남는 순간이 있다면요?'];

function getGreeting() {
  const hour = new Date().getHours();
  return GREETINGS.find((g) => hour < g.until)?.text ?? GREETINGS[GREETINGS.length - 1].text;
}

// A callback beat — "지난번에 '~'라고 했었죠" — sits between the greeting and today's questions
// when there's something worth bringing back up (§4: a sign this isn't one-off, told through
// content, not a streak). It only ever quotes; see src/game/memory.ts for the rules this keeps to.
function buildDailyBeats(greeting: string, callback: MemoryEntry | null): DialogueBeat[] {
  const beats: DialogueBeat[] = [{ text: greeting, answerable: false }];
  if (callback) {
    beats.push({ text: `지난번에 "${quote(callback.answer)}"라고 했었죠.`, answerable: false });
  }
  beats.push(...DAILY_QUESTIONS.map((text) => ({ text, answerable: true })));
  return beats;
}

// The room fills the whole tab, edge to edge — no separate top bar or button row cut out of it
// anymore. What used to live in a bottom action row (실습/지난 이야기/상점) is now the persistent
// tab bar (MainTabs); when there's nothing to say, Home is just the room with nothing floating
// over it but the coin count, which is what "living in a room" actually looks like.
export default function HomeScreen(_props: HomeScreenProps) {
  const { state, loaded, completeExercise, isCompletedToday } = useGame();
  const insets = useSafeAreaInsets();
  const [callback, setCallback] = useState<MemoryEntry | null>(null);
  const [callbackLoaded, setCallbackLoaded] = useState(false);

  // Computed once per mount so the opening line doesn't change while the screen stays open.
  const greeting = useMemo(getGreeting, []);
  const alreadyCheckedInToday = isCompletedToday(DAILY_CHECKIN_ID);

  useEffect(() => {
    let cancelled = false;
    takeCallback().then((found) => {
      if (cancelled) return;
      setCallback(found);
      setCallbackLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const beats = useMemo(() => buildDailyBeats(greeting, callback), [greeting, callback]);

  // No popup and no praise: the character's closing line thanks them for talking, and
  // the coin count simply goes up (§4: rewards accumulate quietly). The only record kept is
  // memory.ts's log — it's what the memo tab reads and what future callbacks are drawn from.
  const handleComplete = (answers: string[]) => {
    recordMemory(DAILY_CHECKIN_ID, DAILY_QUESTIONS, answers);
    completeExercise(DAILY_CHECKIN_ID);
  };

  const { current, phase, draft, setDraft, advance, done } = useDialogue(beats, handleComplete);
  const showAnswerBox = !alreadyCheckedInToday && phase === 'input';

  // completeExercise() flips alreadyCheckedInToday in the same render pass `done` becomes true
  // (React batches the two setState calls), so without this, the thank-you line and the
  // "오늘은 이미..." notice would race and the thank-you line would never actually be seen.
  // Hold it on screen for a moment instead, then let the room take over on its own —
  // advance() is a no-op once done, so there's no tap that would otherwise dismiss it.
  const [showThankYou, setShowThankYou] = useState(false);
  useEffect(() => {
    if (!done) return;
    setShowThankYou(true);
    const t = setTimeout(() => setShowThankYou(false), 1800);
    return () => clearTimeout(t);
  }, [done]);

  // Waits on callbackLoaded too: `beats` depends on `callback`, and starting the dialogue
  // before that resolves risks the beat array (and the greeting the user already tapped past)
  // shifting under them once it does. The wait is a fast on-device read, imperceptible in practice.
  const inDialogue = !alreadyCheckedInToday && !done && callbackLoaded;
  const showPanel = inDialogue || showThankYou;
  const bubbleText = showThankYou ? '오늘 이야기 나눠줘서 고마워요.' : current.text;

  return (
    <View style={styles.container}>
      {/* wait for the saved state so bought furniture doesn't pop in a moment after the room appears */}
      {loaded && (
        <RoomBackdrop owned={state.inventory}>
          {/* Mounted (hidden) even during the dialogue so its sprites are already loaded when she starts to walk */}
          <RoamingCharacter hidden={inDialogue} />
          {inDialogue && <RoomPortrait />}
        </RoomBackdrop>
      )}

      <CoinBadge coins={state.coins} style={[styles.coinBadge, { top: insets.top + 10 }]} />

      {showPanel && (
        <FloatingPanel style={styles.panel}>
          <TouchableOpacity onPress={advance} activeOpacity={0.85} style={styles.dialogueTouchable}>
            <Text style={styles.dialogueText}>{bubbleText}</Text>
            {!done && <TapHintChevron />}
          </TouchableOpacity>
          {showAnswerBox && (
            <View style={styles.answerRow}>
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
              <TouchableOpacity style={styles.sendButton} onPress={advance}>
                <Text style={styles.sendButtonText}>다음</Text>
              </TouchableOpacity>
            </View>
          )}
          <CrisisFooter tone="dark" />
        </FloatingPanel>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  coinBadge: { position: 'absolute', left: 14, zIndex: 10 },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  dialogueTouchable: { alignItems: 'center' },
  dialogueText: { color: TEXT_ON_DARK, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  answerRow: { marginTop: 12, gap: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    padding: 10,
    minHeight: 56,
    fontSize: 14,
    color: '#fff',
    textAlignVertical: 'top',
  },
  sendButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: { color: '#111', fontSize: 14, fontWeight: '700' },
});

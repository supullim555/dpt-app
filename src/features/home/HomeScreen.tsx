import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HomeScreenProps } from '@/app/navigation/types';
import { RoomBackdrop, RoomPortrait, RoamingCharacter } from '@/features/room';
import CrisisFooter from '@/ui/CrisisFooter';
import { CoinBadge, StatusBadge, StatusOverlay, StatUpToast, useGame, type StatId } from '@/features/game';
import FloatingPanel from '@/ui/FloatingPanel';
import { DialogueExercise, useDialogueCompletion } from '@/features/dialogue';
import { QuestWidget, EXERCISES, type Exercise } from '@/features/exercises';
import { useReportBottomPanel } from '@/ui/PanelVisibility';
import { useAsyncEffect } from '@/core/hooks/useAsyncEffect';
import { loadAiOptIn } from '@/features/ai';
import { DAILY_CHECKIN_ID, quote, takeCallback, type MemoryEntry } from '@/features/memory';

const GREETINGS: { until: number; text: string }[] = [
  { until: 11, text: '아침이네요. 지금 마음은 어때요?' },
  { until: 17, text: '오늘 하루 어떻게 흘러가고 있나요?' },
  { until: 22, text: '수고 많았어요. 잠깐 마음을 돌아볼까요?' },
  { until: 24, text: '이 시간까지 깨어있네요. 무리하지 말아요.' },
];

// Kept as its own list so the exact same questions can be recorded to memory afterward, rather
// than re-deriving them from whatever lead-in lines DialogueExercise is given.
const DAILY_QUESTIONS = ['오늘 하루는 어땠나요?', '그중에서 가장 기억에 남는 순간이 있다면요?'];
// §33: talking about the day each day is what "유대감" stands for.
const DAILY_CHECKIN_STAT: StatId = 'bond';

function getGreeting() {
  const hour = new Date().getHours();
  return GREETINGS.find((g) => hour < g.until)?.text ?? GREETINGS[GREETINGS.length - 1].text;
}

// A callback line — "지난번에 '~'라고 했었죠" — sits after the greeting when there's something
// worth bringing back up (§4: a sign this isn't one-off, told through content, not a streak).
// It only ever quotes; see src/features/memory/memory.ts for the rules this keeps to.
function dailyLeadIn(greeting: string, callback: MemoryEntry | null): string[] {
  return callback ? [greeting, `지난번에 "${quote(callback.answer)}"라고 했었죠.`] : [greeting];
}

// §27's "실습을 홈 화면에서 자연스럽게" — runs a selected exercise's dialogue inside Home's own
// FloatingPanel, the same shape the daily check-in uses (§30: now literally the same component).
// Replaces the old ExerciseDetail screen's theory/목표 read-out with a single natural-sounding
// lead-in line instead (the callback quote when there's one, otherwise the exercise's own
// summary) — a real conversation doesn't open by citing the technique's theoretical lineage.
function ActiveExerciseDialogue({ exercise, onDone }: { exercise: Exercise; onDone: () => void }) {
  const [callback, setCallback] = useState<MemoryEntry | null>(null);
  const [callbackLoaded, setCallbackLoaded] = useState(false);

  useAsyncEffect(
    async (isCancelled) => {
      setCallbackLoaded(false);
      const found = await takeCallback(exercise.id);
      if (isCancelled()) return;
      setCallback(found);
      setCallbackLoaded(true);
    },
    [exercise.id]
  );

  const { onComplete: handleComplete, toast } = useDialogueCompletion({
    id: exercise.id,
    questions: exercise.questions,
    stat: exercise.stat,
    onClosed: onDone,
  });

  if (!callbackLoaded) return null;

  return (
    <>
      <StatUpToast toast={toast} />
      <DialogueExercise
        questions={exercise.questions}
        onComplete={handleComplete}
        leadIn={callback ? `지난번 여기서 "${quote(callback.answer)}"라고 적었었죠.` : exercise.summary}
        showPortrait
      />
    </>
  );
}

// The room fills the whole tab, edge to edge — no separate top bar or button row cut out of it
// anymore. What used to live in a bottom action row (실습/지난 이야기/상점) is now the persistent
// tab bar (MainTabs); when there's nothing to say, Home is just the room with nothing floating
// over it but the coin count and the quest widget, which is what "living in a room" actually
// looks like.
export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { state, loaded, isCompletedToday } = useGame();
  const insets = useSafeAreaInsets();
  const [callback, setCallback] = useState<MemoryEntry | null>(null);
  const [callbackLoaded, setCallbackLoaded] = useState(false);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const [showStatus, setShowStatus] = useState(false);

  // Computed once per mount so the opening line doesn't change while the screen stays open.
  const greeting = useMemo(getGreeting, []);
  const alreadyCheckedInToday = isCompletedToday(DAILY_CHECKIN_ID);

  useAsyncEffect(async (isCancelled) => {
    const found = await takeCallback();
    if (isCancelled()) return;
    setCallback(found);
    setCallbackLoaded(true);
  }, []);

  // Re-read on focus, not just mount: QuestWidget's own AI-on prompt can flip this while the
  // screen stays mounted (bottom-tabs keeps tabs alive), and the check-in flow below needs to
  // know about it without the user having to leave and come back to Home.
  const isFocused = useIsFocused();
  useAsyncEffect(
    async (isCancelled) => {
      if (!isFocused) return;
      const v = await loadAiOptIn();
      if (!isCancelled()) setAiOn(v === 'on');
    },
    [isFocused]
  );

  // §30: a single "is the check-in dialogue currently occupying the panel" flag, the same shape
  // ActiveExerciseDialogue uses above — starts true once there's something to say (not already
  // done today, and the callback lookup has resolved so the lead-in lines don't shift under a
  // tap already in flight), stays true through DialogueExercise's own thank-you bubble, and only
  // clears 1800ms after completion. Replaces the old version's direct use of useDialogue's
  // `done`/`phase` state, which existed only because this screen used to hand-rolled its own
  // copy of DialogueExercise's UI instead of rendering the component.
  const [checkinShowing, setCheckinShowing] = useState(false);
  useEffect(() => {
    if (callbackLoaded && !alreadyCheckedInToday) setCheckinShowing(true);
    // alreadyCheckedInToday flipping true (completeExercise, same render as the dialogue's own
    // onComplete) must NOT re-run this and hide the panel early — only the initial "nothing said
    // yet today" transition should ever turn it on. See handleCheckinComplete for how it turns
    // back off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callbackLoaded]);

  // No popup and no praise: the character's closing line thanks them for talking, and
  // the coin count simply goes up (§4: rewards accumulate quietly). The only record kept is
  // memory.ts's log — it's what the memo tab reads and what future callbacks are drawn from.
  const { onComplete: handleCheckinComplete, toast: checkinToast } = useDialogueCompletion({
    id: DAILY_CHECKIN_ID,
    questions: DAILY_QUESTIONS,
    stat: DAILY_CHECKIN_STAT,
    onClosed: () => setCheckinShowing(false),
  });

  // An exercise picked from the quest widget always takes over, even mid-check-in — tapping a
  // quest button is a deliberate choice that should win over whatever Home would otherwise show.
  const showExercisePanel = !!activeExercise;
  const showCheckinPanel = !showExercisePanel && checkinShowing;
  const showPanel = showExercisePanel || showCheckinPanel;
  // Close-up portrait (vs. the roaming sprite) for the whole time either panel is up, including
  // its post-completion thank-you hold — not just the "actively asking a question" window.
  const showCloseUp = showExercisePanel || showCheckinPanel;
  // Lets MainTabs' floating relief button know to move out of this panel's way while it's open.
  // Gated on focus too: bottom-tabs keeps Home mounted (not unmounted) when another tab is
  // selected, so `showPanel` alone would stay true in the background after switching away with
  // the check-in still unanswered — the button would then dodge a panel that isn't even on screen.
  useReportBottomPanel(showPanel && isFocused);

  const questExercises = useMemo(
    () => EXERCISES.map((exercise) => ({ exercise, doneToday: isCompletedToday(exercise.id) })),
    // isCompletedToday is stable per completeExercise/isCompletedToday identity from useGame,
    // but its RESULT depends on state.lastCompleted — re-derive whenever that changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCompletedToday, state.lastCompleted]
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* wait for the saved state so bought furniture doesn't pop in a moment after the room appears */}
      {loaded && (
        <RoomBackdrop owned={state.inventory}>
          {/* Mounted (hidden) even during the dialogue so its sprites are already loaded when she starts to walk */}
          <RoamingCharacter hidden={showCloseUp} />
          {showCloseUp && <RoomPortrait />}
        </RoomBackdrop>
      )}

      <CoinBadge coins={state.coins} style={[styles.coinBadge, { top: insets.top + 10 }]} />
      <StatusBadge onPress={() => setShowStatus(true)} style={[styles.statusBadge, { top: insets.top + 10 }]} />

      {!showPanel && (
        <QuestWidget
          style={{ top: insets.top + 64 }}
          exercises={questExercises}
          aiOn={aiOn}
          onSelectExercise={setActiveExercise}
          onOpenAiChat={() => navigation.navigate('AiChat')}
        />
      )}

      {showExercisePanel && activeExercise && (
        <FloatingPanel>
          <ActiveExerciseDialogue exercise={activeExercise} onDone={() => setActiveExercise(null)} />
          <CrisisFooter tone="dark" />
        </FloatingPanel>
      )}

      {showCheckinPanel && (
        <FloatingPanel>
          <StatUpToast toast={checkinToast} />
          <DialogueExercise
            questions={DAILY_QUESTIONS}
            onComplete={handleCheckinComplete}
            leadIn={dailyLeadIn(greeting, callback)}
            showPortrait={false}
          />
          <CrisisFooter tone="dark" />
        </FloatingPanel>
      )}

      {showStatus && <StatusOverlay onClose={() => setShowStatus(false)} />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  coinBadge: { position: 'absolute', left: 14, zIndex: 10 },
  statusBadge: { position: 'absolute', right: 14, zIndex: 10 },
});

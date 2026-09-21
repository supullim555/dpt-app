import { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import RoomBackdrop from '../components/RoomBackdrop';
import RoomPortrait from '../components/RoomPortrait';
import RoamingCharacter from '../components/RoamingCharacter';
import TapHintChevron from '../components/TapHintChevron';
import CrisisFooter from '../components/CrisisFooter';
import { useGame } from '../game/GameContext';
import { useDialogue, type DialogueBeat } from '../hooks/useDialogue';
import { makeSubmitOnEnterHandler } from '../hooks/useSubmitOnEnter';
import { saveEntry } from '../storage/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const DAILY_CHECKIN_ID = 'daily-checkin';
const BOTTOM_BAR_HEIGHT = 150;

const GREETINGS: { until: number; text: string }[] = [
  { until: 11, text: '아침이네요. 지금 마음은 어때요?' },
  { until: 17, text: '오늘 하루 어떻게 흘러가고 있나요?' },
  { until: 22, text: '수고 많았어요. 잠깐 마음을 돌아볼까요?' },
  { until: 24, text: '이 시간까지 깨어있네요. 무리하지 말아요.' },
];

function getGreeting() {
  const hour = new Date().getHours();
  return GREETINGS.find((g) => hour < g.until)?.text ?? GREETINGS[GREETINGS.length - 1].text;
}

function buildDailyBeats(greeting: string): DialogueBeat[] {
  return [
    { text: greeting, answerable: false },
    { text: '오늘 하루는 어땠나요?', answerable: true },
    { text: '그중에서 가장 기억에 남는 순간이 있다면요?', answerable: true },
  ];
}

export default function HomeScreen({ navigation }: Props) {
  const { state, loaded, completeExercise, isCompletedToday } = useGame();

  // Computed once per mount so the opening line doesn't change while the screen stays open.
  const greeting = useMemo(getGreeting, []);
  const alreadyCheckedInToday = isCompletedToday(DAILY_CHECKIN_ID);
  const beats = useMemo(() => buildDailyBeats(greeting), [greeting]);

  // No popup and no praise: the character's closing line thanks them for talking, and
  // the coin count simply goes up (§4: rewards accumulate quietly).
  const handleComplete = (answers: string[]) => {
    const today = new Date().toISOString().slice(0, 10);
    saveEntry(`answers.${DAILY_CHECKIN_ID}.${today}`, answers);
    completeExercise(DAILY_CHECKIN_ID);
  };

  const { current, phase, draft, setDraft, advance, done } = useDialogue(beats, handleComplete);
  const showAnswerBox = !alreadyCheckedInToday && phase === 'input';
  const bubbleText = alreadyCheckedInToday
    ? '오늘은 이미 이야기 나눴어요. 편할 때 또 와요.'
    : done
      ? '오늘 이야기 나눠줘서 고마워요.'
      : current.text;
  const inDialogue = !alreadyCheckedInToday && !done;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.coinText}>🪙 {state.coins}</Text>
      </View>

      <View style={styles.stage}>
        {/* wait for the saved state so bought furniture doesn't pop in a moment after the room appears */}
        {loaded && (
          <RoomBackdrop owned={state.inventory}>{inDialogue ? <RoomPortrait /> : <RoamingCharacter />}</RoomBackdrop>
        )}
      </View>

      <View style={[styles.bottomBar, inDialogue && styles.dialogueBar]}>
        {inDialogue ? (
          <>
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
          </>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ExerciseList')}
            >
              <Text style={styles.actionButtonText}>실습</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Shop')}>
              <Text style={styles.actionButtonText}>상점</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  topBar: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  coinText: { fontSize: 14, fontWeight: '700', color: '#444' },
  stage: { flex: 1 },
  bottomBar: {
    minHeight: BOTTOM_BAR_HEIGHT,
    padding: 16,
    justifyContent: 'center',
  },
  dialogueBar: { backgroundColor: 'rgba(20,20,20,0.82)' },
  dialogueTouchable: { alignItems: 'center' },
  dialogueText: { color: '#fff', fontSize: 15, lineHeight: 22, textAlign: 'center' },
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
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  actionButton: {
    backgroundColor: 'rgba(34,34,34,0.88)',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 20,
  },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

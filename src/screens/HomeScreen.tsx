import { useMemo } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import CharacterView from '../components/CharacterView';
import TapHintChevron from '../components/TapHintChevron';
import { useGame } from '../game/GameContext';
import { useDialogue, type DialogueBeat } from '../hooks/useDialogue';
import { saveEntry } from '../storage/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const DAILY_CHECKIN_ID = 'daily-checkin';

const GREETINGS: { until: number; text: string }[] = [
  { until: 11, text: '좋은 아침이에요! 오늘 하루도 함께해요.' },
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
  const { state, completeExercise, isCompletedToday } = useGame();
  const { width, height } = useWindowDimensions();
  const roomSize = Math.min(width * 0.92, height * 0.7);

  // Computed once per mount so the opening line doesn't change while the screen stays open.
  const greeting = useMemo(getGreeting, []);
  const alreadyCheckedInToday = isCompletedToday(DAILY_CHECKIN_ID);
  const beats = useMemo(() => buildDailyBeats(greeting), [greeting]);

  const handleComplete = (answers: string[]) => {
    const today = new Date().toISOString().slice(0, 10);
    saveEntry(`answers.${DAILY_CHECKIN_ID}.${today}`, answers);
    const success = completeExercise(DAILY_CHECKIN_ID);
    if (success) {
      Alert.alert('완료!', '오늘 이야기 나눠줘서 고마워요. +10 코인을 받았어요.');
    }
  };

  const { current, phase, draft, setDraft, advance, done } = useDialogue(beats, handleComplete);
  const showAnswerBox = !alreadyCheckedInToday && phase === 'input';
  const bubbleText = alreadyCheckedInToday
    ? '오늘은 이미 이야기 나눴어요. 내일 또 얘기해요!'
    : done
      ? '오늘 이야기 나눠줘서 고마워요.'
      : current.text;
  const bubbleTappable = !alreadyCheckedInToday && !done;

  return (
    <View style={styles.container}>
      <View style={[styles.room, { width: roomSize, height: roomSize }]}>
        <CharacterView equipped={state.equipped} size={roomSize} />

        <View style={styles.coinBadge}>
          <Text style={styles.coinBadgeText}>🪙 {state.coins}</Text>
        </View>

        <TouchableOpacity
          style={styles.bubble}
          activeOpacity={bubbleTappable ? 0.8 : 1}
          disabled={!bubbleTappable}
          onPress={advance}
        >
          <Text style={styles.bubbleText}>{bubbleText}</Text>
          {bubbleTappable && <TapHintChevron />}
        </TouchableOpacity>

        {showAnswerBox ? (
          <View style={styles.answerBar}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="여기에 적어보세요"
              placeholderTextColor="#999"
              multiline
              autoFocus
            />
            <TouchableOpacity style={styles.roomButton} onPress={advance}>
              <Text style={styles.roomButtonText}>다음</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.roomButton}
              onPress={() => navigation.navigate('ExerciseList')}
            >
              <Text style={styles.roomButtonText}>실습</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roomButton} onPress={() => navigation.navigate('Shop')}>
              <Text style={styles.roomButtonText}>상점</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' },
  room: { position: 'relative' },
  coinBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  coinBadgeText: { fontSize: 13, fontWeight: '700', color: '#333' },
  bubble: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    maxWidth: '75%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleText: { fontSize: 12, color: '#333', textAlign: 'center', lineHeight: 17 },
  bottomBar: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  answerBar: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    gap: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 10,
    minHeight: 56,
    fontSize: 13,
    color: '#222',
    textAlignVertical: 'top',
  },
  roomButton: {
    backgroundColor: 'rgba(34,34,34,0.88)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  roomButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

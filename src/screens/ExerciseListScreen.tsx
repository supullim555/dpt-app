import { useCallback, useState } from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { TalkScreenProps } from '../navigation/types';
import ScreenHeader from '../components/ScreenHeader';
import CoinBadge from '../components/CoinBadge';
import { EXERCISES, TRACKS, type Track } from '../data/exercises';
import { useGame } from '../game/GameContext';
import { loadAiOptIn, setAiOptIn, type AiOptIn } from '../ai/preference';
import { BORDER, INK, MUTED, SCREEN_BG } from '../theme';

const sections = (Object.keys(TRACKS) as Track[]).map((track) => ({
  title: TRACKS[track].label,
  data: EXERCISES.filter((e) => e.track === track),
}));

// The "이야기" tab (was a separate "실습" screen with its own 홈/상점 buttons — both are gone
// now that MainTabs is always there).
export default function ExerciseListScreen({ navigation }: TalkScreenProps) {
  const { state } = useGame();
  const [aiOptIn, setAiOptInState] = useState<AiOptIn>('unset');

  // Re-reads on every focus, not just mount: this is the one place to flip AI back on after
  // declining it in IntroGate (§24 only asks once at launch), so coming back here after doing
  // that needs to reflect the new choice without a full screen reload.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadAiOptIn().then((v) => !cancelled && setAiOptInState(v));
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const turnAiOn = async () => {
    await setAiOptIn('on');
    setAiOptInState('on');
  };

  return (
    <SectionList
      style={styles.list}
      ListHeaderComponent={
        <>
          <ScreenHeader title="이야기" right={<CoinBadge coins={state.coins} />} />
          {aiOptIn === 'on' ? (
            <TouchableOpacity style={styles.aiCard} onPress={() => navigation.navigate('AiChat')}>
              <Text style={styles.aiCardTitle}>AI와 이야기</Text>
              <Text style={styles.aiCardBody}>정해진 질문 없이, 자유롭게 대화해요.</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.aiCardOff}>
              <Text style={styles.aiCardOffTitle}>AI와 자유롭게 이야기하기</Text>
              <Text style={styles.aiCardOffBody}>
                켜면 Google Gemini와 대화할 수 있어요. 여기서 쓰는 내용은 이 기기가 아니라 Gemini
                서버로 전송돼요.
              </Text>
              <TouchableOpacity style={styles.aiCardOffButton} onPress={turnAiOn}>
                <Text style={styles.aiCardOffButtonText}>켜기</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      }
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
        >
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSummary} numberOfLines={2}>
            {item.summary}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: SCREEN_BG },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: MUTED,
    backgroundColor: SCREEN_BG,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  cardSummary: { marginTop: 6, fontSize: 13, color: MUTED, lineHeight: 18 },
  aiCard: {
    backgroundColor: INK,
    marginHorizontal: 20,
    marginBottom: 4,
    padding: 16,
    borderRadius: 16,
  },
  aiCardTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  aiCardBody: { marginTop: 4, fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  aiCardOff: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 4,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  aiCardOffTitle: { fontSize: 15, fontWeight: '700', color: INK },
  aiCardOffBody: { marginTop: 4, fontSize: 12, color: MUTED, lineHeight: 17 },
  aiCardOffButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: SCREEN_BG,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  aiCardOffButtonText: { fontSize: 13, fontWeight: '600', color: INK },
});

import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import CharacterView from '../components/CharacterView';
import { useGame } from '../game/GameContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

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

export default function HomeScreen({ navigation }: Props) {
  const { state } = useGame();
  const { width, height } = useWindowDimensions();
  // Computed once per mount so the greeting doesn't change while the screen stays open.
  const greeting = useMemo(getGreeting, []);
  // Room feel: the character's space fills ~70% of the screen, capped by width so it never overflows.
  const roomSize = Math.min(width * 0.92, height * 0.7);

  return (
    <View style={styles.container}>
      <View style={[styles.room, { width: roomSize, height: roomSize }]}>
        <CharacterView equipped={state.equipped} size={roomSize} />

        <View style={styles.coinBadge}>
          <Text style={styles.coinBadgeText}>🪙 {state.coins}</Text>
        </View>

        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{greeting}</Text>
        </View>

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
    maxWidth: '65%',
    backgroundColor: 'rgba(255,255,255,0.9)',
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
  roomButton: {
    backgroundColor: 'rgba(34,34,34,0.88)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  roomButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

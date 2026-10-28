import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import type { Exercise } from './exercises';
import { setAiOptIn } from '@/features/ai';
import { QUEST_ICON_SOURCES } from '@/assets/questIcons';
import IconOrEmoji from '@/ui/IconOrEmoji';
import { BORDER, CHIP_SHADOW, INK, MUTED, OVERLAY_LIGHT, SCREEN_BG } from '@/ui/theme';

type Props = {
  exercises: { exercise: Exercise; doneToday: boolean }[];
  aiOn: boolean | null; // null while the stored choice hasn't loaded yet
  onSelectExercise: (exercise: Exercise) => void;
  onOpenAiChat: () => void;
  /** Vertical placement — the safe-area top inset varies per device, so the caller (which
   * already reads it for CoinBadge) passes it down rather than this component re-reading it. */
  style?: ViewStyle;
};

// §27's "모바일 게임의 일일 퀘스트 목록" request — a small column of buttons living on Home
// itself, so starting one of the structured exercises (or the free AI chat) doesn't require
// leaving the room at all. Replaces the old "이야기" tab's list-then-detail-screen flow for
// everything except actually looking back at what was said (that's 메모 now, §27).
//
// Collapsible by design, not just as a nice-to-have: the room is the point of this screen, and a
// permanent column of buttons over it would fight that. Collapsed is a single small toggle;
// expanded is the full list. Resets to expanded on every mount (not persisted) — a once-per-visit
// UI preference isn't worth a storage round trip.
export default function QuestWidget({ exercises, aiOn, onSelectExercise, onOpenAiChat, style }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);

  if (collapsed) {
    return (
      <TouchableOpacity
        style={[styles.collapsedToggle, style]}
        onPress={() => setCollapsed(false)}
        accessibilityLabel="오늘의 이야기 목록 펼치기"
      >
        <Text style={styles.collapsedIcon}>📋</Text>
      </TouchableOpacity>
    );
  }

  const handleAiPress = () => {
    if (aiOn) {
      onOpenAiChat();
    } else {
      setShowAiPrompt((v) => !v);
    }
  };

  const turnAiOn = async () => {
    await setAiOptIn('on');
    setShowAiPrompt(false);
    onOpenAiChat();
  };

  return (
    <View style={[styles.wrap, style]}>
      <TouchableOpacity
        style={styles.collapseButton}
        onPress={() => setCollapsed(true)}
        accessibilityLabel="오늘의 이야기 목록 접기"
      >
        <Text style={styles.collapseIcon}>⌃</Text>
      </TouchableOpacity>

      {exercises.map(({ exercise, doneToday }) => (
        <TouchableOpacity
          key={exercise.id}
          style={styles.item}
          onPress={() => onSelectExercise(exercise)}
          disabled={doneToday}
          accessibilityLabel={exercise.title}
        >
          <View style={[styles.questButton, doneToday && styles.questButtonDone]}>
            <IconOrEmoji
              source={QUEST_ICON_SOURCES[exercise.id]}
              emoji="💭"
              imageStyle={styles.questIconImage}
              emojiStyle={styles.questIcon}
            />
            {doneToday && (
              <View style={styles.doneBadge}>
                <Text style={styles.doneBadgeText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemLabel} numberOfLines={2}>
            {exercise.shortLabel}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.item} onPress={handleAiPress} accessibilityLabel="AI와 이야기">
        <View style={[styles.questButton, styles.aiButton, !aiOn && styles.questButtonOff]}>
          <Text style={styles.questIcon}>✨</Text>
        </View>
        <Text style={styles.itemLabel} numberOfLines={2}>
          AI와 대화
        </Text>
      </TouchableOpacity>

      {showAiPrompt && (
        <View style={styles.aiPrompt}>
          <Text style={styles.aiPromptText}>
            켜면 AI(Google Gemini)와 자유롭게 대화할 수 있어요. 나누는 대화는 이 기기가 아니라
            Gemini 서버로 전송돼요.
          </Text>
          <TouchableOpacity style={styles.aiPromptButton} onPress={turnAiOn}>
            <Text style={styles.aiPromptButtonText}>켜기</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, alignItems: 'center', gap: 10 },
  collapseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  collapseIcon: { fontSize: 14, color: MUTED },
  collapsedToggle: {
    position: 'absolute',
    left: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OVERLAY_LIGHT,
    borderWidth: 1,
    borderColor: BORDER,
    ...CHIP_SHADOW,
  },
  collapsedIcon: { fontSize: 18 },
  item: { alignItems: 'center', width: 64 },
  // A small pill rather than plain text over the room art behind it — the backdrop's color
  // varies by what furniture is bought (§12), so plain text risks low contrast somewhere.
  itemLabel: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: INK,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  questButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OVERLAY_LIGHT,
    borderWidth: 1,
    borderColor: BORDER,
    ...CHIP_SHADOW,
  },
  questButtonDone: { opacity: 0.45 },
  questButtonOff: { opacity: 0.55 },
  aiButton: { backgroundColor: INK, borderColor: INK },
  questIcon: { fontSize: 20 },
  questIconImage: { width: 26, height: 26 },
  doneBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#6fae82',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: SCREEN_BG,
  },
  doneBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  aiPrompt: {
    marginTop: 4,
    width: 220,
    padding: 12,
    borderRadius: 14,
    backgroundColor: OVERLAY_LIGHT,
    borderWidth: 1,
    borderColor: BORDER,
    ...CHIP_SHADOW,
  },
  aiPromptText: { fontSize: 12, lineHeight: 17, color: MUTED },
  aiPromptButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: INK,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  aiPromptButtonText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});

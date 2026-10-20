import React from 'react';
import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { OVERLAY_LIGHT, shadow } from '../theme';

const badgeShadow = shadow({ y: 2, blur: 4, opacity: 0.15, elevation: 3 });

type Props = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

// CoinBadge's mirror on the opposite corner (§33) — the entry point into the status screen.
// Shown unconditionally like CoinBadge, not hidden while a panel is open like QuestWidget:
// QuestWidget hides itself to stop a new conversation from starting mid check-in, which doesn't
// apply to just looking at stats already earned.
function StatusBadgeBase({ onPress, style }: Props) {
  return (
    <TouchableOpacity style={[styles.badge, style]} onPress={onPress} accessibilityLabel="상태 보기">
      <Text style={styles.text}>📊 상태</Text>
    </TouchableOpacity>
  );
}

export default React.memo(StatusBadgeBase);

const styles = StyleSheet.create({
  badge: {
    backgroundColor: OVERLAY_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    ...badgeShadow,
  },
  text: { fontSize: 13, fontWeight: '700', color: '#444' },
});

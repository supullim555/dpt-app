import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import HudBadge from '@/ui/HudBadge';

type Props = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

// CoinBadge's mirror on the opposite corner (§33) — the entry point into the status overlay.
// Shown unconditionally like CoinBadge, not hidden while a panel is open like QuestWidget:
// QuestWidget hides itself to stop a new conversation from starting mid check-in, which doesn't
// apply to just looking at stats already earned.
function StatusBadgeBase({ onPress, style }: Props) {
  return (
    <HudBadge onPress={onPress} accessibilityLabel="상태 보기" style={style}>
      📊 상태
    </HudBadge>
  );
}

export default React.memo(StatusBadgeBase);

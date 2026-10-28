import React, { type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { OVERLAY_LIGHT, shadow } from './theme';

const badgeShadow = shadow({ y: 2, blur: 4, opacity: 0.15, elevation: 3 });

type Props = {
  children: ReactNode;
  /** Omit for a plain display badge (CoinBadge) — a TouchableOpacity is only used when there's
   * actually something to press (StatusBadge), so a non-interactive badge doesn't dim on tap for
   * no reason. */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// The small floating "HUD" pill shared by every badge over the room scene — CoinBadge and
// StatusBadge used to each define an identical shadow + StyleSheet for this same shape (§38).
function HudBadgeBase({ children, onPress, accessibilityLabel, style }: Props) {
  const text = <Text style={styles.text}>{children}</Text>;
  if (onPress) {
    return (
      <TouchableOpacity style={[styles.badge, style]} onPress={onPress} accessibilityLabel={accessibilityLabel}>
        {text}
      </TouchableOpacity>
    );
  }
  return (
    <View style={[styles.badge, style]} accessibilityLabel={accessibilityLabel}>
      {text}
    </View>
  );
}

export default React.memo(HudBadgeBase);

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

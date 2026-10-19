import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { OVERLAY_LIGHT, shadow } from '../theme';

const badgeShadow = shadow({ y: 2, blur: 4, opacity: 0.15, elevation: 3 });

type Props = {
  coins: number;
  style?: StyleProp<ViewStyle>;
};

// A small floating pill instead of a full-width top bar band — used on every screen that shows
// the coin count, so it reads as one HUD element floating over a scene rather than another
// screen carved into its own rectangle (the app previously had three of those on Home alone).
function CoinBadgeBase({ coins, style }: Props) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>🪙 {coins}</Text>
    </View>
  );
}

export default React.memo(CoinBadgeBase);

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

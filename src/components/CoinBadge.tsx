import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import HudBadge from './HudBadge';

type Props = {
  coins: number;
  style?: StyleProp<ViewStyle>;
};

// A small floating pill instead of a full-width top bar band — used on every screen that shows
// the coin count, so it reads as one HUD element floating over a scene rather than another
// screen carved into its own rectangle (the app previously had three of those on Home alone).
function CoinBadgeBase({ coins, style }: Props) {
  return <HudBadge style={style}>🪙 {coins}</HudBadge>;
}

export default React.memo(CoinBadgeBase);

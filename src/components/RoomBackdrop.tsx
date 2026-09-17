import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ITEM_MAP } from '../game/catalog';
import SpriteSheetAnimator from './SpriteSheetAnimator';

type Props = {
  equippedBackgroundId: string;
  /** Fixed square card of this size (px). Ignored when `full` is set. */
  size?: number;
  /** Fill the parent instead of being a fixed-size square card. */
  full?: boolean;
  children?: React.ReactNode;
};

// The room's customizable backdrop (from the shop's `background` slot),
// with room content (character, HUD) laid over it as children.
function RoomBackdropBase({ equippedBackgroundId, size = 0, full = false, children }: Props) {
  const background = ITEM_MAP[equippedBackgroundId];
  const hasAsset = Boolean(background?.image || background?.sprite);

  return (
    <View
      style={[
        styles.stage,
        full ? styles.full : { width: size, height: size, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
        !hasAsset && { backgroundColor: background?.color ?? '#eee' },
      ]}
    >
      {/* Animated background sprites aren't wired up for `full` mode yet (no
          catalog background currently defines one) — only `image` is. */}
      {hasAsset && background?.sprite && (
        <View style={styles.fill}>
          <SpriteSheetAnimator spec={background.sprite} size={size} />
        </View>
      )}
      {hasAsset && !background?.sprite && background?.image && (
        <Image source={background.image} style={styles.fill} resizeMode="cover" />
      )}
      {children}
    </View>
  );
}

export default React.memo(RoomBackdropBase);

const styles = StyleSheet.create({
  stage: { position: 'relative', overflow: 'hidden' },
  full: { flex: 1 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});

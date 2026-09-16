import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { ITEM_MAP, type ShopItem, type SlotId } from '../game/catalog';
import SpriteSheetAnimator from './SpriteSheetAnimator';
import { USE_NATIVE_DRIVER } from '../anim/useNativeDriver';

type Props = {
  equipped: Record<SlotId, string>;
  size?: number;
};

// Renders one equipped item as a layer: a sprite sheet if the item has one,
// else a static image, else the color/emoji placeholder. Callers never need
// to know which representation an item uses — swapping a placeholder for
// real art is just adding `image`/`sprite` to that catalog entry.
function Layer({ item, style, layerSize }: { item?: ShopItem; style: object; layerSize: number }) {
  if (!item) return null;
  if (item.sprite) {
    return (
      <View style={style}>
        <SpriteSheetAnimator spec={item.sprite} size={layerSize} />
      </View>
    );
  }
  if (item.image) {
    return (
      <Image
        source={item.image}
        style={[style, { width: layerSize, height: layerSize }]}
        resizeMode="contain"
      />
    );
  }
  if (item.color !== 'transparent') {
    return <View style={[style, { backgroundColor: item.color, width: layerSize, height: layerSize }]} />;
  }
  if (item.emoji) {
    return <Text style={[style, { fontSize: layerSize }]}>{item.emoji}</Text>;
  }
  return null;
}

// Background fills the whole stage edge-to-edge (cover), unlike the other
// layers which are icon-sized and positioned within it.
function BackgroundLayer({ item, size }: { item?: ShopItem; size: number }) {
  if (!item) return null;
  if (item.sprite) {
    return (
      <View style={styles.backgroundFill}>
        <SpriteSheetAnimator spec={item.sprite} size={size} />
      </View>
    );
  }
  if (item.image) {
    return <Image source={item.image} style={styles.backgroundFill} resizeMode="cover" />;
  }
  return null;
}

function CharacterViewBase({ equipped, size = 220 }: Props) {
  const background = ITEM_MAP[equipped.background];
  const body = ITEM_MAP[equipped.body];
  const outfit = ITEM_MAP[equipped.outfit];
  const accessory = ITEM_MAP[equipped.accessory];

  // Idle "breathing" bob — only for the placeholder body shape. Once a real
  // sprite sheet is set on the body item, its own frames drive the motion
  // and this stops double-animating.
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (body?.sprite) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob, body?.sprite]);
  const bobTranslateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  const hasBackgroundAsset = Boolean(background?.image || background?.sprite);

  return (
    <View
      style={[
        styles.stage,
        { width: size, height: size },
        !hasBackgroundAsset && { backgroundColor: background?.color ?? '#eee' },
      ]}
    >
      {hasBackgroundAsset && <BackgroundLayer item={background} size={size} />}

      <Animated.View
        style={[styles.characterLayers, { transform: [{ translateY: bobTranslateY }] }]}
      >
        <Layer item={body} style={styles.body} layerSize={size * 0.5} />
        {outfit && (outfit.color !== 'transparent' || outfit.image || outfit.sprite) && (
          <Layer item={outfit} style={styles.outfit} layerSize={size * 0.4} />
        )}
        {accessory && (accessory.emoji || accessory.image || accessory.sprite) && (
          <Layer item={accessory} style={styles.accessory} layerSize={size * 0.18} />
        )}
      </Animated.View>
    </View>
  );
}

export default React.memo(CharacterViewBase);

const styles = StyleSheet.create({
  stage: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backgroundFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  characterLayers: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  body: { position: 'absolute', bottom: '15%', borderRadius: 999 },
  outfit: { position: 'absolute', bottom: '18%', borderRadius: 10 },
  accessory: { position: 'absolute', top: '10%' },
});

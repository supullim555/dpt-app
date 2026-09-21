import React from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { CHARACTER_CLIPS, PORTRAIT_FRONT } from '../assets/character';
import { FLOOR_SOURCE, ROOM_OBJECTS, WALLPAPER_SOURCE } from '../room/objects';

const SOURCES: ImageSourcePropType[] = [
  PORTRAIT_FRONT,
  ...Object.values(CHARACTER_CLIPS).map((c) => c.source),
  ...ROOM_OBJECTS.map((o) => o.source),
  FLOOR_SOURCE,
  WALLPAPER_SOURCE,
];

// Loads every character and room image the moment the app starts, so the first time a clip,
// the portrait or a piece of furniture is drawn it's already in the cache instead of showing
// a blank while it downloads. Each is an ordinary <Image> — invisible and 1px — which loads
// through exactly the same path as when it's drawn for real, on web and native alike (there's
// no separate prefetch API to differ between them).
function ArtPreloaderBase() {
  return (
    <View style={{ pointerEvents: 'none', position: 'absolute', left: 0, top: 0, width: 1, height: 1, opacity: 0, overflow: 'hidden' }}>
      {SOURCES.map((source, i) => (
        <Image key={i} source={source} style={{ width: 1, height: 1 }} />
      ))}
    </View>
  );
}

export default React.memo(ArtPreloaderBase);

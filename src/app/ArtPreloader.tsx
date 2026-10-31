import React from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { CHARACTER_CLIPS, PORTRAIT_FRONT } from '@/assets/character';
import { QUEST_ICON_SOURCES } from '@/assets/questIcons';
import { VISIT_CARDS, VISIT_GIRL, VISIT_OPENING, VISIT_PANEL, VISIT_ROOM, VISIT_SCRIBBLES, VISIT_TORN } from '@/assets/visitUi';
import { FLOOR_SOURCE, ROOM_OBJECTS, WALLPAPER_SOURCE } from '@/features/room';
import { VISIT_ENABLED } from '@/features/visit';

const SOURCES: ImageSourcePropType[] = [
  PORTRAIT_FRONT,
  ...Object.values(CHARACTER_CLIPS).map((c) => c.source),
  ...ROOM_OBJECTS.map((o) => o.source),
  FLOOR_SOURCE,
  WALLPAPER_SOURCE,
  ...Object.values(QUEST_ICON_SOURCES),
  ...(VISIT_ENABLED ? [VISIT_ROOM, VISIT_GIRL, VISIT_TORN, VISIT_PANEL, ...VISIT_CARDS, ...VISIT_OPENING, ...VISIT_SCRIBBLES] : []),
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

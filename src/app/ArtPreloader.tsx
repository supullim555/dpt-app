import React from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { VISIT_CARDS, VISIT_OPENING, VISIT_PANEL, VISIT_SCRIBBLES } from '@/assets/visitUi';

const SOURCES: ImageSourcePropType[] = [VISIT_PANEL, ...VISIT_CARDS, ...VISIT_OPENING, ...VISIT_SCRIBBLES];

// Loads the screens' paper and opening images the moment the app starts, so the first time one
// is drawn it's already in the cache instead of showing
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

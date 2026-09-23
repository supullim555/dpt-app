import React, { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { WALL_BOTTOM, getRoomLayout, type RoomLayout } from '../room/layout';
import { FLOOR_SOURCE, WALLPAPER_SOURCE } from '../room/objects';
import { RoomContext } from '../room/RoomContext';

type Props = {
  /** Ids of the furniture the player owns (the starting pieces are always there). */
  owned: readonly string[];
  /** Room content (character, portrait) drawn over the furniture. */
  children?: ReactNode;
};

// Average colours of the wall and floor pictures. Each picture sits on its own colour so that,
// on the frame where the room first appears but the picture isn't decoded yet, you see wall and
// floor tones instead of the dark stage colour showing through.
const WALL_COLOR = '#f6e3cf';
const FLOOR_COLOR = '#dfa96e';

// Back wall and floor. The generated textures are wider than the room needs,
// so they're cropped to fit ('cover') rather than squashed.
function Shell({ room }: { room: RoomLayout }) {
  const { width, height, wallBottom } = room;
  return (
    <>
      <Image
        source={WALLPAPER_SOURCE}
        resizeMode="cover"
        style={{ position: 'absolute', left: 0, top: 0, width, height: wallBottom, backgroundColor: WALL_COLOR }}
      />
      <Image
        source={FLOOR_SOURCE}
        resizeMode="cover"
        style={{ position: 'absolute', left: 0, top: wallBottom, width, height: height - wallBottom, backgroundColor: FLOOR_COLOR }}
      />
      {/* baseboard, and the shadow the wall casts on the floor along it */}
      <View style={{ position: 'absolute', left: 0, top: wallBottom - height * 0.012, width, height: height * 0.012, backgroundColor: '#8b5e3c' }} />
      <View style={{ position: 'absolute', left: 0, top: wallBottom, width, height: height * 0.016, backgroundColor: 'rgba(60,35,20,0.18)' }} />
    </>
  );
}

// Every piece is its own image. Wall and flat pieces sit in the back; solid
// furniture gets an even zIndex by floor-contact line, so the character (odd
// zIndex, see RoamingCharacter) walks in front of or behind each one correctly.
function RoomScene({ room }: { room: RoomLayout }) {
  return (
    <>
      <Shell room={room} />
      {room.objects.map((o) => (
        <Image
          key={o.id}
          source={o.source}
          resizeMode="stretch"
          style={{ position: 'absolute', left: o.left, top: o.top, width: o.width, height: o.height, zIndex: o.z }}
        />
      ))}
    </>
  );
}

// The room, with whatever's living in it (the character) laid over the top as
// children. Measures itself and shares the resulting geometry through RoomContext.
function RoomBackdropBase({ owned, children }: Props) {
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const stageRef = useRef<View>(null);
  const applySize = (width: number, height: number) =>
    setStage((s) => (s.width === width && s.height === height ? s : { width, height }));

  // On web, `onLayout` fires a frame late (ResizeObserver), which left the room undrawn for a
  // few frames each time this screen appeared. The DOM node can be measured synchronously
  // right after the first render and before the browser paints, so do that too. (Native has
  // no such method and just relies on onLayout, which it delivers before drawing.)
  useLayoutEffect(() => {
    const node = stageRef.current as unknown as { getBoundingClientRect?: () => { width: number; height: number } } | null;
    const r = node?.getBoundingClientRect?.();
    if (r && r.width > 0 && r.height > 0) applySize(r.width, r.height);
  }, []);

  // Keyed by content, not array identity, so re-renders that don't change what's owned
  // don't rebuild the layout (which would restart the character's walk).
  const ownedKey = [...owned].sort().join(',');
  const room = useMemo(
    () => (stage.width > 0 && stage.height > 0 ? getRoomLayout(stage.width, stage.height, owned) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stage.width, stage.height, ownedKey]
  );

  return (
    <View
      ref={stageRef}
      style={styles.stage}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        applySize(width, height);
      }}
    >
      {/* Until the stage has been measured (a frame or so after a screen appears) there is no
          room to draw. Show the wall and floor colours instead of the dark stage colour, so that
          frame blends into the room that follows rather than flashing dark between two bright ones. */}
      {!room && (
        <>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: `${WALL_BOTTOM * 100}%`, backgroundColor: WALL_COLOR }} />
          <View style={{ position: 'absolute', left: 0, right: 0, top: `${WALL_BOTTOM * 100}%`, bottom: 0, backgroundColor: FLOOR_COLOR }} />
        </>
      )}
      {room && (
        <RoomContext.Provider value={room}>
          <View style={{ position: 'absolute', top: 0, left: room.offsetX, width: room.width, height: room.height, overflow: 'hidden' }}>
            <RoomScene room={room} />
            {children}
          </View>
        </RoomContext.Provider>
      )}
    </View>
  );
}

export default React.memo(RoomBackdropBase);

const styles = StyleSheet.create({
  stage: { flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#3a2a24' },
});

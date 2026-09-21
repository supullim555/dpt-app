import React, { useMemo, useState, type ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { getRoomLayout, type RoomLayout } from '../room/layout';
import { FLOOR_SOURCE, WALLPAPER_SOURCE } from '../room/objects';
import { RoomContext } from '../room/RoomContext';

type Props = {
  /** Ids of the furniture the player owns (the starting pieces are always there). */
  owned: readonly string[];
  /** Room content (character, portrait) drawn over the furniture. */
  children?: ReactNode;
};

// Back wall and floor. The generated textures are wider than the room needs,
// so they're cropped to fit ('cover') rather than squashed.
function Shell({ room }: { room: RoomLayout }) {
  const { width, height, wallBottom } = room;
  return (
    <>
      <Image source={WALLPAPER_SOURCE} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width, height: wallBottom }} />
      <Image
        source={FLOOR_SOURCE}
        resizeMode="cover"
        style={{ position: 'absolute', left: 0, top: wallBottom, width, height: height - wallBottom }}
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
      style={styles.stage}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setStage((s) => (s.width === width && s.height === height ? s : { width, height }));
      }}
    >
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

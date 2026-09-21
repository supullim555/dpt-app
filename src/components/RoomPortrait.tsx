import React from 'react';
import { View } from 'react-native';
import CharacterPortrait from './CharacterPortrait';
import { PORTRAIT_ASPECT } from '../assets/character';
import { useRoom } from '../room/RoomContext';

// Where the soles sit inside the portrait art (shoes end just above the edge).
const FEET_FRACTION = 0.99;

// The big detailed character used while she's talking. She stands on the floor
// at the front of the room (with a shadow) rather than floating over it, and
// this is the same spot RoamingCharacter starts from afterwards.
function RoomPortraitBase() {
  const room = useRoom();
  if (!room) return null;

  // Tall art: size by height, but never wider than most of the room.
  const height = Math.min(room.height * 0.46, (room.width * 0.8) / PORTRAIT_ASPECT);
  const width = height * PORTRAIT_ASPECT;
  const feetY = room.walk.y + room.walk.h;

  return (
    <View
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        left: 0,
        top: 0,
        width: room.width,
        height: room.height,
        zIndex: 100,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: feetY - height * 0.02,
          width: width * 0.8,
          height: height * 0.045,
          borderRadius: height,
          backgroundColor: 'rgba(60,35,20,0.28)',
        }}
      />
      <View style={{ position: 'absolute', top: feetY - height * FEET_FRACTION }}>
        <CharacterPortrait size={height} />
      </View>
    </View>
  );
}

export default React.memo(RoomPortraitBase);

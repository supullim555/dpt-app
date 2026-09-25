import React from 'react';
import { View } from 'react-native';
import IdleSprite from './IdleSprite';
import { IDLE_CLIPS, frameSizeFor } from '../assets/character';
import { useRoom } from '../room/RoomContext';

// She stands (and breathes) at the front of the room, a little bigger than when she's
// wandering so she has presence at the gate. Same spot as the dialogue portrait.
const SIZE_FACTOR = 1.7;

function RoomStanderBase() {
  const room = useRoom();
  if (!room) return null;

  const spec = IDLE_CLIPS.breathe;
  const size = room.charSize * SIZE_FACTOR;
  const { frameW, frameH } = frameSizeFor(size, spec);
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
          top: feetY - size * 0.05,
          width: size * 0.6,
          height: size * 0.09,
          borderRadius: size,
          backgroundColor: 'rgba(60,35,20,0.28)',
        }}
      />
      <View style={{ position: 'absolute', top: feetY - frameH * spec.feetFraction, width: frameW, height: frameH }}>
        <IdleSprite size={frameW} />
      </View>
    </View>
  );
}

export default React.memo(RoomStanderBase);

import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useRoomBoxSize } from './useRoomBoxSize';

/** A full-height column as wide as the room, for plain screens (메모, AI 대화): on a wide window
 * they line up with Home instead of stretching to the edges of the page. */
export default function RoomColumn({ children }: { children: ReactNode }) {
  const { width } = useRoomBoxSize();
  return <View style={{ flex: 1, width, alignSelf: 'center' }}>{children}</View>;
}

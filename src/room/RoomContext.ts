import { createContext, useContext } from 'react';
import type { RoomLayout } from './layout';

// Provided by RoomBackdrop once it has measured itself; anything drawn inside
// the room (the roaming character, the dialogue portrait) reads it from here.
export const RoomContext = createContext<RoomLayout | null>(null);

export const useRoom = () => useContext(RoomContext);
